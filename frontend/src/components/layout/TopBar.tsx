import { Circle, RefreshCw, AlertTriangle } from 'lucide-react'
import { useVaultSync } from '@/hooks/useVaultSync'
import { formatRelativeTime } from '@/lib/utils'
import { cn } from '@/lib/utils'

export function TopBar() {
  const { state, lastSynced, conflicts } = useVaultSync()

  const syncChip = {
    synced: { color: 'text-emerald-500', label: `Synced ${formatRelativeTime(lastSynced)}`, icon: Circle },
    syncing: { color: 'text-blue-400', label: 'Syncing…', icon: RefreshCw },
    conflict: { color: 'text-amber-500', label: `${conflicts.length} conflict${conflicts.length !== 1 ? 's' : ''}`, icon: AlertTriangle },
    error: { color: 'text-red-500', label: 'Sync error', icon: AlertTriangle },
    disconnected: { color: 'text-muted-foreground', label: 'Disconnected', icon: Circle },
  }[state]

  const Icon = syncChip.icon

  return (
    <header className="h-14 flex items-center justify-between px-4 border-b border-border bg-card shrink-0">
      <div className="md:hidden font-bold text-foreground tracking-tight">AIOS</div>
      <div className="flex-1" />
      <button
        className={cn(
          'flex items-center gap-1.5 text-xs font-medium px-2.5 py-1.5 rounded-full',
          'bg-muted hover:bg-accent transition-colors',
          syncChip.color
        )}
        title="Vault sync status"
      >
        <Icon
          className={cn('w-3 h-3', state === 'syncing' && 'animate-spin')}
          fill={state === 'synced' ? 'currentColor' : 'none'}
        />
        <span className="hidden sm:inline">{syncChip.label}</span>
      </button>
    </header>
  )
}
