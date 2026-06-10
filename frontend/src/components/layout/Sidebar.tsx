import { NavLink, useLocation } from 'react-router-dom'
import {
  LayoutDashboard, MessageSquare, Bot, IndianRupee,
  Heart, Briefcase, Rocket, PenLine, Plug, Settings,
  ChevronLeft, ChevronRight
} from 'lucide-react'
import * as Tooltip from '@radix-ui/react-tooltip'
import { cn } from '@/lib/utils'
import { useUIStore } from '@/stores/uiStore'

interface NavItem {
  to?: string
  icon?: React.FC<{ className?: string }>
  label: string
  divider?: boolean
}

const NAV_ITEMS: NavItem[] = [
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
]

export function Sidebar() {
  const { sidebarOpen, toggleSidebar } = useUIStore()
  const location = useLocation()

  return (
    <Tooltip.Provider delayDuration={300} skipDelayDuration={0}>
      <aside
        className={cn(
          'hidden md:flex flex-col h-[100dvh] bg-background border-r border-border shrink-0 relative z-40 transition-[width] duration-200 ease-in-out',
          sidebarOpen ? 'w-[220px]' : 'w-[52px]'
        )}
      >
        {/* Logo */}
        <div className={cn(
          'flex items-center h-12 border-b border-border shrink-0',
          sidebarOpen ? 'px-4 gap-3' : 'justify-center px-0'
        )}>
          {sidebarOpen ? (
            <>
              <div className="w-6 h-6 rounded-md bg-primary flex items-center justify-center shrink-0">
                <span className="text-[10px] font-bold text-primary-foreground">AI</span>
              </div>
              <span className="font-semibold text-foreground text-[14px] tracking-tight flex-1">AIOS</span>
              <button
                onClick={toggleSidebar}
                className="p-1 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                aria-label="Collapse sidebar"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
              </button>
            </>
          ) : (
            <Tooltip.Root>
              <Tooltip.Trigger asChild>
                <button
                  onClick={toggleSidebar}
                  className="w-6 h-6 rounded-md bg-primary flex items-center justify-center hover:bg-primary/90 transition-colors"
                  aria-label="Expand sidebar"
                >
                  <span className="text-[10px] font-bold text-primary-foreground">AI</span>
                </button>
              </Tooltip.Trigger>
              <Tooltip.Portal>
                <Tooltip.Content side="right" sideOffset={10}
                  className="z-50 px-2 py-1 text-[11px] font-medium rounded-lg bg-popover text-popover-foreground border border-border shadow-md">
                  Expand
                </Tooltip.Content>
              </Tooltip.Portal>
            </Tooltip.Root>
          )}
        </div>

        {/* Nav */}
        <nav className="flex-1 py-3 overflow-y-auto overflow-x-hidden">
          <div className={cn('flex flex-col', sidebarOpen ? 'px-3 gap-0.5' : 'px-2 gap-0.5')}>
            {NAV_ITEMS.map((item, i) => {
              if (item.divider) {
                if (!sidebarOpen) return <div key={i} className="my-2 h-px bg-border mx-1" />
                return (
                  <div key={i} className="pt-4 pb-1.5 px-1">
                    <span className="section-label">{item.label}</span>
                  </div>
                )
              }

              const Icon = item.icon!
              const isActive = item.to === '/'
                ? location.pathname === '/'
                : location.pathname.startsWith(item.to!)

              const linkContent = (
                <div className={cn(
                  'flex items-center gap-2.5 py-1.5 rounded-lg text-[13px] font-medium transition-all duration-150',
                  isActive
                    ? 'bg-primary/10 text-primary border-l-2 border-primary pl-[10px]'
                    : 'text-muted-foreground hover:bg-muted hover:text-foreground border-l-2 border-transparent',
                  sidebarOpen ? 'px-3' : 'justify-center px-0 w-8 h-8 mx-auto rounded-lg border-l-0',
                  !sidebarOpen && isActive && 'bg-primary/10 text-primary border-l-0'
                )}>
                  <Icon className="shrink-0 w-[15px] h-[15px]" />
                  {sidebarOpen && <span className="truncate">{item.label}</span>}
                </div>
              )

              if (!sidebarOpen) {
                return (
                  <Tooltip.Root key={item.to}>
                    <Tooltip.Trigger asChild>
                      <NavLink to={item.to!} className="block outline-none">{linkContent}</NavLink>
                    </Tooltip.Trigger>
                    <Tooltip.Portal>
                      <Tooltip.Content side="right" sideOffset={10}
                        className="z-50 px-2 py-1 text-[11px] font-medium rounded-lg bg-popover text-popover-foreground border border-border shadow-md">
                        {item.label}
                      </Tooltip.Content>
                    </Tooltip.Portal>
                  </Tooltip.Root>
                )
              }

              return <NavLink key={item.to} to={item.to!} className="block outline-none">{linkContent}</NavLink>
            })}
          </div>
        </nav>
      </aside>
    </Tooltip.Provider>
  )
}
