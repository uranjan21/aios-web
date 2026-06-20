import { useRef, useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import type { LucideIcon } from 'lucide-react'
import { Bell, X, AlertTriangle, CheckCircle, Zap, Info, AlertCircle } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import styled from 'styled-components'
import { useNotificationStore, type Notification } from '@/stores/notificationStore'
import { useNotifications } from '@/hooks/useNotifications'
import { formatRelativeTime } from '@/lib/utils'

const TYPE_COLORS: Record<Notification['type'], string> = {
  conflict:       '#d97706',
  agent_error:    '#dc2626',
  agent_success:  '#16a34a',
  budget_warning: '#7c3aed',
  info:           '#0284c7',
}

const TYPE_ICONS: Record<Notification['type'], LucideIcon> = {
  conflict:       AlertTriangle,
  agent_error:    AlertCircle,
  agent_success:  CheckCircle,
  budget_warning: Zap,
  info:           Info,
}

/* ── Styled ─────────────────────────────────────────────────────────── */
const Root = styled.div`position: relative;`

const BellBtn = styled.button`
  position: relative;
  padding: 6px;
  border-radius: 10px;
  background: transparent;
  border: none;
  color: ${({ theme }) => theme.color.mutedForeground};
  cursor: pointer;
  display: flex;
  align-items: center;
  transition: background 120ms, color 120ms;
  &:hover { background: ${({ theme }) => theme.color.muted}; color: ${({ theme }) => theme.color.foreground}; }
  &:focus-visible { outline: 2px solid ${({ theme }) => theme.color.ring}; outline-offset: 2px; }
`

const BadgeMotion = styled(motion.span)`
  position: absolute;
  top: -2px;
  right: -2px;
  min-width: 16px;
  height: 16px;
  padding: 0 4px;
  border-radius: 9999px;
  background: ${({ theme }) => theme.color.primary};
  color: ${({ theme }) => theme.color.primaryForeground};
  font-size: 9px;
  font-weight: 700;
  display: flex;
  align-items: center;
  justify-content: center;
`

const Panel = styled(motion.div)`
  position: absolute;
  right: 0;
  top: calc(100% + 8px);
  width: 320px;
  background: ${({ theme }) => theme.color.card};
  border: 1px solid ${({ theme }) => theme.color.border};
  border-radius: ${({ theme }) => theme.radii['2xl']};
  box-shadow: ${({ theme }) => theme.shadow.xl};
  z-index: ${({ theme }) => theme.zIndex.dropdown};
  overflow: hidden;
`

const PanelHead = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  border-bottom: 1px solid ${({ theme }) => theme.color.border};
`

const PanelTitle = styled.span`
  font-size: 14px;
  font-weight: 600;
  color: ${({ theme }) => theme.color.foreground};
`

const ClearAllBtn = styled.button`
  font-size: 12px;
  color: ${({ theme }) => theme.color.mutedForeground};
  background: none;
  border: none;
  cursor: pointer;
  &:hover { color: ${({ theme }) => theme.color.foreground}; }
`

const ListScroll = styled.div`max-height: 320px; overflow-y: auto;`

const EmptyWrap = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 40px 16px;
  gap: 8px;
  color: ${({ theme }) => theme.color.mutedForeground};
  text-align: center;
`

const NotifRow = styled(motion.div)<{ $unread: boolean }>`
  position: relative;
  display: flex;
  gap: 12px;
  padding: 12px 16px;
  border-bottom: 1px solid ${({ theme }) => theme.color.border};
  cursor: pointer;
  background: ${({ theme, $unread }) => $unread ? `${theme.color.primary}06` : 'transparent'};
  transition: background 100ms;
  &:last-child { border-bottom: none; }
  &:hover { background: ${({ theme }) => theme.color.muted}50; }
`

const NotifContent = styled.div`flex: 1; min-width: 0;`

const NotifTitle2 = styled.p<{ $unread: boolean }>`
  font-size: 14px;
  font-weight: ${({ $unread }) => $unread ? 500 : 400};
  color: ${({ theme, $unread }) => $unread ? theme.color.foreground : theme.color.mutedForeground};
  margin: 0 0 2px;
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
`

const NotifBody2 = styled.p`
  font-size: 12px; color: ${({ theme }) => theme.color.mutedForeground};
  margin: 0 0 4px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
`

const NotifTime = styled.p`
  font-size: 10px; color: ${({ theme }) => theme.color.mutedForeground}80; margin: 0;
`

const UnreadDot = styled.span`
  position: absolute; right: 40px; top: 14px;
  width: 6px; height: 6px; border-radius: 50%;
  background: ${({ theme }) => theme.color.primary};
`

const DismissBtn = styled.button`
  padding: 2px; border-radius: 6px; background: none; border: none; cursor: pointer;
  color: ${({ theme }) => theme.color.mutedForeground}; flex-shrink: 0;
  display: flex; align-items: center;
  &:hover { color: ${({ theme }) => theme.color.foreground}; }
`

function NotifItemRow({ n, onClose }: { n: Notification; onClose: () => void }) {
  const navigate = useNavigate()
  const Icon = TYPE_ICONS[n.type]
  const color = TYPE_COLORS[n.type]
  const markRead = useNotificationStore(s => s.markRead)
  const dismiss = useNotificationStore(s => s.dismiss)

  return (
    <NotifRow
      layout
      initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 12 }}
      $unread={!n.read}
      onClick={() => { markRead(n.id); if (n.href) navigate(n.href); onClose() }}
    >
      <Icon size={16} style={{ flexShrink: 0, marginTop: 2, color }} />
      <NotifContent>
        <NotifTitle2 $unread={!n.read}>{n.title}</NotifTitle2>
        {n.body && <NotifBody2>{n.body}</NotifBody2>}
        <NotifTime>{formatRelativeTime(n.timestamp)}</NotifTime>
      </NotifContent>
      {!n.read && <UnreadDot aria-hidden />}
      <DismissBtn onClick={e => { e.stopPropagation(); dismiss(n.id) }} aria-label="Dismiss">
        <X size={12} />
      </DismissBtn>
    </NotifRow>
  )
}

export function NotificationBell() {
  const [open, setOpen] = useState(false)
  const panelRef = useRef<HTMLDivElement>(null)
  const btnRef = useRef<HTMLButtonElement>(null)
  const { notifications, unread } = useNotifications()
  const { markAllRead, clear } = useNotificationStore()

  useEffect(() => {
    if (!open) return
    const onClick = (e: MouseEvent) => {
      if (panelRef.current?.contains(e.target as Node)) return
      if (btnRef.current?.contains(e.target as Node)) return
      setOpen(false)
    }
    document.addEventListener('mousedown', onClick)
    return () => document.removeEventListener('mousedown', onClick)
  }, [open])

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false) }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open])

  const handleOpen = () => {
    setOpen(o => !o)
    if (!open && unread > 0) setTimeout(markAllRead, 600)
  }

  return (
    <Root>
      <BellBtn
        ref={btnRef}
        onClick={handleOpen}
        aria-label={`Notifications${unread > 0 ? ` (${unread} unread)` : ''}`}
        aria-expanded={open}
        aria-haspopup="dialog"
      >
        <Bell size={16} aria-hidden />
        <AnimatePresence>
          {unread > 0 && (
            <BadgeMotion key="badge" initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }} aria-hidden>
              {unread > 99 ? '99+' : unread}
            </BadgeMotion>
          )}
        </AnimatePresence>
      </BellBtn>

      <AnimatePresence>
        {open && (
          <Panel
            ref={panelRef}
            role="dialog" aria-label="Notifications"
            initial={{ opacity: 0, y: -8, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.97 }}
            transition={{ duration: 0.15 }}
          >
            <PanelHead>
              <PanelTitle>Notifications</PanelTitle>
              {notifications.length > 0 && <ClearAllBtn onClick={clear}>Clear all</ClearAllBtn>}
            </PanelHead>
            <ListScroll>
              {notifications.length === 0 ? (
                <EmptyWrap>
                  <Bell size={28} style={{ opacity: 0.4 }} aria-hidden />
                  <p style={{ fontSize: 14, margin: 0 }}>All caught up</p>
                </EmptyWrap>
              ) : (
                <AnimatePresence initial={false}>
                  {notifications.map(n => <NotifItemRow key={n.id} n={n} onClose={() => setOpen(false)} />)}
                </AnimatePresence>
              )}
            </ListScroll>
          </Panel>
        )}
      </AnimatePresence>
    </Root>
  )
}
