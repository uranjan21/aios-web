import { useEffect, useRef } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { useNotificationStore } from '@aios/shared/stores/notificationStore'
import { useVaultSync } from './useVaultSync'

/**
 * Bridges vault sync conflicts → notification store.
 * Also bridges the agent WS → notification store for failures.
 * Must be mounted inside the authenticated shell.
 */
export function useNotifications() {
  const { conflicts, state } = useVaultSync()
  const add = useNotificationStore((s) => s.add)
  const notifications = useNotificationStore((s) => s.notifications)
  const queryClient = useQueryClient()

  const processedConflicts = useRef<Set<string>>(new Set())

  // Surface vault conflicts as notifications
  useEffect(() => {
    conflicts.forEach((c) => {
      if (!processedConflicts.current.has(c.id)) {
        processedConflicts.current.add(c.id)
        add({
          type: 'conflict',
          title: 'Vault conflict detected',
          body: c.path,
          href: '/settings',
        })
      }
    })
  }, [conflicts, add])

  const lastError = useRef<number>(0)
  // Surface sync error as notification
  useEffect(() => {
    if (state === 'error') {
      if (Date.now() - lastError.current > 30000) {
        lastError.current = Date.now()
        add({ type: 'info', title: 'Vault sync error', body: 'Check your vault connection in Settings.', href: '/settings' })
      }
    }
  }, [state, add])

  // Subscribe to agent WS events
  useEffect(() => {
    const protocol = location.protocol === 'https:' ? 'wss' : 'ws'
    const ws = new WebSocket(`${protocol}://${location.host}/ws/agents`)
    ws.onmessage = (evt) => {
      try {
        const event = JSON.parse(evt.data)
        if (event.type === 'anomaly' || event.type === 'digest_ready') {
          add({
            type: 'info',
            title: event.title,
            body: event.body,
            href: '/',
          })
        } else if (event.type === 'budget_alert') {
          add({
            type: event.level >= 100 ? 'agent_error' : 'info',
            title: event.level >= 100 ? `Budget exceeded: ${event.category}` : `Budget warning: ${event.category}`,
            body: `₹${Number(event.spent).toLocaleString('en-IN')} of ₹${Number(event.limit).toLocaleString('en-IN')} (${event.pct}%)`,
            href: '/areas/finance',
          })
          queryClient.invalidateQueries({ queryKey: ['finance'] })
        } else if (event.type === 'recurring_posted') {
          add({
            type: 'info',
            title: `${event.kind} auto-posted`,
            body: `${event.name} — ₹${Number(event.amount).toLocaleString('en-IN')}`,
            href: '/areas/finance',
          })
          queryClient.invalidateQueries({ queryKey: ['finance'] })
        } else if (event.type === 'agent_complete') {
          if (event.status === 'error') {
            add({
              type: 'agent_error',
              title: 'Agent run failed',
              body: event.task_id,
              href: '/agents',
            })
            queryClient.invalidateQueries({ queryKey: ['agents'] })
          } else if (event.status === 'success') {
            add({
              type: 'agent_success',
              title: 'Agent run complete',
              body: event.task_id,
              href: '/agents',
            })
            queryClient.invalidateQueries({ queryKey: ['agents'] })
          }
        }
      } catch (e) {
        console.error("Failed to parse agent WS message:", e)
      }
    }
    return () => ws.close()
  }, [add, queryClient])

  const unread = notifications.filter((n) => !n.read).length
  return { notifications, unread }
}
