/**
 * The global sidebar.
 *
 * ── 2026-08-05 rebuild ────────────────────────────────────────────────────
 * `navigation.ts` has described a two-level tree since 2026-08-01, but this
 * file did not render one. `buildSidebarSections` flattened it: every area
 * carrying `subs` was promoted to a top-level accordion of its own, so the
 * group layer ("Areas", "Intelligence"…) never appeared on screen and all 31
 * destinations sat open at once. Finding the current page meant scanning a
 * scrolling wall of same-weight rows.
 *
 * What renders now:
 *
 *   GROUP HEADING          static label, never clickable (it is a heading)
 *     area row      ▸      Finance / Health / Career — expands its sub-pages
 *       sub row            a destination, drawn on a hairline rail
 *     destination row      groups whose members are leaves (Daily, Workspace…)
 *
 * The open/closed rule is the part worth reading: an area is open when
 * `collapsedSections['nav:<key>']` says so, and falls back to "open iff this
 * is the area you are in". Entering an area force-opens it (the effect below),
 * because arriving somewhere and not seeing its navigation is the one failure
 * mode a collapsed tree must not have. After that the chevron is yours.
 */
import { useEffect, useMemo, useRef, useState } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import { useTheme } from 'styled-components'
import { useUIStore } from '@ct/shared/stores/uiStore'
import { navSections, resolvePath, type NavItem, type SubNavItem } from '@/config/navigation'
import { useAuthStore } from '@ct/shared/stores/authStore'
import { accountLabel } from '@ct/shared/lib/account'
import { DropdownMenu, DropdownMenuTrigger, Tooltip, focusRing } from '@ledgr/ui'
import { ChevronLeft, ChevronRight, ChevronsUpDown, Sun, Moon, Command } from 'lucide-react'
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
  background: ${({ theme }) => theme.color.card};
  border: 1px solid ${({ theme }) => theme.chrome.border};
  color: ${({ theme }) => theme.color.foreground};
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  box-shadow: ${({ theme }) => theme.elevation[2]};
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
  gap: ${({ theme }) => theme.spacing[3]};
  padding: ${({ theme, $collapsed }) => $collapsed ? `${theme.spacing[4]} ${theme.spacing[2]}` : `${theme.spacing[4]} ${theme.spacing[4]}`};
  border-bottom: 1px solid ${({ theme }) => theme.chrome.border};
  min-height: 68px;
  position: relative;
  z-index: 2;
  justify-content: ${({ $collapsed }) => $collapsed ? 'center' : 'flex-start'};
`

/*
 * The logo mark is GONE (2026-08-06, Utsav's call). It had already been stripped
 * to a flat accent chip on 2026-08-05 for being the loudest thing in the
 * sidebar; the chip was still a solid accent square sitting above every nav row
 * and setting the contrast ceiling for all of them. The wordmark stays — that
 * is the product's name, which the collapsed rail drops along with every other
 * label. Do not reintroduce a mark here.
 */
const BrandText = styled.div<{ $collapsed: boolean }>`
  display: flex;
  flex-direction: column;
  opacity: ${({ $collapsed }) => $collapsed ? 0 : 1};
  transition: opacity 180ms ease;
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
    }
  }
`

const NavList = styled.nav`
  flex: 1;
  overflow-y: auto;
  /*
   * scrollbar-width alone leaves the COLOUR to the browser, which paints a
   * near-white track down the sidebar edge in dark mode — the brightest thing
   * on the screen, against a soft palette. Pin both.
   * (No backticks in this comment: it lives inside a template literal.)
   */
  scrollbar-width: thin;
  scrollbar-color: ${({ theme }) => theme.chrome.borderStrong} transparent;
  padding: ${({ theme }) => `${theme.spacing[3]} ${theme.spacing[2]}`};
  display: flex;
  flex-direction: column;
  /*
   * 12px, not 16. Five groups × 15 rows overflow a 720px viewport either way,
   * so the gap is spent on separating groups only as much as the uppercase
   * headings already do — every extra pixel here is a row pushed off-screen.
   */
  gap: ${({ theme }) => theme.spacing[3]};
  position: relative;
  z-index: 2;
`

const NavGroup = styled.div`
  display: flex;
  flex-direction: column;
  gap: 2px;
`

/**
 * A GROUP HEADING IS NOT A BUTTON.
 *
 * It used to be one — a `<button>` that collapsed the section — and that is
 * exactly what let the tree render as seven sibling accordions with no visible
 * grouping. A heading labels; the rows below it are the targets. Collapsing
 * now belongs to the three areas that actually branch, where it earns its keep.
 *
 * On the collapsed rail the label cannot be read, so it degrades to a hairline
 * separator rather than clipped text.
 */
const GroupHeading = styled.div<{ $collapsed: boolean }>`
  font-size: 10px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.09em;
  color: ${({ theme }) => theme.color.mutedForeground};
  padding: ${({ theme }) => `${theme.spacing[1]} ${theme.spacing[3]}`};
  margin-bottom: 2px;
  user-select: none;

  ${({ $collapsed, theme }) => $collapsed && css`
    padding: 0;
    margin: ${theme.spacing[2]} auto;
    width: 24px;
    height: 1px;
    background: ${theme.chrome.border};
    color: transparent;
    overflow: hidden;
  `}
`

const RowWrapper = styled.div`
  position: relative;
  display: flex;
  align-items: center;
`

/**
 * One navigable row — an area, a leaf destination, or a sub-page.
 *
 * The active treatment is domain-coloured rather than accent-coloured: a
 * Finance row stays gold and a Health row stays green wherever it appears,
 * which is what makes a tree of this size scannable. `$color` comes from
 * `theme.domain[item.domain]`, or the muted foreground for areas with none.
 *
 * The 08-01 version painted the active row with a gradient wash, a tinted
 * border AND a coloured drop shadow — three signals for one bit of state, and
 * the shadow bled onto the neighbouring row. It is a flat tinted fill now,
 * plus the rail indicator on sub-rows: legible at a glance, and it stays
 * inside its own box.
 */
const NavRow = styled(NavLink)<{
  $collapsed: boolean
  $color: string
  $active: boolean
  $sub?: boolean
  $hasChevron?: boolean
}>`
  flex: 1;
  min-width: 0;
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing[2.5]};
  /*
   * Both levels sit at the same 31px row height. A taller parent row was the
   * obvious way to signal hierarchy, but it cost 4px × 15 rows of vertical
   * budget in a column that already overflows; the indent, the rail and the
   * weight difference carry the hierarchy on their own.
   */
  padding: ${({ theme }) => `${theme.spacing[1.5]} ${theme.spacing[2.5]}`};
  padding-right: ${({ theme, $hasChevron }) => ($hasChevron ? theme.spacing[7] : theme.spacing[2.5])};
  border-radius: ${({ theme }) => theme.radii.sm};
  font-size: ${({ theme }) => theme.typography.role['body-m'].size};
  font-weight: ${({ $sub }) => ($sub ? 400 : 500)};
  color: ${({ theme }) => theme.chrome.fgMuted};
  text-decoration: none;
  transition: background 140ms, color 140ms;
  position: relative;

  ${({ $collapsed, theme }) => $collapsed && css`
    justify-content: center;
    padding: ${theme.spacing[2.5]} 0;
  `}

  & > svg {
    width: ${({ $sub }) => ($sub ? '15px' : '16px')};
    height: ${({ $sub }) => ($sub ? '15px' : '16px')};
    flex-shrink: 0;
    color: ${({ theme }) => theme.chrome.fgMuted};
    transition: color 140ms;
  }

  .label {
    white-space: nowrap;
    opacity: ${({ $collapsed }) => $collapsed ? 0 : 1};
    transition: opacity 180ms ease;
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
    background: color-mix(in srgb, ${$color} 14%, transparent);
    color: ${theme.chrome.fg};
    font-weight: 600;

    & > svg {
      color: ${$color};
    }
  `}
`

/**
 * The parent of an open branch is emphasised but NOT filled. It is context for
 * the highlighted child; painting both at full strength reads as two current
 * pages.
 */
const AreaRow = styled(NavRow)<{ $open: boolean }>`
  ${({ $open, $active, theme }) => $open && !$active && css`
    color: ${theme.chrome.fg};
    font-weight: 600;
  `}

  & > svg {
    color: ${({ theme, $open, $color }) => ($open ? $color : theme.chrome.fgMuted)};
  }
`

/** The active bar drawn on the sub-page rail, in the area's domain colour. */
const RowIndicator = styled.span<{ $color: string; $active: boolean }>`
  position: absolute;
  left: -13px;
  top: 6px;
  bottom: 6px;
  width: 2px;
  border-radius: 1px;
  background: ${({ $active, $color }) => ($active ? $color : 'transparent')};
  transition: background 140ms;
`

/**
 * The expander is a separate hit target from the row, so clicking "Finance"
 * goes to Finance and clicking the chevron only opens the branch. One control
 * doing both would make the label a coin toss.
 */
const Chevron = styled.button<{ $open: boolean }>`
  position: absolute;
  right: 4px;
  width: 22px;
  height: 22px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: none;
  background: transparent;
  border-radius: ${({ theme }) => theme.radii.sm};
  color: ${({ theme }) => theme.color.mutedForeground};
  cursor: pointer;
  transition: background-color 140ms, color 140ms;

  &:hover {
    background: ${({ theme }) => theme.chrome.ctl};
    color: ${({ theme }) => theme.chrome.fg};
  }

  ${focusRing}

  & > svg {
    width: 13px;
    height: 13px;
    transform: ${({ $open }) => ($open ? 'rotate(90deg)' : 'none')};
    transition: transform 200ms cubic-bezier(0.16, 1, 0.3, 1);
  }
`

/**
 * Sub-pages sit inside a hairline rail, indented from the area row. The rail
 * is what makes the second level legible without a second indent step — each
 * row's active indicator is a bar drawn ON the rail (see `RowIndicator`).
 *
 * `max-height` is computed from the row count rather than a fixed ceiling: the
 * old 600px constant meant every branch animated at a different apparent speed
 * depending on how many rows it held.
 */
const SubList = styled.div<{ $open: boolean; $count: number }>`
  display: flex;
  flex-direction: column;
  gap: 1px;
  overflow: hidden;
  max-height: ${({ $open, $count }) => ($open ? `${$count * 34 + 8}px` : '0px')};
  opacity: ${({ $open }) => ($open ? 1 : 0)};
  transition: max-height 220ms cubic-bezier(0.16, 1, 0.3, 1), opacity 160ms ease;

  margin: 2px 0 ${({ theme }) => theme.spacing[1]} ${({ theme }) => theme.spacing[4]};
  padding-left: ${({ theme }) => theme.spacing[3]};
  border-left: 1px solid ${({ theme }) => theme.chrome.border};
`

const TooltipShortcut = styled.span`
  font-size: 9px;
  font-weight: 700;
  padding: ${({ theme }) => `${theme.spacing[0.5]} ${theme.spacing[1.5]}`};
  border-radius: ${({ theme }) => theme.radii.sm};
  background: color-mix(in srgb, ${({ theme }) => theme.color.accent} 18%, transparent);
  color: ${({ theme }) => theme.color.accent};
  text-transform: uppercase;
  letter-spacing: 0.05em;
`

const TooltipBody = styled.div`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing[2]};
`

const QuickActionsBar = styled.div`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing[1.5]};
  padding: ${({ theme }) => `0 ${theme.spacing[3]}`};
  margin-bottom: ${({ theme }) => theme.spacing[2]};
`

const QuickActionButton = styled.button`
  display: flex;
  align-items: center;
  justify-content: center;
  gap: ${({ theme }) => theme.spacing[1.5]};
  padding: ${({ theme }) => `${theme.spacing[1.5]} ${theme.spacing[2]}`};
  border-radius: ${({ theme }) => theme.radii.sm};
  background: transparent;
  border: 1px solid ${({ theme }) => theme.chrome.border};
  color: ${({ theme }) => theme.color.mutedForeground};
  font-size: 11px;
  font-weight: 600;
  cursor: pointer;
  transition: background-color 140ms, color 140ms, border-color 140ms;
  flex: 1;

  &:hover {
    background: ${({ theme }) => theme.chrome.ctl};
    color: ${({ theme }) => theme.chrome.fg};
  }

  svg {
    width: 13px;
    height: 13px;
  }

  ${focusRing}
`

const FooterSection = styled.div`
  padding: ${({ theme }) => theme.spacing[2]};
  border-top: 1px solid ${({ theme }) => theme.chrome.border};
  position: relative;
  z-index: 2;
`

const UserBlock = styled.button<{ $collapsed: boolean }>`
  width: 100%;
  border: 1px solid transparent;
  border-radius: ${({ theme }) => theme.radii.md};
  background: transparent;
  font: inherit;
  color: inherit;
  cursor: pointer;
  padding: ${({ theme }) => theme.spacing[2]};
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing[2.5]};
  position: relative;
  transition: background-color 150ms ease, border-color 150ms ease;

  &:hover {
    background: ${({ theme }) => theme.chrome.ctl};
    border-color: ${({ theme }) => theme.chrome.border};
  }

  ${focusRing}

  ${({ $collapsed, theme }) => $collapsed && css`
    justify-content: center;
    padding: ${theme.spacing[2]} 0;
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
    background: ${({ theme }) => theme.color.success};
    border: 2px solid ${({ theme }) => theme.color.card};
    animation: ${pulseGlow} 2.5s infinite ease-in-out;
  }
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
`

const AvatarImage = styled.img`
  width: 32px;
  height: 32px;
  border-radius: 50%;
  object-fit: cover;
`

const UserInfo = styled.div<{ $collapsed: boolean }>`
  flex-direction: column;
  flex: 1;
  min-width: 0;
  align-items: flex-start;
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

/** Persisted key for an area's open/closed override. */
const openKey = (item: NavItem) => `nav:${item.key}`

export function Sidebar() {
  const [collapsed, setCollapsed] = useState(false)
  const {
    sidebarOpen, collapsedSections, toggleSectionCollapsed, setSectionCollapsed,
    toggleTheme, theme, setCmdPaletteOpen,
  } = useUIStore()
  const user = useAuthStore(s => s.user)
  const styledTheme = useTheme()
  const { pathname } = useLocation()

  const isAdmin = !!user?.is_admin
  const sections = useMemo(() => navSections(isAdmin), [isAdmin])

  // Longest-prefix match, so /app/finance/transactions highlights that row and
  // not Finance's Overview (whose path is the bare /app/finance).
  const current = resolvePath(pathname)
  const activeItemKey = current?.item.key

  /*
   * Force the area you just entered open. Keyed on the active area CHANGING,
   * not on every render — otherwise collapsing the branch you are standing in
   * would be undone on the next paint and the chevron would look broken.
   */
  const prevArea = useRef<string | undefined>(activeItemKey)
  useEffect(() => {
    if (activeItemKey && activeItemKey !== prevArea.current) {
      const item = sections.flatMap(s => s.items).find(i => i.key === activeItemKey)
      if (item?.subs?.length) setSectionCollapsed(openKey(item), false)
    }
    prevArea.current = activeItemKey
  }, [activeItemKey, sections, setSectionCollapsed])

  /*
   * Five groups and fifteen rows do not fit a 720px viewport, so this column
   * scrolls — which is fine right up until the row you are on is the one below
   * the fold. Pull it into view on every navigation. `nearest` so a row that is
   * already visible does not jerk the list to centre it.
   */
  const navRef = useRef<HTMLElement>(null)
  useEffect(() => {
    const active = navRef.current?.querySelector('[data-active="true"]')
    active?.scrollIntoView({ block: 'nearest' })
  }, [pathname])

  const colorFor = (item: NavItem) =>
    item.domain ? styledTheme.domain[item.domain] : styledTheme.chrome.fgMuted

  /** Open iff explicitly set; otherwise open exactly when you are inside it. */
  const isOpen = (item: NavItem) => {
    const override = collapsedSections[openKey(item)]
    return override === undefined ? item.key === activeItemKey : !override
  }

  const tooltipFor = (label: string, shortcut?: string) => (
    <TooltipBody>
      <span>{label}</span>
      {shortcut && <TooltipShortcut>g {shortcut}</TooltipShortcut>}
    </TooltipBody>
  )

  const renderSub = (item: NavItem, sub: SubNavItem) => {
    const Icon = sub.icon
    const color = colorFor(item)
    const active = current?.item.key === item.key && current?.sub?.key === sub.key

    return (
      <RowWrapper key={`${item.key}:${sub.key}`}>
        <RowIndicator $color={color} $active={active} />
        <NavRow to={sub.to} $collapsed={false} $color={color} $active={active} $sub data-active={active}>
          <Icon />
          <span className="label">{sub.label}</span>
        </NavRow>
      </RowWrapper>
    )
  }

  const renderItem = (item: NavItem) => {
    const Icon = item.icon
    const color = colorFor(item)
    const branches = !!item.subs?.length
    const open = branches && !collapsed && isOpen(item)

    /*
     * An expanded area with subs is "active" only when you are on the area
     * itself with no sub resolved — otherwise the highlight belongs to the
     * visible child, and lighting both reads as two current pages.
     *
     * On the COLLAPSED rail there is no visible child to carry it, so the area
     * takes the highlight for anything beneath it. Without this branch, sitting
     * on /app/finance/transactions with the rail collapsed highlighted nothing
     * at all, and the rail stopped answering "where am I".
     */
    const inThisArea = current?.item.key === item.key
    const active = branches && !collapsed
      ? inThisArea && !current?.sub
      : inThisArea

    return (
      <div key={item.key}>
        <RowWrapper>
          <Tooltip
            side="right"
            disabled={!collapsed}
            content={tooltipFor(item.label, item.shortcut)}
          >
            {branches ? (
              <AreaRow
                to={item.to}
                $collapsed={collapsed}
                $color={color}
                $active={active}
                $open={open}
                $hasChevron={!collapsed}
                data-active={active}
              >
                <Icon />
                <span className="label">{item.label}</span>
              </AreaRow>
            ) : (
              <NavRow to={item.to} $collapsed={collapsed} $color={color} $active={active} data-active={active}>
                <Icon />
                <span className="label">{item.label}</span>
              </NavRow>
            )}
          </Tooltip>

          {branches && !collapsed && (
            <Chevron
              type="button"
              $open={open}
              onClick={() => toggleSectionCollapsed(openKey(item))}
              aria-expanded={open}
              aria-label={`${open ? 'Collapse' : 'Expand'} ${item.label}`}
            >
              <ChevronRight />
            </Chevron>
          )}
        </RowWrapper>

        {branches && !collapsed && (
          <SubList $open={open} $count={item.subs!.length} aria-hidden={!open}>
            {item.subs!.map((sub) => renderSub(item, sub))}
          </SubList>
        )}
      </div>
    )
  }

  return (
    <SidebarRoot $collapsed={collapsed} $mobileOpen={sidebarOpen}>
      <ToggleButton
        $collapsed={collapsed}
        onClick={() => setCollapsed(!collapsed)}
        aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
      >
        <ChevronLeft />
      </ToggleButton>

      <BrandPanel $collapsed={collapsed}>
        <BrandText $collapsed={collapsed}>
          <span className="name">Control <span className="accent">Tower</span></span>
        </BrandText>
      </BrandPanel>

      <NavList ref={navRef} aria-label="Main navigation">
        {sections.map((section) => (
          <NavGroup key={section.key}>
            <GroupHeading $collapsed={collapsed} aria-hidden={collapsed}>
              {section.label}
            </GroupHeading>
            {section.items.map(renderItem)}
          </NavGroup>
        ))}
      </NavList>

      {!collapsed && (
        <QuickActionsBar>
          <QuickActionButton onClick={toggleTheme} title="Toggle theme">
            {theme === 'dark' ? <Moon /> : <Sun />}
            <span>{theme === 'dark' ? 'Dark' : 'Light'}</span>
          </QuickActionButton>

          <QuickActionButton onClick={() => setCmdPaletteOpen(true)} title="Open command palette (⌘K)">
            <Command />
            <span>⌘K</span>
          </QuickActionButton>
        </QuickActionsBar>
      )}

      <FooterSection>
        <DropdownMenu>
          <DropdownMenuTrigger>
            <UserBlock $collapsed={collapsed} aria-label={`User menu: ${user?.name || 'User'}`}>
              <AvatarWrapper>
                {user?.picture_url ? (
                  <AvatarImage src={user.picture_url} alt="" referrerPolicy="no-referrer" />
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
