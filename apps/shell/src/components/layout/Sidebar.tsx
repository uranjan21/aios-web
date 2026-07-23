import { useState } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import { useUIStore } from '@ct/shared/stores/uiStore'
import { NAV_GROUP_ORDER, navItemsForGroup } from '@/config/navigation'
import { useAuthStore } from '@ct/shared/stores/authStore'
import { logoutAndRedirect } from '@ct/shared/lib/logout'
import { accountLabel } from '@ct/shared/lib/account'
import {
  DropdownMenu, DropdownMenuTrigger, DropdownMenuContent,
  DropdownMenuItem, DropdownMenuSeparator, DropdownMenuLabel, focusRing } from '@ledgr/ui'
import {
  Settings,
  ChevronLeft, LogOut, ChevronsUpDown
} from 'lucide-react'


import styled, { css } from 'styled-components'
import { SIDEBAR_NAV_WIDTH, SIDEBAR_NAV_COLLAPSED_WIDTH } from '@ct/shared/theme/layout'

const SidebarRoot = styled.aside<{ $collapsed: boolean; $mobileOpen?: boolean }>`
  position: relative;
  display: flex;
  flex-direction: column;
  width: ${({ $collapsed }) => ($collapsed ? SIDEBAR_NAV_COLLAPSED_WIDTH : SIDEBAR_NAV_WIDTH)};
  height: 100vh;
  flex-shrink: 0;
  background: ${({ theme }) => theme.chrome.bg};
  border-right: 1px solid ${({ theme }) => theme.chrome.border};
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

  @media ${({ theme }) => theme.media.belowMd} {
    position: fixed;
    top: 0;
    left: 0;
    height: 100dvh;
    width: ${SIDEBAR_NAV_WIDTH} !important;
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
  background: ${({ theme }) => theme.chrome.bg};
  border: 1px solid ${({ theme }) => theme.chrome.border};
  color: ${({ theme }) => theme.chrome.fg};
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  box-shadow: ${({ theme }) => theme.shadow.md};
  transition: background-color 120ms, border-color 120ms;

  &:hover {
    background: ${({ theme }) => theme.chrome.border};
  }
  
  & > svg {
    width: 12px;
    height: 12px;
    transform: ${({ $collapsed }) => $collapsed ? 'rotate(180deg)' : 'none'};
    transition: transform 200ms cubic-bezier(0.2, 0, 0, 1);
  }

  ${focusRing}

  @media ${({ theme }) => theme.media.belowMd} {
    display: none;
  }
`

const BrandPanel = styled.div`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => `${theme.spacing[3]}`};
  padding: ${({ theme }) => `${theme.spacing[4]}`};
  border-bottom: 1px solid ${({ theme }) => theme.chrome.border};
  min-height: 68px;
  position: relative;
  overflow: hidden;
`

const LogoBadge = styled.div`
  width: 36px;
  height: 36px;
  flex-shrink: 0;
  border-radius: ${({ theme }) => theme.radii.md};
  background: ${({ theme }) => theme.chrome.border};
  color: ${({ theme }) => theme.color.accent};
  display: flex;
  align-items: center;
  justify-content: center;
  font-family: ${({ theme }) => theme.typography.fontFamily.display};
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
    font-family: ${({ theme }) => theme.typography.fontFamily.display};
    font-size: 1rem;
    font-weight: 700;
    color: ${({ theme }) => theme.chrome.fg};

    .accent { color: ${({ theme }) => theme.color.accent}; }
  }
  .tagline {
    font-size: ${({ theme }) => theme.typography.fontSize.xs};
    text-transform: uppercase;
    letter-spacing: 0.04em;
    color: ${({ theme }) => theme.chrome.fg}99;
  }
`

const NavList = styled.nav`
  flex: 1;
  overflow-y: auto;
  scrollbar-width: thin;
  padding: ${({ theme }) => `${theme.spacing[2]}`};
  display: flex;
  flex-direction: column;
  position: relative;
`

const NavGroup = styled.div`
  margin-top: ${({ theme }) => `${theme.spacing[4]}`};
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => `${theme.spacing[0.5]}`};
  &:first-child { margin-top: 0; }
`

const CategoryHeader = styled.div<{ $collapsed: boolean }>`
  font-size: ${({ theme }) => theme.typography.fontSize.xs};
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.09em;
  color: ${({ theme }) => theme.chrome.fg}80;
  padding: ${({ theme }) => `0 ${theme.spacing[3]}`};
  margin-bottom: ${({ theme }) => `${theme.spacing[1.5]}`};
  min-height: 15px;

  ${({ $collapsed, theme }) => $collapsed && css`
    color: transparent;
    position: relative;
    &::after {
      content: '';
      position: absolute;
      left: 12px;
      right: 12px;
      top: 50%;
      height: 1px;
      background: ${theme.chrome.fg}33;
    }
  `}
`

const NavItemLink = styled(NavLink)<{ $collapsed: boolean }>`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => `${theme.spacing[3]}`};
  padding: ${({ theme }) => `${theme.spacing[2]} ${theme.spacing[3]}`};
  border-radius: ${({ theme }) => theme.radii.md};
  font-size: ${({ theme }) => theme.typography.fontSize.sm};
  font-weight: 500;
  color: ${({ theme }) => theme.chrome.fg}D9;
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
    color: ${({ theme }) => theme.chrome.fg};
  }

  ${focusRing}

  &.active {
    background: rgba(255, 255, 255, 0.10);
    color: ${({ theme }) => theme.chrome.fg};
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

const UserBlock = styled.button<{ $collapsed: boolean }>`
  width: calc(100% - 16px);
  margin: ${({ theme }) => `${theme.spacing[2]}`};
  border: none;
  border-radius: ${({ theme }) => theme.radii.md};
  background: transparent;
  font: inherit;
  color: inherit;
  cursor: pointer;
  padding: ${({ theme }) => `${theme.spacing[2]}`};
  display: flex;
  align-items: center;
  gap: ${({ theme }) => `${theme.spacing[3]}`};
  position: relative;
  transition: background-color 150ms ease, box-shadow 150ms ease;

  &:hover { 
    background: ${({ theme }) => theme.chrome.border}; 
    box-shadow: ${({ theme }) => theme.shadow.sm};
  }

  ${focusRing}

  ${({ $collapsed }) => $collapsed && css`
    justify-content: center;
    padding: ${({ theme }) => `${theme.spacing[2]} 0`};
  `}
`

const Avatar = styled.div`
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background: ${({ theme }) => theme.color.accent};
  color: ${({ theme }) => theme.color.accentForeground};
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: ${({ theme }) => theme.typography.fontSize.sm};
  font-weight: 700;
  flex-shrink: 0;
`

const UserInfo = styled.div<{ $collapsed: boolean }>`
  display: flex;
  flex-direction: column;
  flex: 1;
  min-width: 0;
  align-items: flex-start;
  opacity: ${({ $collapsed }) => $collapsed ? 0 : 1};
  display: ${({ $collapsed }) => $collapsed ? 'none' : 'flex'};

  .name {
    font-size: ${({ theme }) => theme.typography.fontSize.sm};
    font-weight: 600;
    color: ${({ theme }) => theme.chrome.fg};
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    max-width: 100%;
  }

  .meta {
    font-size: ${({ theme }) => theme.typography.fontSize.xs};
    font-weight: 500;
    color: ${({ theme }) => theme.chrome.fg}99;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    max-width: 100%;
  }
`

const MenuProfileCard = styled.div`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => `${theme.spacing[3]}`};
  padding: ${({ theme }) => `${theme.spacing[1.5]} ${theme.spacing[1]} ${theme.spacing[2.5]} ${theme.spacing[1]}`};
`

const MenuProfileInfo = styled.div`
  display: flex;
  flex-direction: column;
  min-width: 0;

  .menu-name {
    font-size: 0.875rem;
    font-weight: 600;
    color: var(--ui-text-primary, inherit);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .menu-meta {
    font-size: 0.75rem;
    /* Sidebar chrome is always dark, so this reads from the chrome foreground,
       not the active-mode muted token (which is dark text in light mode). */
    color: ${({ theme }) => `color-mix(in srgb, ${theme.chrome.fg} 55%, transparent)`};
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
`

const UserMenuContent = styled.div`
  width: 208px;
  padding: ${({ theme }) => `${theme.spacing[2]}`};
`

const UserMenuItemContent = styled.span`
  display: inline-flex;
  align-items: center;
  gap: ${({ theme }) => `${theme.spacing[2.5]}`};
`

const DropdownIconWrapper = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  color: ${({ theme }) => theme.chrome.fg}80;
  margin-left: auto;

  svg {
    width: 16px;
    height: 16px;
  }
`


export function Sidebar() {
  const [collapsed, setCollapsed] = useState(false)
  const { sidebarOpen } = useUIStore()
  const user = useAuthStore(s => s.user)
  const navigate = useNavigate()

  return (
    <SidebarRoot $collapsed={collapsed} $mobileOpen={sidebarOpen}>
      <ToggleButton $collapsed={collapsed} onClick={() => setCollapsed(!collapsed)} aria-label="Toggle Sidebar">
        <ChevronLeft />
      </ToggleButton>

      <BrandPanel>
        <LogoBadge>A</LogoBadge>
        <BrandText $collapsed={collapsed}>
          <span className="name">ai<span className="accent">os</span></span>
          <span className="tagline">Premium Agent</span>
        </BrandText>
      </BrandPanel>

      <NavList aria-label="Main navigation">
        {NAV_GROUP_ORDER.map((group) => {
          const items = navItemsForGroup(group, !!user?.is_admin)
          if (items.length === 0) return null
          return (
          <NavGroup key={group}>
            <CategoryHeader $collapsed={collapsed}>{group}</CategoryHeader>
            {items.map((item) => {
              const Icon = item.icon
              return (
                <NavItemLink 
                  key={item.to} 
                  to={item.to}
                  end={item.to === '/app'}
                  $collapsed={collapsed}
                  title={collapsed ? item.label : undefined}
                >
                  <Icon />
                  <span className="label">{item.label}</span>
                </NavItemLink>
              )
            })}
          </NavGroup>
          )
        })}
      </NavList>

      <div style={{ padding: '0 0 8px 0', borderTop: '1px solid var(--ui-border)' }}>
        <DropdownMenu>
          <DropdownMenuTrigger>
            <UserBlock $collapsed={collapsed} aria-label={`User menu: ${user?.name || 'User'}`}>
              {user?.picture_url ? (
                <img src={user.picture_url} alt="" referrerPolicy="no-referrer" style={{ width: 32, height: 32, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }} />
              ) : (
                <Avatar>{(user?.name || 'U')[0].toUpperCase()}</Avatar>
              )}
              <UserInfo $collapsed={collapsed}>
                <span className="name">{user?.name || 'User'}</span>
                <span className="meta">{accountLabel(user)}</span>
              </UserInfo>
              {!collapsed && (
                <DropdownIconWrapper>
                  <ChevronsUpDown />
                </DropdownIconWrapper>
              )}
            </UserBlock>
          </DropdownMenuTrigger>
          <DropdownMenuContent side="top" align={collapsed ? 'start' : 'center'}>
            <UserMenuContent style={{ width: collapsed ? '220px' : '208px' }}>
              <DropdownMenuLabel style={{ padding: 0, marginBottom: '4px' }}>
                <MenuProfileCard>
                  {user?.picture_url ? (
                    <img src={user.picture_url} alt="" referrerPolicy="no-referrer" style={{ width: 36, height: 36, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }} />
                  ) : (
                    <Avatar style={{ width: 36, height: 36, fontSize: '14px' }}>{(user?.name || 'U')[0].toUpperCase()}</Avatar>
                  )}
                  <MenuProfileInfo>
                    <span className="menu-name">{user?.name || 'Account'}</span>
                    <span className="menu-meta">{accountLabel(user)}</span>
                  </MenuProfileInfo>
                </MenuProfileCard>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onSelect={() => navigate('/app/settings')}>
                <UserMenuItemContent>
                  <Settings size={16} /> Profile &amp; settings
                </UserMenuItemContent>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem destructive onSelect={() => logoutAndRedirect(navigate)}>
                <UserMenuItemContent>
                  <LogOut size={16} /> Log out
                </UserMenuItemContent>
              </DropdownMenuItem>
            </UserMenuContent>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </SidebarRoot>
  )
}
