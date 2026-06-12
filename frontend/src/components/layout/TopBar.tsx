import React from 'react'
import { Circle, RefreshCw, AlertTriangle, Sun, Moon, Search } from 'lucide-react'
import { NotificationBell } from '@/components/NotificationBell'
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
  
  const breadcrumbs = ['AIOS']
  const path = location.pathname
  if (path !== '/' && path !== '/login') {
    const parts = path.split('/').filter(Boolean)
    if (parts[0] === 'areas') {
      breadcrumbs.push('Areas')
      if (parts[1]) breadcrumbs.push(parts[1].charAt(0).toUpperCase() + parts[1].slice(1))
      if (parts[2]) breadcrumbs.push(parts[2].charAt(0).toUpperCase() + parts[2].slice(1))
    } else {
      breadcrumbs.push(PAGE_NAMES[path] || (parts[0].charAt(0).toUpperCase() + parts[0].slice(1)))
    }
  } else if (path === '/') {
    breadcrumbs.push('Dashboard')
  }

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
    <header className="h-16 flex items-center px-5 shrink-0 gap-3 z-30 relative bg-transparent">
      {/* Breadcrumbs */}
      <div className="flex items-center gap-1.5 text-[12px] font-medium text-muted-foreground mr-auto" aria-label="Breadcrumb">
        {breadcrumbs.map((bc, i) => (
          <React.Fragment key={i}>
            {i > 0 && <span className="opacity-40">/</span>}
            <span className={cn(i === breadcrumbs.length - 1 && "text-foreground font-semibold")}>{bc}</span>
          </React.Fragment>
        ))}
      </div>

      {/* Right side group */}
      <div className="flex items-center gap-2">
        <button
          onClick={() => setCmdPaletteOpen(true)}
          aria-label="Open command palette (⌘K)"
          className="hidden sm:flex items-center gap-2 text-[11px] text-muted-foreground bg-muted/60 hover:bg-muted px-2.5 py-1 rounded-full border border-border/60 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/20"
        >
          <Search className="w-3 h-3" aria-hidden="true" />
          <span>Search…</span>
          <kbd className="ml-4 font-mono bg-background border border-border/50 rounded px-1 text-[9px] py-0.5 shadow-sm">⌘K</kbd>
        </button>
        <button
          onClick={() => setCmdPaletteOpen(true)}
          aria-label="Open command palette"
          className="sm:hidden p-1.5 rounded-md hover:bg-accent text-muted-foreground transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
        >
          <Search className="w-3.5 h-3.5" aria-hidden="true" />
        </button>

        <button
          onClick={toggleTheme}
          aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
          className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors focus-ring"
        >
          {theme === 'dark'
            ? <Sun className="w-3.5 h-3.5" aria-hidden="true" />
            : <Moon className="w-3.5 h-3.5" aria-hidden="true" />
          }
        </button>

        <NotificationBell />

        <div
          aria-live={isAlert ? 'assertive' : 'polite'}
          aria-atomic="true"
          role="status"
        >
          <button
            className={cn(
              'flex items-center gap-1.5 text-[10px] font-medium tracking-wide px-2 py-1 rounded-full',
              'bg-muted/60 border border-subtle transition-colors focus-ring',
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
