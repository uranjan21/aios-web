import { useRef, useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Bell, X, AlertTriangle, CheckCircle, Zap, Info, AlertCircle } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { cn } from '@/lib/utils'
import { useNotificationStore, type Notification } from '@/stores/notificationStore'
import { useNotifications } from '@/hooks/useNotifications'
import { formatRelativeTime } from '@/lib/utils'

const TYPE_CONFIG: Record<Notification['type'], { icon: React.FC<{ className?: string }>; color: string }> = {
  conflict:       { icon: AlertTriangle, color: 'text-kpi-amber' },
  agent_error:    { icon: AlertCircle,   color: 'text-destructive' },
  agent_success:  { icon: CheckCircle,   color: 'text-kpi-emerald' },
  budget_warning: { icon: Zap,           color: 'text-kpi-purple' },
  info:           { icon: Info,          color: 'text-kpi-blue' },
}

function NotifItem({ n, onClose }: { n: Notification; onClose: () => void }) {
  const navigate = useNavigate()
  const { icon: Icon, color } = TYPE_CONFIG[n.type]
  const markRead = useNotificationStore((s) => s.markRead)
  const dismiss = useNotificationStore((s) => s.dismiss)

  function handleClick() {
    markRead(n.id)
    if (n.href) navigate(n.href)
    onClose()
  }

  return (
    <motion.div
      layout
      initial={{ opacity: 0, x: 12 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 12 }}
      className={cn(
        'relative flex gap-3 px-4 py-3 border-b border-border last:border-0',
        'hover:bg-muted/30 cursor-pointer transition-colors',
        !n.read && 'bg-primary/5',
      )}
      onClick={handleClick}
    >
      <Icon className={cn('w-4 h-4 mt-0.5 shrink-0', color)} aria-hidden="true" />
      <div className="flex-1 min-w-0">
        <p className={cn('text-sm font-medium', !n.read && 'text-foreground', n.read && 'text-muted-foreground')}>
          {n.title}
        </p>
        {n.body && <p className="text-xs text-muted-foreground mt-0.5 truncate">{n.body}</p>}
        <p className="text-[10px] text-muted-foreground/60 mt-1">{formatRelativeTime(n.timestamp)}</p>
      </div>
      {!n.read && (
        <span className="absolute right-10 top-3.5 w-1.5 h-1.5 rounded-full bg-primary" aria-hidden="true" />
      )}
      <button
        onClick={(e) => { e.stopPropagation(); dismiss(n.id) }}
        aria-label="Dismiss notification"
        className="p-0.5 rounded hover:bg-accent text-muted-foreground hover:text-foreground transition shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
      >
        <X className="w-3 h-3" />
      </button>
    </motion.div>
  )
}

export function NotificationBell() {
  const [open, setOpen] = useState(false)
  const panelRef = useRef<HTMLDivElement>(null)
  const buttonRef = useRef<HTMLButtonElement>(null)
  const { notifications, unread } = useNotifications()
  const { markAllRead, clear } = useNotificationStore()

  // Close on outside click
  useEffect(() => {
    if (!open) return
    function handleClick(e: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(e.target as Node) &&
          buttonRef.current && !buttonRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [open])

  // Close on Escape
  useEffect(() => {
    if (!open) return
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [open])

  function handleOpen() {
    setOpen((o) => !o)
    if (!open && unread > 0) {
      // Mark all read when panel opens
      setTimeout(markAllRead, 600)
    }
  }

  return (
    <div className="relative">
      <button
        ref={buttonRef}
        onClick={handleOpen}
        aria-label={`Notifications${unread > 0 ? ` (${unread} unread)` : ''}`}
        aria-expanded={open}
        aria-haspopup="dialog"
        className="relative p-1.5 rounded-md hover:bg-accent text-muted-foreground hover:text-foreground transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
      >
        <Bell className="w-4 h-4" aria-hidden="true" />
        <AnimatePresence>
          {unread > 0 && (
            <motion.span
              key="badge"
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0 }}
              className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 px-1 rounded-full bg-primary text-primary-foreground text-[9px] font-bold flex items-center justify-center"
              aria-hidden="true"
            >
              {unread > 99 ? '99+' : unread}
            </motion.span>
          )}
        </AnimatePresence>
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            ref={panelRef}
            role="dialog"
            aria-label="Notifications"
            initial={{ opacity: 0, y: -8, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.97 }}
            transition={{ duration: 0.15 }}
            className="absolute right-0 top-full mt-2 w-80 bg-card border border-border rounded-2xl shadow-2xl z-50 overflow-hidden"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-border">
              <span className="text-sm font-semibold text-foreground">Notifications</span>
              {notifications.length > 0 && (
                <button
                  onClick={clear}
                  className="text-xs text-muted-foreground hover:text-foreground transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded"
                >
                  Clear all
                </button>
              )}
            </div>

            {/* List */}
            <div className="max-h-80 overflow-y-auto">
              {notifications.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-10 text-center">
                  <Bell className="w-7 h-7 text-muted-foreground/40 mb-2" aria-hidden="true" />
                  <p className="text-sm text-muted-foreground">All caught up</p>
                </div>
              ) : (
                <AnimatePresence initial={false}>
                  {notifications.map((n) => (
                    <NotifItem key={n.id} n={n} onClose={() => setOpen(false)} />
                  ))}
                </AnimatePresence>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
