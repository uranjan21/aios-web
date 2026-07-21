import { useEffect, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { CheckCircle, XCircle, AlertCircle, RefreshCw, Bell, BellOff } from 'lucide-react'
import { toast } from 'sonner'
import styled, { useTheme } from 'styled-components'
import { api } from '@aios/shared/api/client'
import { useVaultSync } from '@aios/shared/hooks/useVaultSync'
import { useFeatures } from '@aios/shared/hooks/useFeatures'
import { Skeleton } from '@aios/shared/components/ui/skeleton'
import { Button, focusRing } from '@ledgr/ui'
import { Row, Section } from '../shared'

// ── Backend status ────────────────────────────────────────────────────────────

const StatusText = styled.span<{ $variant: 'success' | 'warning' }>`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => `${theme.spacing[1.5]}`};
  font-size: ${({ theme }) => theme.typography.fontSize.sm};
  font-weight: 500;
  color: ${({ theme, $variant }) => $variant === 'success' ? theme.color.success : theme.color.warning};
`

const RetryBtn = styled.button`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => `${theme.spacing[1.5]}`};
  font-size: ${({ theme }) => theme.typography.fontSize.sm};
  color: ${({ theme }) => theme.color.mutedForeground};
  background: none;
  border: none;
  cursor: pointer;
  border-radius: ${({ theme }) => theme.radii.xs};
  transition: color 120ms ease-in-out;
  &:hover { color: ${({ theme }) => theme.color.foreground}; }
  ${focusRing}
`

const SkelStatus = styled(Skeleton)`
  height: 1.25rem;
  width: 5rem;
`

function BackendStatus() {
  const theme = useTheme()
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['health'],
    queryFn: () => api.get<{ status: string; db: boolean }>('/health').then(r => r.data),
    refetchInterval: 30_000,
  })

  if (isLoading) return <SkelStatus />
  if (isError || !data) return (
    <RetryBtn onClick={() => refetch()}>
      <XCircle size={16} style={{ color: theme.color.mutedForeground }} />
      <span style={{ color: theme.color.mutedForeground }}>Offline</span>
      <RefreshCw size={12} />
    </RetryBtn>
  )

  const ok = data.status === 'ok' && data.db !== false
  return (
    <StatusText $variant={ok ? 'success' : 'warning'}>
      {ok ? <CheckCircle size={16} /> : <AlertCircle size={16} />}
      {ok ? 'Online' : 'DB unreachable'}
    </StatusText>
  )
}

// ── Push notifications ────────────────────────────────────────────────────────

const PushBtn = styled.button<{ $active: boolean; $busy: boolean }>`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => `${theme.spacing[1.5]}`};
  font-size: ${({ theme }) => theme.typography.fontSize.sm};
  padding: ${({ theme }) => `${theme.spacing[1.5]} ${theme.spacing[2.5]}`};
  border-radius: ${({ theme }) => theme.radii.xs};
  cursor: pointer;
  transition: all 120ms;
  opacity: ${({ $busy }) => $busy ? 0.6 : 1};
  ${({ theme, $active }) => $active ? `
    border: 1px solid ${theme.color.accent};
    background: color-mix(in srgb, ${theme.color.accent} 10%, transparent);
    color: ${theme.color.accent};
  ` : `
    border: 1px solid ${theme.color.border};
    background: transparent;
    color: ${theme.color.mutedForeground};
    &:hover { color: ${theme.color.foreground}; }
  `}
  ${focusRing}
`

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const raw = window.atob(base64)
  return Uint8Array.from([...raw].map(c => c.charCodeAt(0)))
}

function PushNotificationsRow() {
  const supported = 'serviceWorker' in navigator && 'PushManager' in window
  const [enabled, setEnabled] = useState(false)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (!supported) return
    navigator.serviceWorker.getRegistration()
      .then(reg => reg?.pushManager.getSubscription())
      .then(sub => setEnabled(!!sub))
      .catch(() => {})
  }, [supported])

  const toggle = async () => {
    if (!supported || busy) return
    setBusy(true)
    try {
      if (enabled) {
        const reg = await navigator.serviceWorker.getRegistration()
        const sub = await reg?.pushManager.getSubscription()
        if (sub) {
          await api.post('/push/unsubscribe', { endpoint: sub.endpoint })
          await sub.unsubscribe()
        }
        setEnabled(false)
        toast.success('Push notifications disabled')
      } else {
        const perm = await Notification.requestPermission()
        if (perm !== 'granted') { toast.error('Notification permission denied by browser'); return }
        const reg = await navigator.serviceWorker.register('/sw.js')
        const { data } = await api.get<{ public_key: string }>('/push/public-key')
        const sub = await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(data.public_key) as BufferSource,
        })
        await api.post('/push/subscribe', sub.toJSON())
        setEnabled(true)
        toast.success('Push notifications enabled')
      }
    } catch (e) {
      console.error('Push toggle failed:', e)
      toast.error('Failed to update push notifications')
    } finally {
      setBusy(false)
    }
  }

  return (
    <Row label="Push Notifications">
      {!supported ? (
        <span style={{ fontSize: 12, color: 'var(--muted-foreground)' }}>Not supported in this browser</span>
      ) : (
        <PushBtn onClick={toggle} disabled={busy} aria-pressed={enabled} $active={enabled} $busy={busy}>
          {enabled ? <Bell size={14} /> : <BellOff size={14} />}
          {enabled ? 'Enabled' : 'Disabled'}
        </PushBtn>
      )}
    </Row>
  )
}

// ── Vault sync row ────────────────────────────────────────────────────────────

const SyncStatusText = styled.span<{ $state: string }>`
  font-size: ${({ theme }) => theme.typography.fontSize.sm};
  font-weight: 500;
  color: ${({ theme, $state }) => {
    switch ($state) {
      case 'synced':
        return theme.color.success
      case 'syncing':
        return theme.color.accent
      case 'conflict':
        return theme.color.warning
      case 'error':
        return theme.color.destructive
      case 'disconnected':
      default:
        return theme.color.mutedForeground
    }
  }};
`

function VaultSyncRow() {
  const { vault_sync: vaultSyncEnabled } = useFeatures()
  const { state, lastSynced } = useVaultSync()
  const stateLabel = {
    synced: 'Synced', syncing: 'Syncing…', conflict: 'Conflict',
    error: 'Sync error', disconnected: 'Disconnected',
  }[state] ?? state

  // Vault sync is a self-host-only feature; hidden in hosted SaaS mode.
  if (!vaultSyncEnabled) return null

  return (
    <Row label="Vault Sync">
      <SyncStatusText $state={state}>
        {stateLabel}
      </SyncStatusText>
      {lastSynced && (
        <span style={{ fontSize: 12, color: 'var(--muted-foreground)' }}>
          {new Date(lastSynced).toLocaleTimeString()}
        </span>
      )}
    </Row>
  )
}

// ── System status section ─────────────────────────────────────────────────────

export function SystemStatusSection() {
  const queryClient = useQueryClient()
  return (
    <Section
      title="System Status"
      action={
        <Button
          size="sm"
          variant="ghost"
          onClick={() => {
            queryClient.invalidateQueries({ queryKey: ['health'] })
            toast.success('System status refreshed')
          }}
        >
          <RefreshCw size={12} style={{ marginRight: 4 }} /> Refresh
        </Button>
      }
    >
      <Row label="Backend"><BackendStatus /></Row>
      <VaultSyncRow />
      <PushNotificationsRow />
    </Section>
  )
}
