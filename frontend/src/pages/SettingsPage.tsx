import { useEffect, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { Sun, Moon, CheckCircle, XCircle, AlertCircle, LogOut, RefreshCw, Bell, BellOff } from 'lucide-react'
import { toast } from 'sonner'
import { api } from '@/api/client'
import { chatApi } from '@/api/chat'
import { useAuthStore } from '@/stores/authStore'
import { useUIStore } from '@/stores/uiStore'
import { useVaultSync } from '@/hooks/useVaultSync'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'
import { GlassCard, ProgressBar } from '@/components/lumina'

function Section({ title, children, delay }: { title: string; children: React.ReactNode; delay?: 0 | 100 | 200 | 300 }) {
  return (
    <GlassCard title={title} noPadding contentClassName="divide-y divide-border" fadeIn="up" delay={delay}>
      {children}
    </GlassCard>
  )
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4 px-5 py-3.5">
      <span className="text-[13px] font-medium text-foreground">{label}</span>
      <div className="flex items-center gap-2">{children}</div>
    </div>
  )
}

function BackendStatus() {
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['health'],
    queryFn: () => api.get<{ status: string; db: boolean }>('/health').then(r => r.data),
    refetchInterval: 30_000,
  })

  if (isLoading) return <Skeleton className="h-5 w-20" />
  if (isError || !data) return (
    <button onClick={() => refetch()} className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition">
      <XCircle className="w-4 h-4 text-destructive" aria-hidden="true" />
      <span className="text-destructive">Offline</span>
      <RefreshCw className="w-3 h-3" aria-hidden="true" />
    </button>
  )

  const ok = data.status === 'ok' && data.db !== false
  return (
    <span className={cn('flex items-center gap-1.5 text-xs font-medium', ok ? 'text-kpi-emerald' : 'text-kpi-amber')}>
      {ok
        ? <CheckCircle className="w-4 h-4" aria-hidden="true" />
        : <AlertCircle className="w-4 h-4" aria-hidden="true" />
      }
      {ok ? 'Online' : 'DB unreachable'}
    </span>
  )
}

function TokenGauge() {
  const { data, isLoading } = useQuery({
    queryKey: ['token-budget'],
    queryFn: chatApi.tokenBudget,
    refetchInterval: 60_000,
  })

  if (isLoading) return (
    <div className="px-5 py-3.5 space-y-2">
      <Skeleton className="h-3 w-40" />
      <Skeleton className="h-2 w-full rounded-full" />
    </div>
  )

  if (!data) return null

  const pct = data.percent
  const color = pct >= 90 ? 'bg-destructive' : pct >= 70 ? 'bg-kpi-amber' : 'bg-primary'
  const resetH = Math.floor(data.reset_in_seconds / 3600)
  const resetM = Math.floor((data.reset_in_seconds % 3600) / 60)

  return (
    <div className="px-5 py-3.5 space-y-2">
      <div className="flex items-center justify-between text-sm">
        <span className="text-foreground">Claude Token Budget</span>
        <span className={cn('text-xs font-mono font-medium tabular-nums', pct >= 90 ? 'text-destructive' : pct >= 70 ? 'text-kpi-amber' : 'text-muted-foreground')}>
          {data.used_today.toLocaleString()} / {data.daily_limit.toLocaleString()}
        </span>
      </div>
      <ProgressBar value={pct} colorClassName={color} glow={pct >= 90} size="sm" />
      <p className="text-xs text-muted-foreground">
        {pct.toFixed(1)}% used · resets in {resetH}h {resetM}m
        {pct >= 80 && <span className="text-kpi-amber ml-1">· approaching limit</span>}
      </p>
    </div>
  )
}

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
        if (perm !== 'granted') {
          toast.error('Notification permission denied by browser')
          return
        }
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
        <span className="text-xs text-muted-foreground">Not supported in this browser</span>
      ) : (
        <button
          onClick={toggle}
          disabled={busy}
          aria-pressed={enabled}
          className={cn(
            'flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-md border transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary',
            enabled
              ? 'border-primary/40 bg-primary/10 text-primary'
              : 'border-border text-muted-foreground hover:text-foreground',
            busy && 'opacity-60',
          )}
        >
          {enabled ? <Bell className="w-3.5 h-3.5" aria-hidden="true" /> : <BellOff className="w-3.5 h-3.5" aria-hidden="true" />}
          {enabled ? 'Enabled' : 'Disabled'}
        </button>
      )}
    </Row>
  )
}

function VaultSyncRow() {
  const { state, lastSynced, conflicts } = useVaultSync()
  const stateLabel = {
    synced: 'Synced',
    syncing: 'Syncing…',
    conflict: `${conflicts.length} conflict(s)`,
    error: 'Sync error',
    disconnected: 'Disconnected',
  }[state]

  const stateColor = {
    synced: 'text-kpi-emerald',
    syncing: 'text-primary',
    conflict: 'text-kpi-amber',
    error: 'text-destructive',
    disconnected: 'text-muted-foreground',
  }[state]

  return (
    <Row label="Vault Sync">
      <span className={cn('text-xs font-medium', stateColor)}>{stateLabel}</span>
      {lastSynced && <span className="text-xs text-muted-foreground">{new Date(lastSynced).toLocaleTimeString()}</span>}
    </Row>
  )
}

export function SettingsPage() {
  const logout = useAuthStore(s => s.logout)
  const navigate = useNavigate()
  const { theme, setTheme } = useUIStore()

  const handleLogout = async () => {
    try {
      await api.post('/auth/logout')
    } catch (e) {
      console.error("Logout failed:", e)
    } finally {
      logout()
      navigate('/login')
    }
  }

  return (
    <div className="min-h-screen bg-[hsl(var(--page-bg))] p-4 md:p-6">
    <div className="mx-auto max-w-[680px] space-y-6">
      <div>
        <p className="text-muted-foreground text-[13px] mt-0.5">Configure your AIOS instance</p>
      </div>

      {/* Appearance */}
      <Section title="Appearance">
        <Row label="Theme">
          <div className="flex items-center gap-1 bg-muted rounded-lg p-1">
            <button
              onClick={() => setTheme('dark')}
              aria-pressed={theme === 'dark'}
              aria-label="Dark mode"
              className={cn(
                'flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-md transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary',
                theme === 'dark' ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground',
              )}
            >
              <Moon className="w-3.5 h-3.5" aria-hidden="true" /> Dark
            </button>
            <button
              onClick={() => setTheme('light')}
              aria-pressed={theme === 'light'}
              aria-label="Light mode"
              className={cn(
                'flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-md transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary',
                theme === 'light' ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground',
              )}
            >
              <Sun className="w-3.5 h-3.5" aria-hidden="true" /> Light
            </button>
          </div>
        </Row>
      </Section>

      {/* System status */}
      <Section title="System Status" delay={100}>
        <Row label="Backend">
          <BackendStatus />
        </Row>
        <VaultSyncRow />
        <PushNotificationsRow />
        <Row label="Rate limits">
          <span className="text-xs text-muted-foreground">Chat 20/min · Agents 5/min · Auth 10/min</span>
        </Row>
      </Section>

      {/* AI Budget */}
      <Section title="AI Usage" delay={200}>
        <TokenGauge />
        <Row label="Model">
          <span className="text-xs font-mono text-muted-foreground">claude-sonnet-4-5</span>
        </Row>
        <Row label="Session limit">
          <span className="text-xs font-mono text-muted-foreground">50,000 tokens</span>
        </Row>
      </Section>

      {/* Keyboard shortcuts */}
      <Section title="Keyboard Shortcuts" delay={300}>
        {[
          ['⌘K', 'Command palette'],
          ['⌘L', 'Quick capture'],
          ['?', 'Command palette (alt)'],
          ['⌘⇧T', 'Toggle theme'],
          ['G then D', 'Go to Dashboard'],
          ['G then C', 'Go to Chat'],
          ['G then F', 'Go to Finance'],
          ['G then H', 'Go to Health'],
          ['G then R', 'Go to Career'],
          ['G then B', 'Go to Business'],
          ['G then N', 'Go to Content'],
        ].map(([key, label]) => (
          <Row key={key} label={label}>
            <kbd className="text-xs font-mono bg-muted border border-border rounded px-2 py-0.5">{key}</kbd>
          </Row>
        ))}
      </Section>

      {/* Danger zone */}
      <GlassCard title="Account" fadeIn="up" delay={300}>
        <button
          onClick={handleLogout}
          className="flex items-center gap-2 text-sm px-4 py-2 rounded-lg border border-destructive/30 text-destructive hover:bg-destructive/10 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-destructive"
        >
          <LogOut className="w-4 h-4" aria-hidden="true" /> Sign out
        </button>
      </GlassCard>
    </div>
    </div>
  )
}
