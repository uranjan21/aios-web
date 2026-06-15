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
      <div className="hidden md:flex h-[100dvh] shrink-0 relative z-30">
      <aside
        className={cn(
          'flex flex-col h-full shadow-premium-md bg-card overflow-hidden transition-[width] duration-300 ease-[cubic-bezier(0.16,1,0.3,1)]',
          sidebarOpen ? 'w-[228px]' : 'w-[60px]'
        )}
      >
        {/* Brand */}
        <div className={cn(
          'flex items-center h-16 shrink-0',
          sidebarOpen ? 'px-4 gap-3' : 'justify-center px-0'
        )}>
          {sidebarOpen ? (
            <>
              <div className="w-7 h-7 rounded-xl bg-gradient-to-br from-primary to-amber-600 shadow-glow flex items-center justify-center shrink-0">
                <span className="text-[10px] font-bold text-primary-foreground">AI</span>
              </div>
              <span className="font-display text-foreground text-[17px] flex-1">aios</span>
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
                  className="w-7 h-7 rounded-xl bg-gradient-to-br from-primary to-amber-600 shadow-glow flex items-center justify-center hover:opacity-90 transition-opacity"
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
                  'flex items-center gap-2.5 py-2 rounded-2xl text-[13px] font-medium transition-all duration-200',
                  isActive
                    ? 'bg-gradient-to-r from-primary/15 to-primary/5 text-primary shadow-[inset_0_0_0_1px_hsl(var(--primary)/0.25)]'
                    : 'text-muted-foreground hover:bg-muted/70 hover:text-foreground hover:translate-x-0.5',
                  sidebarOpen ? 'px-3' : 'justify-center px-0 w-9 h-9 mx-auto rounded-2xl',
                )}>
                  <Icon className="shrink-0 w-[15px] h-[15px]" />
                  {sidebarOpen && <span className="truncate">{item.label}</span>}
                  {sidebarOpen && isActive && <span className="ml-auto w-1.5 h-1.5 rounded-full bg-primary shadow-glow" />}
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

        {/* Footer hint */}
        {sidebarOpen && (
          <div className="px-4 py-3 border-t border-border/60 shrink-0">
            <span className="text-[10px] text-muted-foreground/70 tracking-wide">⌘K search · ⌘L capture</span>
          </div>
        )}
      </aside>
      </div>
    </Tooltip.Provider>
  )
}
