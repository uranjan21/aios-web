import { resolvePath } from '@/config/navigation'
import { Sun, Moon, Search, Menu, Sparkles, ChevronRight, Home } from 'lucide-react'
import { NotificationBell } from '@/components/NotificationBell'
import { useLocation, useNavigate } from 'react-router-dom'
import { useUIStore } from '@ct/shared/stores/uiStore'
import { useAuthStore } from '@ct/shared/stores/authStore'
import { useSubscription } from '@ct/shared/hooks/useSubscription'
import { DropdownMenu, DropdownMenuTrigger } from '@ledgr/ui'
import { AccountMenuBody } from './AccountMenu'
import styled from 'styled-components'
import { TOPBAR_HEIGHT } from '@ct/shared/theme/layout'


/*
 * Redesigned 2026-08-06 (soft-colour pass). What changed and why:
 *
 *  - Every colour was a hardcoded `rgba(0,0,0,0.04)` / `rgba(255,255,255,0.08)`
 *    literal, so the header was the one piece of chrome that did NOT repaint
 *    when the user switched palette. It is on `theme.chrome.*` now — the token
 *    group that exists for exactly this surface — so it follows the palette.
 *  - `saturate(180%)` is the opposite of a soft palette: it re-saturated the
 *    muted colours behind it on the way through the blur. Gone. The blur stays
 *    (it is what makes content feel like it passes *under* the bar) at a
 *    gentler radius, with no saturation boost.
 *  - The two-stop gradient + `elevation[1]` drop shadow stacked two separators
 *    over one edge. A single hairline does the job; the bar reads as a quiet
 *    edge rather than a floating panel.
 */
const HeaderRoot = styled.header`
  position: relative;
  height: ${TOPBAR_HEIGHT};
  flex-shrink: 0;
  z-index: 30;
  border-bottom: 1px solid ${({ theme }) => theme.chrome.border};
  background: ${({ theme }) => theme.chrome.bg};
  backdrop-filter: ${({ theme }) => theme.glass.regular};
  -webkit-backdrop-filter: ${({ theme }) => theme.glass.regular};
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing[4]};
  padding: 0 ${({ theme }) => theme.spacing[5]};
`

const LeftSide = styled.div`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing[4]};
`

const Hamburger = styled.button`
  padding: ${({ theme }) => `${theme.spacing[2]}`};
  margin-left: -${({ theme }) => theme.spacing[2]};
  background: transparent;
  border: none;
  color: ${({ theme }) => theme.chrome.fg};
  cursor: pointer;
  border-radius: ${({ theme }) => theme.radii.sm};

  &:hover { background: ${({ theme }) => theme.chrome.hoverBg}; }

  @media ${({ theme }) => theme.media.md} {
    display: none;
  }
`

const Crumbs = styled.nav`
  display: flex;
  align-items: center;
  gap: 7px;
  min-width: 0;

  @media ${({ theme }) => theme.media.belowSm} {
    display: none;
  }

  .sep {
    width: 9px;
    height: 9px;
    flex-shrink: 0;
    opacity: 0.4;
    color: ${({ theme }) => theme.color.mutedForeground};
  }

  .crumb {
    background: none;
    border: none;
    padding: 0;
    font: inherit;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    letter-spacing: -0.005em;
    transition: color 150ms ease;
    color: ${({ theme }) => theme.color.mutedForeground};
    font-size: ${({ theme }) => theme.typography.role['body-s'].size};
    font-weight: 500;
    cursor: pointer;

    &:hover { color: ${({ theme }) => theme.chrome.fg}; }

    /* The current page is not a link — it is where you already are. It carries
       the weight instead of a colour shout: 600, not 700, on the soft pass. */
    &.last {
      color: ${({ theme }) => theme.chrome.fg};
      font-size: ${({ theme }) => theme.typography.role['body-l'].size};
      font-weight: 600;
      cursor: default;
    }
  }
`

/** Every header control shares one height so the bar reads as a single row. */
const CTL_HEIGHT = '32px'

const HomeButton = styled.button`
  display: flex;
  align-items: center;
  justify-content: center;
  width: ${CTL_HEIGHT};
  height: ${CTL_HEIGHT};
  flex-shrink: 0;
  border-radius: ${({ theme }) => theme.radii.sm};
  border: 1px solid transparent;
  background: transparent;
  color: ${({ theme }) => theme.color.mutedForeground};
  cursor: pointer;
  transition: background 150ms, color 150ms, border-color 150ms;

  /* Was a filled glass chip that hovered to a full accent outline — the
     loudest control in the bar, for "go home". Quiet by default now. */
  &:hover {
    background: ${({ theme }) => theme.chrome.hoverBg};
    border-color: ${({ theme }) => theme.chrome.border};
    color: ${({ theme }) => theme.chrome.fg};
  }

  svg { width: 16px; height: 16px; }
`

const GlobalSearchContainer = styled.button`
  max-width: 240px;
  width: 240px;
  height: ${CTL_HEIGHT};
  display: flex;
  align-items: center;
  padding: 0 ${({ theme }) => theme.spacing[3]};
  gap: ${({ theme }) => theme.spacing[2]};
  border-radius: ${({ theme }) => theme.radii.md};
  background: ${({ theme }) => theme.chrome.ctl};
  border: 1px solid ${({ theme }) => theme.chrome.border};
  color: ${({ theme }) => theme.color.mutedForeground};
  cursor: pointer;
  transition: border-color 150ms ease, background 150ms ease, color 150ms ease;

  &:hover {
    background: ${({ theme }) => theme.chrome.ctlHover};
    border-color: ${({ theme }) => theme.chrome.borderStrong};
    color: ${({ theme }) => theme.chrome.fg};
  }

  @media ${({ theme }) => theme.media.belowSm} {
    display: none;
  }

  .icon-search {
    width: 14px;
    height: 14px;
    flex-shrink: 0;
    opacity: 0.7;
  }

  .placeholder {
    font-size: ${({ theme }) => theme.typography.role['body-s'].size};
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
    background: ${({ theme }) => theme.chrome.hoverBg};
    color: ${({ theme }) => theme.color.mutedForeground};
    border: 1px solid ${({ theme }) => theme.chrome.border};
    letter-spacing: 0;
    flex-shrink: 0;
  }
`

const RightCluster = styled.div`
  margin-left: auto;
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing[2]};
`

/** Hairline between the two right-hand groups: what you invoke | who you are. */
const Divider = styled.span`
  width: 1px;
  height: 18px;
  flex-shrink: 0;
  background: ${({ theme }) => theme.chrome.border};
  margin: 0 ${({ theme }) => theme.spacing[1]};

  @media ${({ theme }) => theme.media.belowSm} {
    display: none;
  }
`

const IconButton = styled.button`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: ${CTL_HEIGHT};
  height: ${CTL_HEIGHT};
  border-radius: ${({ theme }) => theme.radii.sm};
  background: transparent;
  border: 1px solid transparent;
  color: ${({ theme }) => theme.color.mutedForeground};
  cursor: pointer;
  transition: color 150ms ease, background 150ms ease, border-color 150ms ease;

  &:hover {
    background: ${({ theme }) => theme.chrome.hoverBg};
    color: ${({ theme }) => theme.chrome.fg};
    border-color: ${({ theme }) => theme.chrome.border};
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
  border-color: ${({ theme }) => theme.chrome.border};

  &:hover {
    border-color: ${({ theme }) => theme.chrome.borderStrong};
  }
`

/*
 * "Ask AI" is the one control in the bar that should read as an invitation, so
 * it keeps a fill while everything else went transparent — but a soft accent
 * WASH (`theme.accent.soft`), not the `accent + hex-alpha` string concat this
 * used before. That concat assumed `color.accent` was always a 6-digit hex;
 * it also produced a saturated chip that fought the muted palette.
 */
const AssistantButton = styled.button`
  display: inline-flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing[1.5]};
  padding: 0 ${({ theme }) => theme.spacing[3]};
  height: ${CTL_HEIGHT};
  border-radius: ${({ theme }) => theme.radii.md};
  background: ${({ theme }) => theme.accent.soft};
  border: 1px solid ${({ theme }) => theme.accent.ring};
  color: ${({ theme }) => theme.color.accent};
  font-size: ${({ theme }) => theme.typography.role['body-s'].size};
  font-weight: 600;
  white-space: nowrap;
  cursor: pointer;
  transition: background 150ms ease, border-color 150ms ease;

  &:hover {
    background: ${({ theme }) => theme.accent.ring};
    border-color: ${({ theme }) => theme.color.accent};
  }

  svg {
    width: 14px;
    height: 14px;
  }

  /* Below sm the label drops and it becomes an icon square — the assistant is
     the last thing that should fall off a narrow header. */
  @media ${({ theme }) => theme.media.belowSm} {
    width: ${CTL_HEIGHT};
    padding: 0;
    justify-content: center;

    .label { display: none; }
  }
`

export function TopBar() {
  const { theme, toggleTheme, setCmdPaletteOpen, toggleSidebar, toggleAssistant } = useUIStore()
  const location = useLocation()
  const navigate = useNavigate()
  const user = useAuthStore(s => s.user)

  useSubscription()

  /*
   * Breadcrumbs, 2026-08-01. This used to be a THIRD flat nav — six hardcoded
   * paths duplicating the sidebar. With a 34-destination tree that list could
   * never be representative, so it is now a trail showing where you are:
   * home icon -> area -> sub-page.
   */
  const current = resolvePath(location.pathname)
  const crumbs: Array<{ label: string; to?: string }> = []
  if (current) {
    // An area with subs is not itself a destination — its own path belongs to
    // its first sub — so it renders as plain text, not a link.
    crumbs.push({ label: current.item.label, to: current.item.subs ? undefined : current.item.to })
    if (current.sub) crumbs.push({ label: current.sub.label, to: current.sub.to })
  }

  return (
    <HeaderRoot>
      <LeftSide>
        <Hamburger aria-label="Open mobile menu" onClick={toggleSidebar}>
          <Menu size={18} />
        </Hamburger>

        <HomeButton type="button" aria-label="Home" title="Home" onClick={() => navigate('/app')}>
          <Home />
        </HomeButton>

        <Crumbs aria-label="Breadcrumb">
          {crumbs.map((crumb, i) => {
            const last = i === crumbs.length - 1
            return (
              <span key={`${crumb.label}-${i}`} style={{ display: 'flex', alignItems: 'center', gap: 7, minWidth: 0 }}>
                {i > 0 && <ChevronRight className="sep" />}
                <button
                  type="button"
                  className={`crumb${last ? ' last' : ''}`}
                  disabled={last || !crumb.to}
                  onClick={() => crumb.to && navigate(crumb.to)}
                >
                  {crumb.label}
                </button>
              </span>
            )
          })}
        </Crumbs>
      </LeftSide>

      <RightCluster>
        {/* A page's own actions do NOT land here (reverted 2026-08-02, later):
            the TopBar is permanent app chrome and one page's Settings link or
            domain filter has no business in it. They render in the page's own
            header block — see `PageContent` in @ct/shared. */}
        <GlobalSearchContainer onClick={() => setCmdPaletteOpen(true)} type="button" aria-label="Global search">
          <Search className="icon-search" />
          <span className="placeholder">Search...</span>
          <kbd className="shortcut-badge">⌘K</kbd>
        </GlobalSearchContainer>

        <AssistantButton onClick={toggleAssistant} aria-label="Ask AI" title="Ask AI (⌘J)">
          <Sparkles />
          <span className="label">Ask AI</span>
        </AssistantButton>

        <Divider aria-hidden="true" />

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

