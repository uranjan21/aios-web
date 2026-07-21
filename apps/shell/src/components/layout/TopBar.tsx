import React from 'react'
import { PAGE_NAMES } from '@/config/navigation'
import { ArrowLeft, Sun, Moon, Search, Menu, ChevronRight, Home, Settings, LogOut } from 'lucide-react'
import { NotificationBell } from '@/components/NotificationBell'
import { useLocation, useNavigate } from 'react-router-dom'
import { useUIStore } from '@aios/shared/stores/uiStore'
import { useAuthStore } from '@aios/shared/stores/authStore'
import { logoutAndRedirect } from '@aios/shared/lib/logout'
import {
  DropdownMenu, DropdownMenuTrigger, DropdownMenuContent,
  DropdownMenuItem, DropdownMenuSeparator, focusRing } from '@ledgr/ui'

import styled from 'styled-components'
import { TOPBAR_HEIGHT } from '@aios/shared/theme/layout'

const HeaderRoot = styled.header`
  position: relative;
  height: ${TOPBAR_HEIGHT};
  flex-shrink: 0;
  z-index: 30;
  border-bottom: 1px solid ${({ theme }) => theme.color.border};
  background: color-mix(in srgb, ${({ theme }) => theme.color.card} 80%, transparent);
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
  box-shadow: ${({ theme }) => theme.shadow.sm};
  display: flex;
  align-items: center;
  gap: ${({ theme }) => `${theme.spacing[3]}`};
  padding: ${({ theme }) => `0 ${theme.spacing[4]}`};
`

const BackButton = styled.button`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: ${({ theme }) => `${theme.spacing[1.5]}`};
  border-radius: ${({ theme }) => theme.radii.sm};
  background: transparent;
  border: none;
  color: ${({ theme }) => theme.color.mutedForeground};
  cursor: pointer;
  transition: background-color 120ms, color 120ms;
  
  &:hover {
    background: ${({ theme }) => theme.color.muted};
    color: ${({ theme }) => theme.color.foreground};
  }

  ${focusRing}
  
  svg { width: 16px; height: 16px; }
`

const Hamburger = styled.button`
  padding: ${({ theme }) => `${theme.spacing[2]}`};
  margin-left: -8px;
  background: transparent;
  border: none;
  color: ${({ theme }) => theme.color.foreground};
  cursor: pointer;
  border-radius: ${({ theme }) => theme.radii.md};
  
  &:hover { background: ${({ theme }) => theme.color.muted}; }

  ${focusRing}
  
  @media ${({ theme }) => theme.media.md} {
    display: none;
  }
`

const BreadcrumbNav = styled.nav`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => `${theme.spacing[1.5]}`};
  font-size: ${({ theme }) => theme.typography.fontSize.base};
  
  @media ${({ theme }) => theme.media.belowMd} {
    display: none;
  }
  
  .crumb {
    color: ${({ theme }) => theme.color.mutedForeground};
    text-decoration: none;
    display: inline-flex;
    align-items: center;
    background: none;
    border: none;
    padding: ${({ theme }) => `${theme.spacing[0.5]} ${theme.spacing[1]}`};
    margin: -2px -4px;
    border-radius: ${({ theme }) => theme.radii.xs};
    font: inherit;
  }

  .crumb.link {
    cursor: pointer;
    &:hover { color: ${({ theme }) => theme.color.foreground}; }
  ${focusRing}
  }

  .crumb.active {
    font-weight: 500;
    color: ${({ theme }) => theme.color.foreground};
  }

  .separator {
    width: 12px;
    height: 12px;
    color: ${({ theme }) => theme.color.mutedForeground};
    flex-shrink: 0;
  }
`

const GlobalSearchContainer = styled.div`
  flex: 1;
  max-width: 28rem;
  position: relative;
  margin-left: ${({ theme }) => `${theme.spacing[6]}`};

  @media ${({ theme }) => theme.media.belowSm} {
    display: none;
    margin-left: 0;
  }
  
  input {
    width: 100%;
    height: 36px;
    padding: ${({ theme }) => `0 ${theme.spacing[8]}`};
    border-radius: ${({ theme }) => theme.radii.md};
    border: 1px solid ${({ theme }) => theme.color.input};
    background: ${({ theme }) => theme.color.background};
    color: ${({ theme }) => theme.color.foreground};
    font-size: ${({ theme }) => theme.typography.fontSize.base};
    
    &:focus {
      outline: none;
      border-color: ${({ theme }) => theme.color.ring};
      box-shadow: 0 0 0 3px ${({ theme }) => theme.color.ring}33;
    }
    
    &::placeholder {
      color: ${({ theme }) => theme.color.mutedForeground};
    }
  }
  
  .icon-left {
    position: absolute;
    left: 10px;
    top: 50%;
    transform: translateY(-50%);
    width: 14px;
    height: 14px;
    color: ${({ theme }) => theme.color.mutedForeground};
    pointer-events: none;
  }
`

const RightCluster = styled.div`
  margin-left: auto;
  display: flex;
  align-items: center;
  gap: ${({ theme }) => `${theme.spacing[1]}`};
`

const IconButton = styled.button`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: ${({ theme }) => `${theme.spacing[1.5]}`};
  border-radius: ${({ theme }) => theme.radii.md};
  background: transparent;
  border: none;
  color: ${({ theme }) => theme.color.mutedForeground};
  cursor: pointer;
  transition: background-color 120ms, color 120ms;
  
  &:hover {
    background: ${({ theme }) => theme.color.muted};
    color: ${({ theme }) => theme.color.foreground};
  }

  ${focusRing}
  
  svg {
    width: 16px;
    height: 16px;
  }
  
  @media (pointer: coarse) {
    min-width: 40px;
    min-height: 40px;
  }
`

const UserMenuTrigger = styled.button`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => `${theme.spacing[2]}`};
  padding: ${({ theme }) => `${theme.spacing[1]} ${theme.spacing[2]}`};
  border-radius: ${({ theme }) => theme.radii.md};
  background: transparent;
  border: none;
  cursor: pointer;
  transition: background-color 120ms;
  
  &:hover { background: ${({ theme }) => theme.color.muted}; }

  ${focusRing}
  
  .avatar {
    width: 24px;
    height: 24px;
    border-radius: 50%;
    background: ${({ theme }) => theme.color.primaryHover};
    color: ${({ theme }) => theme.color.primaryForeground};
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: ${({ theme }) => theme.typography.fontSize.xs};
    font-weight: 600;
  }
  
  .info {
    display: none;
    flex-direction: column;
    text-align: left;

    @media ${({ theme }) => theme.media.sm} {
      display: flex;
    }
    
    .name {
      font-size: ${({ theme }) => theme.typography.fontSize.sm};
      font-weight: 500;
      color: ${({ theme }) => theme.color.foreground};
      line-height: 1.2;
    }
    
    .role {
      font-size: ${({ theme }) => theme.typography.fontSize.xs};
      text-transform: capitalize;
      color: ${({ theme }) => theme.color.mutedForeground};
      line-height: 1.2;
    }
  }
`


const AccountMenuContent = styled(DropdownMenuContent)`
  min-width: 260px;
`

const PopoverHeader = styled.div`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => `${theme.spacing[3.5]}`};
  padding: ${({ theme }) => `${theme.spacing[3]}`};
  margin-bottom: ${({ theme }) => `${theme.spacing[1]}`};
  border-radius: ${({ theme }) => theme.radii.sm};
  background: linear-gradient(145deg, ${({ theme }) => theme.color.muted}, transparent);
  
  .avatar-large {
    width: 42px;
    height: 42px;
    border-radius: 50%;
    background: ${({ theme }) => theme.color.primary};
    color: ${({ theme }) => theme.color.primaryForeground};
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: ${({ theme }) => theme.typography.fontSize.md};
    font-weight: 600;
    flex-shrink: 0;
    box-shadow: ${({ theme }) => theme.elevation[2]};
  }
  
  .user-details {
    display: flex;
    flex-direction: column;
    overflow: hidden;
    
    .name {
      font-size: ${({ theme }) => theme.typography.fontSize.base};
      font-weight: 600;
      color: ${({ theme }) => theme.color.foreground};
      white-space: nowrap;
      text-overflow: ellipsis;
      overflow: hidden;
      letter-spacing: -0.01em;
      margin-bottom: ${({ theme }) => `${theme.spacing[0.5]}`};
    }
    
    .email {
      font-size: ${({ theme }) => theme.typography.fontSize.sm};
      color: ${({ theme }) => theme.color.mutedForeground};
      white-space: nowrap;
      text-overflow: ellipsis;
      overflow: hidden;
    }
  }
`

export function TopBar() {
  const { theme, toggleTheme, setCmdPaletteOpen, toggleSidebar } = useUIStore()
  const user = useAuthStore(s => s.user)
  const location = useLocation()
  const navigate = useNavigate()

  const path = location.pathname
  const canGoBack = path !== '/app' && path !== '/' && path !== '/login'

  // Build breadcrumbs as { label, to } — every non-leaf segment is a real route.
  // All authenticated routes live under /app, so strip that prefix before parsing segments.
  const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1)
  const breadcrumbs: { label: string; to: string }[] = [{ label: 'AIOS', to: '/app' }]

  if (canGoBack) {
    const appPath = path.startsWith('/app') ? path.slice(4) : path
    const parts = appPath.split('/').filter(Boolean)
    if (parts[0] === 'areas') {
      // "Areas" has no index route — point it at the first area so the link resolves.
      breadcrumbs.push({ label: 'Areas', to: '/app/finance' })
      if (parts[1]) breadcrumbs.push({ label: cap(parts[1]), to: `/app/${parts[1]}` })
      if (parts[2]) breadcrumbs.push({ label: cap(parts[2]), to: `/app/${parts[1]}/${parts[2]}` })
    } else if (parts.length) {
      const fullPath = `/app/${parts.join('/')}`
      breadcrumbs.push({ label: PAGE_NAMES[fullPath] || cap(parts[0]), to: fullPath })
    }
  }

  return (
    <HeaderRoot>
      <Hamburger aria-label="Open mobile menu" onClick={toggleSidebar}>
        <Menu size={20} />
      </Hamburger>

      {canGoBack && (
        <BackButton onClick={() => navigate(-1)} aria-label="Go back">
          <ArrowLeft />
        </BackButton>
      )}

      <BreadcrumbNav aria-label="Breadcrumb">
        <button type="button" className="crumb link" onClick={() => navigate('/app')} aria-label="Home">
          <Home size={14} />
        </button>
        <ChevronRight className="separator" />
        {breadcrumbs.map((bc, i) => {
          const isLast = i === breadcrumbs.length - 1
          return (
            <React.Fragment key={i}>
              {isLast ? (
                <span className="crumb active" aria-current="page">{bc.label}</span>
              ) : (
                <button type="button" className="crumb link" onClick={() => navigate(bc.to)}>
                  {bc.label}
                </button>
              )}
              {!isLast && <ChevronRight className="separator" />}
            </React.Fragment>
          )
        })}
      </BreadcrumbNav>

      <GlobalSearchContainer onClick={() => setCmdPaletteOpen(true)}>
        <Search className="icon-left" />
        <input 
          type="text" 
          placeholder="Search anything (⌘K)..." 
          readOnly 
          aria-label="Global search"
        />
      </GlobalSearchContainer>

      <RightCluster>
        <IconButton onClick={toggleTheme} aria-label="Toggle theme">
          {theme === 'dark' ? <Sun /> : <Moon />}
        </IconButton>
        
        {/* We can use the custom NotificationBell but wrap it conceptually if needed */}
        <NotificationBell />
        
        <DropdownMenu>
          <DropdownMenuTrigger>
            <UserMenuTrigger aria-label={`User menu: ${user?.name || 'User'}`}>
              {user?.picture_url ? (
                <img className="avatar" src={user.picture_url} alt="" referrerPolicy="no-referrer" style={{ width: 24, height: 24, borderRadius: '50%', objectFit: 'cover' }} />
              ) : (
                <div className="avatar">{(user?.name || 'U')[0].toUpperCase()}</div>
              )}
              <div className="info">
                <span className="name">{user?.name || 'User'}</span>
                <span className="role">{user?.auth_provider === 'google' ? user.email : 'Admin'}</span>
              </div>
            </UserMenuTrigger>
          </DropdownMenuTrigger>
          <AccountMenuContent side="bottom" align="end">
            <PopoverHeader>
              {user?.picture_url ? (
                <img className="avatar-large" src={user.picture_url} alt="" referrerPolicy="no-referrer" style={{ objectFit: 'cover' }} />
              ) : (
                <div className="avatar-large">{(user?.name || 'U')[0].toUpperCase()}</div>
              )}
              <div className="user-details">
                <span className="name">{user?.name || 'User'}</span>
                <span className="email">{user?.email || 'user@example.com'}</span>
              </div>
            </PopoverHeader>
            <DropdownMenuSeparator />
            <DropdownMenuItem onSelect={() => navigate('/app/settings')}>
              <Settings size={16} style={{ marginRight: '8px' }} /> Profile & settings
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem destructive onSelect={() => logoutAndRedirect(navigate)}>
              <LogOut size={16} style={{ marginRight: '8px' }} /> Log out
            </DropdownMenuItem>
          </AccountMenuContent>
        </DropdownMenu>
      </RightCluster>
    </HeaderRoot>
  )
}
