import { useState } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import { useUIStore } from '@/stores/uiStore'
import { useAuthStore } from '@/stores/authStore'
import {
  LayoutDashboard, MessageSquare, Bot, IndianRupee,
  Heart, Briefcase, Rocket, PenLine, Plug, Settings,
  ChevronLeft, BookOpen
} from 'lucide-react'
import styled, { css } from 'styled-components'
// import { Tooltip } from '@ledgr/ui' // Assumed available, otherwise use native title or Radix

/**
 * Fixed dark-chrome palette. The sidebar is intentionally dark in BOTH light and
 * dark themes, so these are hardcoded rather than theme tokens — do NOT swap to
 * theme.color.primary/card, which resolve to near-white in dark mode and would
 * make the sidebar turn white (the original dark-mode contrast bug).
 */
const CHROME_BG = '#1C1917'
const CHROME_BORDER = '#292524'
const CHROME_FG = '#FAFAF9'

const SidebarRoot = styled.aside<{ $collapsed: boolean; $mobileOpen?: boolean }>`
  position: relative;
  display: flex;
  flex-direction: column;
  width: ${({ $collapsed }) => ($collapsed ? '64px' : '224px')};
  height: 100vh;
  flex-shrink: 0;
  background: ${CHROME_BG};
  border-right: 1px solid ${CHROME_BORDER};
  transition: width 200ms cubic-bezier(0.2, 0, 0, 1);
  z-index: 30;

  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 11rem;
    background: radial-gradient(circle at 80% 0%, ${({ theme }) => theme.color.accent}2E, transparent 55%);
    pointer-events: none;
  }

  @media (max-width: 768px) {
    position: fixed;
    top: 0;
    left: 0;
    height: 100dvh;
    width: 224px !important;
    z-index: 200;
    transform: ${({ $mobileOpen }) => $mobileOpen ? 'translateX(0)' : 'translateX(-100%)'};
    transition: transform 220ms cubic-bezier(0.2, 0, 0, 1), width 0ms;
    display: flex;
  }
`

const ToggleButton = styled.button<{ $collapsed: boolean }>`
  position: absolute;
  top: 5rem;
  right: -12px;
  z-index: 10;
  width: 24px;
  height: 24px;
  border-radius: ${({ theme }) => theme.radii.sm};
  background: ${CHROME_BG};
  border: 1px solid ${CHROME_BORDER};
  color: ${CHROME_FG};
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  box-shadow: ${({ theme }) => theme.shadow.md};
  transition: background-color 120ms, border-color 120ms;
  
  &:hover {
    background: ${CHROME_BORDER};
  }
  
  & > svg {
    width: 12px;
    height: 12px;
    transform: ${({ $collapsed }) => $collapsed ? 'rotate(180deg)' : 'none'};
    transition: transform 200ms cubic-bezier(0.2, 0, 0, 1);
  }

  &:focus-visible {
    outline: 2px solid ${({ theme }) => theme.color.ring};
    outline-offset: 2px;
  }

  @media (max-width: 768px) {
    display: none;
  }
`

const BrandPanel = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 16px;
  border-bottom: 1px solid ${CHROME_BORDER};
  min-height: 68px; /* 36px badge + 32px padding */
  position: relative;
  overflow: hidden;
`

const LogoBadge = styled.div`
  width: 36px;
  height: 36px;
  flex-shrink: 0;
  border-radius: 12px;
  background: ${CHROME_BORDER};
  color: ${({ theme }) => theme.color.accent};
  display: flex;
  align-items: center;
  justify-content: center;
  font-family: ${({ theme }) => theme.typography.fontFamily.serif};
  font-size: 1rem;
  font-weight: 700;
  box-shadow: ${({ theme }) => theme.shadow.lg};
  border: 1px solid ${({ theme }) => theme.color.accent}33;
`

const BrandText = styled.div<{ $collapsed: boolean }>`
  display: flex;
  flex-direction: column;
  opacity: ${({ $collapsed }) => $collapsed ? 0 : 1};
  transition: opacity 200ms, width 200ms;
  white-space: nowrap;
  overflow: hidden;
  width: ${({ $collapsed }) => $collapsed ? 0 : 'auto'};

  .name {
    font-family: ${({ theme }) => theme.typography.fontFamily.serif};
    font-size: 1rem;
    font-weight: 700;
    color: ${CHROME_FG};
  }
  .tagline {
    font-size: 10px;
    text-transform: uppercase;
    letter-spacing: 0.04em;
    color: ${CHROME_FG}99;
  }
`

const NavList = styled.nav`
  flex: 1;
  overflow-y: auto;
  scrollbar-width: thin;
  padding: 8px;
  display: flex;
  flex-direction: column;
  position: relative;
`

const NavGroup = styled.div`
  margin-top: 16px;
  display: flex;
  flex-direction: column;
  gap: 2px;
  &:first-child { margin-top: 0; }
`

const CategoryHeader = styled.div<{ $collapsed: boolean }>`
  font-size: 10px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.09em;
  color: ${CHROME_FG}80;
  padding: 0 12px;
  margin-bottom: 6px;
  min-height: 15px;

  ${({ $collapsed }) => $collapsed && css`
    color: transparent;
    position: relative;
    &::after {
      content: '';
      position: absolute;
      left: 12px;
      right: 12px;
      top: 50%;
      height: 1px;
      background: ${CHROME_FG}33;
    }
  `}
`

const NavItemLink = styled(NavLink)<{ $collapsed: boolean }>`
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 9px 12px;
  border-radius: 12px;
  font-size: 13px;
  font-weight: 500;
  color: ${CHROME_FG}D9;
  text-decoration: none;
  transition: background-color 120ms cubic-bezier(0.2, 0, 0, 1), color 120ms cubic-bezier(0.2, 0, 0, 1);
  position: relative;

  ${({ $collapsed }) => $collapsed && css`
    justify-content: center;
  `}

  & > svg {
    width: 18px;
    height: 18px;
    flex-shrink: 0;
  }

  .label {
    white-space: nowrap;
    opacity: ${({ $collapsed }) => $collapsed ? 0 : 1};
    transition: opacity 200ms, width 200ms;
    overflow: hidden;
    width: ${({ $collapsed }) => $collapsed ? 0 : 'auto'};
  }

  &:hover {
    background: rgba(255, 255, 255, 0.06);
    color: ${CHROME_FG};
  }

  &:focus-visible {
    outline: 2px solid ${({ theme }) => theme.color.ring};
    outline-offset: 2px;
  }

  &.active {
    background: rgba(255, 255, 255, 0.10);
    color: ${CHROME_FG};
    font-weight: 600;
    
    & > svg {
      color: ${({ theme }) => theme.color.accent};
    }

    &::before {
      content: '';
      position: absolute;
      left: 0;
      top: 50%;
      transform: translateY(-50%);
      width: 3px;
      height: 18px;
      border-radius: 0 3px 3px 0;
      background: ${({ theme }) => theme.color.accent};
    }
  }
`

const UserBlock = styled.div<{ $collapsed: boolean }>`
  border-top: 1px solid ${CHROME_BORDER};
  padding: 8px;
  display: flex;
  align-items: center;
  gap: 8px;
  position: relative;
  
  ${({ $collapsed }) => $collapsed && css`
    justify-content: center;
  `}
`

const Avatar = styled.div`
  width: 28px;
  height: 28px;
  border-radius: 50%;
  background: ${({ theme }) => theme.color.accent};
  color: ${({ theme }) => theme.color.accentForeground};
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  font-weight: 600;
  flex-shrink: 0;
`

const UserInfo = styled.div<{ $collapsed: boolean }>`
  display: flex;
  flex-direction: column;
  flex: 1;
  min-width: 0;
  opacity: ${({ $collapsed }) => $collapsed ? 0 : 1};
  display: ${({ $collapsed }) => $collapsed ? 'none' : 'flex'};

  .name {
    font-size: 12px;
    font-weight: 500;
    color: ${CHROME_FG};
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
`

const NAV_GROUPS = [
  {
    category: 'Main',
    items: [
      { to: '/app', icon: LayoutDashboard, label: 'Dashboard' },
      { to: '/app/chat', icon: MessageSquare, label: 'Chat' },
      { to: '/app/agents', icon: Bot, label: 'Agents' },
    ]
  },
  {
    category: 'Areas',
    items: [
      { to: '/app/areas/finance', icon: IndianRupee, label: 'Finance' },
      { to: '/app/areas/health', icon: Heart, label: 'Health' },
      { to: '/app/areas/career', icon: Briefcase, label: 'Career' },
      { to: '/app/areas/business', icon: Rocket, label: 'Business' },
      { to: '/app/areas/content', icon: PenLine, label: 'Content' },
    ]
  },
  {
    category: 'System',
    items: [
      { to: '/app/guide', icon: BookOpen, label: 'Guide' },
      { to: '/app/integrations', icon: Plug, label: 'Integrations' },
      { to: '/app/settings', icon: Settings, label: 'Settings' },
    ]
  }
]

export function Sidebar() {
  const [collapsed, setCollapsed] = useState(false)
  const { sidebarOpen, setSidebarOpen } = useUIStore()
  const user = useAuthStore(s => s.user)

  return (
    <SidebarRoot $collapsed={collapsed} $mobileOpen={sidebarOpen}>
      <ToggleButton $collapsed={collapsed} onClick={() => setCollapsed(!collapsed)} aria-label="Toggle Sidebar">
        <ChevronLeft />
      </ToggleButton>

      <BrandPanel>
        <LogoBadge>A</LogoBadge>
        <BrandText $collapsed={collapsed}>
          <span className="name">AIOS</span>
          <span className="tagline">Premium Agent</span>
        </BrandText>
      </BrandPanel>

      <NavList aria-label="Main navigation">
        {NAV_GROUPS.map((group) => (
          <NavGroup key={group.category}>
            <CategoryHeader $collapsed={collapsed}>{group.category}</CategoryHeader>
            {group.items.map((item) => {
              const Icon = item.icon
              return (
                <NavItemLink 
                  key={item.to} 
                  to={item.to}
                  end={item.to === '/app'}
                  $collapsed={collapsed}
                  title={collapsed ? item.label : undefined} // Native tooltip as fallback
                >
                  <Icon />
                  <span className="label">{item.label}</span>
                </NavItemLink>
              )
            })}
          </NavGroup>
        ))}
      </NavList>

      <UserBlock $collapsed={collapsed}>
        {user?.picture_url ? (
          <img src={user.picture_url} alt="" referrerPolicy="no-referrer" style={{ width: 28, height: 28, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }} />
        ) : (
          <Avatar>{(user?.name || 'U')[0].toUpperCase()}</Avatar>
        )}
        <UserInfo $collapsed={collapsed}>
          <span className="name">{user?.name || 'User'}</span>
        </UserInfo>
      </UserBlock>
    </SidebarRoot>
  )
}
