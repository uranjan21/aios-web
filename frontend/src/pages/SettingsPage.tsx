import { useEffect, useRef, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useNavigate, Link } from 'react-router-dom'
import { Sun, Moon, CheckCircle, XCircle, AlertCircle, LogOut, RefreshCw, Bell, BellOff, Settings, Palette, Activity, Sparkles, Keyboard, User, CreditCard, Save, Lock, Trash2, Shield } from 'lucide-react'
import { toast } from 'sonner'
import { api } from '@/api/client'
import { chatApi } from '@/api/chat'
import { billingApi } from '@/api/billing'
import { useAuthStore } from '@/stores/authStore'
import { useUIStore } from '@/stores/uiStore'
import { useVaultSync } from '@/hooks/useVaultSync'
import { useFeatures } from '@/hooks/useFeatures'
import { Skeleton } from '@/components/ui/skeleton'
import { ProgressBar } from '@/components/lumina';
import { Card as GlassCard, PageHeader, Select } from '@ledgr/ui';
import { Button } from '@/components/ui/button'
import styled, { useTheme } from 'styled-components'
import { PageContainer, PageContent } from '@/components/layout/PageLayout'

// ── Row ───────────────────────────────────────────────────────────────────────

const RowRoot = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 14px 20px;
`

const RowLabel = styled.span`
  font-size: 13px;
  font-weight: 500;
  color: ${({ theme }) => theme.color.foreground};
`

const RowActions = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
`

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <RowRoot>
      <RowLabel>{label}</RowLabel>
      <RowActions>{children}</RowActions>
    </RowRoot>
  )
}

const SECTION_META: Record<string, { icon: React.ReactNode; subtitle: string }> = {
  Appearance: { icon: <Palette size={16} />, subtitle: 'Theme, density, and visual preferences' },
  'System Status': { icon: <Activity size={16} />, subtitle: 'Live state of backend, sync, and integrations' },
  'AI Usage': { icon: <Sparkles size={16} />, subtitle: 'Token spend and model usage this period' },
  'Keyboard Shortcuts': { icon: <Keyboard size={16} />, subtitle: 'Quick reference for in-app shortcuts' },
  Billing: { icon: <CreditCard size={16} />, subtitle: 'Manage subscription and billing' },
  Profile: { icon: <User size={16} />, subtitle: 'Your name and avatar' },
  Security: { icon: <Lock size={16} />, subtitle: 'Change your password' },
  Account: { icon: <User size={16} />, subtitle: 'Sign-out and account-level controls' },
}

function Section({ title, children, delay, action }: { title: string; children: React.ReactNode; delay?: 0 | 100 | 200 | 300; action?: React.ReactNode }) {
  const meta = SECTION_META[title]
  return (
    <GlassCard
      variant="glass"
      title={title}
      subtitle={meta?.subtitle}
      icon={meta?.icon}
      action={action}
      noPadding
      fadeIn="up"
      delay={delay}
    >
      {children}
    </GlassCard>
  )
}

// ── Theme toggle ──────────────────────────────────────────────────────────────

const ThemeSwitcher = styled.div`
  display: flex;
  align-items: center;
  gap: 4px;
  background: ${({ theme }) => theme.color.muted};
  border-radius: 8px;
  padding: 4px;
`

const ThemeBtn = styled.button<{ $active: boolean }>`
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  padding: 6px 10px;
  border-radius: 6px;
  border: 1px solid transparent;
  cursor: pointer;
  transition: all 120ms;
  ${({ theme, $active }) => $active ? `
    background: ${theme.color.card};
    color: ${theme.color.foreground};
    border-color: ${theme.color.border}80;
    box-shadow: ${theme.shadow.xs};
  ` : `
    background: transparent;
    color: ${theme.color.mutedForeground};
    &:hover { color: ${theme.color.foreground}; }
  `}
  &:focus-visible { outline: 2px solid ${({ theme }) => theme.color.ring}; outline-offset: 2px; }
`

// ── Kbd ───────────────────────────────────────────────────────────────────────

const KbdEl = styled.kbd`
  font-size: 12px;
  background: ${({ theme }) => theme.color.muted};
  border: 1px solid ${({ theme }) => theme.color.border};
  border-radius: 4px;
  padding: 2px 8px;
  font-family: ${({ theme }) => theme.typography.fontFamily.mono ?? 'ui-monospace, monospace'};
`

// ── Backend status ────────────────────────────────────────────────────────────

const StatusText = styled.span<{ $variant: 'success' | 'warning' }>`
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  font-weight: 500;
  color: ${({ theme, $variant }) => $variant === 'success' ? theme.color.success : theme.color.warning};
`

const RetryBtn = styled.button`
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  color: ${({ theme }) => theme.color.mutedForeground};
  background: none;
  border: none;
  cursor: pointer;
  border-radius: 4px;
  transition: color 120ms ease-in-out;
  &:hover { color: ${({ theme }) => theme.color.foreground}; }
  &:focus-visible { outline: 2px solid ${({ theme }) => theme.color.ring}; outline-offset: 2px; }
`

function BackendStatus() {
  const theme = useTheme()
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['health'],
    queryFn: () => api.get<{ status: string; db: boolean }>('/health').then(r => r.data),
    refetchInterval: 30_000,
  })

  if (isLoading) return <SkelStatus />
  if (isError || !data) return (
    <RetryBtn onClick={() => refetch()}>
      <XCircle size={16} style={{ color: theme.color.mutedForeground }} />
      <span style={{ color: theme.color.mutedForeground }}>Offline</span>
      <RefreshCw size={12} />
    </RetryBtn>
  )

  const ok = data.status === 'ok' && data.db !== false
  return (
    <StatusText $variant={ok ? 'success' : 'warning'}>
      {ok ? <CheckCircle size={16} /> : <AlertCircle size={16} />}
      {ok ? 'Online' : 'DB unreachable'}
    </StatusText>
  )
}

// ── Token gauge ───────────────────────────────────────────────────────────────

const GaugeWrap = styled.div`
  padding: 14px 20px;
  display: flex;
  flex-direction: column;
  gap: 8px;
`

const GaugeMeta = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size: 14px;
`

const GaugeNote = styled.p`
  font-size: 12px;
  color: ${({ theme }) => theme.color.mutedForeground};
  margin: 0;
`

// ── Styled Skeletons ──────────────────────────────────────────────────────────

const SkelStatus = styled(Skeleton)`
  height: 1.25rem;
  width: 5rem;
`

const SkelGaugeTitle = styled(Skeleton)`
  height: 0.75rem;
  width: 10rem;
`

const SkelGaugeBar = styled(Skeleton)`
  height: 0.5rem;
  width: 100%;
`

function TokenGauge() {
  const theme = useTheme()
  const { data, isLoading } = useQuery({
    queryKey: ['token-budget'],
    queryFn: chatApi.tokenBudget,
    refetchInterval: 60_000,
  })

  if (isLoading) return (
    <GaugeWrap>
      <SkelGaugeTitle />
      <SkelGaugeBar />
    </GaugeWrap>
  )
  if (!data) return null

  const pct = data.percent
  const barColor = pct >= 90 ? theme.color.mutedForeground : pct >= 70 ? theme.color.accent : theme.color.primary
  const metaColor = pct >= 90 ? theme.color.mutedForeground : pct >= 70 ? theme.color.accent : undefined

  const resetH = Math.floor(data.reset_in_seconds / 3600)
  const resetM = Math.floor((data.reset_in_seconds % 3600) / 60)

  return (
    <GaugeWrap>
      <GaugeMeta>
        <span style={{ color: theme.color.foreground }}>Claude Token Budget</span>
        <span style={{ fontSize: 12, fontWeight: 500, fontVariantNumeric: 'tabular-nums', color: metaColor ?? theme.color.mutedForeground }}>
          {data.used_today.toLocaleString()} / {data.daily_limit.toLocaleString()}
        </span>
      </GaugeMeta>
      <ProgressBar value={pct} color={barColor} glow={pct >= 90} size="sm" />
      <GaugeNote>
        {pct.toFixed(1)}% used · resets in {resetH}h {resetM}m
        {pct >= 80 && <span style={{ color: theme.color.accent, marginLeft: 4 }}>· approaching limit</span>}
      </GaugeNote>
    </GaugeWrap>
  )
}

// ── Push notifications ────────────────────────────────────────────────────────

const PushBtn = styled.button<{ $active: boolean; $busy: boolean }>`
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  padding: 6px 10px;
  border-radius: 6px;
  cursor: pointer;
  transition: all 120ms;
  opacity: ${({ $busy }) => $busy ? 0.6 : 1};
  ${({ theme, $active }) => $active ? `
    border: 1px solid ${theme.color.accent};
    background: color-mix(in srgb, ${theme.color.accent} 10%, transparent);
    color: ${theme.color.accent};
  ` : `
    border: 1px solid ${theme.color.border};
    background: transparent;
    color: ${theme.color.mutedForeground};
    &:hover { color: ${theme.color.foreground}; }
  `}
  &:focus-visible { outline: 2px solid ${({ theme }) => theme.color.ring}; outline-offset: 2px; }
`

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const raw = window.atob(base64)
  return Uint8Array.from([...raw].map(c => c.charCodeAt(0)))
}

function PushNotificationsRow() {
  const supported = 'serviceWorker' in navigator && 'PushManager' in window
  const [enabled, setEnabled] = useState(false)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (!supported) return
    navigator.serviceWorker.getRegistration()
      .then(reg => reg?.pushManager.getSubscription())
      .then(sub => setEnabled(!!sub))
      .catch(() => {})
  }, [supported])

  const toggle = async () => {
    if (!supported || busy) return
    setBusy(true)
    try {
      if (enabled) {
        const reg = await navigator.serviceWorker.getRegistration()
        const sub = await reg?.pushManager.getSubscription()
        if (sub) {
          await api.post('/push/unsubscribe', { endpoint: sub.endpoint })
          await sub.unsubscribe()
        }
        setEnabled(false)
        toast.success('Push notifications disabled')
      } else {
        const perm = await Notification.requestPermission()
        if (perm !== 'granted') { toast.error('Notification permission denied by browser'); return }
        const reg = await navigator.serviceWorker.register('/sw.js')
        const { data } = await api.get<{ public_key: string }>('/push/public-key')
        const sub = await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(data.public_key) as BufferSource,
        })
        await api.post('/push/subscribe', sub.toJSON())
        setEnabled(true)
        toast.success('Push notifications enabled')
      }
    } catch (e) {
      console.error('Push toggle failed:', e)
      toast.error('Failed to update push notifications')
    } finally {
      setBusy(false)
    }
  }

  return (
    <Row label="Push Notifications">
      {!supported ? (
        <span style={{ fontSize: 12, color: 'var(--muted-foreground)' }}>Not supported in this browser</span>
      ) : (
        <PushBtn onClick={toggle} disabled={busy} aria-pressed={enabled} $active={enabled} $busy={busy}>
          {enabled ? <Bell size={14} /> : <BellOff size={14} />}
          {enabled ? 'Enabled' : 'Disabled'}
        </PushBtn>
      )}
    </Row>
  )
}

// ── Vault sync row ────────────────────────────────────────────────────────────

const SyncStatusText = styled.span<{ $state: string }>`
  font-size: 12px;
  font-weight: 500;
  color: ${({ theme, $state }) => {
    switch ($state) {
      case 'synced':
        return theme.color.success
      case 'syncing':
        return theme.color.accent
      case 'conflict':
        return theme.color.warning
      case 'error':
        return theme.color.destructive
      case 'disconnected':
      default:
        return theme.color.mutedForeground
    }
  }};
`

function VaultSyncRow() {
  const { vault_sync: vaultSyncEnabled } = useFeatures()
  const { state, lastSynced } = useVaultSync()
  const stateLabel = {
    synced: 'Synced', syncing: 'Syncing…', conflict: 'Conflict',
    error: 'Sync error', disconnected: 'Disconnected',
  }[state] ?? state

  // Vault sync is a self-host-only feature; hidden in hosted SaaS mode.
  if (!vaultSyncEnabled) return null

  return (
    <Row label="Vault Sync">
      <SyncStatusText $state={state}>
        {stateLabel}
      </SyncStatusText>
      {lastSynced && (
        <span style={{ fontSize: 12, color: 'var(--muted-foreground)' }}>
          {new Date(lastSynced).toLocaleTimeString()}
        </span>
      )}
    </Row>
  )
}

// ── Shared form input ─────────────────────────────────────────────────────────

const FormInput = styled.input`
  font-size: 13px;
  padding: 7px 10px;
  border-radius: 6px;
  border: 1px solid ${({ theme }) => theme.color.border};
  background: ${({ theme }) => theme.color.background};
  color: ${({ theme }) => theme.color.foreground};
  outline: none;
  min-width: 200px;
  transition: border-color 120ms;
  &:focus { border-color: ${({ theme }) => theme.color.accent}; }
  &::placeholder { color: ${({ theme }) => theme.color.mutedForeground}; }
`

// ── Profile section ──────────────────────────────────────────────────────────

function ProfileSection() {
  const { user, setUser } = useAuthStore()
  const [name, setName] = useState(user?.name ?? '')
  const [busy, setBusy] = useState(false)

  // Keep local state in sync if user changes externally
  const prevName = useRef(user?.name ?? '')
  useEffect(() => {
    if (user?.name && user.name !== prevName.current) {
      setName(user.name)
      prevName.current = user.name
    }
  }, [user?.name])

  const save = async () => {
    if (!name.trim()) return
    setBusy(true)
    try {
      const { data } = await api.patch('/auth/profile', { name: name.trim() })
      setUser(data)
      toast.success('Profile updated')
    } catch {
      toast.error('Failed to update profile')
    } finally {
      setBusy(false)
    }
  }

  const dirty = name.trim() !== (user?.name ?? '')

  return (
    <Section title="Profile" delay={300}>
      <Row label="Display name">
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <FormInput
            value={name}
            onChange={e => setName(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && dirty && save()}
            placeholder="Your name"
            maxLength={80}
          />
          {dirty && (
            <Button size="sm" variant="primary" onClick={save} disabled={busy}>
              <Save size={12} style={{ marginRight: 4 }} /> Save
            </Button>
          )}
        </div>
      </Row>
      <Row label="Email">
        <span style={{ fontSize: 13, color: 'var(--muted-foreground)' }}>{user?.email ?? '—'}</span>
      </Row>
      <Row label="Sign-in method">
        <span style={{ fontSize: 13, color: 'var(--muted-foreground)', textTransform: 'capitalize' }}>
          {user?.auth_provider ?? '—'}
        </span>
      </Row>
    </Section>
  )
}

// ── Security / change password ────────────────────────────────────────────────

function SecuritySection() {
  const { user, logout } = useAuthStore()
  const navigate = useNavigate()
  const [current, setCurrent] = useState('')
  const [next, setNext] = useState('')
  const [busy, setBusy] = useState(false)

  // Only email-auth users can change password; Google users have no local password.
  if (user?.auth_provider !== 'email') return null

  const submit = async () => {
    if (!current || next.length < 8) return
    setBusy(true)
    try {
      await api.post('/auth/change-password', { current, new: next })
      toast.success('Password changed — please log in again')
      setCurrent('')
      setNext('')
      // Backend re-issues the cookie but the logout flow is safer UX
      setTimeout(() => { logout(); navigate('/login') }, 1500)
    } catch (e: unknown) {
      const msg = (e as { response?: { data?: { detail?: string } } })?.response?.data?.detail
      toast.error(msg ?? 'Failed to change password')
    } finally {
      setBusy(false)
    }
  }

  return (
    <Section title="Security" delay={300}>
      <Row label="Current password">
        <FormInput
          type="password"
          value={current}
          onChange={e => setCurrent(e.target.value)}
          placeholder="Current password"
          autoComplete="current-password"
        />
      </Row>
      <Row label="New password">
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <FormInput
            type="password"
            value={next}
            onChange={e => setNext(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && submit()}
            placeholder="Min. 8 characters"
            autoComplete="new-password"
          />
          <Button
            size="sm"
            variant="primary"
            onClick={submit}
            disabled={busy || !current || next.length < 8}
          >
            <Lock size={12} style={{ marginRight: 4 }} /> Update
          </Button>
        </div>
      </Row>
    </Section>
  )
}

// ── Billing (M1) ────────────────────────────────────────────────────────────────

function BillingSection() {
  const { billing_enabled: billingEnabled } = useFeatures()
  const navigate = useNavigate()
  const [busy, setBusy] = useState(false)
  const { data, isLoading } = useQuery({
    queryKey: ['billing', 'subscription'],
    queryFn: () => billingApi.subscription(),
    enabled: billingEnabled,
    staleTime: 60_000,
  })
  const { data: usage } = useQuery({
    queryKey: ['billing', 'usage'],
    queryFn: () => billingApi.usage(),
    enabled: billingEnabled,
    staleTime: 60_000,
  })

  // Billing is a hosted feature; hidden entirely when Stripe isn't configured.
  if (!billingEnabled) return null

  const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1)
  const bundle = data?.bundle ?? false
  const modules = data?.modules ?? []
  const hasPaid = bundle || modules.length > 0
  const ownedLabel = bundle
    ? 'Everything · all modules'
    : modules.length
      ? modules.map(cap).join(', ')
      : 'Free tier'
  const statusSuffix = data?.status && data.status !== 'active' ? ` · ${data.status}` : ''

  const openPortal = async () => {
    setBusy(true)
    try {
      const { url } = await billingApi.portal()
      window.location.href = url
    } catch {
      toast.error('Could not open billing portal')
      setBusy(false)
    }
  }

  return (
    <Section title="Billing & modules" delay={300}>
      {data?.status === 'past_due' && (
        <Row label="⚠ Payment failed — access continues briefly while we retry">
          <Button size="sm" variant="primary" onClick={openPortal} disabled={busy}>
            <CreditCard size={14} style={{ marginRight: 4 }} /> Update card
          </Button>
        </Row>
      )}
      <Row label="Your modules">
        <span style={{ fontSize: 13, fontWeight: 600 }}>
          {isLoading ? '…' : `${ownedLabel}${statusSuffix}`}
        </span>
      </Row>
      <Row label="Pick the modules you pay for">
        <Button size="sm" variant="primary" onClick={() => navigate('/pricing')}>
          Manage modules
        </Button>
      </Row>
      {usage && (
        <Row label="AI usage this month">
          <span style={{ fontSize: 13, fontWeight: 600 }}>
            {usage.used} / {usage.included}
            {usage.overage > 0 && (
              <span style={{ fontWeight: 400, opacity: 0.75 }}>
                {usage.metered ? ` · +${usage.overage} billed` : ` · ${usage.overage} over cap`}
              </span>
            )}
          </span>
        </Row>
      )}
      {hasPaid && (
        <Row label="Payment method & invoices">
          <Button size="sm" variant="outline" onClick={openPortal} disabled={busy}>
            <CreditCard size={14} style={{ marginRight: 4 }} /> Manage billing
          </Button>
        </Row>
      )}
    </Section>
  )
}

// ── Danger zone / account deletion (GDPR right to erasure) ──────────────────────

function DangerZone() {
  const logout = useAuthStore(s => s.logout)
  const navigate = useNavigate()
  const [confirming, setConfirming] = useState(false)
  const [text, setText] = useState('')
  const [busy, setBusy] = useState(false)

  const deleteAccount = async () => {
    if (text !== 'DELETE') return
    setBusy(true)
    try {
      await api.delete('/auth/me')
      toast.success('Account deleted')
      logout()
      navigate('/')
    } catch (e: unknown) {
      const msg = (e as { response?: { data?: { detail?: string } } })?.response?.data?.detail
      toast.error(msg ?? 'Failed to delete account')
      setBusy(false)
    }
  }

  return (
    <div style={{ padding: '14px 20px', borderTop: '1px solid var(--border)' }}>
      <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--destructive, #b91c1c)', marginBottom: 6 }}>
        Delete account
      </div>
      <div style={{ fontSize: 12, color: 'var(--muted-foreground)', marginBottom: 10 }}>
        Permanently erase your account and all associated data. This cannot be undone.
      </div>
      {!confirming ? (
        <Button variant="destructive" size="sm" onClick={() => setConfirming(true)}>
          <Trash2 size={12} style={{ marginRight: 4 }} /> Delete my account
        </Button>
      ) : (
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
          <FormInput
            value={text}
            onChange={e => setText(e.target.value)}
            placeholder="Type DELETE to confirm"
            aria-label="Type DELETE to confirm account deletion"
          />
          <Button variant="destructive" size="sm" disabled={busy || text !== 'DELETE'} onClick={deleteAccount}>
            Confirm
          </Button>
          <Button variant="ghost" size="sm" disabled={busy} onClick={() => { setConfirming(false); setText('') }}>
            Cancel
          </Button>
        </div>
      )}
    </div>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────

export function SettingsPage() {
  const queryClient = useQueryClient()
  const logout = useAuthStore(s => s.logout)
  const user = useAuthStore(s => s.user)
  const navigate = useNavigate()
  const { theme, setTheme } = useUIStore()

  const [aiRange, setAiRange] = useState('daily')
  const [shortcutCategory, setShortcutCategory] = useState('all')

  const handleLogout = async () => {
    try { await api.post('/auth/logout') } catch (e) { console.error('Logout failed:', e) }
    finally { logout(); navigate('/login') }
  }

  // Returning from Stripe Checkout — confirm and refresh the subscription.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    if (params.get('billing') === 'success') {
      toast.success('Subscription active — welcome to Pro!')
      queryClient.invalidateQueries({ queryKey: ['billing', 'subscription'] })
      window.history.replaceState({}, '', window.location.pathname)
    }
  }, [queryClient])

  return (
    <PageContainer>
      <PageContent>
        <PageHeader title="Settings" subtitle="Preferences, integrations and account management." icon={<Settings />} eyebrow="SYSTEM" />

        <Section
          title="Appearance"
          action={
            <Button size="sm" variant="ghost" onClick={() => setTheme('light')}>
              Reset
            </Button>
          }
        >
          <Row label="Theme">
            <ThemeSwitcher>
              <ThemeBtn onClick={() => setTheme('dark')} aria-pressed={theme === 'dark'} aria-label="Dark mode" $active={theme === 'dark'}>
                <Moon size={14} /> Dark
              </ThemeBtn>
              <ThemeBtn onClick={() => setTheme('light')} aria-pressed={theme === 'light'} aria-label="Light mode" $active={theme === 'light'}>
                <Sun size={14} /> Light
              </ThemeBtn>
            </ThemeSwitcher>
          </Row>
        </Section>

        <Section
          title="System Status"
          delay={100}
          action={
            <Button
              size="sm"
              variant="ghost"
              onClick={() => {
                queryClient.invalidateQueries({ queryKey: ['health'] })
                toast.success('System status refreshed')
              }}
            >
              <RefreshCw size={12} style={{ marginRight: 4 }} /> Refresh
            </Button>
          }
        >
          <Row label="Backend"><BackendStatus /></Row>
          <VaultSyncRow />
          <PushNotificationsRow />
          <Row label="Rate limits">
            <span style={{ fontSize: 12, color: 'var(--muted-foreground)' }}>Chat 20/min · Agents 5/min · Auth 10/min</span>
          </Row>
        </Section>

        <Section
          title="AI Usage"
          delay={200}
          action={
            <Select
              size="sm"
              fullWidth={false}
              options={[
                { label: 'Daily', value: 'daily' },
                { label: 'Weekly', value: 'weekly' },
                { label: 'Monthly', value: 'monthly' },
              ]}
              value={aiRange}
              onChange={(val) => setAiRange(val as string)}
              aria-label="AI usage period"
            />
          }
        >
          <TokenGauge />
          <Row label="Model"><span style={{ fontSize: 12, color: 'var(--muted-foreground)' }}>claude-sonnet-4-5</span></Row>
          <Row label="Session limit"><span style={{ fontSize: 12, color: 'var(--muted-foreground)' }}>50,000 tokens</span></Row>
        </Section>

        <Section
          title="Keyboard Shortcuts"
          delay={300}
          action={
            <Select
              size="sm"
              fullWidth={false}
              options={[
                { label: 'All Keys', value: 'all' },
                { label: 'Navigation', value: 'nav' },
                { label: 'Actions', value: 'action' },
              ]}
              value={shortcutCategory}
              onChange={(val) => setShortcutCategory(val as string)}
              aria-label="Keyboard shortcut category"
            />
          }
        >
          {[
            ['⌘K', 'Command palette', 'action'], ['⌘L', 'Quick capture', 'action'], ['?', 'Command palette (alt)', 'action'],
            ['⌘⇧T', 'Toggle theme', 'action'], ['G then D', 'Go to Dashboard', 'nav'], ['G then C', 'Go to Chat', 'nav'],
            ['G then F', 'Go to Finance', 'nav'], ['G then H', 'Go to Health', 'nav'], ['G then R', 'Go to Career', 'nav'],
            ['G then B', 'Go to Business', 'nav'], ['G then N', 'Go to Content', 'nav'],
          ]
            .filter(([,, cat]) => shortcutCategory === 'all' || cat === shortcutCategory)
            .map(([key, label]) => (
              <Row key={key} label={label}>
                <KbdEl>{key}</KbdEl>
              </Row>
            ))
          }
        </Section>

        {user?.is_admin && (
          <GlassCard
            variant="glass"
            title="Admin Panel"
            subtitle="Manage users, plans, and system overview"
            icon={<Shield size={16} />}
            noPadding
            fadeIn="up"
            delay={300}
          >
            <div style={{ padding: '14px 20px' }}>
              <Link to="/app/admin">
                <Button size="sm" variant="primary">
                  <Shield size={12} style={{ marginRight: 4 }} /> Open Admin Panel
                </Button>
              </Link>
            </div>
          </GlassCard>
        )}

        <ProfileSection />

        <SecuritySection />

        <BillingSection />

        <GlassCard
          variant="glass"
          title="Account"
          subtitle="Sign-out and account-level controls"
          icon={<User size={16} />}
          action={
            <Button variant="destructive" size="sm" onClick={handleLogout}>
              <LogOut size={12} /> Sign out
            </Button>
          }
          fadeIn="up"
          delay={300}
        >
          <div style={{ padding: '14px 20px', fontSize: '12px', color: 'var(--muted-foreground)' }}>
            Signing out will invalidate your current session across all devices.
          </div>
          <DangerZone />
        </GlassCard>
      </PageContent>
    </PageContainer>
  )
}
