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
    <nav className="md:hidden fixed bottom-0 inset-x-0 glass-panel border-t z-50">
      <div className="grid grid-cols-5 h-16">
        {TABS.map(({ to, icon: Icon, label }) => {
          const isActive = to === '/'
            ? location.pathname === '/'
            : location.pathname.startsWith(to)

          return (
            <NavLink
              key={to}
              to={to}
              onClick={() => { if (navigator.vibrate) navigator.vibrate(8) }}
              className={cn(
                'flex flex-col items-center justify-center gap-0.5 text-[10px] font-medium transition-colors',
                isActive ? 'text-primary' : 'text-muted-foreground'
              )}
            >
              <div className={cn('p-1.5 rounded-xl transition-colors', isActive && 'bg-primary/10')}>
                <Icon className="w-5 h-5" />
              </div>
              {label}
            </NavLink>
          )
        })}
      </div>
    </nav>
  )
}
