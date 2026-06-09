import { createBrowserRouter, Navigate } from 'react-router-dom'
import { AppShell } from '@/components/layout/AppShell'
import { LoginPage } from '@/pages/LoginPage'
import { DashboardPage } from '@/pages/DashboardPage'
import { ChatPage } from '@/pages/ChatPage'
import { AgentsPage } from '@/pages/AgentsPage'
import { IntegrationsPage } from '@/pages/IntegrationsPage'
import { SettingsPage } from '@/pages/SettingsPage'
import { FinancePage } from '@/pages/areas/FinancePage'
import { HealthPage } from '@/pages/areas/HealthPage'
import { CareerPage } from '@/pages/areas/CareerPage'
import { BusinessPage } from '@/pages/areas/BusinessPage'
import { ContentPage } from '@/pages/areas/ContentPage'
import { useAuthStore } from '@/stores/authStore'

function RequireAuth({ children }: { children: React.ReactNode }) {
  const isAuthenticated = useAuthStore(s => s.isAuthenticated)
  if (!isAuthenticated) return <Navigate to="/login" replace />
  return <>{children}</>
}

export const router = createBrowserRouter([
  { path: '/login', element: <LoginPage /> },
  {
    element: (
      <RequireAuth>
        <AppShell />
      </RequireAuth>
    ),
    children: [
      { path: '/', element: <DashboardPage /> },
      { path: '/chat', element: <ChatPage /> },
      { path: '/chat/:sessionId', element: <ChatPage /> },
      { path: '/agents', element: <AgentsPage /> },
      { path: '/areas/finance', element: <FinancePage /> },
      { path: '/areas/health', element: <HealthPage /> },
      { path: '/areas/career', element: <CareerPage /> },
      { path: '/areas/business', element: <BusinessPage /> },
      { path: '/areas/content', element: <ContentPage /> },
      { path: '/integrations', element: <IntegrationsPage /> },
      { path: '/settings', element: <SettingsPage /> },
      { path: '/areas', element: <Navigate to="/areas/finance" replace /> },
    ],
  },
])
