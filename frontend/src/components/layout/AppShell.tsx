import { useEffect } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import { AnimatePresence } from 'framer-motion'
import styled from 'styled-components'
import { Sidebar } from './Sidebar'
import { TopBar } from './TopBar'
import { BottomNav } from './BottomNav'
import { CommandPalette } from '@/components/CommandPalette'
import { GlobalCapture } from '@/components/GlobalCapture'
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts'
import { useNotifications } from '@/hooks/useNotifications'
import { useUIStore } from '@/stores/uiStore'

const MobileBackdrop = styled.div<{ $show: boolean }>`
  display: none;
  @media (max-width: 768px) {
    display: ${({ $show }) => $show ? 'block' : 'none'};
    position: fixed;
    inset: 0;
    background: rgba(45, 49, 58, 0.5);
    z-index: 199;
    backdrop-filter: blur(2px);
  }
`

const Root = styled.div`
  display: flex;
  height: 100vh;
  overflow: hidden;
  position: relative;
  background: 
    radial-gradient(ellipse 80% 60% at 90% -10%, ${({ theme }) => theme.color.accent}12, transparent 58%),
    radial-gradient(ellipse 70% 50% at -10% 105%, ${({ theme }) => theme.color.primary}12, transparent 55%),
    ${({ theme }) => theme.color.background};
  color: ${({ theme }) => theme.color.foreground};
`

const MainColumn = styled.div`
  flex: 1;
  display: flex;
  flex-direction: column;
  min-width: 0;
`

const ContentArea = styled.main`
  flex: 1;
  overflow-y: auto;
  outline: none;
  position: relative;
  
  @media (max-width: 768px) {
    padding-bottom: 72px; /* Prevent the 64px BottomNav from obscuring scrollable content */
  }
`

const SkipLink = styled.a`
  position: absolute;
  top: -1000px;
  left: 12px;
  z-index: 200;
  background: ${({ theme }) => theme.color.primary};
  color: ${({ theme }) => theme.color.primaryForeground};
  padding: 8px 16px;
  border-radius: 8px;
  box-shadow: 0 4px 16px rgba(45, 49, 58, 0.2);
  outline: 2px solid ${({ theme }) => theme.color.accent};
  
  &:focus {
    top: 12px;
  }
`

export function AppShell() {
  useKeyboardShortcuts()
  useNotifications()
  const location = useLocation()
  const { pushRecentPage, sidebarOpen, setSidebarOpen } = useUIStore()

  useEffect(() => {
    pushRecentPage(location.pathname)
    // Close mobile sidebar on navigation
    setSidebarOpen(false)
  }, [location.pathname]) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <Root>
      <SkipLink href="#main-content">Skip to content</SkipLink>

      <MobileBackdrop $show={sidebarOpen} onClick={() => setSidebarOpen(false)} />
      <Sidebar />
      
      <MainColumn>
        <TopBar />
        
        <ContentArea id="main-content" tabIndex={-1}>
          <AnimatePresence mode="wait">
            <Outlet key={location.pathname} />
          </AnimatePresence>
        </ContentArea>
      </MainColumn>

      <CommandPalette />
      <GlobalCapture />
      <BottomNav />
    </Root>
  )
}
