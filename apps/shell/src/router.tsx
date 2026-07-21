import { lazy, Suspense, useEffect } from 'react'
import { createBrowserRouter, Navigate } from 'react-router-dom'
import { AppShell } from '@/components/layout/AppShell'
import { RouteErrorBoundary } from '@/components/RouteErrorBoundary'
import { PageTransition } from '@/components/PageTransition'
import { Spinner } from '@ledgr/ui'
import { useAuthStore } from '@aios/shared/stores/authStore'
import { api } from '@aios/shared/api/client'

// Lazy-load all pages for code splitting
const LoginPage = lazy(() => import('@/pages/LoginPage').then(m => ({ default: m.LoginPage })))
const DashboardPage = lazy(() => import('@/pages/DashboardPage').then(m => ({ default: m.DashboardPage })))
const AgentsPage = lazy(() => import('@/pages/AgentsPage').then(m => ({ default: m.AgentsPage })))
const SettingsPage = lazy(() => import('@/pages/SettingsPage').then(m => ({ default: m.SettingsPage })))
const OAuthCallbackPage = lazy(() => import('@/pages/OAuthCallbackPage').then(m => ({ default: m.OAuthCallbackPage })))
const GoogleAuthCallbackPage = lazy(() => import('@/pages/GoogleAuthCallbackPage').then(m => ({ default: m.GoogleAuthCallbackPage })))
const FinancePage = lazy(() => import('@aios/finance/pages/FinancePage').then(m => ({ default: m.FinancePage })))
const FinanceSettingsPage = lazy(() => import('@aios/finance/pages/FinanceSettingsPage').then(m => ({ default: m.FinanceSettingsPage })))
const HealthPage = lazy(() => import('@aios/health/pages/HealthPage').then(m => ({ default: m.HealthPage })))
const HealthSettingsPage = lazy(() => import('@aios/health/pages/HealthSettingsPage').then(m => ({ default: m.HealthSettingsPage })))
const CareerPage = lazy(() => import('@aios/career/pages/CareerPage').then(m => ({ default: m.CareerPage })))
const CareerSettingsPage = lazy(() => import('@aios/career/pages/CareerSettingsPage').then(m => ({ default: m.CareerSettingsPage })))
const ReviewPage = lazy(() => import('@/pages/ReviewPage').then(m => ({ default: m.ReviewPage })))

const PlanPage = lazy(() => import('@/pages/PlanPage').then(m => ({ default: m.PlanPage })))

const ChatPage = lazy(() => import('@/pages/ChatPage').then(m => ({ default: m.ChatPage })))
const LandingPage = lazy(() => import('@/pages/LandingPage').then(m => ({ default: m.LandingPage })))
const VerifyEmailPage = lazy(() => import('@/pages/VerifyEmailPage').then(m => ({ default: m.VerifyEmailPage })))
const PricingPage = lazy(() => import('@/pages/PricingPage').then(m => ({ default: m.PricingPage })))
const AdminPage = lazy(() => import('@/pages/AdminPage').then(m => ({ default: m.AdminPage })))

// Legal Pages
const LegalLayout = lazy(() => import('@/pages/legal/LegalLayout').then(m => ({ default: m.LegalLayout })))
const PrivacyPolicyPage = lazy(() => import('@/pages/legal/PrivacyPolicyPage').then(m => ({ default: m.PrivacyPolicyPage })))
const TermsOfServicePage = lazy(() => import('@/pages/legal/TermsOfServicePage').then(m => ({ default: m.TermsOfServicePage })))
const SupportPage = lazy(() => import('@/pages/legal/SupportPage').then(m => ({ default: m.SupportPage })))

function PageLoader() {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '60vh',
        gap: '16px',
        padding: '24px',
      }}
    >
      <Spinner size="lg" tone="primary" label="Loading AI OS…" />
      <span style={{ fontSize: '13px', color: 'var(--muted-foreground)', letterSpacing: '0.05em', textTransform: 'uppercase', fontWeight: 500 }}>
        Loading AI OS...
      </span>
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

import { useSubscription } from '@aios/shared/hooks/useSubscription'

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
  { path: '/verify-email', element: <Page><VerifyEmailPage /></Page>, errorElement: <RouteErrorBoundary /> },
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
      { path: 'agents', element: <Page><RequireModule module="agents"><AgentsPage /></RequireModule></Page> },
      { path: 'plan', element: <Page><PlanPage /></Page> },
      // The four workspace pages collapsed into /app/plan on 2026-07-21.
      // Redirects keep old links and bookmarks working.
      { path: 'goals', element: <Navigate to="/app/plan?view=goals" replace /> },
      { path: 'projects', element: <Navigate to="/app/plan?view=projects" replace /> },
      { path: 'sprints', element: <Navigate to="/app/plan?view=sprints" replace /> },
      { path: 'tasks', element: <Navigate to="/app/plan?view=tasks" replace /> },
      { path: 'review', element: <Page><ReviewPage /></Page> },

      // Finance Area
      { path: 'finance', element: <Page><RequireModule module="finance"><FinancePage /></RequireModule></Page> },
      { path: 'finance/settings', element: <Page><RequireModule module="finance"><FinanceSettingsPage /></RequireModule></Page> },

      // Health Area
      { path: 'health', element: <Page><RequireModule module="health"><HealthPage /></RequireModule></Page> },
      { path: 'health/settings', element: <Page><RequireModule module="health"><HealthSettingsPage /></RequireModule></Page> },

      // Career Area
      { path: 'career', element: <Page><RequireModule module="career"><CareerPage /></RequireModule></Page> },
      { path: 'career/settings', element: <Page><RequireModule module="career"><CareerSettingsPage /></RequireModule></Page> },

      // System
      { path: 'integrations/:provider/callback', element: <Page><OAuthCallbackPage /></Page> },
      { path: 'settings', element: <Page><SettingsPage /></Page> },
      { path: 'admin', element: <Page><RequireAdmin><AdminPage /></RequireAdmin></Page> },
      
      // Legacy /app/areas/* links.
      { path: 'areas', element: <Navigate to="/app/finance" replace /> },
      { path: 'areas/finance', element: <Navigate to="/app/finance" replace /> },
      { path: 'areas/health', element: <Navigate to="/app/health" replace /> },
      { path: 'areas/career', element: <Navigate to="/app/career" replace /> },
    ],
  },
  { path: '*', element: <Navigate to="/" replace /> },
], {
  future: {
    v7_relativeSplatPath: true,
  },
})
