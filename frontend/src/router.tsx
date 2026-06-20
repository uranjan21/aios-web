import { lazy, Suspense, useEffect } from 'react'
import { createBrowserRouter, Navigate } from 'react-router-dom'
import { AppShell } from '@/components/layout/AppShell'
import { RouteErrorBoundary } from '@/components/RouteErrorBoundary'
import { PageTransition } from '@/components/PageTransition'
import { Skeleton } from '@/components/ui/skeleton'
import { useAuthStore } from '@/stores/authStore'
import { api } from '@/api/client'
import { PlaceholderPage } from '@/pages/areas/Placeholders'

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

// Guide Pages
const GuideLayout = lazy(() => import('@/pages/guide/GuideLayout').then(m => ({ default: m.GuideLayout })))
const GuideOverview = lazy(() => import('@/pages/guide/GuideOverview').then(m => ({ default: m.GuideOverview })))
const ChatGuide = lazy(() => import('@/pages/guide/ChatGuide').then(m => ({ default: m.ChatGuide })))
const AgentsGuide = lazy(() => import('@/pages/guide/AgentsGuide').then(m => ({ default: m.AgentsGuide })))
const FinanceGuide = lazy(() => import('@/pages/guide/FinanceGuide').then(m => ({ default: m.FinanceGuide })))
const HealthGuide = lazy(() => import('@/pages/guide/HealthGuide').then(m => ({ default: m.HealthGuide })))
const CareerGuide = lazy(() => import('@/pages/guide/CareerGuide').then(m => ({ default: m.CareerGuide })))
const BusinessGuide = lazy(() => import('@/pages/guide/BusinessGuide').then(m => ({ default: m.BusinessGuide })))
const ContentGuide = lazy(() => import('@/pages/guide/ContentGuide').then(m => ({ default: m.ContentGuide })))

function PageLoader() {
  return (
    <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <Skeleton style={{ height: '32px', width: '160px', borderRadius: '8px' }} />
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '16px' }}>
        {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} style={{ height: '112px', borderRadius: '12px' }} />)}
      </div>
    </div>
  )
}

function RequireAuth({ children }: { children: React.ReactNode }) {
  const isAuthenticated = useAuthStore(s => s.isAuthenticated)
  const logout = useAuthStore(s => s.logout)

  useEffect(() => {
    if (!isAuthenticated) return
    api.get('/auth/me').catch((err) => {
      if (err?.response?.status === 401) logout()
    })
  }, [isAuthenticated, logout])

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
  { path: '/login', element: <Page><LoginPage /></Page>, errorElement: <RouteErrorBoundary /> },
  {
    element: (
      <RequireAuth>
        <AppShell />
      </RequireAuth>
    ),
    errorElement: <RouteErrorBoundary />,
    children: [
      { path: '/', element: <Page><DashboardPage /></Page> },
      { path: '/chat', element: <Page><ChatPage /></Page> },
      { path: '/chat/:sessionId', element: <Page><ChatPage /></Page> },
      { path: '/agents', element: <Page><AgentsPage /></Page> },
      
      // Finance Area
      { path: '/areas/finance', element: <Page><FinancePage /></Page> },

      
      // Health Area
      { path: '/areas/health', element: <Page><HealthPage /></Page> },

      // Career Area
      // { path: '/areas/career', element: <Page><CareerPage /></Page> },

      // Business Area
      // { path: '/areas/business', element: <Page><BusinessPage /></Page> },

      // Content Area
      // { path: '/areas/content', element: <Page><ContentPage /></Page> },
      
      // System
      { path: '/integrations', element: <Page><IntegrationsPage /></Page> },
      { path: '/settings', element: <Page><SettingsPage /></Page> },
      
      // Guide
      { 
        path: '/guide', 
        element: <Page><GuideLayout /></Page>,
        children: [
          { index: true, element: <GuideOverview /> },
          { path: 'chat', element: <ChatGuide /> },
          { path: 'agents', element: <AgentsGuide /> },
          { path: 'areas/finance', element: <FinanceGuide /> },
          { path: 'areas/health', element: <HealthGuide /> },
          { path: 'areas/career', element: <CareerGuide /> },
          { path: 'areas/business', element: <BusinessGuide /> },
          { path: 'areas/content', element: <ContentGuide /> },
        ]
      },

      { path: '/areas', element: <Navigate to="/areas/finance" replace /> },
      { path: '*', element: <Navigate to="/" replace /> },
    ],
  },
], {
  future: {
    v7_relativeSplatPath: true,
  },
})
