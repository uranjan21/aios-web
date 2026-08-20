import { lazy, Suspense, useEffect } from 'react'
import { createBrowserRouter, Navigate, useLocation, useSearchParams } from 'react-router-dom'
import { AppShell } from '@/components/layout/AppShell'
import { RouteErrorBoundary, RouteErrorElement } from '@/components/RouteErrorBoundary'
import { PageTransition } from '@/components/PageTransition'
import styled from 'styled-components'
import { SkeletonPage } from '@ledgr/ui'
import { PAGE_MAX_WIDTH } from '@ct/shared/theme/layout'
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

/*
 * Route-level fallback, shown while a lazy page chunk is in flight.
 *
 * This was a centred spinner + "Loading Control Tower…". A spinner is the
 * right shape when you cannot know what is coming; here we do know — every
 * destination behind it is a KPI strip over a module grid. So it draws that,
 * and the real page replaces it without the layout moving. The label stays as
 * a screen-reader announcement only: the skeleton already says "content", and
 * repeating it in visible text is noise.
 */
const PageLoaderRoot = styled.div`
  padding: ${({ theme }) => `${theme.spacing[6]} ${theme.spacing[6]} ${theme.spacing[8]}`};
  width: 100%;
  max-width: ${PAGE_MAX_WIDTH};
  margin: 0 auto;

  @media ${({ theme }) => theme.media.belowMd} {
    padding: ${({ theme }) => `${theme.spacing[4]} ${theme.spacing[3]} ${theme.spacing[6]}`};
  }
`

function PageLoader() {
  return (
    <PageLoaderRoot role="status" aria-busy="true" aria-label="Loading Control Tower">
      <SkeletonPage kpis={4} modules={[7, 5, 12]} />
    </PageLoaderRoot>
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
 * A redirect that carries the query string across.
 *
 * `<Navigate to="/x" />` drops `?section=accounts`, which would silently break
 * every deep link into a settings rail. Renaming a route is only safe if the
 * old URL keeps working *completely*, so the renames below go through this.
 */
function LegacyRedirect({ to }: { to: string }) {
  const { search, hash } = useLocation()
  return <Navigate to={`${to}${search}${hash}`} replace />
}

/**
 * /app/plan has now meant three things. Until 2026-08-01 it was the
 * goals/projects/sprints/tasks page (now /app/workspace/*); from then it was
 * the week planner; since 2026-08-05 the week planner lives at /app/week and
 * this path is redirect-only.
 *
 * Both generations of link have to land: `?view=goals` is the oldest form and
 * a static <Navigate> cannot read it, so it is resolved here first.
 */
function PlanRoute() {
  const [params] = useSearchParams()
  const view = params.get('view')
  if (view) return <Navigate to={`/app/workspace/${view}`} replace />
  return <LegacyRedirect to="/app/week" />
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
  { path: '/', element: <Page><LandingPage /></Page>, errorElement: <RouteErrorElement /> },
  { path: '/pricing', element: <Page><PricingPage /></Page>, errorElement: <RouteErrorElement /> },
  { path: '/login', element: <Page><LoginPage /></Page>, errorElement: <RouteErrorElement /> },

  { path: '/signup', element: <Page><LoginPage initialMode="signup" /></Page>, errorElement: <RouteErrorElement /> },
  { path: '/verify-email', element: <Page><VerifyEmailPage /></Page>, errorElement: <RouteErrorElement /> },
  { path: '/forgot-password', element: <Page><ForgotPasswordPage /></Page>, errorElement: <RouteErrorElement /> },
  { path: '/reset-password', element: <Page><ResetPasswordPage /></Page>, errorElement: <RouteErrorElement /> },
  { path: '/auth/google/callback', element: <Page><GoogleAuthCallbackPage /></Page>, errorElement: <RouteErrorElement /> },
  // Google redirects here after a Connections (gmail/gcal/gfit/notion) consent —
  // must match the backend's redirect_uri exactly, which has no /app prefix.
  { path: '/integrations/:provider/callback', element: <Page><OAuthCallbackPage /></Page>, errorElement: <RouteErrorElement /> },
  {
    element: <Page><LegalLayout /></Page>,
    errorElement: <RouteErrorElement />,
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
    errorElement: <RouteErrorElement />,
    children: [
      { index: true, element: <Page><DashboardPage /></Page> },
      { path: 'chat', element: <Page><RequireModule module="chat"><ChatPage /></RequireModule></Page> },
      { path: 'agents', element: <Page><RequireModule module="agents"><AgentsPage /></RequireModule></Page> },
      // The week time-blocking planner. Renamed from /app/plan on 2026-08-05
      // because that path had already meant two different pages; `plan` below
      // is now redirect-only and resolves both generations of old link.
      { path: 'week', element: <Page><WeekPlanPage /></Page> },
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
      /* Renamed from `finance/settings` on 2026-08-05 — the page holds
         accounts, categories and loan/bill defaults, which are setup, not app
         settings. The old path redirects WITH its query string, so
         `?section=accounts` deep links still land on the right rail tab. */
      { path: 'finance/setup', element: <Page><RequireModule module="finance"><FinanceSettingsPage /></RequireModule></Page> },
      { path: 'finance/settings', element: <LegacyRedirect to="/app/finance/setup" /> },
      /* Accounts and Loans left the sidebar on 2026-08-03 — Finance Setup's rail
         renders the very same components, so they were two paths to one page.
         These must sit BEFORE `finance/:section` or the param route swallows
         them and renders the old standalone page. */
      { path: 'finance/accounts', element: <Navigate to="/app/finance/setup?section=accounts" replace /> },
      { path: 'finance/loans', element: <Navigate to="/app/finance/setup?section=loans" replace /> },
      { path: 'finance/:section', element: <Page><RequireModule module="finance"><FinancePage /></RequireModule></Page> },

      // Health Area
      { path: 'health', element: <Page><RequireModule module="health"><HealthPage /></RequireModule></Page> },
      /* Renamed from `health/settings` on 2026-08-05: the page is one group of
         numeric targets (body, fitness, nutrition), not preferences. */
      { path: 'health/targets', element: <Page><RequireModule module="health"><HealthSettingsPage /></RequireModule></Page> },
      { path: 'health/settings', element: <LegacyRedirect to="/app/health/targets" /> },
      { path: 'health/:section', element: <Page><RequireModule module="health"><HealthPage /></RequireModule></Page> },

      // Career Area
      { path: 'career', element: <Page><RequireModule module="career"><CareerPage /></RequireModule></Page> },
      /* Career Settings held only the skills inventory, which is now its own
         destination (2026-08-03). Redirect rather than 404 an old bookmark. */
      { path: 'career/settings', element: <Navigate to="/app/career/skills" replace /> },
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
