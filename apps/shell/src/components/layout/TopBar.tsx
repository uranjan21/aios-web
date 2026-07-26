import { NAV_ITEMS, type NavItem } from '@/config/navigation'
import { Sun, Moon, Search, Menu, Sparkles } from 'lucide-react'
import { NotificationBell } from '@/components/NotificationBell'
import { useLocation, useNavigate } from 'react-router-dom'
import { useUIStore } from '@ct/shared/stores/uiStore'
import { useAuthStore } from '@ct/shared/stores/authStore'
import { useSubscription } from '@ct/shared/hooks/useSubscription'
import { DropdownMenu, DropdownMenuTrigger } from '@ledgr/ui'
import { AccountMenuBody } from './AccountMenu'
import styled from 'styled-components'
import { TOPBAR_HEIGHT } from '@ct/shared/theme/layout'

// Paths to surface as flat links in the TopBar (ordered). Items not entitled or
// not present in NAV_ITEMS are silently skipped.
const TOPBAR_NAV_PATHS = ['/app', '/app/finance', '/app/health', '/app/career', '/app/plan', '/app/chat']

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
  border-radius: ${({ theme }) => theme.radii.sm};

  &:hover { background: ${({ theme }) =>
    theme.mode === 'dark' ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.05)'}; }

  @media ${({ theme }) => theme.media.md} {
    display: none;
  }
`

const TopNavLinks = styled.nav`
  display: flex;
  align-items: center;
  gap: 2px;

  @media ${({ theme }) => theme.media.belowMd} {
    display: none;
  }

  .nav-link {
    position: relative;
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 6px 12px;
    border-radius: ${({ theme }) => theme.radii.sm};
    color: ${({ theme }) => theme.color.mutedForeground};
    text-decoration: none;
    font-size: 13.5px;
    font-weight: 500;
    transition: color 150ms ease, background 150ms ease;
    background: transparent;
    border: none;
    cursor: pointer;

    &:hover {
      color: ${({ theme }) => theme.color.foreground};
      background: ${({ theme }) =>
        theme.mode === 'dark' ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.04)'};
    }

    &.active {
      color: ${({ theme }) => theme.color.foreground};
      background: ${({ theme }) =>
        theme.mode === 'dark' ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.06)'};
      font-weight: 600;
    }

    svg {
      width: 14px;
      height: 14px;
      flex-shrink: 0;
      opacity: 0.75;
    }
  }
`

const LogoBadge = styled.div`
  width: 30px;
  height: 30px;
  flex-shrink: 0;
  border-radius: ${({ theme }) => theme.radii.md};
  background: ${({ theme }) => theme.color.primary};
  color: ${({ theme }) => theme.color.primaryForeground};
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 13px;
  font-weight: 700;
  letter-spacing: -0.02em;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
  flex-shrink: 0;
  margin-right: 4px;
`

const GlobalSearchContainer = styled.button`
  max-width: 220px;
  width: 220px;
  height: 34px;
  display: flex;
  align-items: center;
  padding: 0 12px;
  gap: 8px;
  border-radius: ${({ theme }) => theme.radii.md};
  background: ${({ theme }) =>
    theme.mode === 'dark' ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.04)'};
  border: 1px solid ${({ theme }) =>
    theme.mode === 'dark' ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.07)'};
  color: ${({ theme }) => theme.color.mutedForeground};
  cursor: pointer;
  transition: border-color 150ms ease, background 150ms ease;

  &:hover {
    background: ${({ theme }) =>
      theme.mode === 'dark' ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.06)'};
    border-color: ${({ theme }) =>
      theme.mode === 'dark' ? 'rgba(255, 255, 255, 0.14)' : 'rgba(0, 0, 0, 0.12)'};
    color: ${({ theme }) => theme.color.foreground};
  }

  @media ${({ theme }) => theme.media.belowSm} {
    display: none;
  }

  .icon-search {
    width: 13px;
    height: 13px;
    flex-shrink: 0;
    opacity: 0.6;
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
    font-size: 11px;
    font-weight: 500;
    padding: 1px 5px;
    border-radius: ${({ theme }) => theme.radii.sm};
    background: ${({ theme }) =>
      theme.mode === 'dark' ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.06)'};
    color: ${({ theme }) => theme.color.mutedForeground};
    border: 1px solid ${({ theme }) =>
      theme.mode === 'dark' ? 'rgba(255, 255, 255, 0.12)' : 'rgba(0, 0, 0, 0.08)'};
    letter-spacing: 0;
    flex-shrink: 0;
  }
`

const RightCluster = styled.div`
  margin-left: auto;
  display: flex;
  align-items: center;
  gap: 8px;
`

const IconButton = styled.button`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 34px;
  height: 34px;
  border-radius: ${({ theme }) => theme.radii.sm};
  background: transparent;
  border: 1px solid transparent;
  color: ${({ theme }) => theme.color.mutedForeground};
  cursor: pointer;
  transition: color 150ms ease, background 150ms ease, border-color 150ms ease;

  &:hover {
    background: ${({ theme }) =>
      theme.mode === 'dark' ? 'rgba(255, 255, 255, 0.07)' : 'rgba(0, 0, 0, 0.05)'};
    color: ${({ theme }) => theme.color.foreground};
    border-color: ${({ theme }) =>
      theme.mode === 'dark' ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.07)'};
  }

  svg {
    width: 15px;
    height: 15px;
  }
`

const AvatarButton = styled(IconButton)`
  border-radius: 50%;
  overflow: hidden;
  padding: 0;
  border-color: ${({ theme }) =>
    theme.mode === 'dark' ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.08)'};

  &:hover {
    border-color: ${({ theme }) => theme.color.accent}66;
  }
`

const AssistantButton = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 0 14px;
  height: 34px;
  border-radius: ${({ theme }) => theme.radii.md};
  background: ${({ theme }) => theme.color.accent}18;
  border: 1px solid ${({ theme }) => theme.color.accent}30;
  color: ${({ theme }) => theme.color.accent};
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition: background 150ms ease, border-color 150ms ease;

  &:hover {
    background: ${({ theme }) => theme.color.accent}28;
    border-color: ${({ theme }) => theme.color.accent}50;
  }

  svg {
    width: 13px;
    height: 13px;
  }
`

function isItemActive(item: NavItem, pathname: string) {
  if (item.to === '/app') return pathname === '/app'
  return pathname.startsWith(item.to)
}

export function TopBar() {
  const { theme, toggleTheme, setCmdPaletteOpen, toggleSidebar, toggleAssistant } = useUIStore()
  const location = useLocation()
  const navigate = useNavigate()
  const user = useAuthStore(s => s.user)

  const { data: sub } = useSubscription()
  const entitled = sub?.entitled ?? []

  const visibleItems = NAV_ITEMS.filter(item => {
    if (item.adminOnly && !user?.is_admin) return false
    if (item.module && !user?.is_admin && !entitled.includes(item.module)) return false
    return true
  })

  // Flat ordered list — only the paths we surface in the TopBar nav.
  const topbarItems = TOPBAR_NAV_PATHS
    .map(path => visibleItems.find(item => item.to === path))
    .filter((item): item is NavItem => !!item)

  return (
    <HeaderRoot>
      <LeftSide>
        <LogoBadge aria-hidden>CT</LogoBadge>

        <Hamburger aria-label="Open mobile menu" onClick={toggleSidebar}>
          <Menu size={18} />
        </Hamburger>

        <TopNavLinks aria-label="Main navigation">
          {topbarItems.map(item => {
            const Icon = item.icon
            const active = isItemActive(item, location.pathname)
            return (
              <button
                key={item.to}
                type="button"
                className={`nav-link${active ? ' active' : ''}`}
                onClick={() => navigate(item.to)}
              >
                <Icon />
                {item.label}
              </button>
            )
          })}
        </TopNavLinks>
      </LeftSide>

      <RightCluster>
        <GlobalSearchContainer onClick={() => setCmdPaletteOpen(true)} type="button" aria-label="Global search">
          <Search className="icon-search" />
          <span className="placeholder">Search...</span>
          <kbd className="shortcut-badge">⌘K</kbd>
        </GlobalSearchContainer>

        <AssistantButton onClick={toggleAssistant} title="Open AI Assistant (⌘J)">
          <Sparkles />
          Ask AI
        </AssistantButton>

        <IconButton onClick={toggleTheme} aria-label="Toggle theme" title="Toggle theme">
          {theme === 'dark' ? <Sun /> : <Moon />}
        </IconButton>

        <NotificationBell />

        <DropdownMenu>
          <DropdownMenuTrigger>
            <AvatarButton aria-label="User menu">
              {user?.picture_url ? (
                <img src={user.picture_url} alt="" referrerPolicy="no-referrer" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              ) : (
                <span style={{ fontSize: 13, fontWeight: 600 }}>{(user?.name || 'U')[0].toUpperCase()}</span>
              )}
            </AvatarButton>
          </DropdownMenuTrigger>
          <AccountMenuBody side="bottom" align="end" />
        </DropdownMenu>
      </RightCluster>
    </HeaderRoot>
  )
}

