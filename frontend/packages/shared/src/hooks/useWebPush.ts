/**
 * Browser push subscription.
 *
 * Extracted from the old Settings → System status section when the 2026-08-01
 * IA retired it. The briefing preferences store a `channels.push` FLAG, but the
 * actual Web Push subscription is a separate browser-side handshake — service
 * worker registration, permission prompt, VAPID key, then POST /push/subscribe.
 * Setting the flag without this hook would enable a channel that can never
 * deliver.
 */
import { useCallback, useEffect, useState } from 'react'
import { api } from '../api/client'

/** VAPID keys arrive base64url-encoded; PushManager wants raw bytes. */
function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const raw = window.atob(base64)
  const out = new Uint8Array(raw.length)
  for (let i = 0; i < raw.length; i += 1) out[i] = raw.charCodeAt(i)
  return out
}

export interface WebPushState {
  /** False when the browser has no service worker or PushManager at all. */
  supported: boolean
  /** True when this browser currently holds a subscription. */
  subscribed: boolean
  busy: boolean
  subscribe: () => Promise<boolean>
  unsubscribe: () => Promise<boolean>
}

export function useWebPush(): WebPushState {
  const supported = typeof window !== 'undefined'
    && 'serviceWorker' in navigator
    && 'PushManager' in window

  const [subscribed, setSubscribed] = useState(false)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (!supported) return
    navigator.serviceWorker.getRegistration()
      .then(reg => reg?.pushManager.getSubscription())
      .then(sub => setSubscribed(!!sub))
      .catch(() => {})
  }, [supported])

  const subscribe = useCallback(async () => {
    if (!supported || busy) return false
    setBusy(true)
    try {
      const perm = await Notification.requestPermission()
      if (perm !== 'granted') return false
      const reg = await navigator.serviceWorker.register('/sw.js')
      const { data } = await api.get<{ public_key: string }>('/push/public-key')
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(data.public_key) as BufferSource,
      })
      await api.post('/push/subscribe', sub.toJSON())
      setSubscribed(true)
      return true
    } catch (e) {
      console.error('Push subscribe failed:', e)
      return false
    } finally {
      setBusy(false)
    }
  }, [supported, busy])

  const unsubscribe = useCallback(async () => {
    if (!supported || busy) return false
    setBusy(true)
    try {
      const reg = await navigator.serviceWorker.getRegistration()
      const sub = await reg?.pushManager.getSubscription()
      if (sub) {
        await api.post('/push/unsubscribe', { endpoint: sub.endpoint })
        await sub.unsubscribe()
      }
      setSubscribed(false)
      return true
    } catch (e) {
      console.error('Push unsubscribe failed:', e)
      return false
    } finally {
      setBusy(false)
    }
  }, [supported, busy])

  return { supported, subscribed, busy, subscribe, unsubscribe }
}
