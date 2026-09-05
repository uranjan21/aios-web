import { describe, it, expect } from 'vitest'
import {
  reconnectDelay,
  shouldReconnect,
  WS_CLOSE_NORMAL,
  WS_CLOSE_POLICY,
  WS_RECONNECT_CAP_MS,
} from './useChat'

/**
 * S16. Both WS hooks reconnected every 3s forever regardless of close code, so
 * a logged-out tab (backend closes 1008) hammered `/ws/chat` at 20 req/min and
 * an outage produced a thundering herd on recovery. The policy is pure and
 * lives beside the hooks precisely so it can be tested without a real socket.
 */
describe('shouldReconnect', () => {
  it('refuses to retry a policy close — retrying 1008 can never succeed', () => {
    expect(shouldReconnect(WS_CLOSE_POLICY)).toBe(false)
  })

  it('refuses to retry a normal close', () => {
    expect(shouldReconnect(WS_CLOSE_NORMAL)).toBe(false)
  })

  it('retries the codes that represent a transient failure', () => {
    // 1006 abnormal (the usual backend-restart code), 1011 server error,
    // 1012 service restart, 1013 try again later.
    for (const code of [1001, 1006, 1011, 1012, 1013]) {
      expect(shouldReconnect(code)).toBe(true)
    }
  })
})

describe('reconnectDelay', () => {
  const opts = { base: 3000, cap: WS_RECONNECT_CAP_MS }

  it('collapses to exactly base on the first attempt', () => {
    // attempt 0 → ceiling === base, so the jitter window has zero width.
    expect(reconnectDelay(0, { ...opts, random: () => 0 })).toBe(3000)
    expect(reconnectDelay(0, { ...opts, random: () => 1 })).toBe(3000)
  })

  it('doubles the ceiling per attempt', () => {
    expect(reconnectDelay(1, { ...opts, random: () => 1 })).toBe(6000)
    expect(reconnectDelay(2, { ...opts, random: () => 1 })).toBe(12000)
    expect(reconnectDelay(3, { ...opts, random: () => 1 })).toBe(24000)
  })

  it('clamps at the cap however long the outage lasts', () => {
    for (const attempt of [4, 10, 50, 1000]) {
      expect(reconnectDelay(attempt, { ...opts, random: () => 1 })).toBe(WS_RECONNECT_CAP_MS)
    }
  })

  it('never returns less than base — a blip still reconnects promptly', () => {
    for (const attempt of [0, 1, 5, 20]) {
      expect(reconnectDelay(attempt, { ...opts, random: () => 0 })).toBe(3000)
    }
  })

  it('spreads retries across the window rather than firing on one tick', () => {
    const delays = new Set(
      Array.from({ length: 200 }, () => reconnectDelay(4, opts)),
    )
    // With real randomness 200 draws over a 27s window must not collapse to one
    // value — that collapse is exactly the herd the jitter exists to prevent.
    expect(delays.size).toBeGreaterThan(50)
    for (const d of delays) {
      expect(d).toBeGreaterThanOrEqual(3000)
      expect(d).toBeLessThanOrEqual(WS_RECONNECT_CAP_MS)
    }
  })

  it('treats a negative attempt as the first one instead of shrinking below base', () => {
    expect(reconnectDelay(-3, { ...opts, random: () => 1 })).toBe(3000)
  })

  it('honours the vault hook’s slower base', () => {
    expect(reconnectDelay(1, { base: 5000, cap: WS_RECONNECT_CAP_MS, random: () => 1 })).toBe(10000)
  })
})
