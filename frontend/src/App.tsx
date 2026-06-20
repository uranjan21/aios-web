import { RouterProvider } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Toaster } from 'sonner'
import { router } from './router'
import { ThemeProvider } from './components/ThemeProvider'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 30_000,
    },
  },
})

import { PageHeaderProvider } from '@ledgr/ui'

export function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <PageHeaderProvider>
          <RouterProvider router={router} future={{ v7_startTransition: true }} />
          <Toaster
            position="bottom-right"
            toastOptions={{
              style: {
                background: 'var(--color-card, #ffffff)',
                color: 'var(--color-cardForeground, #0f172a)',
                border: 'none',
                borderRadius: '16px',
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
