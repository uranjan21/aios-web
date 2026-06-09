import { NavLink, useLocation } from 'react-router-dom'
import { LayoutDashboard, MessageSquare, Bot, Grid3X3, MoreHorizontal } from 'lucide-react'
import { cn } from '@/lib/utils'

const TABS = [
  { to: '/', icon: LayoutDashboard, label: 'Home' },
  { to: '/chat', icon: MessageSquare, label: 'Chat' },
  { to: '/areas', icon: Grid3X3, label: 'Areas' },
  { to: '/agents', icon: Bot, label: 'Agents' },
  { to: '/settings', icon: MoreHorizontal, label: 'More' },
]

export function BottomNav() {
  const location = useLocation()

  return (
    <nav className="md:hidden fixed bottom-0 inset-x-0 bg-card border-t border-border z-50">
      <div className="grid grid-cols-5 h-16">
        {TABS.map(({ to, icon: Icon, label }) => {
          const isActive = to === '/'
            ? location.pathname === '/'
            : location.pathname.startsWith(to)

          return (
            <NavLink
              key={to}
              to={to}
              className={cn(
                'flex flex-col items-center justify-center gap-1 text-[10px] font-medium transition-colors',
                isActive ? 'text-primary' : 'text-muted-foreground'
              )}
            >
              <Icon className="w-5 h-5" />
              {label}
            </NavLink>
          )
        })}
      </div>
    </nav>
  )
}
