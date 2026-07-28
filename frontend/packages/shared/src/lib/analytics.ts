/**
 * Product analytics + error reporting — both opt-in via Vite env vars.
 *
 * Nothing loads unless VITE_POSTHOG_KEY / VITE_SENTRY_DSN are set, so dev and
 * self-host stay silent. We instrument a deliberately tiny, fixed set of events
 * — the ones that answer "does the Gmail-transaction wedge actually activate
 * people?" — not a firehose.
 */
import posthog from 'posthog-js'
import * as Sentry from '@sentry/react'

/** The complete, closed set of product events. Add here, nowhere else. */
export type AnalyticsEvent =
  | 'signup'
  | 'onboarding_completed'
  | 'first_entry_logged'
  | 'gmail_connected'
  | 'pending_txn_approved'

// The root tsconfig doesn't pull in `vite/client`, so `import.meta.env` isn't
// typed here. Vite still statically replaces these at build time.
const env = (import.meta as unknown as { env?: Record<string, string | undefined> }).env ?? {}
const POSTHOG_KEY = env.VITE_POSTHOG_KEY
const POSTHOG_HOST = env.VITE_POSTHOG_HOST || 'https://us.i.posthog.com'
const SENTRY_DSN = env.VITE_SENTRY_DSN

let posthogReady = false

export function initAnalytics(): void {
  if (SENTRY_DSN) {
    Sentry.init({
      dsn: SENTRY_DSN,
      environment: env.MODE,
      // No session replay / PII: this app renders financial and health data.
      tracesSampleRate: 0,
      sendDefaultPii: false,
    })
  }
  if (POSTHOG_KEY) {
    posthog.init(POSTHOG_KEY, {
      api_host: POSTHOG_HOST,
      capture_pageview: true,
      autocapture: false,        // explicit events only — no accidental DOM capture of financial fields
      persistence: 'localStorage',
    })
    posthogReady = true
  }
}

/** Tie subsequent events to a user. Call on login / session restore. */
export function identify(userId: string): void {
  if (posthogReady) posthog.identify(userId)
  if (SENTRY_DSN) Sentry.setUser({ id: userId })
}

/** Clear identity on logout. */
export function resetAnalytics(): void {
  if (posthogReady) posthog.reset()
  if (SENTRY_DSN) Sentry.setUser(null)
}

/** Record one of the fixed product events. No-op when analytics is off. */
export function track(event: AnalyticsEvent, props?: Record<string, unknown>): void {
  if (posthogReady) posthog.capture(event, props)
}

/**
 * Fire an event at most once per browser (for "first X" activation events).
 * Guarded by localStorage so it survives reloads but doesn't need server state.
 */
export function trackOnce(event: AnalyticsEvent, props?: Record<string, unknown>): void {
  const key = `ct.evt.${event}`
  try {
    if (localStorage.getItem(key)) return
    localStorage.setItem(key, '1')
  } catch {
    // localStorage unavailable (private mode) — fall through and just fire.
  }
  track(event, props)
}

/** Report a handled error. No-op when Sentry is off. */
export function captureError(err: unknown, context?: Record<string, unknown>): void {
  if (SENTRY_DSN) Sentry.captureException(err, context ? { extra: context } : undefined)
}
