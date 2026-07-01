import React from 'react'
import { ArrowLeft, Sun, Moon, Search, Menu, ChevronRight, Home } from 'lucide-react'
import { NotificationBell } from '@/components/NotificationBell'
import { useLocation, useNavigate } from 'react-router-dom'
import { useUIStore } from '@/stores/uiStore'
import { useAuthStore } from '@/stores/authStore'
import styled from 'styled-components'

const HeaderRoot = styled.header`
  position: relative;
  height: 48px;
  flex-shrink: 0;
  z-index: 30;
  border-bottom: 1px solid ${({ theme }) => theme.color.border};
  background: color-mix(in srgb, ${({ theme }) => theme.color.card} 80%, transparent);
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
  box-shadow: ${({ theme }) => theme.shadow.sm};
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 0 16px;
`

const BackButton = styled.button`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 6px;
  border-radius: 8px;
  background: transparent;
  border: none;
  color: ${({ theme }) => theme.color.mutedForeground};
  cursor: pointer;
  transition: background-color 120ms, color 120ms;
  
  &:hover {
    background: ${({ theme }) => theme.color.muted};
    color: ${({ theme }) => theme.color.foreground};
  }

  &:focus-visible {
    outline: 2px solid ${({ theme }) => theme.color.ring};
    outline-offset: 2px;
  }
  
  svg { width: 16px; height: 16px; }
`

const Hamburger = styled.button`
  padding: 8px;
  margin-left: -8px;
  background: transparent;
  border: none;
  color: ${({ theme }) => theme.color.foreground};
  cursor: pointer;
  border-radius: 12px;
  
  &:hover { background: ${({ theme }) => theme.color.muted}; }

  &:focus-visible {
    outline: 2px solid ${({ theme }) => theme.color.ring};
    outline-offset: 2px;
  }
  
  @media (min-width: 768px) {
    display: none;
  }
`

const BreadcrumbNav = styled.nav`
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 14px;
  
  @media (max-width: 767px) {
    display: none;
  }
  
  .crumb {
    color: ${({ theme }) => theme.color.mutedForeground};
    text-decoration: none;
    display: inline-flex;
    align-items: center;
    background: none;
    border: none;
    padding: 2px 4px;
    margin: -2px -4px;
    border-radius: 6px;
    font: inherit;
  }

  .crumb.link {
    cursor: pointer;
    &:hover { color: ${({ theme }) => theme.color.foreground}; }
    &:focus-visible {
      outline: 2px solid ${({ theme }) => theme.color.ring};
      outline-offset: 1px;
    }
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
  margin-left: 24px;

  @media (max-width: 639px) {
    display: none;
    margin-left: 0;
  }
  
  input {
    width: 100%;
    height: 36px;
    padding: 0 32px;
    border-radius: 12px;
    border: 1px solid ${({ theme }) => theme.color.input};
    background: ${({ theme }) => theme.color.background};
    color: ${({ theme }) => theme.color.foreground};
    font-size: 14px;
    
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
  gap: 4px;
`

const IconButton = styled.button`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 6px;
  border-radius: 12px;
  background: transparent;
  border: none;
  color: ${({ theme }) => theme.color.mutedForeground};
  cursor: pointer;
  transition: background-color 120ms, color 120ms;
  
  &:hover {
    background: ${({ theme }) => theme.color.muted};
    color: ${({ theme }) => theme.color.foreground};
  }

  &:focus-visible {
    outline: 2px solid ${({ theme }) => theme.color.ring};
    outline-offset: 2px;
  }
  
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
  gap: 8px;
  padding: 4px 8px;
  border-radius: 12px;
  background: transparent;
  border: none;
  cursor: pointer;
  transition: background-color 120ms;
  
  &:hover { background: ${({ theme }) => theme.color.muted}; }

  &:focus-visible {
    outline: 2px solid ${({ theme }) => theme.color.ring};
    outline-offset: 2px;
  }
  
  .avatar {
    width: 24px;
    height: 24px;
    border-radius: 50%;
    background: ${({ theme }) => theme.color.primaryHover};
    color: ${({ theme }) => theme.color.primaryForeground};
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 10px;
    font-weight: 600;
  }
  
  .info {
    display: none;
    flex-direction: column;
    text-align: left;

    @media (min-width: 640px) {
      display: flex;
    }
    
    .name {
      font-size: 12px;
      font-weight: 500;
      color: ${({ theme }) => theme.color.foreground};
      line-height: 1.2;
    }
    
    .role {
      font-size: 10px;
      text-transform: capitalize;
      color: ${({ theme }) => theme.color.mutedForeground};
      line-height: 1.2;
    }
  }
`

const PAGE_NAMES: Record<string, string> = {
  '/app': 'Dashboard',
  '/app/chat': 'Chat',
  '/app/agents': 'Agents',
  '/app/integrations': 'Integrations',
  '/app/settings': 'Settings',
  '/app/guide': 'Guide',
  '/app/admin': 'Admin',
  '/app/areas/finance': 'Finance',
  '/app/areas/health': 'Health',
  '/app/areas/career': 'Career',
  '/app/areas/business': 'Business',
  '/app/areas/content': 'Content',
}

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
      breadcrumbs.push({ label: 'Areas', to: '/app/areas/finance' })
      if (parts[1]) breadcrumbs.push({ label: cap(parts[1]), to: `/app/areas/${parts[1]}` })
      if (parts[2]) breadcrumbs.push({ label: cap(parts[2]), to: `/app/areas/${parts[1]}/${parts[2]}` })
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
        
        <UserMenuTrigger aria-label={`User settings menu: ${user?.name || 'User'}`} onClick={() => navigate('/settings')}>
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
      </RightCluster>
    </HeaderRoot>
  )
}
