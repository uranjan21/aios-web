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

    &:hover { color: ${({ theme }) => theme.color.foreground}; }

    /* The current page is not a link — it is where you already are. */
    &.last {
      color: ${({ theme }) => theme.color.foreground};
      font-size: ${({ theme }) => theme.typography.role['body-l'].size};
      font-weight: 700;
      cursor: default;
    }
  }
`

const HomeButton = styled.button`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  flex-shrink: 0;
  border-radius: ${({ theme }) => theme.radii.sm};
  border: 1px solid ${({ theme }) => theme.glass.border};
  background: ${({ theme }) => theme.glass.ctl};
  color: ${({ theme }) => theme.color.mutedForeground};
  cursor: pointer;
  transition: background 150ms, color 150ms, border-color 150ms;

  &:hover {
    background: ${({ theme }) => theme.accent.soft};
    border-color: ${({ theme }) => theme.color.accent};
    color: ${({ theme }) => theme.color.accent};
  }

  svg { width: 16px; height: 16px; }
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

