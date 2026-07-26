import { useState } from 'react'
import { NavLink } from 'react-router-dom'
import { useUIStore } from '@ct/shared/stores/uiStore'
import { NAV_GROUP_ORDER, navItemsForGroup, NavItem } from '@/config/navigation'
import { useAuthStore } from '@ct/shared/stores/authStore'
import { accountLabel } from '@ct/shared/lib/account'
import {
  DropdownMenu, DropdownMenuTrigger, Tooltip, focusRing } from '@ledgr/ui'
import {
  ChevronLeft, ChevronDown, ChevronsUpDown, Sun, Moon, Command, Sparkles
} from 'lucide-react'
import { AccountMenuBody } from './AccountMenu'
import styled, { css, keyframes } from 'styled-components'
import { SIDEBAR_NAV_WIDTH, SIDEBAR_NAV_COLLAPSED_WIDTH } from '@ct/shared/theme/layout'

const pulseGlow = keyframes`
  0%, 100% { opacity: 0.6; transform: scale(1); }
  50% { opacity: 1; transform: scale(1.15); }
`

const SidebarRoot = styled.aside<{ $collapsed: boolean; $mobileOpen?: boolean }>`
  position: relative;
  display: flex;
  flex-direction: column;
  width: ${({ $collapsed }) => ($collapsed ? SIDEBAR_NAV_COLLAPSED_WIDTH : SIDEBAR_NAV_WIDTH)};
  height: 100vh;
  flex-shrink: 0;
  background: ${({ theme }) =>
    theme.mode === 'dark'
      ? 'rgba(15, 17, 23, 0.85)'
      : 'rgba(250, 248, 245, 0.85)'};
  backdrop-filter: blur(24px) saturate(190%);
  -webkit-backdrop-filter: blur(24px) saturate(190%);
  border-right: 1px solid ${({ theme }) =>
    theme.mode === 'dark' ? 'rgba(255, 255, 255, 0.08)' : theme.color.border};
  box-shadow: 4px 0 24px -4px rgba(0, 0, 0, 0.06);
  transition: width 220ms cubic-bezier(0.16, 1, 0.3, 1);
  z-index: 30;

  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 14rem;
    background: radial-gradient(circle at 75% 0%, ${({ theme }) => theme.color.accent}2E, transparent 65%);
    pointer-events: none;
    z-index: 1;
  }

  @media ${({ theme }) => theme.media.belowMd} {
    position: fixed;
    top: 0;
    left: 0;
    height: 100dvh;
    width: ${SIDEBAR_NAV_WIDTH} !important;
    z-index: 200;
    transform: ${({ $mobileOpen }) => $mobileOpen ? 'translateX(0)' : 'translateX(-100%)'};
    transition: transform 240ms cubic-bezier(0.16, 1, 0.3, 1), width 0ms;
    display: flex;
  }
`

const ToggleButton = styled.button<{ $collapsed: boolean }>`
  position: absolute;
  top: 1.25rem;
  right: -13px;
  z-index: 20;
  width: 26px;
  height: 26px;
  border-radius: 50%;
  background: ${({ theme }) =>
    theme.mode === 'dark' ? 'rgba(26, 30, 42, 0.95)' : 'rgba(255, 255, 255, 0.95)'};
  backdrop-filter: blur(12px);
  border: 1px solid ${({ theme }) =>
    theme.mode === 'dark' ? 'rgba(255, 255, 255, 0.15)' : theme.color.border};
  color: ${({ theme }) => theme.color.foreground};
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.12);
  transition: background-color 150ms, border-color 150ms, transform 150ms;

  &:hover {
    background: ${({ theme }) => theme.color.accent};
    color: ${({ theme }) => theme.color.accentForeground};
    border-color: ${({ theme }) => theme.color.accent};
    transform: scale(1.08);
  }
  
  & > svg {
    width: 13px;
    height: 13px;
    transform: ${({ $collapsed }) => $collapsed ? 'rotate(180deg)' : 'none'};
    transition: transform 220ms cubic-bezier(0.16, 1, 0.3, 1);
  }

  ${focusRing}

  @media ${({ theme }) => theme.media.belowMd} {
    display: none;
  }
`

const BrandPanel = styled.div<{ $collapsed: boolean }>`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => `${theme.spacing[3]}`};
  padding: ${({ theme, $collapsed }) => $collapsed ? `${theme.spacing[4]} ${theme.spacing[2]}` : `${theme.spacing[4]} ${theme.spacing[4]}`};
  border-bottom: 1px solid ${({ theme }) =>
    theme.mode === 'dark' ? 'rgba(255, 255, 255, 0.06)' : theme.color.border};
  min-height: 68px;
  position: relative;
  z-index: 2;
  justify-content: ${({ $collapsed }) => $collapsed ? 'center' : 'flex-start'};
`

const LogoBadge = styled.div`
  width: 38px;
  height: 38px;
  flex-shrink: 0;
  border-radius: ${({ theme }) => theme.radii.lg};
  background: linear-gradient(135deg, ${({ theme }) => theme.color.accent}33 0%, ${({ theme }) => theme.color.accent}10 100%);
  color: ${({ theme }) => theme.color.accent};
  display: flex;
  align-items: center;
  justify-content: center;
  font-family: ${({ theme }) => theme.typography.fontFamily.display};
  font-size: 1.1rem;
  font-weight: 800;
  box-shadow: 0 4px 16px ${({ theme }) => theme.color.accent}2A;
  border: 1px solid ${({ theme }) => theme.color.accent}44;
  position: relative;
  transition: transform 200ms ease;

  &:hover {
    transform: scale(1.05);
  }

  .sparkle {
    position: absolute;
    top: -3px;
    right: -3px;
    width: 10px;
    height: 10px;
    color: ${({ theme }) => theme.color.accent};
  }
`

const BrandText = styled.div<{ $collapsed: boolean }>`
  display: flex;
  flex-direction: column;
  opacity: ${({ $collapsed }) => $collapsed ? 0 : 1};
  transition: opacity 180ms ease, width 180ms ease;
  white-space: nowrap;
  overflow: hidden;
  width: ${({ $collapsed }) => $collapsed ? 0 : 'auto'};

  .name {
    font-family: ${({ theme }) => theme.typography.fontFamily.display};
    font-size: 1.05rem;
    font-weight: 700;
    letter-spacing: -0.02em;
    color: ${({ theme }) => theme.color.foreground};

    .accent { 
      color: ${({ theme }) => theme.color.accent};
      font-weight: 800;
    }
  }
  .tagline {
    font-size: 10px;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    color: ${({ theme }) => theme.color.mutedForeground};
  }
`

const NavList = styled.nav`
  flex: 1;
  overflow-y: auto;
  scrollbar-width: thin;
  padding: ${({ theme }) => `${theme.spacing[3]} ${theme.spacing[2]}`};
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => `${theme.spacing[2]}`};
  position: relative;
  z-index: 2;
`

const NavGroup = styled.div`
  display: flex;
  flex-direction: column;
`

const CategoryHeader = styled.button<{ $collapsed: boolean; $isCollapsedSection: boolean }>`
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: space-between;
  background: transparent;
  border: none;
  font: inherit;
  font-size: 10px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  color: ${({ theme }) => theme.color.mutedForeground};
  padding: ${({ theme }) => `${theme.spacing[1.5]} ${theme.spacing[3]}`};
  margin-bottom: ${({ theme }) => `${theme.spacing[1]}`};
  cursor: pointer;
  border-radius: ${({ theme }) => theme.radii.sm};
  transition: color 150ms, background-color 150ms;

  &:hover {
    color: ${({ theme }) => theme.color.foreground};
    background: ${({ theme }) =>
      theme.mode === 'dark' ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.04)'};
  }

  .chevron {
    width: 12px;
    height: 12px;
    opacity: 0.7;
    transform: ${({ $isCollapsedSection }) => $isCollapsedSection ? 'rotate(-90deg)' : 'rotate(0deg)'};
    transition: transform 200ms cubic-bezier(0.16, 1, 0.3, 1);
  }

  ${({ $collapsed, theme }) => $collapsed && css`
    justify-content: center;
    padding: 0;
    margin: ${theme.spacing[2]} 0;
    pointer-events: none;

    span, .chevron { display: none; }

    &::after {
      content: '';
      width: 24px;
      height: 1px;
      background: ${theme.color.border};
    }
  `}
`

const ItemsContainer = styled.div<{ $isCollapsedSection: boolean }>`
  display: flex;
  flex-direction: column;
  gap: 3px;
  overflow: hidden;
  max-height: ${({ $isCollapsedSection }) => ($isCollapsedSection ? '0px' : '600px')};
  opacity: ${({ $isCollapsedSection }) => ($isCollapsedSection ? 0 : 1)};
  transition: max-height 240ms cubic-bezier(0.16, 1, 0.3, 1), opacity 200ms ease;
`

const TooltipShortcut = styled.span`
  font-size: 9px;
  font-weight: 700;
  padding: 2px 6px;
  border-radius: 4px;
  background: ${({ theme }) => theme.color.accent}22;
  color: ${({ theme }) => theme.color.accent};
  border: 1px solid ${({ theme }) => theme.color.accent}44;
  text-transform: uppercase;
  letter-spacing: 0.05em;
`

const NavItemWrapper = styled.div`
  position: relative;
`

const NavItemLink = styled(NavLink)<{ $collapsed: boolean }>`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => `${theme.spacing[3]}`};
  padding: ${({ theme }) => `${theme.spacing[2]} ${theme.spacing[3]}`};
  border-radius: ${({ theme }) => theme.radii.md};
  font-size: ${({ theme }) => theme.typography.fontSize.sm};
  font-weight: 500;
  color: ${({ theme }) =>
    theme.mode === 'dark' ? 'rgba(255, 255, 255, 0.75)' : theme.color.foreground};
  text-decoration: none;
  transition: background-color 140ms ease, color 140ms ease, transform 140ms ease;
  position: relative;

  ${({ $collapsed }) => $collapsed && css`
    justify-content: center;
    padding: ${({ theme }) => `${theme.spacing[2.5]} 0`};
  `}

  & > svg {
    width: 18px;
    height: 18px;
    flex-shrink: 0;
    color: ${({ theme }) => theme.color.mutedForeground};
    transition: transform 140ms ease, color 140ms ease;
  }

  .label {
    white-space: nowrap;
    opacity: ${({ $collapsed }) => $collapsed ? 0 : 1};
    transition: opacity 180ms ease, width 180ms ease;
    overflow: hidden;
    width: ${({ $collapsed }) => $collapsed ? 0 : 'auto'};
    flex: 1;
  }

  &:hover {
    background: ${({ theme }) =>
      theme.mode === 'dark' ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.05)'};
    color: ${({ theme }) => theme.color.foreground};
    
    & > svg {
      transform: scale(1.1);
      color: ${({ theme }) => theme.color.accent};
    }
  }

  ${focusRing}

  &.active {
    background: linear-gradient(90deg, ${({ theme }) => theme.color.accent}24 0%, ${({ theme }) => theme.color.accent}0A 100%);
    color: ${({ theme }) => theme.color.foreground};
    font-weight: 600;
    box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.08);
    
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
      height: 20px;
      border-radius: 0 4px 4px 0;
      background: ${({ theme }) => theme.color.accent};
      box-shadow: 0 0 10px ${({ theme }) => theme.color.accent};
    }
  }
`

const QuickActionsBar = styled.div<{ $collapsed: boolean }>`
  display: flex;
  align-items: center;
  justify-content: ${({ $collapsed }) => $collapsed ? 'center' : 'space-between'};
  gap: 6px;
  padding: ${({ theme }) => `0 ${theme.spacing[3]}`};
  margin-bottom: ${({ theme }) => theme.spacing[2]};
`

const QuickActionButton = styled.button`
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 6px 10px;
  border-radius: ${({ theme }) => theme.radii.md};
  background: ${({ theme }) =>
    theme.mode === 'dark' ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.04)'};
  border: 1px solid ${({ theme }) =>
    theme.mode === 'dark' ? 'rgba(255, 255, 255, 0.08)' : theme.color.border};
  color: ${({ theme }) => theme.color.mutedForeground};
  font-size: 11px;
  font-weight: 600;
  cursor: pointer;
  transition: all 140ms ease;
  flex: 1;

  &:hover {
    background: ${({ theme }) =>
      theme.mode === 'dark' ? 'rgba(255, 255, 255, 0.12)' : 'rgba(0, 0, 0, 0.08)'};
    color: ${({ theme }) => theme.color.foreground};
    border-color: ${({ theme }) => theme.color.accent}44;
  }

  svg {
    width: 14px;
    height: 14px;
  }

  ${focusRing}
`

const FooterSection = styled.div`
  padding: ${({ theme }) => `${theme.spacing[2]}`};
  border-top: 1px solid ${({ theme }) =>
    theme.mode === 'dark' ? 'rgba(255, 255, 255, 0.06)' : theme.color.border};
  position: relative;
  z-index: 2;
`

const UserBlock = styled.button<{ $collapsed: boolean }>`
  width: 100%;
  border: 1px solid ${({ theme }) =>
    theme.mode === 'dark' ? 'rgba(255, 255, 255, 0.08)' : theme.color.border};
  border-radius: ${({ theme }) => theme.radii.lg};
  background: ${({ theme }) =>
    theme.mode === 'dark' ? 'rgba(255, 255, 255, 0.04)' : 'rgba(0, 0, 0, 0.02)'};
  font: inherit;
  color: inherit;
  cursor: pointer;
  padding: ${({ theme }) => `${theme.spacing[2]}`};
  display: flex;
  align-items: center;
  gap: ${({ theme }) => `${theme.spacing[2.5]}`};
  position: relative;
  transition: background-color 150ms ease, border-color 150ms ease, box-shadow 150ms ease;

  &:hover { 
    background: ${({ theme }) =>
      theme.mode === 'dark' ? 'rgba(255, 255, 255, 0.09)' : 'rgba(0, 0, 0, 0.05)'};
    border-color: ${({ theme }) => theme.color.accent}44;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.06);
  }

  ${focusRing}

  ${({ $collapsed }) => $collapsed && css`
    justify-content: center;
    padding: ${({ theme }) => `${theme.spacing[2]} 0`};
  `}
`

const AvatarWrapper = styled.div`
  position: relative;
  flex-shrink: 0;

  .status-dot {
    position: absolute;
    bottom: -1px;
    right: -1px;
    width: 9px;
    height: 9px;
    border-radius: 50%;
    background: #10B981;
    border: 2px solid ${({ theme }) => theme.color.card};
    animation: ${pulseGlow} 2.5s infinite ease-in-out;
  }
`

const Avatar = styled.div`
  width: 34px;
  height: 34px;
  border-radius: 50%;
  background: linear-gradient(135deg, ${({ theme }) => theme.color.accent} 0%, ${({ theme }) => theme.color.accent}CC 100%);
  color: ${({ theme }) => theme.color.accentForeground};
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: ${({ theme }) => theme.typography.fontSize.sm};
  font-weight: 700;
  box-shadow: 0 2px 8px ${({ theme }) => theme.color.accent}33;
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
    color: ${({ theme }) => theme.color.foreground};
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    max-width: 100%;
    letter-spacing: -0.01em;
  }

  .meta {
    font-size: 11px;
    font-weight: 500;
    color: ${({ theme }) => theme.color.mutedForeground};
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    max-width: 100%;
  }
`

const DropdownIconWrapper = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  color: ${({ theme }) => theme.color.mutedForeground};
  margin-left: auto;

  svg {
    width: 15px;
    height: 15px;
  }
`

export function Sidebar() {
  const [collapsed, setCollapsed] = useState(false)
  const { sidebarOpen, collapsedSections, toggleSectionCollapsed, toggleTheme, theme, setCmdPaletteOpen } = useUIStore()
  const user = useAuthStore(s => s.user)

  return (
    <SidebarRoot $collapsed={collapsed} $mobileOpen={sidebarOpen}>
      <ToggleButton $collapsed={collapsed} onClick={() => setCollapsed(!collapsed)} aria-label="Toggle Sidebar">
        <ChevronLeft />
      </ToggleButton>

      <BrandPanel $collapsed={collapsed}>
        <LogoBadge>
          <Sparkles className="sparkle" />
          C
        </LogoBadge>
        <BrandText $collapsed={collapsed}>
          <span className="name">Control <span className="accent">Tower</span></span>
        </BrandText>
      </BrandPanel>

      <NavList aria-label="Main navigation">
        {NAV_GROUP_ORDER.map((group) => {
          const items = navItemsForGroup(group, !!user?.is_admin)
          if (items.length === 0) return null

          const isCollapsedSection = !!collapsedSections[group]

          return (
            <NavGroup key={group}>
              <CategoryHeader 
                $collapsed={collapsed}
                $isCollapsedSection={isCollapsedSection}
                onClick={() => toggleSectionCollapsed(group)}
                aria-expanded={!isCollapsedSection}
                title={collapsed ? group : undefined}
              >
                <span>{group}</span>
                <ChevronDown className="chevron" />
              </CategoryHeader>

              <ItemsContainer $isCollapsedSection={!collapsed && isCollapsedSection}>
                {items.map((item: NavItem) => {
                  const Icon = item.icon
                  return (
                    <NavItemWrapper key={item.to}>
                      <Tooltip
                        side="right"
                        disabled={!collapsed}
                        content={
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span>{item.label}</span>
                            {item.shortcut && <TooltipShortcut>g {item.shortcut}</TooltipShortcut>}
                          </div>
                        }
                      >
                        <NavItemLink 
                          to={item.to}
                          end={item.to === '/app'}
                          $collapsed={collapsed}
                        >
                          <Icon />
                          <span className="label">{item.label}</span>
                        </NavItemLink>
                      </Tooltip>
                    </NavItemWrapper>
                  )
                })}
              </ItemsContainer>
            </NavGroup>
          )
        })}
      </NavList>

      {!collapsed && (
        <QuickActionsBar $collapsed={collapsed}>
          <QuickActionButton onClick={toggleTheme} title="Toggle theme">
            {theme === 'dark' ? <Moon /> : <Sun />}
            <span>{theme === 'dark' ? 'Dark' : 'Light'}</span>
          </QuickActionButton>

          <QuickActionButton onClick={() => setCmdPaletteOpen(true)} title="Open Command Palette (Cmd+K)">
            <Command />
            <span>Cmd+K</span>
          </QuickActionButton>
        </QuickActionsBar>
      )}

      <FooterSection>
        <DropdownMenu>
          <DropdownMenuTrigger>
            <UserBlock $collapsed={collapsed} aria-label={`User menu: ${user?.name || 'User'}`}>
              <AvatarWrapper>
                {user?.picture_url ? (
                  <img src={user.picture_url} alt="" referrerPolicy="no-referrer" style={{ width: 34, height: 34, borderRadius: '50%', objectFit: 'cover' }} />
                ) : (
                  <Avatar>{(user?.name || 'U')[0].toUpperCase()}</Avatar>
                )}
                <div className="status-dot" />
              </AvatarWrapper>

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
          <AccountMenuBody side="top" align="start" />
        </DropdownMenu>
      </FooterSection>
    </SidebarRoot>
  )
}


