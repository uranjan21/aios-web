import { useEffect, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { Sun, Moon, CheckCircle, XCircle, AlertCircle, LogOut, RefreshCw, Bell, BellOff, Settings, Palette, Activity, Sparkles, Keyboard, User, CreditCard } from 'lucide-react'
import { toast } from 'sonner'
import { api } from '@/api/client'
import { chatApi } from '@/api/chat'
import { useAuthStore } from '@/stores/authStore'
import { useUIStore } from '@/stores/uiStore'
import { useVaultSync } from '@/hooks/useVaultSync'
import { Skeleton } from '@/components/ui/skeleton'
import { ProgressBar } from '@/components/lumina';
import { Card as GlassCard, PageHeader, Select } from '@ledgr/ui';
import { Button } from '@/components/ui/button'
import styled, { useTheme } from 'styled-components'

// ── Layout ─────────────────────────────────────────────────────────────────────

const PageRoot = styled.div`
  min-height: 100vh;
  background: ${({ theme }) => theme.color.background};
  padding: 16px;
  @media (min-width: 768px) { padding: 24px; }
`

const PageContent = styled.div`
  margin: 0 auto;
  max-width: 680px;
  display: flex;
  flex-direction: column;
  gap: 24px;
`

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
  const { state, lastSynced } = useVaultSync()
  const stateLabel = {
    synced: 'Synced', syncing: 'Syncing…', conflict: 'Conflict',
    error: 'Sync error', disconnected: 'Disconnected',
  }[state] ?? state

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

// ── Page ──────────────────────────────────────────────────────────────────────

export function SettingsPage() {
  const queryClient = useQueryClient()
  const logout = useAuthStore(s => s.logout)
  const navigate = useNavigate()
  const { theme, setTheme } = useUIStore()

  const [aiRange, setAiRange] = useState('daily')
  const [shortcutCategory, setShortcutCategory] = useState('all')

  const handleLogout = async () => {
    try { await api.post('/auth/logout') } catch (e) { console.error('Logout failed:', e) }
    finally { logout(); navigate('/login') }
  }

  return (
    <PageRoot>
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

        <Section
          title="Billing"
          delay={300}
          action={
            <Button size="sm" onClick={() => navigate('/pricing')}>
              Upgrade Plan
            </Button>
          }
        >
          <Row label="Current Plan"><span style={{ fontSize: 13, color: 'var(--foreground)', fontWeight: 500 }}>Starter (Free)</span></Row>
          <Row label="Next Billing Date"><span style={{ fontSize: 12, color: 'var(--muted-foreground)' }}>N/A</span></Row>
        </Section>

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
            Logged in as personal administrator. All config files and data are stored locally in your vault.
          </div>
        </GlassCard>
      </PageContent>
    </PageRoot>
  )
}
