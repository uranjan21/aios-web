import { useMemo, useState } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import { useTheme } from 'styled-components'
import { useUIStore } from '@ct/shared/stores/uiStore'
import { navSections, resolvePath, type NavItem, type SubNavItem } from '@/config/navigation'
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
  /*
   * Chrome tokens, not hand-rolled rgba. theme.chrome follows the active mode
   * as of 2026-08-01 — the sidebar used to be hardcoded near-black in both
   * modes, which the redesign drops in favour of a light sidebar in light mode.
   */
  background: ${({ theme }) => theme.chrome.bg};
  backdrop-filter: ${({ theme }) => theme.chrome.filter};
  -webkit-backdrop-filter: ${({ theme }) => theme.chrome.filter};
  border-right: 1px solid ${({ theme }) => theme.chrome.border};
  box-shadow: ${({ theme }) =>
    theme.chrome.hi === 'none'
      ? theme.chrome.edge
      : `${theme.chrome.hi}, ${theme.chrome.edge}`};
  transition: width 220ms cubic-bezier(0.16, 1, 0.3, 1);
  z-index: 30;

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

/**
 * Rows sit inside a hairline rail, indented from the section header. The rail
 * is what makes the two levels legible without a second indent step — each
 * row's active indicator is a 3px bar drawn ON the rail (see `RowIndicator`).
 */
const ItemsContainer = styled.div<{ $isCollapsedSection: boolean; $collapsed: boolean }>`
  display: flex;
  flex-direction: column;
  gap: 3px;
  overflow: hidden;
  max-height: ${({ $isCollapsedSection }) => ($isCollapsedSection ? '0px' : '600px')};
  opacity: ${({ $isCollapsedSection }) => ($isCollapsedSection ? 0 : 1)};
  transition: max-height 240ms cubic-bezier(0.16, 1, 0.3, 1), opacity 200ms ease;

  ${({ $collapsed, theme }) => !$collapsed && css`
    margin: 0 0 ${theme.spacing[0.5]} ${theme.spacing[2.5]};
    padding-left: 11px;
    border-left: 1px solid ${theme.chrome.border};
  `}
`

/** The 3px active bar drawn on the rail, in the area's domain colour. */
const RowIndicator = styled.span<{ $color: string; $active: boolean }>`
  position: absolute;
  left: -14px;
  top: 7px;
  bottom: 7px;
  width: 3px;
  border-radius: 2px;
  background: ${({ $active, $color }) => ($active ? $color : 'transparent')};
  box-shadow: ${({ $active, $color }) => ($active ? `0 0 10px ${$color}` : 'none')};
  transition: background 150ms, box-shadow 150ms;
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

/**
 * A single destination row. The active treatment is domain-coloured rather
 * than accent-coloured: a Finance row stays gold and a Health row stays green
 * wherever it appears, which is what makes a 34-item tree scannable.
 * `$color` comes from `theme.domain[item.domain]`, or the muted foreground for
 * areas with no domain identity.
 */
const NavItemLink = styled(NavLink)<{ $collapsed: boolean; $color: string; $active: boolean }>`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => `${theme.spacing[2.5]}`};
  padding: ${({ theme }) => `${theme.spacing[2]} ${theme.spacing[2.5]}`};
  border: 1px solid transparent;
  border-radius: ${({ theme }) => theme.radii.sm};
  font-size: ${({ theme }) => theme.typography.role['body-m'].size};
  font-weight: 500;
  color: ${({ theme }) => theme.chrome.fgMuted};
  text-decoration: none;
  transition: background 150ms, color 150ms, border-color 150ms, box-shadow 150ms;
  position: relative;

  ${({ $collapsed }) => $collapsed && css`
    justify-content: center;
    padding: ${({ theme }) => `${theme.spacing[2.5]} 0`};
  `}

  & > svg {
    width: 16px;
    height: 16px;
    flex-shrink: 0;
    color: ${({ theme }) => theme.chrome.fgMuted};
    transition: color 150ms;
  }

  .label {
    white-space: nowrap;
    opacity: ${({ $collapsed }) => $collapsed ? 0 : 1};
    transition: opacity 180ms ease, width 180ms ease;
    overflow: hidden;
    text-overflow: ellipsis;
    width: ${({ $collapsed }) => $collapsed ? 0 : 'auto'};
    flex: 1;
  }

  &:hover {
    background: ${({ theme }) => theme.chrome.ctl};
    color: ${({ theme }) => theme.chrome.fg};
  }

  ${focusRing}

  /*
   * Active state comes from the $active prop, NOT react-router's own .active
   * class. Two reasons: NavLink's matching is prefix-based, so /app and
   * /app/finance would both light up on /app/finance/investments; and
   * styled(NavLink) discards a function-valued className, so the usual escape
   * hatch of passing a className callback silently does nothing.
   */
  ${({ $active, $color, theme }) => $active && css`
    background: linear-gradient(100deg, ${$color}30, ${$color}0C);
    border-color: ${$color}48;
    box-shadow: ${theme.chrome.hi === 'none'
      ? `0 6px 18px -12px ${$color}`
      : `${theme.chrome.hi}, 0 6px 18px -12px ${$color}`};
    color: ${theme.chrome.fg};
    font-weight: 700;

    & > svg {
      color: ${$color};
    }
  `}
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

/**
 * Flattens the nav tree into the list of collapsible sections the sidebar
 * renders. An area WITH sub-pages becomes its own section (header = the area
 * name, rows = its subs); areas WITHOUT subs are pooled into one section per
 * group. So "Finance" is a section of 9 rows, while Chat and Agents share an
 * "Intelligence" section — which is what keeps a 34-destination tree to one
 * indent level instead of a nested accordion.
 */
interface SidebarSection {
  key: string
  label: string
  /** The owning area — present only for a section built from one area's subs. */
  item?: NavItem
  rows: Array<{ item: NavItem; sub?: SubNavItem; to: string; label: string; icon: NavItem['icon'] }>
}

function buildSidebarSections(isAdmin: boolean): SidebarSection[] {
  const sections: SidebarSection[] = []

  for (const group of navSections(isAdmin)) {
    const leftover: NavItem[] = []

    for (const item of group.items) {
      if (item.subs?.length) {
        sections.push({
          key: `item-${item.key}`,
          label: item.label,
          item,
          rows: item.subs.map((sub) => ({ item, sub, to: sub.to, label: sub.label, icon: sub.icon })),
        })
      } else {
        leftover.push(item)
      }
    }

    if (leftover.length) {
      sections.push({
        key: `group-${group.key}`,
        label: group.label,
        rows: leftover.map((item) => ({ item, to: item.to, label: item.label, icon: item.icon })),
      })
    }
  }

  return sections
}

export function Sidebar() {
  const [collapsed, setCollapsed] = useState(false)
  const { sidebarOpen, collapsedSections, toggleSectionCollapsed, toggleTheme, theme, setCmdPaletteOpen } = useUIStore()
  const user = useAuthStore(s => s.user)
  const styledTheme = useTheme()
  const { pathname } = useLocation()

  const isAdmin = !!user?.is_admin
  const sections = useMemo(() => buildSidebarSections(isAdmin), [isAdmin])

  // Longest-prefix match, so /app/finance/transactions highlights that row and
  // not Finance's Overview (whose path is the bare /app/finance).
  const current = resolvePath(pathname)

  const colorFor = (item: NavItem) =>
    item.domain ? styledTheme.domain[item.domain] : styledTheme.chrome.fgMuted

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
        {sections.map((section) => {
          const isCollapsedSection = !!collapsedSections[section.key]

          return (
            <NavGroup key={section.key}>
              <CategoryHeader
                $collapsed={collapsed}
                $isCollapsedSection={isCollapsedSection}
                onClick={() => toggleSectionCollapsed(section.key)}
                aria-expanded={!isCollapsedSection}
                title={collapsed ? section.label : undefined}
              >
                <span>{section.label}</span>
                <ChevronDown className="chevron" />
              </CategoryHeader>

              <ItemsContainer
                $collapsed={collapsed}
                $isCollapsedSection={!collapsed && isCollapsedSection}
              >
                {section.rows.map((row) => {
                  const Icon = row.icon
                  const color = colorFor(row.item)
                  const active = row.sub
                    ? current?.sub?.key === row.sub.key && current?.item.key === row.item.key
                    : current?.item.key === row.item.key

                  return (
                    <NavItemWrapper key={`${row.item.key}:${row.sub?.key ?? ''}`}>
                      {!collapsed && <RowIndicator $color={color} $active={active} />}
                      <Tooltip
                        side="right"
                        disabled={!collapsed}
                        content={
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span>{section.item ? `${section.label} · ${row.label}` : row.label}</span>
                            {row.item.shortcut && <TooltipShortcut>g {row.item.shortcut}</TooltipShortcut>}
                          </div>
                        }
                      >
                        <NavItemLink
                          to={row.to}
                          $collapsed={collapsed}
                          $color={color}
                          $active={active}
                        >
                          <Icon />
                          <span className="label">{row.label}</span>
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


