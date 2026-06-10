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
        colorPrimary: '#0D9488',
        colorLink: '#0D9488',
        borderRadius: 8,
        fontFamily: 'inherit',
        colorBgContainer: theme === 'dark' ? 'hsl(240 5% 11%)' : '#ffffff',
        colorBgElevated: theme === 'dark' ? 'hsl(240 6% 9%)' : '#ffffff',
        colorText: theme === 'dark' ? 'hsl(0 0% 93%)' : 'hsl(0 0% 9%)',
        colorTextSecondary: theme === 'dark' ? 'hsl(240 4% 57%)' : 'hsl(0 0% 44%)',
        colorBorder: theme === 'dark' ? 'hsl(240 5% 18%)' : 'hsl(36 9% 84%)',
        colorBorderSecondary: theme === 'dark' ? 'hsl(240 5% 18%)' : 'hsl(36 9% 84%)',
      }
    }}>
    <div className="flex h-[100dvh] overflow-hidden bg-background">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-50 focus:px-3 focus:py-1.5 focus:rounded-md focus:bg-primary focus:text-primary-foreground focus:text-sm focus:font-medium"
      >
        Skip to content
      </a>
      <Sidebar />
      <div className="flex flex-col flex-1 min-w-0">
        <TopBar />
        <main id="main-content" className="flex-1 overflow-y-auto pb-16 md:pb-0" tabIndex={-1}>
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
