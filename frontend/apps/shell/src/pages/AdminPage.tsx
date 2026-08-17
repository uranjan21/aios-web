import { useMemo, useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { BarChart3, Cpu, Shield, Users, Search, ChevronLeft, ChevronRight, Trash2, Crown, RefreshCw } from 'lucide-react'
import { toast } from 'sonner'
import dayjs from 'dayjs'
import styled from 'styled-components'
import { Card as GlassCard, Select, Button, Skeleton } from '@ledgr/ui'
import { adminApi, AdminUser } from '@ct/shared/api/admin'
import { useAuthStore } from '@ct/shared/stores/authStore'
import { ModuleGrid, type ModuleSpec } from '@ct/shared/components/modules'
import { PageContainer, PageContent } from '@ct/shared/components/layout/PageLayout'

// ── User table ───────────────────────────────────────────────────────────────

const SearchBar = styled.div`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => `${theme.spacing[2]}`};
  padding: ${({ theme }) => `${theme.spacing[2.5]} ${theme.spacing[4]}`};
  background: ${({ theme }) => theme.color.background};
  border: 1px solid ${({ theme }) => theme.color.border};
  border-radius: ${({ theme }) => theme.radii.sm};
`

const SearchInput = styled.input`
  flex: 1;
  font-size: ${({ theme }) => theme.typography.fontSize.sm};
  background: transparent;
  border: none;
  outline: none;
  color: ${({ theme }) => theme.color.foreground};
  &::placeholder { color: ${({ theme }) => theme.color.mutedForeground}; }
`

/*
 * The wrapper had `overflow-x: auto` but its grid children had no `min-width`,
 * so at 375px the grid simply stayed 375px wide: nothing overflowed, so nothing
 * scrolled, and the `1fr` email column collapsed to a few characters instead.
 * The floor is the same idiom `TableKind` uses (`ShellKinds.tsx`) — 110px per
 * column — so the row overflows and the container can actually scroll it.
 */
const USER_TABLE_COLS = 5

const Table = styled.div`
  width: 100%;
  overflow-x: auto;

  > * { min-width: ${USER_TABLE_COLS * 110}px; }
`

const THead = styled.div`
  display: grid;
  grid-template-columns: 1fr 120px 110px 110px 80px;
  padding: ${({ theme }) => `${theme.spacing[2]} ${theme.spacing[4]}`};
  border-bottom: 1px solid ${({ theme }) => theme.color.border};
  gap: ${({ theme }) => `${theme.spacing[2]}`};
`

const TH = styled.div`
  font-size: ${({ theme }) => theme.typography.fontSize.xs};
  font-weight: 600;
  color: ${({ theme }) => theme.color.mutedForeground};
  text-transform: uppercase;
  letter-spacing: 0.05em;
`

const TRow = styled.div`
  display: grid;
  grid-template-columns: 1fr 120px 110px 110px 80px;
  padding: ${({ theme }) => `${theme.spacing[3]} ${theme.spacing[4]}`};
  border-bottom: 1px solid ${({ theme }) => theme.color.border}40;
  gap: ${({ theme }) => `${theme.spacing[2]}`};
  align-items: center;
  &:last-child { border-bottom: none; }
  &:hover { background: ${({ theme }) => theme.color.muted}40; }
`

const UserInfo = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => `${theme.spacing[0.5]}`};
  min-width: 0;
`

const UserName = styled.div`
  font-size: ${({ theme }) => theme.typography.fontSize.sm};
  font-weight: 500;
  color: ${({ theme }) => theme.color.foreground};
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`

const UserEmail = styled.div`
  font-size: ${({ theme }) => theme.typography.fontSize.xs};
  color: ${({ theme }) => theme.color.mutedForeground};
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`

const PlanBadge = styled.span<{ $plan: string }>`
  display: inline-flex;
  align-items: center;
  gap: ${({ theme }) => `${theme.spacing[1]}`};
  font-size: ${({ theme }) => theme.typography.fontSize.xs};
  font-weight: 600;
  padding: ${({ theme }) => `${theme.spacing[0.5]} ${theme.spacing[2]}`};
  border-radius: ${({ theme }) => theme.radii.lg};
  ${({ theme, $plan }) => {
    if ($plan === 'pro') return `background: color-mix(in srgb, ${theme.color.accent} 15%, transparent); color: ${theme.color.accent};`
    if ($plan === 'household') return `background: color-mix(in srgb, ${theme.color.primary} 15%, transparent); color: ${theme.color.primary};`
    return `background: ${theme.color.muted}; color: ${theme.color.mutedForeground};`
  }}
`

const AdminBadge = styled.span`
  display: inline-flex;
  align-items: center;
  gap: ${({ theme }) => `${theme.spacing[0.5]}`};
  font-size: ${({ theme }) => theme.typography.fontSize.xs};
  font-weight: 700;
  color: ${({ theme }) => theme.color.primaryForeground};
  background: ${({ theme }) => theme.color.primary};
  padding: ${({ theme }) => `${theme.spacing[0.5]} ${theme.spacing[1.5]}`};
  border-radius: ${({ theme }) => theme.radii.lg};
  letter-spacing: 0.05em;
`

const PLANS = ['free', 'pro', 'household'] as const

function PlanSelect({ user, onDone }: { user: AdminUser; onDone: () => void }) {
  const qc = useQueryClient()
  const [plan, setPlan] = useState(user.plan)
  const [status, setStatus] = useState(user.plan_status)
  const [open, setOpen] = useState(false)

  const mut = useMutation({
    mutationFn: () => adminApi.overridePlan(user.id, plan, status),
    onSuccess: () => {
      toast.success(`${user.email} → ${plan} (${status})`)
      qc.invalidateQueries({ queryKey: ['admin'] })
      setOpen(false)
      onDone()
    },
    onError: () => toast.error('Failed to update plan'),
  })

  if (!open) {
    return (
      <PlanBadge $plan={user.plan} onClick={() => setOpen(true)} style={{ cursor: 'pointer' }} title="Click to change plan">
        {user.plan === 'pro' && <Crown size={10} />}
        {user.plan}
      </PlanBadge>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6, minWidth: 160 }}>
      <div style={{ display: 'flex', gap: 4 }}>
        <Select
          value={plan}
          onChange={(val) => setPlan(String(val))}
          options={PLANS.map(p => ({ value: p, label: p }))}
          placeholder="Plan"
        />
        <Select
          value={status}
          onChange={(val) => setStatus(String(val))}
          options={['active', 'trialing', 'past_due', 'canceled'].map(s => ({ value: s, label: s }))}
          placeholder="Status"
        />
      </div>
      <div style={{ display: 'flex', gap: 4 }}>
        <Button size="sm" variant="primary" onClick={() => mut.mutate()} disabled={mut.isPending} style={{ flex: 1 }}>
          {mut.isPending ? '…' : 'Save'}
        </Button>
        <Button size="sm" variant="ghost" onClick={() => setOpen(false)}>✕</Button>
      </div>
    </div>
  )
}

function UserRow({ user, currentAdminId }: { user: AdminUser; currentAdminId: string }) {
  const qc = useQueryClient()

  const toggleAdmin = useMutation({
    mutationFn: () => adminApi.toggleAdmin(user.id, !user.is_admin),
    onSuccess: () => {
      toast.success(`${user.email} admin → ${!user.is_admin}`)
      qc.invalidateQueries({ queryKey: ['admin'] })
    },
    onError: () => toast.error('Failed to update admin status'),
  })

  const deleteUser = useMutation({
    mutationFn: () => adminApi.deleteUser(user.id),
    onSuccess: () => {
      toast.success(`${user.email} deleted`)
      qc.invalidateQueries({ queryKey: ['admin'] })
    },
    onError: () => toast.error('Failed to delete user'),
  })

  const isSelf = user.id === currentAdminId

  return (
    <TRow>
      <UserInfo>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <UserName>{user.name}</UserName>
          {user.is_admin && <AdminBadge><Shield size={8} /> ADMIN</AdminBadge>}
        </div>
        <UserEmail>{user.email}</UserEmail>
      </UserInfo>

      <PlanSelect user={user} onDone={() => {}} />

      <div style={{ fontSize: 11, color: 'var(--muted-foreground)' }}>
        {user.created_at ? new Date(user.created_at).toLocaleDateString() : '—'}
      </div>

      <div>
        {!isSelf && (
          <Button
            size="sm"
            variant={user.is_admin ? 'outline' : 'ghost'}
            onClick={() => toggleAdmin.mutate()}
            disabled={toggleAdmin.isPending}
            title={user.is_admin ? 'Revoke admin' : 'Grant admin'}
            style={{ fontSize: 11 }}
          >
            <Shield size={12} style={{ marginRight: 2 }} />
            {user.is_admin ? 'Revoke' : 'Grant'}
          </Button>
        )}
      </div>

      <div>
        {!isSelf && (
          <Button
            size="sm"
            variant="ghost"
            onClick={() => {
              if (confirm(`Permanently delete ${user.email}?`)) deleteUser.mutate()
            }}
            disabled={deleteUser.isPending}
            style={{ color: 'var(--destructive)' }}
            title="Delete user"
          >
            <Trash2 size={14} />
          </Button>
        )}
      </div>
    </TRow>
  )
}

const PAGE_SIZE = 20

function UsersTable({ currentAdminId }: { currentAdminId: string }) {
  const [search, setSearch] = useState('')
  const [offset, setOffset] = useState(0)
  const qc = useQueryClient()

  const { data, isLoading } = useQuery({
    queryKey: ['admin', 'users', search, offset],
    queryFn: () => adminApi.listUsers({ search, limit: PAGE_SIZE, offset }),
    staleTime: 10_000,
    placeholderData: prev => prev,
  })

  const total = data?.total ?? 0
  const page = Math.floor(offset / PAGE_SIZE) + 1
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE))

  return (
    <GlassCard
      variant="glass"
      title="Users"
      subtitle={`${total} total`}
      icon={<Users size={16} />}
      action={
        <Button size="sm" variant="ghost" onClick={() => qc.invalidateQueries({ queryKey: ['admin', 'users'] })}>
          <RefreshCw size={12} />
        </Button>
      }
      noPadding
      fadeIn="up"
      delay={100}
    >
      <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)' }}>
        <SearchBar>
          <Search size={14} style={{ color: 'var(--muted-foreground)', flexShrink: 0 }} />
          <SearchInput
            value={search}
            onChange={e => { setSearch(e.target.value); setOffset(0) }}
            placeholder="Search by name or email…"
          />
        </SearchBar>
      </div>

      <Table>
        <THead>
          <TH>User</TH>
          <TH>Plan</TH>
          <TH>Joined</TH>
          <TH>Admin</TH>
          <TH>Delete</TH>
        </THead>

        {isLoading ? (
          /* Load into the row's own 5-column geometry, not a single bar in the
             first column — otherwise the table visibly re-lays out on arrival. */
          [...Array(5)].map((_, i) => (
            <TRow key={i}>
              <Skeleton height={14} width="62%" />
              <Skeleton height={14} width="70%" />
              <Skeleton height={14} width="80%" />
              <Skeleton height={14} width={32} />
              <Skeleton height={14} width={24} />
            </TRow>
          ))
        ) : !data?.users.length ? (
          <div style={{ padding: '32px 16px', textAlign: 'center', fontSize: 13, color: 'var(--muted-foreground)' }}>
            {search ? 'No users match your search.' : 'No users yet.'}
          </div>
        ) : (
          data.users.map(u => (
            <UserRow key={u.id} user={u} currentAdminId={currentAdminId} />
          ))
        )}
      </Table>

      {total > PAGE_SIZE && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', borderTop: '1px solid var(--border)' }}>
          <span style={{ fontSize: 12, color: 'var(--muted-foreground)' }}>
            Page {page} of {pages} · {total} users
          </span>
          <div style={{ display: 'flex', gap: 4 }}>
            <Button size="sm" variant="ghost" disabled={offset === 0} onClick={() => setOffset(Math.max(0, offset - PAGE_SIZE))}>
              <ChevronLeft size={14} />
            </Button>
            <Button size="sm" variant="ghost" disabled={offset + PAGE_SIZE >= total} onClick={() => setOffset(offset + PAGE_SIZE)}>
              <ChevronRight size={14} />
            </Button>
          </div>
        </div>
      )}
    </GlassCard>
  )
}

// ── Page ─────────────────────────────────────────────────────────────────────

/**
 * Admin → Overview.
 *
 * Phase 4 conversion to the canvas's `admin:overview` composition —
 * tiles(12) · bars(7) · progress(5) · table(12) — from the admin stats and
 * user endpoints. The interactive users table stays below it: that is where
 * plan overrides, the admin flag and deletion live, and none of it fits a
 * read-only module.
 *
 * THREE DEPARTURES. The canvas draws an instance-health console — requests per
 * hour, CPU and memory, background job runs — and none of that is exposed. The
 * backend publishes user and subscription state, so the modules answer the
 * question this page can actually answer, "who is on this instance and what are
 * they on":
 *  - bars     → signups per month, from user `created_at`.
 *  - progress → the plan mix as shares of the user base.
 *  - table    → the most recent signups.
 *
 * BACKEND FOLLOW-UP: a metrics endpoint (request counts, worker runs, resource
 * usage) would let this render the canvas exactly.
 */
function AdminModules() {
  const { data: stats } = useQuery({
    queryKey: ['admin', 'stats'],
    queryFn: adminApi.stats,
    staleTime: 30_000,
  })
  // A wide page of users so the signup history and recent list are real.
  const { data: recent } = useQuery({
    queryKey: ['admin', 'users', 'recent'],
    queryFn: () => adminApi.listUsers({ limit: 100 }),
    staleTime: 30_000,
  })

  const modules = useMemo<ModuleSpec[]>(() => {
    if (!stats) return []

    const users = recent?.users ?? []
    const paid = stats.pro_users + stats.household_users
    const admins = users.filter(u => u.is_admin).length

    // Signups per month over the last six months.
    const months = Array.from({ length: 6 }, (_, i) => dayjs().subtract(5 - i, 'month'))
    const signupsIn = (m: dayjs.Dayjs) =>
      users.filter(u => u.created_at && dayjs(u.created_at).isSame(m, 'month')).length

    const byRecency = [...users]
      .filter(u => !!u.created_at)
      .sort((a, b) => (b.created_at ?? '').localeCompare(a.created_at ?? ''))
      .slice(0, 8)

    const share = (n: number) => (stats.total_users > 0 ? Math.round((n / stats.total_users) * 100) : 0)

    return [
      {
        kind: 'tiles',
        span: 12,
        tiles: [
          { label: 'Total users', value: String(stats.total_users), sub: `${users.length} loaded` },
          {
            label: 'Paying',
            value: String(paid),
            sub: `${share(paid)}% of the base`,
            subKey: 'success',
            bar: share(paid),
            barKey: 'success',
          },
          { label: 'Free', value: String(stats.free_users), sub: `${share(stats.free_users)}% of the base` },
          {
            label: 'Administrators',
            value: String(admins),
            sub: admins > 1 ? 'More than one full-access account' : 'Full instance access',
            dotKey: admins > 1 ? 'warning' : undefined,
          },
        ],
      },
      {
        kind: 'bars',
        span: 7,
        title: 'Signups per month',
        subtitle: 'Last six months',
        icon: BarChart3,
        bars: months.map((m) => {
          const v = signupsIn(m)
          return {
            label: m.format('MMM'),
            v,
            t: v > 0 ? String(v) : '',
            colorKey: v > 0 ? 'accent' : 'muted',
            dim: v === 0,
          }
        }),
      },
      {
        kind: 'progress',
        span: 5,
        title: 'Plan mix',
        subtitle: 'Share of the user base',
        icon: Cpu,
        rows: [
          { title: 'Free', meta: `${stats.free_users} user(s)`, pct: share(stats.free_users), value: `${share(stats.free_users)}%`, colorKey: 'mutedFg' },
          { title: 'Pro', meta: `${stats.pro_users} user(s)`, pct: share(stats.pro_users), value: `${share(stats.pro_users)}%`, colorKey: 'accent' },
          { title: 'Household', meta: `${stats.household_users} user(s)`, pct: share(stats.household_users), value: `${share(stats.household_users)}%`, colorKey: 'success' },
        ],
      },
      {
        kind: 'table',
        span: 12,
        title: 'Recent signups',
        subtitle: 'Newest first',
        icon: Cpu,
        gridCols: '1.6fr 1.2fr 1fr 0.9fr',
        cols: [{ l: 'User' }, { l: 'Joined' }, { l: 'Provider' }, { l: 'Plan', a: 'right' }],
        rows: byRecency.map(u => [
          { t: u.name || u.email, bold: true },
          dayjs(u.created_at!).format('D MMM YYYY'),
          u.auth_provider,
          { t: u.plan, tag: true, colorKey: u.plan === 'free' ? 'mutedFg' : 'success' },
        ]),
      },
    ]
  }, [stats, recent])

  return <ModuleGrid modules={modules} />
}

export function AdminPage() {
  const user = useAuthStore(s => s.user)

  return (
    <PageContainer>
      <PageContent>
        <AdminModules />
        <UsersTable currentAdminId={user?.id ?? ''} />
      </PageContent>
    </PageContainer>
  )
}
