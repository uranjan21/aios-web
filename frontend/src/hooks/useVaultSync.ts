import { useEffect, useRef, useState, useCallback } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import type { VaultSyncStatus } from '@/types'

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
  const queryClient = useQueryClient()

  const isMounted = useRef(true)

  const connect = useCallback(() => {
    const protocol = location.protocol === 'https:' ? 'wss' : 'ws'
    const ws = new WebSocket(`${protocol}://${location.host}/ws/sync`)
    wsRef.current = ws

    ws.onopen = () => setState('synced')
    ws.onclose = () => {
      if (!isMounted.current) return
      setState('disconnected')
      setTimeout(connect, 5000)
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
    isMounted.current = true
    connect()
    return () => {
      isMounted.current = false
      wsRef.current?.close()
    }
  }, [connect])

  return { state, lastSynced, conflicts }
}
