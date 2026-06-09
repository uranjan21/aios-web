import { Circle, RefreshCw, AlertTriangle, Sun, Moon, Search } from 'lucide-react'
import { useLocation } from 'react-router-dom'
import { useVaultSync } from '@/hooks/useVaultSync'
import { useUIStore } from '@/stores/uiStore'
import { formatRelativeTime } from '@/lib/utils'
import { cn } from '@/lib/utils'

const PAGE_NAMES: Record<string, string> = {
  '/': 'Dashboard',
  '/chat': 'Chat',
  '/agents': 'Agents',
  '/integrations': 'Integrations',
  '/settings': 'Settings',
  '/areas/finance': 'Finance',
  '/areas/health': 'Health',
  '/areas/career': 'Career',
  '/areas/business': 'Business',
  '/areas/content': 'Content',
}

export function TopBar() {
  const { state, lastSynced, conflicts } = useVaultSync()
  const { theme, toggleTheme, setCmdPaletteOpen } = useUIStore()
  const location = useLocation()
  const pageName = PAGE_NAMES[location.pathname] ?? 'AIOS'

  const syncChip = {
    synced: { color: 'text-emerald-500', label: `Synced ${formatRelativeTime(lastSynced)}`, icon: Circle },
    syncing: { color: 'text-blue-400', label: 'Syncing…', icon: RefreshCw },
    conflict: { color: 'text-amber-500', label: `${conflicts.length} conflict${conflicts.length !== 1 ? 's' : ''}`, icon: AlertTriangle },
    error: { color: 'text-red-500', label: 'Sync error', icon: AlertTriangle },
    disconnected: { color: 'text-muted-foreground', label: 'Disconnected', icon: Circle },
  }[state]

  const Icon = syncChip.icon
  const isAlert = state === 'conflict' || state === 'error'

  return (
    <header className="h-14 flex items-center justify-between px-4 border-b border-border bg-card shrink-0 gap-3">
      <div className="md:hidden font-semibold text-foreground tracking-tight">{pageName}</div>

      {/* Command palette trigger */}
      <button
        onClick={() => setCmdPaletteOpen(true)}
        aria-label="Open command palette (⌘K)"
        className="hidden sm:flex items-center gap-2 text-xs text-muted-foreground bg-muted hover:bg-accent px-3 py-1.5 rounded-lg border border-border transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
      >
        <Search className="w-3.5 h-3.5" aria-hidden="true" />
        <span>Search…</span>
        <kbd className="ml-4 font-mono bg-background border border-border rounded px-1">⌘K</kbd>
      </button>
      <button
        onClick={() => setCmdPaletteOpen(true)}
        aria-label="Open command palette"
        className="sm:hidden p-1.5 rounded-md hover:bg-accent text-muted-foreground transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
      >
        <Search className="w-4 h-4" aria-hidden="true" />
      </button>

      <div className="flex items-center gap-2 ml-auto">
        {/* Theme toggle */}
        <button
          onClick={toggleTheme}
          aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
          className="p-1.5 rounded-md hover:bg-accent text-muted-foreground hover:text-foreground transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
        >
          {theme === 'dark'
            ? <Sun className="w-4 h-4" aria-hidden="true" />
            : <Moon className="w-4 h-4" aria-hidden="true" />
          }
        </button>

        {/* Vault sync chip */}
        <div
          aria-live={isAlert ? 'assertive' : 'polite'}
          aria-atomic="true"
          role="status"
        >
          <button
            className={cn(
              'flex items-center gap-1.5 text-xs font-medium px-2.5 py-1.5 rounded-full',
              'bg-muted hover:bg-accent transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary',
              syncChip.color,
            )}
            title={`Vault sync: ${syncChip.label}`}
            aria-label={`Vault sync status: ${syncChip.label}`}
          >
            <Icon
              className={cn('w-3 h-3', state === 'syncing' && 'animate-spin')}
              fill={state === 'synced' ? 'currentColor' : 'none'}
              aria-hidden="true"
            />
            <span className="hidden sm:inline">{syncChip.label}</span>
          </button>
        </div>
      </div>
    </header>
  )
}
