import { Component, type ReactNode } from 'react'
import { useRouteError } from 'react-router-dom'
import { ErrorState } from '@ledgr/ui'

interface State { hasError: boolean }

const FAILED_TITLE = "We couldn't load this page"
const FAILED_BODY = 'Your data is safe — the request to load it failed. Reload to try again.'

/**
 * The router's `errorElement`. It must be its OWN component: an `errorElement`
 * is rendered directly rather than wrapped around children, so pointing it at
 * the class boundary below rendered `props.children` — i.e. nothing at all —
 * on every route-level (loader / lazy-chunk) failure.
 */
export function RouteErrorElement() {
  const error = useRouteError()
  console.error('[RouteErrorElement]', error)
  return (
    <ErrorState
      fullHeight
      title={FAILED_TITLE}
      description={FAILED_BODY}
      retryLabel="Reload"
      onRetry={() => window.location.reload()}
    />
  )
}

/**
 * Last line of defence for a route.
 *
 * Since 2026-08-16 this also catches failed data queries: `App.tsx` throws any
 * 5xx/transport query error rather than letting the call site render it as an
 * empty state. It renders the same `ErrorState` a surface renders in place, so
 * "this failed" looks the same wherever it is caught — the difference is only
 * that recovery here costs a reload.
 */
export class RouteErrorBoundary extends Component<{ children?: ReactNode }, State> {
  state: State = { hasError: false }

  static getDerivedStateFromError() {
    return { hasError: true }
  }

  componentDidCatch(error: Error) {
    console.error('[RouteErrorBoundary]', error)
  }

  render() {
    if (this.state.hasError) {
      return (
        <ErrorState
          fullHeight
          title={FAILED_TITLE}
          description={FAILED_BODY}
          retryLabel="Reload"
          onRetry={() => window.location.reload()}
        />
      )
    }
    return this.props.children
  }
}
