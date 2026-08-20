import { RouterProvider } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MotionConfig } from 'framer-motion'
import { Toaster } from 'sonner'
import { router } from './router'
import { ThemeProvider } from './components/ThemeProvider'

/** Status of a rejected axios request, without importing axios here. */
function statusOf(error: unknown): number | undefined {
  return (error as { response?: { status?: number } } | null)?.response?.status
}

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 30_000,
      /*
       * The failure floor (F1, 2026-08-16). Call sites destructure with a
       * default — `const { data: goals = [] }` — so a failed request used to
       * render the EMPTY state: the user read "your data is gone" rather than
       * "the request failed". On an app holding finance and health records
       * that is the worst possible lie to tell.
       *
       * So a server/transport failure is thrown to the route's
       * RouteErrorBoundary instead of being silently swallowed. This is a
       * FLOOR, not the treatment: a surface that handles its own error opts
       * out with `meta: { inlineError: true }` and renders `<ErrorState
       * onRetry={refetch}>` in place, which is strictly better because it
       * stays recoverable without losing the rest of the page.
       *
       * 4xx are never thrown — 401 is already handled by the axios
       * interceptor (refresh, then redirect), 402 drives UpgradeWall, and
       * 403/404 are legitimate "not yours / not there" answers that a surface
       * may correctly render as empty.
       */
      throwOnError: (error, query) => {
        if (query.meta?.inlineError === true) return false
        const status = statusOf(error)
        return status === undefined || status >= 500
      },
    },
  },
})

import { PageHeaderProvider } from '@ledgr/ui'

export function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <PageHeaderProvider>
          {/*
            reducedMotion="user" makes EVERY framer-motion component in the tree
            honour prefers-reduced-motion, not just the ones written against the
            useMotion() hook. The 2026-07-21 audit found ~100 motion call sites
            ignoring the preference: the global CSS rule in GlobalStyles zeroes
            animation- and transition-duration, but framer-motion drives values
            in JS and is untouched by it. Wrapping here fixes all of them at
            once rather than requiring every call site to remember.

            useMotion() is still the right way to write NEW animation — it also
            collapses stagger delays and returns still variants — but this is
            the backstop for everything else, including third-party motion.
          */}
          <MotionConfig reducedMotion="user">
            <RouterProvider router={router} future={{ v7_startTransition: true }} />
          </MotionConfig>
          <Toaster
            position="bottom-right"
            toastOptions={{
              style: {
                background: 'var(--color-card, #ffffff)',
                color: 'var(--color-cardForeground, #0f172a)',
                border: 'none',
                borderRadius: '10px',
                boxShadow: '0 4px 12px rgba(45, 49, 58, 0.08), 0 2px 4px rgba(45, 49, 58, 0.04)',
                fontSize: '14px',
              },
              classNames: {
                description: 'toast-description',
                actionButton: 'toast-action',
              },
            }}
          />
        </PageHeaderProvider>
      </ThemeProvider>
    </QueryClientProvider>
  )
}
