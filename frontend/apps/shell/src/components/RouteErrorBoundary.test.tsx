import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ThemeProvider } from 'styled-components'
import { QueryClient, QueryClientProvider, useQuery } from '@tanstack/react-query'
import { ctLightTheme } from '@ct/shared/theme/ctTheme'
import { RouteErrorBoundary } from './RouteErrorBoundary'

/**
 * F1 — the failure floor.
 *
 * Call sites destructure with a default (`const { data: goals = [] }`), so
 * before 2026-08-16 a failed request rendered the EMPTY state: on an app
 * holding someone's finance and health records, "your data is gone" is the
 * worst available lie. The floor throws server/transport failures to this
 * boundary instead.
 *
 * The half that matters most is the NEGATIVE one: a 4xx must NOT throw. 401 is
 * already owned by the axios refresh interceptor, 428 drives the "add your API
 * key" prompt, and 403/404 are legitimate "not yours / not there" answers a
 * surface may correctly render as empty. Throwing those would replace a real
 * answer with a full-page error.
 *
 * NOTE: the predicate itself lives inline in `App.tsx` and is not exported, so
 * these tests exercise it through a QueryClient configured the way a surface
 * sees it. See the handoff in the agent report — extracting it to
 * `@ct/shared/lib` would let the shipped predicate be tested directly.
 */

/** The shipped policy, as a QueryClient sees it. */
function statusOf(error: unknown): number | undefined {
  return (error as { response?: { status?: number } } | null)?.response?.status
}

function makeClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        throwOnError: (error, query) => {
          if (query.meta?.inlineError === true) return false
          const status = statusOf(error)
          return status === undefined || status >= 500
        },
      },
    },
  })
}

/** A surface that renders the empty state on failure — the pre-F1 behaviour. */
function Surface({ status, inline }: { status?: number; inline?: boolean }) {
  const { data: items = [], isError } = useQuery({
    queryKey: ['things', status, inline],
    queryFn: () => Promise.reject(status === undefined
      ? new Error('Network Error')
      : { response: { status } }),
    ...(inline ? { meta: { inlineError: true } } : {}),
  })
  if (inline && isError) return <div>inline error, retry available</div>
  return <div>{items.length === 0 ? 'You have no things yet' : 'things'}</div>
}

function renderWithBoundary(node: React.ReactNode) {
  return render(
    <QueryClientProvider client={makeClient()}>
      <ThemeProvider theme={ctLightTheme}>
        <RouteErrorBoundary>{node}</RouteErrorBoundary>
      </ThemeProvider>
    </QueryClientProvider>,
  )
}

/** The boundary and React both log to console.error on a caught throw. */
beforeEach(() => { vi.spyOn(console, 'error').mockImplementation(() => {}) })
afterEach(() => { cleanup(); vi.restoreAllMocks() })

describe('the failure floor — what reaches the boundary', () => {
  it('catches a 500 instead of letting the page claim the data is empty', async () => {
    renderWithBoundary(<Surface status={500} />)
    expect(await screen.findByText("We couldn't load this page")).toBeDefined()
    expect(screen.queryByText('You have no things yet')).toBeNull()
  })

  it('catches a transport failure with no HTTP status at all', async () => {
    renderWithBoundary(<Surface />)
    expect(await screen.findByText("We couldn't load this page")).toBeDefined()
  })

  it('does NOT throw a 403 — "not yours" is a real answer, not a page crash', async () => {
    renderWithBoundary(<Surface status={403} />)
    expect(await screen.findByText('You have no things yet')).toBeDefined()
    expect(screen.queryByText("We couldn't load this page")).toBeNull()
  })

  it('does NOT throw a 404, a 401 or a 428', async () => {
    for (const status of [401, 404, 428]) {
      const { unmount } = renderWithBoundary(<Surface status={status} />)
      expect(await screen.findByText('You have no things yet')).toBeDefined()
      expect(screen.queryByText("We couldn't load this page")).toBeNull()
      unmount()
    }
  })

  it('lets a surface opt out with meta.inlineError even on a 500', async () => {
    renderWithBoundary(<Surface status={500} inline />)
    // Strictly better than the floor: the failure is reported and recoverable
    // in place, without losing the rest of the page.
    expect(await screen.findByText('inline error, retry available')).toBeDefined()
    expect(screen.queryByText("We couldn't load this page")).toBeNull()
  })
})

describe('RouteErrorBoundary', () => {
  function Boom(): React.ReactElement {
    throw new Error('render exploded')
  }

  it('renders its children when nothing throws', () => {
    renderWithBoundary(<div>the page</div>)
    expect(screen.getByText('the page')).toBeDefined()
  })

  it('reassures the user their data is safe rather than implying loss', () => {
    renderWithBoundary(<Boom />)
    expect(screen.getByText(/Your data is safe/i)).toBeDefined()
  })

  it('announces the failure to assistive tech', () => {
    renderWithBoundary(<Boom />)
    // ErrorState carries role="alert"; without it a screen-reader user gets no
    // signal that the page swapped to an error.
    expect(screen.getByRole('alert')).toBeDefined()
  })

  it('offers a recovery action that actually reloads', async () => {
    const reload = vi.fn()
    const original = window.location
    Object.defineProperty(window, 'location', {
      configurable: true,
      value: { ...original, reload },
    })

    renderWithBoundary(<Boom />)
    await userEvent.click(screen.getByRole('button', { name: /reload/i }))
    expect(reload).toHaveBeenCalledTimes(1)

    Object.defineProperty(window, 'location', { configurable: true, value: original })
  })
})
