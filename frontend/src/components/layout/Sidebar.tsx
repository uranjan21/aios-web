import { NavLink, useLocation } from 'react-router-dom'
import {
  LayoutDashboard, MessageSquare, Bot, IndianRupee,
  Heart, Briefcase, Rocket, PenLine, Plug, Settings,
  ChevronLeft, ChevronRight,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useUIStore } from '@/stores/uiStore'

const NAV_ITEMS = [
  { to: '/', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/chat', icon: MessageSquare, label: 'Chat' },
  { to: '/agents', icon: Bot, label: 'Agents' },
  { divider: true, label: 'Areas' },
  { to: '/areas/finance', icon: IndianRupee, label: 'Finance' },
  { to: '/areas/health', icon: Heart, label: 'Health' },
  { to: '/areas/career', icon: Briefcase, label: 'Career' },
  { to: '/areas/business', icon: Rocket, label: 'Business' },
  { to: '/areas/content', icon: PenLine, label: 'Content' },
  { divider: true, label: 'System' },
  { to: '/integrations', icon: Plug, label: 'Integrations' },
  { to: '/settings', icon: Settings, label: 'Settings' },
] as const

interface NavItem {
  to?: string
  icon?: React.FC<{ className?: string }>
  label: string
  divider?: boolean
}

export function Sidebar() {
  const { sidebarOpen, toggleSidebar } = useUIStore()
  const location = useLocation()

  return (
    <aside
      className={cn(
        'hidden md:flex flex-col h-[100dvh] bg-card border-r border-border transition-[width] duration-200 shrink-0',
        sidebarOpen ? 'w-56' : 'w-14'
      )}
    >
      {/* Logo */}
      <div className="flex items-center h-14 px-3 border-b border-border">
        {sidebarOpen && (
          <span className="font-bold text-foreground tracking-tight text-base mr-auto">AIOS</span>
        )}
        <button
          onClick={toggleSidebar}
          className={cn(
            'p-1.5 rounded-md hover:bg-accent text-muted-foreground hover:text-foreground transition-colors',
            !sidebarOpen && 'mx-auto'
          )}
          aria-label="Toggle sidebar"
        >
          {sidebarOpen ? <ChevronLeft className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
        </button>
      </div>

      {/* Nav */}
      <nav className="flex-1 py-3 px-2 space-y-0.5 overflow-y-auto">
        {([...NAV_ITEMS] as NavItem[]).map((item, i) => {
          if (item.divider) {
            if (!sidebarOpen) return <div key={i} className="pt-3" />
            return (
              <div key={i} className="pt-4 pb-1">
                <span className="text-[10px] font-semibold tracking-wide uppercase text-muted-foreground/60 px-2">
                  {item.label}
                </span>
              </div>
            )
          }

          const Icon = item.icon!
          const isActive = item.to === '/'
            ? location.pathname === '/'
            : location.pathname.startsWith(item.to!)

          return (
            <NavLink
              key={item.to}
              to={item.to!}
              className={cn(
                'relative flex items-center gap-3 px-2 py-2 rounded-md text-sm font-medium transition-colors group',
                isActive
                  ? 'bg-primary/10 text-primary'
                  : 'text-muted-foreground hover:bg-accent hover:text-foreground',
                !sidebarOpen && 'justify-center px-0'
              )}
              title={!sidebarOpen ? item.label : undefined}
            >
              {isActive && (
                <span className="absolute left-0 top-1 bottom-1 w-0.5 rounded-r-full bg-primary" />
              )}
              <Icon className="w-4 h-4 shrink-0" />
              {sidebarOpen && <span>{item.label}</span>}
            </NavLink>
          )
        })}
      </nav>
    </aside>
  )
}
