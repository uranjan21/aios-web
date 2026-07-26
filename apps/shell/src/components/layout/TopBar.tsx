import { NAV_ITEMS } from '@/config/navigation'
import { Sun, Moon, Search, Menu, Sparkles } from 'lucide-react'
import { NotificationBell } from '@/components/NotificationBell'
import { useLocation, useNavigate } from 'react-router-dom'
import { useUIStore } from '@ct/shared/stores/uiStore'
import { useAuthStore } from '@ct/shared/stores/authStore'
import { useSubscription } from '@ct/shared/hooks/useSubscription'
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from '@ledgr/ui'
import { ChevronDown } from 'lucide-react'
import { AccountMenuBody } from './AccountMenu'
import styled from 'styled-components'
import { TOPBAR_HEIGHT } from '@ct/shared/theme/layout'

const HeaderRoot = styled.header`
  position: relative;
  height: ${TOPBAR_HEIGHT};
  flex-shrink: 0;
  z-index: 30;
  border-bottom: 1px solid ${({ theme }) =>
    theme.mode === 'dark' ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.04)'};
  background: ${({ theme }) =>
    theme.mode === 'dark'
      ? 'linear-gradient(180deg, rgba(15, 17, 23, 0.85) 0%, rgba(15, 17, 23, 0.75) 100%)'
      : 'linear-gradient(180deg, rgba(255, 255, 255, 0.95) 0%, rgba(255, 255, 255, 0.85) 100%)'};
  backdrop-filter: blur(20px) saturate(180%);
  -webkit-backdrop-filter: blur(20px) saturate(180%);
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 ${({ theme }) => theme.spacing[5]};
  box-shadow: 0 4px 30px rgba(0, 0, 0, 0.03);
`

const LeftSide = styled.div`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing[4]};
`

const Hamburger = styled.button`
  padding: ${({ theme }) => `${theme.spacing[2]}`};
  margin-left: -8px;
  background: transparent;
  border: none;
  color: ${({ theme }) => theme.color.foreground};
  cursor: pointer;
  border-radius: ${({ theme }) => theme.radii.full};
  
  &:hover { background: ${({ theme }) =>
    theme.mode === 'dark' ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.05)'}; }
  
  @media ${({ theme }) => theme.media.md} {
    display: none;
  }
`

const TopNavLinks = styled.nav`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => `${theme.spacing[2]}`};
  
  @media ${({ theme }) => theme.media.belowMd} {
    display: none;
  }
  
  .nav-link {
    position: relative;
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 6px 14px;
    border-radius: 9999px;
    color: ${({ theme }) => theme.color.mutedForeground};
    text-decoration: none;
    font-size: 13px;
    font-weight: 500;
    transition: all 200ms cubic-bezier(0.4, 0, 0.2, 1);
    background: transparent;
    border: 1px solid transparent;
    cursor: pointer;

    &:hover, &[data-state="open"] {
      color: ${({ theme }) => theme.color.foreground};
      background: ${({ theme }) =>
        theme.mode === 'dark' ? 'rgba(255, 255, 255, 0.04)' : 'rgba(0, 0, 0, 0.02)'};
    }

    &:hover {
      transform: scale(1.02);
    }

    &.active {
      color: ${({ theme }) => theme.color.foreground};
      background: ${({ theme }) =>
        theme.mode === 'dark' ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.04)'};
      border-color: ${({ theme }) =>
        theme.mode === 'dark' ? 'rgba(255, 255, 255, 0.12)' : 'rgba(0, 0, 0, 0.06)'};
      font-weight: 600;
      box-shadow: 0 2px 10px rgba(0, 0, 0, 0.02);
    }

    svg {
      width: 14px;
      height: 14px;
      opacity: 0.8;
      transition: transform 200ms ease;
    }
  }
`

const StyledDropdownContent = styled(DropdownMenuContent)`
  min-width: 200px;
  border-radius: ${({ theme }) => theme.radii.lg};
  background: ${({ theme }) =>
    theme.mode === 'dark'
      ? 'rgba(15, 17, 23, 0.72)'
      : 'rgba(255, 255, 255, 0.75)'};
  backdrop-filter: blur(24px) saturate(180%);
  -webkit-backdrop-filter: blur(24px) saturate(180%);
  border: 1px solid ${({ theme }) =>
    theme.mode === 'dark' ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.05)'};
  box-shadow: 0 12px 40px rgba(0, 0, 0, 0.12), 0 4px 16px rgba(0, 0, 0, 0.04);
  padding: 6px;
`

const StyledDropdownItem = styled(DropdownMenuItem)<{ $active?: boolean }>`
  padding: ${({ theme }) => `${theme.spacing[2]} ${theme.spacing[3]}`};
  margin: 2px;
  cursor: pointer;
  border-radius: ${({ theme }) => theme.radii.md};
  transition: all 150ms ease;
  display: flex;
  align-items: center;
  gap: 12px;
  color: ${({ theme }) => theme.color.foreground};
  font-size: 13px;
  font-weight: 500;

  &:hover {
    background: ${({ theme }) =>
      theme.mode === 'dark' ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.03)'};
  }

  ${({ $active, theme }) => $active && `
    background: ${theme.mode === 'dark' ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.05)'};
    font-weight: 600;
  `}

  svg {
    width: 15px;
    height: 15px;
    color: ${({ theme }) => theme.color.mutedForeground};
  }
  
  &:hover svg, ${({ $active }) => $active && '& svg'} {
    color: ${({ theme }) => theme.color.foreground};
  }
`

const LogoBadge = styled.div`
  width: 32px;
  height: 32px;
  flex-shrink: 0;
  border-radius: ${({ theme }) => theme.radii.lg};
  background: linear-gradient(135deg, ${({ theme }) => theme.color.accent}33 0%, ${({ theme }) => theme.color.accent}10 100%);
  color: ${({ theme }) => theme.color.accent};
  display: flex;
  align-items: center;
  justify-content: center;
  font-family: ${({ theme }) => theme.typography.fontFamily.display};
  font-size: 1rem;
  font-weight: 800;
  box-shadow: 0 4px 16px ${({ theme }) => theme.color.accent}2A;
  border: 1px solid ${({ theme }) => theme.color.accent}44;
  position: relative;
  transition: transform 200ms ease;
  margin-right: 12px;

  &:hover {
    transform: scale(1.05);
  }

  .sparkle {
    position: absolute;
    top: -2px;
    right: -2px;
    width: 8px;
    height: 8px;
    color: ${({ theme }) => theme.color.accent};
  }
`

const GlobalSearchContainer = styled.button`
  flex: 1;
  max-width: 24rem;
  height: 34px;
  position: relative;
  display: flex;
  align-items: center;
  padding: 0 16px;
  gap: 12px;
  border-radius: 9999px;
  background: ${({ theme }) =>
    theme.mode === 'dark' ? 'rgba(255, 255, 255, 0.04)' : 'rgba(0, 0, 0, 0.02)'};
  backdrop-filter: blur(12px);
  border: 1px solid ${({ theme }) =>
    theme.mode === 'dark' ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.06)'};
  color: ${({ theme }) => theme.color.mutedForeground};
  cursor: pointer;
  transition: all 250ms cubic-bezier(0.4, 0, 0.2, 1);
  box-shadow: inset 0 1px 2px rgba(0,0,0,0.02);
  margin-left: auto;

  &:hover {
    background: ${({ theme }) =>
      theme.mode === 'dark' ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.04)'};
    border-color: ${({ theme }) => theme.color.accent}66;
    box-shadow: 0 4px 16px ${({ theme }) => theme.color.accent}15;
    color: ${({ theme }) => theme.color.foreground};
    transform: translateY(-1px);
  }

  @media ${({ theme }) => theme.media.belowSm} {
    display: none;
    margin-left: 0;
  }

  .icon-search {
    width: 14px;
    height: 14px;
    flex-shrink: 0;
    opacity: 0.7;
  }

  .placeholder {
    font-size: 13px;
    font-weight: 400;
    flex: 1;
    text-align: left;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .shortcut-badge {
    font-size: 10px;
    font-weight: 600;
    padding: 2px 6px;
    border-radius: 999px;
    background: ${({ theme }) =>
      theme.mode === 'dark' ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.05)'};
    color: ${({ theme }) => theme.color.mutedForeground};
    border: 1px solid ${({ theme }) =>
      theme.mode === 'dark' ? 'rgba(255, 255, 255, 0.15)' : 'rgba(0, 0, 0, 0.08)'};
    letter-spacing: 0.05em;
  }
`

const RightCluster = styled.div`
  margin-left: auto;
  display: flex;
  align-items: center;
  gap: 12px;
`

const IconButton = styled.button`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 34px;
  height: 34px;
  border-radius: 9999px;
  background: ${({ theme }) =>
    theme.mode === 'dark' ? 'rgba(255, 255, 255, 0.03)' : 'rgba(0, 0, 0, 0.02)'};
  border: 1px solid ${({ theme }) =>
    theme.mode === 'dark' ? 'rgba(255, 255, 255, 0.06)' : 'rgba(0, 0, 0, 0.04)'};
  color: ${({ theme }) => theme.color.mutedForeground};
  cursor: pointer;
  transition: all 200ms cubic-bezier(0.4, 0, 0.2, 1);
  
  &:hover {
    background: ${({ theme }) =>
      theme.mode === 'dark' ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.06)'};
    color: ${({ theme }) => theme.color.foreground};
    border-color: ${({ theme }) => theme.color.accent}44;
    transform: translateY(-1px);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
  }
  
  svg {
    width: 15px;
    height: 15px;
  }
`

const AssistantPill = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 0 12px;
  height: 34px;
  border-radius: 9999px;
  background: linear-gradient(135deg, ${({ theme }) => theme.color.accent}1A 0%, ${({ theme }) => theme.color.accent}05 100%);
  border: 1px solid ${({ theme }) => theme.color.accent}33;
  color: ${({ theme }) => theme.color.accent};
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition: all 250ms cubic-bezier(0.4, 0, 0.2, 1);
  box-shadow: 0 2px 10px ${({ theme }) => theme.color.accent}11;

  &:hover {
    background: linear-gradient(135deg, ${({ theme }) => theme.color.accent}2A 0%, ${({ theme }) => theme.color.accent}0F 100%);
    box-shadow: 0 6px 20px ${({ theme }) => theme.color.accent}33;
    transform: translateY(-1px) scale(1.02);
    border-color: ${({ theme }) => theme.color.accent}55;
  }

  svg {
    width: 14px;
    height: 14px;
    filter: drop-shadow(0 2px 4px ${({ theme }) => theme.color.accent}66);
  }
`

export function TopBar() {
  const { theme, toggleTheme, setCmdPaletteOpen, toggleSidebar, toggleAssistant } = useUIStore()
  const location = useLocation()
  const navigate = useNavigate()
  const user = useAuthStore(s => s.user)

  // Use the same entitled logic as Sidebar to filter modules
  const { data: sub } = useSubscription()
  const entitled = sub?.entitled ?? []
  
  const visibleItems = NAV_ITEMS.filter(item => {
    if (item.adminOnly && !user?.is_admin) return false
    if (item.module && !user?.is_admin && !entitled.includes(item.module)) return false
    return true
  })

  const mainItems = visibleItems.filter(item => item.group === 'Main')
  const areaItems = visibleItems.filter(item => item.group === 'Areas')
  
  // Dashboard is always the first Main item (Today)
  const dashboardItem = mainItems.find(item => item.to === '/app')
  const workflowItems = mainItems.filter(item => item.to !== '/app')

  const isGroupActive = (items: typeof visibleItems) => {
    return items.some(item => location.pathname.startsWith(item.to) && (item.to !== '/app' || location.pathname === '/app'))
  }

  const renderDropdownGroup = (label: string, items: typeof visibleItems) => {
    const isActive = isGroupActive(items)
    return (
      <DropdownMenu>
        <DropdownMenuTrigger>
          <button type="button" className={`nav-link ${isActive ? 'active' : ''}`}>
            {label}
            <ChevronDown size={14} style={{ opacity: 0.6 }} />
          </button>
        </DropdownMenuTrigger>
        <StyledDropdownContent align="start">
          {items.map(item => {
            const Icon = item.icon
            const isItemActive = location.pathname.startsWith(item.to) && (item.to !== '/app' || location.pathname === '/app')
            return (
              <StyledDropdownItem 
                key={item.to}
                $active={isItemActive}
                onSelect={() => navigate(item.to)}
              >
                <Icon />
                <span>{item.label}</span>
              </StyledDropdownItem>
            )
          })}
        </StyledDropdownContent>
      </DropdownMenu>
    )
  }

  return (
    <HeaderRoot>
      <LeftSide>
        <LogoBadge>
          <Sparkles className="sparkle" />
          C
        </LogoBadge>

        <Hamburger aria-label="Open mobile menu" onClick={toggleSidebar}>
          <Menu size={18} />
        </Hamburger>

        <TopNavLinks aria-label="Main App Navigation">
          {dashboardItem && (
            <button
              type="button"
              className={`nav-link ${location.pathname === '/app' ? 'active' : ''}`}
              onClick={() => navigate(dashboardItem.to)}
            >
              <dashboardItem.icon />
              {dashboardItem.label}
            </button>
          )}
          
          {renderDropdownGroup('Areas', areaItems)}
          {renderDropdownGroup('Workflow', workflowItems)}
        </TopNavLinks>
      </LeftSide>

      <RightCluster>
        <GlobalSearchContainer onClick={() => setCmdPaletteOpen(true)} type="button" aria-label="Global search">
          <Search className="icon-search" />
          <span className="placeholder">Search anything...</span>
          <kbd className="shortcut-badge">⌘K</kbd>
        </GlobalSearchContainer>

        <AssistantPill onClick={toggleAssistant} title="Open AI Assistant (⌘J)">
          <Sparkles />
          <span>Ask AI</span>
        </AssistantPill>

        <IconButton onClick={toggleTheme} aria-label="Toggle theme" title="Toggle theme">
          {theme === 'dark' ? <Sun /> : <Moon />}
        </IconButton>
        
        <NotificationBell />

        <div style={{ marginLeft: 8 }}>
          <DropdownMenu>
            <DropdownMenuTrigger>
              <IconButton style={{ borderRadius: '50%', overflow: 'hidden', padding: 0 }} aria-label="User Menu">
                {user?.picture_url ? (
                  <img src={user.picture_url} alt="" referrerPolicy="no-referrer" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                ) : (
                  <span style={{ fontSize: 14, fontWeight: 600 }}>{(user?.name || 'U')[0].toUpperCase()}</span>
                )}
              </IconButton>
            </DropdownMenuTrigger>
            <AccountMenuBody side="bottom" align="end" />
          </DropdownMenu>
        </div>
      </RightCluster>
    </HeaderRoot>
  )
}

