import { useEffect } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import { AnimatePresence } from 'framer-motion'
import { ConfigProvider } from 'antd'
import { Sidebar } from './Sidebar'
import { TopBar } from './TopBar'
import { BottomNav } from './BottomNav'
import { CommandPalette } from '@/components/CommandPalette'
import { GlobalCapture } from '@/components/GlobalCapture'
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts'
import { useNotifications } from '@/hooks/useNotifications'
import { useUIStore } from '@/stores/uiStore'

export function AppShell() {
  useKeyboardShortcuts()
  useNotifications()
  const location = useLocation()
  const { theme, pushRecentPage } = useUIStore()

  useEffect(() => {
    pushRecentPage(location.pathname)
  }, [location.pathname]) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <ConfigProvider theme={{
      token: {
        colorPrimary: theme === 'dark' ? '#fb8b24' : '#dd5912',
        colorLink: theme === 'dark' ? '#fb8b24' : '#dd5912',
        borderRadius: 16,
        fontFamily: 'inherit',
        colorBgContainer: theme === 'dark' ? 'hsl(26 16% 10%)' : 'hsl(42 45% 99%)',
        colorBgElevated: theme === 'dark' ? 'hsl(26 16% 12%)' : 'hsl(42 45% 99%)',
        colorText: theme === 'dark' ? 'hsl(38 32% 90%)' : 'hsl(26 32% 12%)',
        colorTextSecondary: theme === 'dark' ? 'hsl(33 14% 62%)' : 'hsl(28 14% 38%)',
        colorBorder: theme === 'dark' ? 'hsl(27 14% 17%)' : 'hsl(36 20% 85%)',
        colorBorderSecondary: theme === 'dark' ? 'hsl(27 14% 17%)' : 'hsl(36 20% 85%)',
      }
    }}>
    <div className="flex h-[100dvh] overflow-hidden bg-[hsl(var(--page-bg))]">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-50 focus:px-3 focus:py-1.5 focus:rounded-md focus:bg-primary focus:text-primary-foreground focus:text-sm focus:font-medium"
      >
        Skip to content
      </a>
      <Sidebar />
      <div className="flex flex-col flex-1 min-w-0 min-h-0">
        <TopBar />
        <main
          id="main-content"
          className="flex-1 overflow-y-auto pb-16 md:pb-0 relative"
          tabIndex={-1}
        >
          <AnimatePresence mode="wait">
            <Outlet key={location.pathname} />
          </AnimatePresence>
        </main>
      </div>
      <BottomNav />
      <CommandPalette />
      <GlobalCapture />
    </div>
    </ConfigProvider>
  )
}
