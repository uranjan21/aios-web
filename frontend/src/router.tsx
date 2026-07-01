import { lazy, Suspense, useEffect } from 'react'
import { createBrowserRouter, Navigate } from 'react-router-dom'
import { AppShell } from '@/components/layout/AppShell'
import { RouteErrorBoundary } from '@/components/RouteErrorBoundary'
import { PageTransition } from '@/components/PageTransition'
import { Skeleton } from '@/components/ui/skeleton'
import { useAuthStore } from '@/stores/authStore'
import { api } from '@/api/client'

// Lazy-load all pages for code splitting
const LoginPage = lazy(() => import('@/pages/LoginPage').then(m => ({ default: m.LoginPage })))
const DashboardPage = lazy(() => import('@/pages/DashboardPage').then(m => ({ default: m.DashboardPage })))
const ChatPage = lazy(() => import('@/pages/ChatPage').then(m => ({ default: m.ChatPage })))
const AgentsPage = lazy(() => import('@/pages/AgentsPage').then(m => ({ default: m.AgentsPage })))
const IntegrationsPage = lazy(() => import('@/pages/IntegrationsPage').then(m => ({ default: m.IntegrationsPage })))
const SettingsPage = lazy(() => import('@/pages/SettingsPage').then(m => ({ default: m.SettingsPage })))
const OAuthCallbackPage = lazy(() => import('@/pages/OAuthCallbackPage').then(m => ({ default: m.OAuthCallbackPage })))
const GoogleAuthCallbackPage = lazy(() => import('@/pages/GoogleAuthCallbackPage').then(m => ({ default: m.GoogleAuthCallbackPage })))
const FinancePage = lazy(() => import('@/pages/areas/FinancePage').then(m => ({ default: m.FinancePage })))
const FinanceSettingsPage = lazy(() => import('@/pages/areas/FinanceSettingsPage').then(m => ({ default: m.FinanceSettingsPage })))
const HealthPage = lazy(() => import('@/pages/areas/HealthPage').then(m => ({ default: m.HealthPage })))
const HealthSettingsPage = lazy(() => import('@/pages/areas/HealthSettingsPage').then(m => ({ default: m.HealthSettingsPage })))
const CareerPage = lazy(() => import('@/pages/areas/CareerPage').then(m => ({ default: m.CareerPage })))
const CareerSettingsPage = lazy(() => import('@/pages/areas/CareerSettingsPage').then(m => ({ default: m.CareerSettingsPage })))
const BusinessPage = lazy(() => import('@/pages/areas/BusinessPage').then(m => ({ default: m.BusinessPage })))
const ContentPage = lazy(() => import('@/pages/areas/ContentPage').then(m => ({ default: m.ContentPage })))

const LandingPage = lazy(() => import('@/pages/LandingPage').then(m => ({ default: m.LandingPage })))
const PricingPage = lazy(() => import('@/pages/PricingPage').then(m => ({ default: m.PricingPage })))
const AdminPage = lazy(() => import('@/pages/AdminPage').then(m => ({ default: m.AdminPage })))

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

// Legal Pages
const LegalLayout = lazy(() => import('@/pages/legal/LegalLayout').then(m => ({ default: m.LegalLayout })))
const PrivacyPolicyPage = lazy(() => import('@/pages/legal/PrivacyPolicyPage').then(m => ({ default: m.PrivacyPolicyPage })))
const TermsOfServicePage = lazy(() => import('@/pages/legal/TermsOfServicePage').then(m => ({ default: m.TermsOfServicePage })))
const SupportPage = lazy(() => import('@/pages/legal/SupportPage').then(m => ({ default: m.SupportPage })))

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

function RequireAdmin({ children }: { children: React.ReactNode }) {
  const user = useAuthStore(s => s.user)
  const isAuthenticated = useAuthStore(s => s.isAuthenticated)
  if (!isAuthenticated) return <Navigate to="/login" replace />
  if (!user) return null  // wait for user profile to load before checking is_admin
  if (!user.is_admin) return <Navigate to="/app" replace />
  return <>{children}</>
}

import { useSubscription } from '@/hooks/useSubscription'

function RequireAuth({ children }: { children: React.ReactNode }) {
  const isAuthenticated = useAuthStore(s => s.isAuthenticated)
  const logout = useAuthStore(s => s.logout)
  const setUser = useAuthStore(s => s.setUser)

  useEffect(() => {
    if (!isAuthenticated) return
    api.get('/auth/me')
      .then(({ data }) => setUser(data))
      .catch((err) => {
        if (err?.response?.status === 401) logout()
      })
  }, [isAuthenticated, logout, setUser])

  if (!isAuthenticated) return <Navigate to="/login" replace />
  return <>{children}</>
}

/**
 * Module-based route guard (Phase 1). Reads the backend-resolved `entitled` set
 * — the single source of truth that already honours admins and billing-disabled
 * installs (both return all modules). This is UX only; the backend's
 * `require_module` is the real enforcement.
 */
function RequireModule({ children, module }: { children: React.ReactNode, module: string }) {
  const { data: sub, isLoading } = useSubscription()
  const user = useAuthStore(s => s.user)

  if (isLoading) return <PageLoader />
  if (user?.is_admin) return <>{children}</>

  const entitled = sub?.entitled ?? []
  if (entitled.includes(module)) return <>{children}</>
  return <Navigate to="/pricing" replace />
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
  { path: '/', element: <Page><LandingPage /></Page>, errorElement: <RouteErrorBoundary /> },
  { path: '/pricing', element: <Page><PricingPage /></Page>, errorElement: <RouteErrorBoundary /> },
  { path: '/login', element: <Page><LoginPage /></Page>, errorElement: <RouteErrorBoundary /> },
  { path: '/signup', element: <Page><LoginPage initialMode="signup" /></Page>, errorElement: <RouteErrorBoundary /> },
  { path: '/auth/google/callback', element: <Page><GoogleAuthCallbackPage /></Page>, errorElement: <RouteErrorBoundary /> },
  {
    element: <Page><LegalLayout /></Page>,
    errorElement: <RouteErrorBoundary />,
    children: [
      { path: '/privacy-policy', element: <PrivacyPolicyPage /> },
      { path: '/terms-of-service', element: <TermsOfServicePage /> },
      { path: '/support', element: <SupportPage /> },
    ]
  },
  {
    path: '/app',
    element: (
      <RequireAuth>
        <AppShell />
      </RequireAuth>
    ),
    errorElement: <RouteErrorBoundary />,
    children: [
      { index: true, element: <Page><DashboardPage /></Page> },
      { path: 'chat', element: <Page><RequireModule module="chat"><ChatPage /></RequireModule></Page> },
      { path: 'chat/:sessionId', element: <Page><RequireModule module="chat"><ChatPage /></RequireModule></Page> },
      { path: 'agents', element: <Page><RequireModule module="agents"><AgentsPage /></RequireModule></Page> },

      // Finance Area
      { path: 'areas/finance', element: <Page><RequireModule module="finance"><FinancePage /></RequireModule></Page> },
      { path: 'areas/finance/settings', element: <Page><RequireModule module="finance"><FinanceSettingsPage /></RequireModule></Page> },

      // Health Area
      { path: 'areas/health', element: <Page><RequireModule module="health"><HealthPage /></RequireModule></Page> },
      { path: 'areas/health/settings', element: <Page><RequireModule module="health"><HealthSettingsPage /></RequireModule></Page> },

      // Career Area
      { path: 'areas/career', element: <Page><RequireModule module="career"><CareerPage /></RequireModule></Page> },
      { path: 'areas/career/settings', element: <Page><RequireModule module="career"><CareerSettingsPage /></RequireModule></Page> },

      // Business Area
      { path: 'areas/business', element: <Page><RequireModule module="business"><BusinessPage /></RequireModule></Page> },

      // Content Area
      { path: 'areas/content', element: <Page><RequireModule module="content"><ContentPage /></RequireModule></Page> },
      
      // System
      { path: 'integrations', element: <Page><RequireModule module="integrations"><IntegrationsPage /></RequireModule></Page> },
      { path: 'integrations/:provider/callback', element: <Page><OAuthCallbackPage /></Page> },
      { path: 'settings', element: <Page><SettingsPage /></Page> },
      { path: 'admin', element: <Page><RequireAdmin><AdminPage /></RequireAdmin></Page> },
      
      // Guide
      { 
        path: 'guide', 
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

      { path: 'areas', element: <Navigate to="/app/areas/finance" replace /> },
    ],
  },
  { path: '*', element: <Navigate to="/" replace /> },
], {
  future: {
    v7_relativeSplatPath: true,
  },
})
