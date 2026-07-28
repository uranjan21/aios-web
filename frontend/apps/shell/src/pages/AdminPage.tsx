import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Shield, Users, Search, ChevronLeft, ChevronRight, Trash2, Crown, RefreshCw } from 'lucide-react'
import { toast } from 'sonner'
import styled, { useTheme } from 'styled-components'
import { PageHeader, Card as GlassCard, Select, Button } from '@ledgr/ui'
import { Skeleton } from '@ct/shared/components/ui/skeleton'
import { adminApi, AdminUser } from '@ct/shared/api/admin'
import { useAuthStore } from '@ct/shared/stores/authStore'
import { PageContainer, PageContent } from '@ct/shared/components/layout/PageLayout'
import { PageDivider } from '@ct/shared/components/layout/PageDivider'

// ── Stat cards ───────────────────────────────────────────────────────────────

const StatsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: ${({ theme }) => `${theme.spacing[4]}`};
  @media ${({ theme }) => theme.media.belowLg} { grid-template-columns: repeat(2, 1fr); }
  @media ${({ theme }) => theme.media.belowXs} { grid-template-columns: 1fr; }
`

const StatCard = styled.div`
  background: ${({ theme }) => theme.color.card};
  border: 1px solid ${({ theme }) => theme.color.border};
  border-radius: ${({ theme }) => theme.radii.md};
  padding: ${({ theme }) => `${theme.spacing[5]}`};
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => `${theme.spacing[1]}`};
`

const StatValue = styled.div`
  font-family: ${({ theme }) => theme.typography.fontFamily.display};
  font-size: ${({ theme }) => theme.typography.fontSize['3xl']};
  font-weight: 700;
  color: ${({ theme }) => theme.color.foreground};
`

const StatLabel = styled.div`
  font-size: ${({ theme }) => theme.typography.fontSize.sm};
  color: ${({ theme }) => theme.color.mutedForeground};
  font-weight: 500;
  text-transform: uppercase;
  letter-spacing: 0.04em;
`

function StatsSection() {
  const theme = useTheme()
  const { data, isLoading } = useQuery({
    queryKey: ['admin', 'stats'],
    queryFn: adminApi.stats,
    staleTime: 30_000,
  })

  if (isLoading) return (
    <StatsGrid>
      {[...Array(4)].map((_, i) => (
        <StatCard key={i}>
          <Skeleton style={{ height: 32, width: 64 }} />
          <Skeleton style={{ height: 12, width: 80, marginTop: 4 }} />
        </StatCard>
      ))}
    </StatsGrid>
  )

  if (!data) return null

  return (
    <StatsGrid>
      <StatCard><StatValue>{data.total_users}</StatValue><StatLabel>Total Users</StatLabel></StatCard>
      <StatCard><StatValue>{data.free_users}</StatValue><StatLabel>Free</StatLabel></StatCard>
      <StatCard><StatValue style={{ color: theme.color.accent }}>{data.pro_users}</StatValue><StatLabel>Pro</StatLabel></StatCard>
      <StatCard><StatValue>{data.household_users}</StatValue><StatLabel>Household</StatLabel></StatCard>
    </StatsGrid>
  )
}

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

const Table = styled.div`
  width: 100%;
  overflow-x: auto;
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
          [...Array(5)].map((_, i) => (
            <div key={i} style={{ padding: '14px 16px', borderBottom: '1px solid var(--border)40' }}>
              <Skeleton style={{ height: 14, width: '60%' }} />
            </div>
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

export function AdminPage() {
  const user = useAuthStore(s => s.user)

  return (
    <PageContainer>
      <PageContent>
        <PageHeader
          title="Admin Panel"
          subtitle="User management, plan overrides, and system overview."
          icon={<Shield />}
          eyebrow="Admin"
        />
        <PageDivider />
        <StatsSection />
        <UsersTable currentAdminId={user?.id ?? ''} />
      </PageContent>
    </PageContainer>
  )
}
