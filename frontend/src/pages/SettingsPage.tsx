import { useQuery } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { Sun, Moon, CheckCircle, XCircle, AlertCircle, LogOut, RefreshCw } from 'lucide-react'
import { api } from '@/api/client'
import { chatApi } from '@/api/chat'
import { useAuthStore } from '@/stores/authStore'
import { useUIStore } from '@/stores/uiStore'
import { useVaultSync } from '@/hooks/useVaultSync'
import { Progress } from '@/components/ui/progress'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="bg-card border border-border rounded-xl divide-y divide-border">
      <div className="px-5 py-3.5">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{title}</h2>
      </div>
      {children}
    </section>
  )
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4 px-5 py-3.5">
      <span className="text-sm text-foreground">{label}</span>
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
    <span className={cn('flex items-center gap-1.5 text-xs font-medium', ok ? 'text-emerald-500' : 'text-amber-500')}>
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
  const color = pct >= 90 ? 'bg-destructive' : pct >= 70 ? 'bg-amber-500' : 'bg-primary'
  const resetH = Math.floor(data.reset_in_seconds / 3600)
  const resetM = Math.floor((data.reset_in_seconds % 3600) / 60)

  return (
    <div className="px-5 py-3.5 space-y-2">
      <div className="flex items-center justify-between text-sm">
        <span className="text-foreground">Claude Token Budget</span>
        <span className={cn('text-xs font-mono font-medium', pct >= 90 ? 'text-destructive' : pct >= 70 ? 'text-amber-500' : 'text-muted-foreground')}>
          {data.used_today.toLocaleString()} / {data.daily_limit.toLocaleString()}
        </span>
      </div>
      <Progress value={pct} indicatorClassName={color} />
      <p className="text-xs text-muted-foreground">
        {pct.toFixed(1)}% used · resets in {resetH}h {resetM}m
        {pct >= 80 && <span className="text-amber-500 ml-1">· approaching limit</span>}
      </p>
    </div>
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
    synced: 'text-emerald-500',
    syncing: 'text-blue-400',
    conflict: 'text-amber-500',
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
    await api.post('/auth/logout')
    logout()
    navigate('/login')
  }

  return (
    <div className="p-4 sm:p-6 space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Settings</h1>
        <p className="text-muted-foreground text-sm mt-0.5">Configure your AIOS instance</p>
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
      <Section title="System Status">
        <Row label="Backend">
          <BackendStatus />
        </Row>
        <VaultSyncRow />
        <Row label="Rate limits">
          <span className="text-xs text-muted-foreground">Chat 20/min · Agents 5/min · Auth 10/min</span>
        </Row>
      </Section>

      {/* AI Budget */}
      <section className="bg-card border border-border rounded-xl divide-y divide-border">
        <div className="px-5 py-3.5">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">AI Usage</h2>
        </div>
        <TokenGauge />
        <Row label="Model">
          <span className="text-xs font-mono text-muted-foreground">claude-sonnet-4-5</span>
        </Row>
        <Row label="Session limit">
          <span className="text-xs font-mono text-muted-foreground">50,000 tokens</span>
        </Row>
      </section>

      {/* Keyboard shortcuts */}
      <Section title="Keyboard Shortcuts">
        {[
          ['⌘K', 'Command palette'],
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
      <section className="bg-card border border-border rounded-xl p-5">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-4">Account</h2>
        <button
          onClick={handleLogout}
          className="flex items-center gap-2 text-sm px-4 py-2 rounded-lg border border-destructive/50 text-destructive hover:bg-destructive/10 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-destructive"
        >
          <LogOut className="w-4 h-4" aria-hidden="true" /> Sign out
        </button>
      </section>
    </div>
  )
}
