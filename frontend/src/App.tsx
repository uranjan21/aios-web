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

export function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
      <RouterProvider router={router} />
      <Toaster
        position="bottom-right"
        toastOptions={{
          classNames: {
            toast: 'bg-card border border-border text-foreground text-sm',
            description: 'text-muted-foreground',
            actionButton: 'bg-primary text-primary-foreground',
          },
        }}
      />
      </ThemeProvider>
    </QueryClientProvider>
  )
}
