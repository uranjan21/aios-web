import { lazy, Suspense, useEffect } from 'react'
import { createBrowserRouter, Navigate, useSearchParams } from 'react-router-dom'
import { AppShell } from '@/components/layout/AppShell'
import { RouteErrorBoundary } from '@/components/RouteErrorBoundary'
import { PageTransition } from '@/components/PageTransition'
import { Spinner } from '@ledgr/ui'
import { useAuthStore } from '@ct/shared/stores/authStore'
import { api } from '@ct/shared/api/client'
import { identify } from '@ct/shared/lib/analytics'

// Lazy-load all pages for code splitting
const LoginPage = lazy(() => import('@/pages/LoginPage').then(m => ({ default: m.LoginPage })))
const DashboardPage = lazy(() => import('@/pages/DashboardPage').then(m => ({ default: m.DashboardPage })))
const AgentsPage = lazy(() => import('@/pages/AgentsPage').then(m => ({ default: m.AgentsPage })))
const SettingsPage = lazy(() => import('@/pages/SettingsPage').then(m => ({ default: m.SettingsPage })))
const OAuthCallbackPage = lazy(() => import('@/pages/OAuthCallbackPage').then(m => ({ default: m.OAuthCallbackPage })))
const GoogleAuthCallbackPage = lazy(() => import('@/pages/GoogleAuthCallbackPage').then(m => ({ default: m.GoogleAuthCallbackPage })))
const FinancePage = lazy(() => import('@ct/finance/pages/FinancePage').then(m => ({ default: m.FinancePage })))
const FinanceSettingsPage = lazy(() => import('@ct/finance/pages/FinanceSettingsPage').then(m => ({ default: m.FinanceSettingsPage })))
const HealthPage = lazy(() => import('@ct/health/pages/HealthPage').then(m => ({ default: m.HealthPage })))
const HealthSettingsPage = lazy(() => import('@ct/health/pages/HealthSettingsPage').then(m => ({ default: m.HealthSettingsPage })))
const CareerPage = lazy(() => import('@ct/career/pages/CareerPage').then(m => ({ default: m.CareerPage })))
const CareerSettingsPage = lazy(() => import('@ct/career/pages/CareerSettingsPage').then(m => ({ default: m.CareerSettingsPage })))
const ReviewPage = lazy(() => import('@/pages/ReviewPage').then(m => ({ default: m.ReviewPage })))

const PlanPage = lazy(() => import('@/pages/PlanPage').then(m => ({ default: m.PlanPage })))
const WeekPlanPage = lazy(() => import('@/pages/WeekPlanPage').then(m => ({ default: m.WeekPlanPage })))

const ChatPage = lazy(() => import('@/pages/ChatPage').then(m => ({ default: m.ChatPage })))
const LandingPage = lazy(() => import('@/pages/LandingPage').then(m => ({ default: m.LandingPage })))
const VerifyEmailPage = lazy(() => import('@/pages/VerifyEmailPage').then(m => ({ default: m.VerifyEmailPage })))
const ForgotPasswordPage = lazy(() => import('@/pages/ForgotPasswordPage').then(m => ({ default: m.ForgotPasswordPage })))
const ResetPasswordPage = lazy(() => import('@/pages/ResetPasswordPage').then(m => ({ default: m.ResetPasswordPage })))
const PricingPage = lazy(() => import('@/pages/PricingPage').then(m => ({ default: m.PricingPage })))
const AdminPage = lazy(() => import('@/pages/AdminPage').then(m => ({ default: m.AdminPage })))
const DesignGalleryPage = lazy(() => import('@/pages/DesignGalleryPage').then(m => ({ default: m.DesignGalleryPage })))

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

import { useSubscription } from '@ct/shared/hooks/useSubscription'

function RequireAuth({ children }: { children: React.ReactNode }) {
  const isAuthenticated = useAuthStore(s => s.isAuthenticated)
  const logout = useAuthStore(s => s.logout)
  const setUser = useAuthStore(s => s.setUser)

  useEffect(() => {
    if (!isAuthenticated) return
    api.get('/auth/me')
      .then(({ data }) => {
        setUser(data)
        if (data?.id) identify(String(data.id))
      })
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

/**
 * /app/plan changed meaning on 2026-08-01: it is now the week planner, and the
 * goals/projects/sprints/tasks page it used to be lives under /app/workspace.
 * Old links carry `?view=goals` etc., which a static <Navigate> cannot read.
 */
function PlanRoute() {
  const [params] = useSearchParams()
  const view = params.get('view')
  if (view) return <Navigate to={`/app/workspace/${view}`} replace />
  return <WeekPlanPage />
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
  { path: '/forgot-password', element: <Page><ForgotPasswordPage /></Page>, errorElement: <RouteErrorBoundary /> },
  { path: '/reset-password', element: <Page><ResetPasswordPage /></Page>, errorElement: <RouteErrorBoundary /> },
  { path: '/auth/google/callback', element: <Page><GoogleAuthCallbackPage /></Page>, errorElement: <RouteErrorBoundary /> },
  // Google redirects here after a Connections (gmail/gcal/gfit/notion) consent —
  // must match the backend's redirect_uri exactly, which has no /app prefix.
  { path: '/integrations/:provider/callback', element: <Page><OAuthCallbackPage /></Page>, errorElement: <RouteErrorBoundary /> },
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
      // /app/plan is the week time-blocking planner as of 2026-08-01. The
      // goals/projects/sprints/tasks page it used to be now lives under
      // /app/workspace/* (PlanPage still backs those routes).
      { path: 'plan', element: <Page><PlanRoute /></Page> },
      { path: 'review', element: <Page><ReviewPage /></Page> },

      /*
       * ── Sub-page routes (2026-08-01) ──────────────────────────────────
       * Each area takes an optional `:section` segment; the page component
       * resolves it via `useAreaSection`. This replaces the `?tab=` query
       * param + the per-area ModuleSidebar, so every destination in the
       * two-level nav is a real, linkable URL.
       */

      // Finance Area
      { path: 'finance', element: <Page><RequireModule module="finance"><FinancePage /></RequireModule></Page> },
      { path: 'finance/settings', element: <Page><RequireModule module="finance"><FinanceSettingsPage /></RequireModule></Page> },
      { path: 'finance/:section', element: <Page><RequireModule module="finance"><FinancePage /></RequireModule></Page> },

      // Health Area
      { path: 'health', element: <Page><RequireModule module="health"><HealthPage /></RequireModule></Page> },
      { path: 'health/settings', element: <Page><RequireModule module="health"><HealthSettingsPage /></RequireModule></Page> },
      { path: 'health/:section', element: <Page><RequireModule module="health"><HealthPage /></RequireModule></Page> },

      // Career Area
      { path: 'career', element: <Page><RequireModule module="career"><CareerPage /></RequireModule></Page> },
      { path: 'career/settings', element: <Page><RequireModule module="career"><CareerSettingsPage /></RequireModule></Page> },
      { path: 'career/:section', element: <Page><RequireModule module="career"><CareerPage /></RequireModule></Page> },

      // Workspace — the four planning entities, promoted out of /app/plan's
      // `?view=` param into their own routes, plus Milestones (Phase 5).
      { path: 'workspace', element: <Navigate to="/app/workspace/projects" replace /> },
      { path: 'workspace/:section', element: <Page><PlanPage /></Page> },

      // System
      { path: 'settings', element: <Page><SettingsPage /></Page> },
      { path: 'settings/:section', element: <Page><SettingsPage /></Page> },
      { path: 'admin', element: <Page><RequireAdmin><AdminPage /></RequireAdmin></Page> },

      // Design gallery — every modular page from the canvas, sample data.
      // Deliberately absent from the nav tree; see DesignGalleryPage.
      { path: 'design', element: <Page><DesignGalleryPage /></Page> },
      { path: 'design/:key', element: <Page><DesignGalleryPage /></Page> },

      /*
       * ── Legacy redirects ──────────────────────────────────────────────
       * Everything that used to be a top-level path or a `?tab=`/`?view=`
       * value. `LegacyTabRedirect` handles the query-param forms, which a
       * static <Navigate> cannot read.
       */
      { path: 'goals', element: <Navigate to="/app/workspace/goals" replace /> },
      { path: 'projects', element: <Navigate to="/app/workspace/projects" replace /> },
      { path: 'sprints', element: <Navigate to="/app/workspace/sprints" replace /> },
      { path: 'tasks', element: <Navigate to="/app/workspace/tasks" replace /> },

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
