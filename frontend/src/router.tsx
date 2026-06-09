import { lazy, Suspense } from 'react'
import { createBrowserRouter, Navigate } from 'react-router-dom'
import { AnimatePresence } from 'framer-motion'
import { AppShell } from '@/components/layout/AppShell'
import { RouteErrorBoundary } from '@/components/RouteErrorBoundary'
import { PageTransition } from '@/components/PageTransition'
import { Skeleton } from '@/components/ui/skeleton'
import { useAuthStore } from '@/stores/authStore'

// Lazy-load all pages for code splitting
const LoginPage = lazy(() => import('@/pages/LoginPage').then(m => ({ default: m.LoginPage })))
const DashboardPage = lazy(() => import('@/pages/DashboardPage').then(m => ({ default: m.DashboardPage })))
const ChatPage = lazy(() => import('@/pages/ChatPage').then(m => ({ default: m.ChatPage })))
const AgentsPage = lazy(() => import('@/pages/AgentsPage').then(m => ({ default: m.AgentsPage })))
const IntegrationsPage = lazy(() => import('@/pages/IntegrationsPage').then(m => ({ default: m.IntegrationsPage })))
const SettingsPage = lazy(() => import('@/pages/SettingsPage').then(m => ({ default: m.SettingsPage })))
const FinancePage = lazy(() => import('@/pages/areas/FinancePage').then(m => ({ default: m.FinancePage })))
const HealthPage = lazy(() => import('@/pages/areas/HealthPage').then(m => ({ default: m.HealthPage })))
const CareerPage = lazy(() => import('@/pages/areas/CareerPage').then(m => ({ default: m.CareerPage })))
const BusinessPage = lazy(() => import('@/pages/areas/BusinessPage').then(m => ({ default: m.BusinessPage })))
const ContentPage = lazy(() => import('@/pages/areas/ContentPage').then(m => ({ default: m.ContentPage })))

function PageLoader() {
  return (
    <div className="p-4 sm:p-6 space-y-4">
      <Skeleton className="h-8 w-40" />
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-28" />)}
      </div>
    </div>
  )
}

function RequireAuth({ children }: { children: React.ReactNode }) {
  const isAuthenticated = useAuthStore(s => s.isAuthenticated)
  if (!isAuthenticated) return <Navigate to="/login" replace />
  return <>{children}</>
}

function Page({ children }: { children: React.ReactNode }) {
  return (
    <RouteErrorBoundary>
      <Suspense fallback={<PageLoader />}>
        <PageTransition>{children}</PageTransition>
      </Suspense>
    </RouteErrorBoundary>
  )
}

export const router = createBrowserRouter([
  { path: '/login', element: <Page><LoginPage /></Page> },
  {
    element: (
      <RequireAuth>
        <AppShell />
      </RequireAuth>
    ),
    children: [
      { path: '/', element: <Page><DashboardPage /></Page> },
      { path: '/chat', element: <Page><ChatPage /></Page> },
      { path: '/chat/:sessionId', element: <Page><ChatPage /></Page> },
      { path: '/agents', element: <Page><AgentsPage /></Page> },
      { path: '/areas/finance', element: <Page><FinancePage /></Page> },
      { path: '/areas/health', element: <Page><HealthPage /></Page> },
      { path: '/areas/career', element: <Page><CareerPage /></Page> },
      { path: '/areas/business', element: <Page><BusinessPage /></Page> },
      { path: '/areas/content', element: <Page><ContentPage /></Page> },
      { path: '/integrations', element: <Page><IntegrationsPage /></Page> },
      { path: '/settings', element: <Page><SettingsPage /></Page> },
      { path: '/areas', element: <Navigate to="/areas/finance" replace /> },
    ],
  },
])
