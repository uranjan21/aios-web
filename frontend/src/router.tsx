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
const HealthPage = lazy(() => import('@/pages/areas/HealthPage').then(m => ({ default: m.HealthPage })))
const CareerPage = lazy(() => import('@/pages/areas/CareerPage').then(m => ({ default: m.CareerPage })))
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

function RequirePlan({ children, allowed }: { children: React.ReactNode, allowed: string[] }) {
  const { data: sub, isLoading } = useSubscription()
  const user = useAuthStore(s => s.user)

  if (isLoading) return <PageLoader />
  if (user?.is_admin) return <>{children}</>

  const currentPlan = sub?.plan || 'free'
  if (!allowed.includes(currentPlan)) {
    return <Navigate to="/pricing" replace />
  }
  return <>{children}</>
}

function RequireArea({ children, area }: { children: React.ReactNode, area: string }) {
  const { data: sub, isLoading } = useSubscription()
  const user = useAuthStore(s => s.user)

  if (isLoading) return <PageLoader />
  if (user?.is_admin) return <>{children}</>

  const currentPlan = sub?.plan || 'free'
  const addons = sub?.addons || []

  // Household plan gets access to everything by default if owner bought them, 
  // but wait, Household users need to buy their own add-ons according to the grille-me answer.
  // So Household is treated just like Pro in terms of add-ons, or they get them if they have the add-on.

  // Free, Pro, Pro Plus, Household all have basic access to finance, health, career
  if (['finance', 'health', 'career'].includes(area)) {
    return <>{children}</>
  }

  // Business and Content require either the specific add-on OR they might be included in some other way.
  // Pro Plus base tier has them as add-ons.
  // So if area is 'business', they need 'business' in addons.
  if (['business', 'content'].includes(area)) {
    if (addons.includes(area)) {
      return <>{children}</>
    }
    return <Navigate to="/pricing" replace />
  }

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
      { path: 'chat', element: <Page><RequirePlan allowed={['pro', 'pro_plus', 'household']}><ChatPage /></RequirePlan></Page> },
      { path: 'chat/:sessionId', element: <Page><RequirePlan allowed={['pro', 'pro_plus', 'household']}><ChatPage /></RequirePlan></Page> },
      { path: 'agents', element: <Page><RequirePlan allowed={['pro', 'pro_plus', 'household']}><AgentsPage /></RequirePlan></Page> },
      
      // Finance Area
      { path: 'areas/finance', element: <Page><RequireArea area="finance"><FinancePage /></RequireArea></Page> },

      // Health Area
      { path: 'areas/health', element: <Page><RequireArea area="health"><HealthPage /></RequireArea></Page> },

      // Career Area
      { path: 'areas/career', element: <Page><RequireArea area="career"><CareerPage /></RequireArea></Page> },

      // Business Area
      { path: 'areas/business', element: <Page><RequireArea area="business"><BusinessPage /></RequireArea></Page> },

      // Content Area
      { path: 'areas/content', element: <Page><RequireArea area="content"><ContentPage /></RequireArea></Page> },
      
      // System
      { path: 'integrations', element: <Page><IntegrationsPage /></Page> },
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
