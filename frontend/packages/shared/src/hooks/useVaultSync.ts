import { useEffect, useRef, useState, useCallback } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { api } from '@ct/shared/api/client'
import { useFeatures } from '@ct/shared/hooks/useFeatures'
import { reconnectDelay, shouldReconnect, WS_RECONNECT_CAP_MS } from '@ct/shared/hooks/useChat'
import type { VaultSyncStatus } from '@ct/shared/types'

type SyncState = 'synced' | 'syncing' | 'conflict' | 'error' | 'disconnected'

interface UseSyncResult {
  state: SyncState
  lastSynced: string | null
  conflicts: VaultSyncStatus['conflicts']
}

export function useVaultSync(): UseSyncResult {
  const [state, setState] = useState<SyncState>('disconnected')
  const [lastSynced, setLastSynced] = useState<string | null>(null)
  const [conflicts, setConflicts] = useState<VaultSyncStatus['conflicts']>([])
  const wsRef = useRef<WebSocket | null>(null)
  const retryRef = useRef(0)
  const retryTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const queryClient = useQueryClient()
  const { vault_sync: vaultSyncEnabled } = useFeatures()

  const isMounted = useRef(true)

  const connect = useCallback(() => {
    const protocol = location.protocol === 'https:' ? 'wss' : 'ws'
    const ws = new WebSocket(`${protocol}://${location.host}/ws/sync`)
    wsRef.current = ws

    ws.onopen = () => {
      retryRef.current = 0
      setState('synced')
    }
    ws.onclose = (evt) => {
      if (!isMounted.current) return
      setState('disconnected')
      // 1008 (not entitled / not signed in) and 1000 (clean close) are terminal:
      // retrying either just re-asks a question already answered. Everything
      // else backs off with jitter so a restarting backend isn't stampeded.
      if (!shouldReconnect(evt.code)) return
      retryTimerRef.current = setTimeout(
        connect,
        reconnectDelay(retryRef.current, { base: 5000, cap: WS_RECONNECT_CAP_MS }),
      )
      retryRef.current += 1
    }
    ws.onerror = () => setState('error')

    ws.onmessage = (evt) => {
      try {
        const event = JSON.parse(evt.data)
        if (event.type === 'ping') return

        if (event.type === 'vault_updated') {
          setLastSynced(new Date().toISOString())
          setState('synced')
          // Invalidate area queries so UI refreshes
          queryClient.invalidateQueries({ queryKey: [event.area] })
        } else if (event.type === 'conflict_detected') {
          setState('conflict')
          setConflicts(prev => [...prev, { id: event.conflict_id, path: event.path }])
        } else if (event.type === 'sync_error') {
          setState('error')
        } else if (event.type === 'sync_complete') {
          setState('synced')
          setLastSynced(new Date().toISOString())
        }
      } catch (e) {
        console.error("Failed to parse sync WS message:", e)
      }
    }
  }, [queryClient])

  useEffect(() => {
    // Vault sync is a self-host-only feature; skip entirely when disabled.
    if (!vaultSyncEnabled) {
      setState('disconnected')
      return
    }
    isMounted.current = true
    connect()
    // Seed lastSynced/conflicts from the REST status so the chip doesn't show
    // "Synced Never" until the first live WS event arrives
    api.get<VaultSyncStatus>('/sync/status')
      .then(r => {
        if (!isMounted.current) return
        if (r.data.last_synced) {
          // Backend emits naive UTC timestamps — mark as UTC so JS doesn't parse as local
          const ts = r.data.last_synced
          setLastSynced(/Z$|[+-]\d{2}:\d{2}$/.test(ts) ? ts : ts + 'Z')
        }
        if (r.data.conflicts?.length) setConflicts(r.data.conflicts)
      })
      .catch(() => {})
    return () => {
      isMounted.current = false
      if (retryTimerRef.current) clearTimeout(retryTimerRef.current)
      wsRef.current?.close()
    }
  }, [connect, vaultSyncEnabled])

  return { state, lastSynced, conflicts }
}
