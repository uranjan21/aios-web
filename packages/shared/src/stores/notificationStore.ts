import { create } from 'zustand'

export type NotificationType = 'conflict' | 'agent_error' | 'budget_warning' | 'agent_success' | 'info'

export interface Notification {
  id: string
  type: NotificationType
  title: string
  body?: string
  timestamp: string
  read: boolean
  /** Link to navigate to when clicking the notification */
  href?: string
}

interface NotificationState {
  notifications: Notification[]
  add: (n: Omit<Notification, 'id' | 'timestamp' | 'read'>) => void
  markAllRead: () => void
  markRead: (id: string) => void
  dismiss: (id: string) => void
  clear: () => void
}

function makeId() {
  return Math.random().toString(36).slice(2)
}

export const useNotificationStore = create<NotificationState>((set) => ({
  notifications: [],

  add: (n) =>
    set((s) => ({
      notifications: [
        {
          ...n,
          id: makeId(),
          timestamp: new Date().toISOString(),
          read: false,
        },
        ...s.notifications,
      ].slice(0, 50), // keep at most 50
    })),

  markRead: (id) =>
    set((s) => ({
      notifications: s.notifications.map((n) => (n.id === id ? { ...n, read: true } : n)),
    })),

  markAllRead: () =>
    set((s) => ({
      notifications: s.notifications.map((n) => ({ ...n, read: true })),
    })),

  dismiss: (id) =>
    set((s) => ({
      notifications: s.notifications.filter((n) => n.id !== id),
    })),

  clear: () => set({ notifications: [] }),
}))
