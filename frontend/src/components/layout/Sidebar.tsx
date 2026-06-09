import { useState } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import {
  LayoutDashboard, MessageSquare, Bot, IndianRupee,
  Heart, Briefcase, Rocket, PenLine, Plug, Settings,
  ChevronLeft, ChevronRight, ChevronDown, ChevronRight as ChevronRightSm
} from 'lucide-react'
import * as Tooltip from '@radix-ui/react-tooltip'
import { cn } from '@/lib/utils'
import { useUIStore } from '@/stores/uiStore'

interface NavItem {
  to?: string
  icon?: React.FC<{ className?: string }>
  label: string
  divider?: boolean
  subItems?: { to: string; label: string }[]
}

const NAV_ITEMS: NavItem[] = [
  { to: '/', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/chat', icon: MessageSquare, label: 'Chat' },
  { to: '/agents', icon: Bot, label: 'Agents' },
  { divider: true, label: 'Areas' },
  { 
    to: '/areas/finance', icon: IndianRupee, label: 'Finance',
    subItems: [
      { to: '/areas/finance', label: 'Dashboard' },
      { to: '/areas/finance/log', label: 'Log Transaction' },
      { to: '/areas/finance/budget', label: 'Budgets' }
    ]
  },
  { 
    to: '/areas/health', icon: Heart, label: 'Health',
    subItems: [
      { to: '/areas/health', label: 'Dashboard' },
      { to: '/areas/health/logs', label: 'Health Logs' },
      { to: '/areas/health/goals', label: 'Fitness Goals' }
    ]
  },
  { 
    to: '/areas/career', icon: Briefcase, label: 'Career',
    subItems: [
      { to: '/areas/career', label: 'Dashboard' },
      { to: '/areas/career/roadmap', label: 'Roadmap' },
      { to: '/areas/career/opportunities', label: 'Opportunities' }
    ]
  },
  { 
    to: '/areas/business', icon: Rocket, label: 'Business',
    subItems: [
      { to: '/areas/business', label: 'Dashboard' },
      { to: '/areas/business/events', label: 'Events' },
      { to: '/areas/business/summary', label: 'Summary' }
    ]
  },
  { to: '/areas/content', icon: PenLine, label: 'Content' },
  { divider: true, label: 'System' },
  { to: '/integrations', icon: Plug, label: 'Integrations' },
  { to: '/settings', icon: Settings, label: 'Settings' },
]

export function Sidebar() {
  const { sidebarOpen, toggleSidebar } = useUIStore()
  const location = useLocation()
  
  // Track which accordion is open
  const [expandedArea, setExpandedArea] = useState<string | null>(null)

  const toggleExpand = (label: string) => {
    setExpandedArea(prev => prev === label ? null : label)
  }

  return (
    <Tooltip.Provider delayDuration={200} skipDelayDuration={0}>
      <aside
        className={cn(
          'hidden md:flex flex-col h-[100dvh] bg-background border-r border-border/40 transition-[width] duration-200 ease-in-out shrink-0 relative z-40',
          sidebarOpen ? 'w-[220px]' : 'w-14'
        )}
      >
        {/* Logo / toggle */}
        <div className="flex items-center h-12 px-3 border-b border-transparent">
          {sidebarOpen && (
            <div className="flex items-center gap-2 mr-auto pl-1">
              <span className="font-semibold text-foreground tracking-tight text-[15px]">AiOS</span>
            </div>
          )}
          <Tooltip.Root>
            <Tooltip.Trigger asChild>
              <button
                onClick={toggleSidebar}
                className={cn(
                  'p-1 rounded-md hover:bg-accent text-muted-foreground hover:text-foreground transition-colors focus-ring',
                  !sidebarOpen && 'mx-auto'
                )}
                aria-label={sidebarOpen ? 'Collapse sidebar' : 'Expand sidebar'}
              >
                {sidebarOpen ? <ChevronLeft className="w-[14px] h-[14px]" /> : <ChevronRight className="w-[14px] h-[14px]" />}
              </button>
            </Tooltip.Trigger>
            {!sidebarOpen && (
              <Tooltip.Portal>
                <Tooltip.Content
                  side="right"
                  sideOffset={8}
                  className="z-50 px-2 py-1 text-[11px] font-medium rounded bg-popover text-popover-foreground border border-border shadow-sm animate-in fade-in-0 zoom-in-95"
                >
                  Expand sidebar
                  <Tooltip.Arrow className="fill-border" />
                </Tooltip.Content>
              </Tooltip.Portal>
            )}
          </Tooltip.Root>
        </div>

        {/* Nav */}
        <nav className="flex-1 py-2 px-2 space-y-[2px] overflow-y-auto overflow-x-hidden scrollbar-none pb-8">
          {NAV_ITEMS.map((item, i) => {
            if (item.divider) {
              if (!sidebarOpen) return <div key={i} className="pt-2" />
              return (
                <div key={i} className="pt-4 pb-1 pl-3">
                  <span className="text-[10px] font-semibold tracking-wider text-muted-foreground/60">
                    {item.label}
                  </span>
                </div>
              )
            }

            const Icon = item.icon!
            const isActive = item.to === '/'
              ? location.pathname === '/'
              : location.pathname.startsWith(item.to!) || (item.subItems?.some(sub => location.pathname === sub.to))

            const hasSubmenu = !!item.subItems
            const isExpanded = expandedArea === item.label

            // Render sub-items if expanded
            const renderSubItems = () => {
              if (!item.subItems) return null
              
              if (sidebarOpen) {
                return (
                  <div className={cn(
                    "overflow-hidden transition-all duration-200 ease-in-out flex flex-col mt-[2px]",
                    isExpanded ? "max-h-48 opacity-100" : "max-h-0 opacity-0"
                  )}>
                    {item.subItems.map(sub => {
                      const isSubActive = location.pathname === sub.to
                      return (
                        <NavLink
                          key={sub.to}
                          to={sub.to}
                          className={cn(
                            'block py-1.5 pl-8 pr-2 rounded-md text-[13px] transition-colors',
                            isSubActive 
                              ? 'bg-accent/80 text-foreground font-medium' 
                              : 'text-muted-foreground hover:bg-accent/40 hover:text-foreground'
                          )}
                        >
                          {sub.label}
                        </NavLink>
                      )
                    })}
                  </div>
                )
              } else {
                // Flyout menu when collapsed
                return (
                  <div className="absolute left-full top-0 ml-1 w-44 rounded-lg bg-popover/95 backdrop-blur-sm border border-border shadow-md opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-100 z-50 p-1 transform translate-x-1 group-hover:translate-x-0">
                    <div className="px-2 py-1.5 text-[11px] font-semibold tracking-wider text-muted-foreground border-b border-border/40 mb-1">
                      {item.label}
                    </div>
                    {item.subItems.map(sub => {
                      const isSubActive = location.pathname === sub.to
                      return (
                        <NavLink
                          key={sub.to}
                          to={sub.to}
                          className={cn(
                            'block py-1.5 px-2 rounded-md text-[13px] transition-colors',
                            isSubActive 
                              ? 'bg-accent/80 text-foreground font-medium' 
                              : 'text-muted-foreground hover:bg-accent/40 hover:text-foreground'
                          )}
                        >
                          {sub.label}
                        </NavLink>
                      )
                    })}
                  </div>
                )
              }
            }

            const linkContent = (
              <div className="relative group">
                <div 
                  onClick={(e) => {
                    if (hasSubmenu && sidebarOpen) {
                      e.preventDefault()
                      toggleExpand(item.label)
                    }
                  }}
                  className={cn(
                    'relative flex items-center gap-2.5 py-1.5 rounded-md text-[13px] font-medium transition-colors cursor-pointer',
                    isActive && !hasSubmenu
                      ? 'bg-accent text-foreground'
                      : isActive && hasSubmenu && !isExpanded
                      ? 'bg-accent/50 text-foreground'
                      : isExpanded
                      ? 'text-foreground'
                      : 'text-muted-foreground hover:bg-accent/50 hover:text-foreground',
                    sidebarOpen ? 'px-2.5' : 'justify-center px-0 mx-1'
                  )}
                >
                  <Icon className={cn("shrink-0", sidebarOpen ? "w-4 h-4" : "w-[18px] h-[18px]")} />
                  
                  {sidebarOpen && (
                    <div className="flex-1 flex items-center justify-between">
                      <span className="truncate">{item.label}</span>
                      {hasSubmenu && (
                        <ChevronRightSm className={cn(
                          "w-3 h-3 transition-transform duration-200 opacity-60",
                          isExpanded && "rotate-90"
                        )} />
                      )}
                    </div>
                  )}
                </div>
                
                {renderSubItems()}
              </div>
            )

            // Wrap in NavLink if it's a direct link, or just render the div if it's a submenu parent
            const wrapper = (!hasSubmenu || !sidebarOpen) ? (
              <NavLink key={item.to || item.label} to={hasSubmenu ? item.subItems![0].to : item.to!} className="block outline-none">
                {linkContent}
              </NavLink>
            ) : (
              <div key={item.label} className="outline-none">
                {linkContent}
              </div>
            )

            if (!sidebarOpen && !hasSubmenu) {
              return (
                <Tooltip.Root key={item.to || item.label}>
                  <Tooltip.Trigger asChild>{wrapper}</Tooltip.Trigger>
                  <Tooltip.Portal>
                    <Tooltip.Content
                      side="right"
                      sideOffset={8}
                      className="z-50 px-2 py-1 text-[11px] font-medium rounded bg-popover text-popover-foreground border border-border shadow-sm animate-in fade-in-0 zoom-in-95"
                    >
                      {item.label}
                      <Tooltip.Arrow className="fill-border" />
                    </Tooltip.Content>
                  </Tooltip.Portal>
                </Tooltip.Root>
              )
            }

            return wrapper
          })}
        </nav>
      </aside>
    </Tooltip.Provider>
  )
}
