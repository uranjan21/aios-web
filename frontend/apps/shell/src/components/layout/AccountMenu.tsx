import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { useAuthStore } from '@ct/shared/stores/authStore'
import { useUIStore } from '@ct/shared/stores/uiStore'
import { logoutAndRedirect } from '@ct/shared/lib/logout'
import { accountLabel } from '@ct/shared/lib/account'
import { billingApi } from '@ct/shared/api/billing'
import {
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  Badge,
} from '@ledgr/ui'
import {
  User,
  CreditCard,
  Settings,
  Shield,
  Sun,
  Moon,
  LifeBuoy,
  LogOut
} from 'lucide-react'
import styled from 'styled-components'

const StyledContent = styled(DropdownMenuContent)`
  min-width: 240px;
  border-radius: ${({ theme }) => theme.radii.xl};
  /*
   * These three were hardcoded literals that overrode the Popover surface
   * underneath — including a blue-grey rgba(15, 17, 23, .72) in dark, on a
   * palette system whose dark surfaces are warm, plus a saturate(180%) that
   * re-saturated the muted palette showing through the blur. On the glass
   * tokens now, so the menu follows whichever palette is active. (2026-08-06)
   */
  background: ${({ theme }) => theme.glass.background};
  backdrop-filter: ${({ theme }) => theme.glass.thick};
  -webkit-backdrop-filter: ${({ theme }) => theme.glass.thick};
  border: 1px solid ${({ theme }) =>
    theme.mode === 'dark' ? theme.glass.borderStrong : theme.color.border};
  /* Popover — elevation[4]. Was a light-mode-only literal. */
  box-shadow: ${({ theme }) => theme.elevation[4]};
  padding: ${({ theme }) => theme.spacing[1]};
`

const IdentityHeader = styled.div`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing[2.5]};
  padding: ${({ theme }) => `${theme.spacing[2]} ${theme.spacing[3]}`};
  margin: ${({ theme }) => theme.spacing[0.5]} ${({ theme }) => theme.spacing[0.5]} ${({ theme }) => theme.spacing[1]} ${({ theme }) => theme.spacing[0.5]};
  border-radius: ${({ theme }) => theme.radii.lg};
  background: ${({ theme }) =>
    theme.mode === 'dark' ? 'rgba(255, 255, 255, 0.03)' : 'rgba(0, 0, 0, 0.02)'};
  border: 1px solid ${({ theme }) =>
    theme.mode === 'dark' ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.03)'};

  .avatar {
    width: 34px;
    height: 34px;
    border-radius: 50%;
    background: linear-gradient(135deg, ${({ theme }) => theme.color.primary} 0%, ${({ theme }) => theme.color.accent} 100%);
    color: ${({ theme }) => theme.color.primaryForeground};
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: ${({ theme }) => theme.typography.fontSize.sm};
    font-weight: 600;
    flex-shrink: 0;
    box-shadow: 0 2px 8px ${({ theme }) => theme.color.primary}33;
  }

  .user-details {
    display: flex;
    flex-direction: column;
    overflow: hidden;

    .name {
      font-size: 13px;
      font-weight: 600;
      color: ${({ theme }) => theme.color.foreground};
      white-space: nowrap;
      text-overflow: ellipsis;
      overflow: hidden;
      letter-spacing: -0.01em;
      line-height: 1.3;
    }

    .meta {
      font-size: 11px;
      color: ${({ theme }) => theme.color.mutedForeground};
      white-space: nowrap;
      text-overflow: ellipsis;
      overflow: hidden;
      line-height: 1.3;
    }
  }
`

const MenuItemContent = styled.div`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing[3]};
  width: 100%;
  
  svg {
    width: 16px;
    height: 16px;
    color: ${({ theme }) => theme.color.mutedForeground};
  }

  .label {
    flex: 1;
    display: flex;
    align-items: center;
  }

  .badge-wrapper {
    display: flex;
    align-items: center;
    transform: translateY(-1px);
  }
`

const StyledMenuItem = styled(DropdownMenuItem)`
  padding: ${({ theme }) => `${theme.spacing[2]} ${theme.spacing[3]}`};
  margin: 1px 2px;
  cursor: pointer;
  border-radius: ${({ theme }) => theme.radii.md};
  transition: all 150ms ease;

  &:hover {
    background: ${({ theme }) =>
      theme.mode === 'dark' ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.03)'};
    color: ${({ theme }) => theme.color.foreground};
  }

  &[data-destructive="true"] {
    color: ${({ theme }) => theme.color.destructive};
    &:hover {
      background: ${({ theme }) => theme.color.destructive}11;
    }
    svg {
      color: ${({ theme }) => theme.color.destructive};
    }
  }
`

const ThemeRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: ${({ theme }) => `${theme.spacing[2]} ${theme.spacing[3]}`};
  margin: 1px 2px;
  
  .label-group {
    display: flex;
    align-items: center;
    gap: ${({ theme }) => theme.spacing[3]};
    font-size: 13px;
    font-weight: 500;
    
    svg {
      width: 16px;
      height: 16px;
      color: ${({ theme }) => theme.color.mutedForeground};
    }
  }
`

const SegmentedControl = styled.div`
  display: flex;
  align-items: center;
  background: ${({ theme }) =>
    theme.mode === 'dark' ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.03)'};
  border: 1px solid ${({ theme }) =>
    theme.mode === 'dark' ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.05)'};
  border-radius: ${({ theme }) => theme.radii.sm};
  padding: ${({ theme }) => theme.spacing[0.5]};
  gap: ${({ theme }) => theme.spacing[0.5]};
`

const Segment = styled.button<{ $active: boolean }>`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 26px;
  height: 22px;
  border: none;
  background: ${({ $active, theme }) =>
    $active
      ? theme.color.card
      : 'transparent'};
  color: ${({ $active, theme }) => $active ? theme.color.foreground : theme.color.mutedForeground};
  border-radius: ${({ theme }) => theme.radii.xs ?? theme.radii.sm};
  box-shadow: ${({ $active }) =>
    $active
      ? '0 1px 3px rgba(0,0,0,0.1)'
      : 'none'};
  cursor: pointer;
  transition: color 150ms ease, background 150ms ease;

  &:hover {
    color: ${({ theme }) => theme.color.foreground};
  }

  svg {
    width: 14px;
    height: 14px;
    color: inherit;
  }
`

export function AccountMenuBody({ side = 'bottom', align = 'end' }: { side?: 'top' | 'bottom' | 'left' | 'right', align?: 'start' | 'center' | 'end' }) {
  const navigate = useNavigate()
  const user = useAuthStore(s => s.user)
  const { theme, setTheme } = useUIStore()

  const { data: subscription } = useQuery({
    queryKey: ['billing', 'subscription'],
    queryFn: billingApi.subscription,
    staleTime: 5 * 60 * 1000,
    retry: false
  })

  return (
    <StyledContent side={side} align={align}>
      <IdentityHeader>
        {user?.picture_url ? (
          <img 
            className="avatar" 
            src={user.picture_url} 
            alt="" 
            referrerPolicy="no-referrer" 
            style={{ objectFit: 'cover' }} 
          />
        ) : (
          <div className="avatar">{(user?.name || 'U')[0].toUpperCase()}</div>
        )}
        <div className="user-details">
          <span className="name">{user?.name || 'User'}</span>
          <span className="meta">{accountLabel(user)}</span>
        </div>
      </IdentityHeader>
      
      <DropdownMenuSeparator />
      
      <StyledMenuItem onSelect={() => navigate('/app/settings?section=profile')}>
        <MenuItemContent>
          <User />
          <span className="label">Profile</span>
        </MenuItemContent>
      </StyledMenuItem>
      
      <StyledMenuItem onSelect={() => navigate('/app/settings?section=billing')}>
        <MenuItemContent>
          <CreditCard />
          <span className="label">Subscription</span>
          {subscription && subscription.plan && (
            <div className="badge-wrapper">
              <Badge tone="accent" style={{ textTransform: 'capitalize' }}>
                {subscription.plan.replace('_', ' ')}
              </Badge>
            </div>
          )}
        </MenuItemContent>
      </StyledMenuItem>
      
      <StyledMenuItem onSelect={() => navigate('/app/settings')}>
        <MenuItemContent>
          <Settings />
          <span className="label">Settings</span>
        </MenuItemContent>
      </StyledMenuItem>
      
      {user?.is_admin && (
        <StyledMenuItem onSelect={() => navigate('/app/settings?section=admin')}>
          <MenuItemContent>
            <Shield />
            <span className="label">Admin</span>
          </MenuItemContent>
        </StyledMenuItem>
      )}
      
      <DropdownMenuSeparator />
      
      <ThemeRow>
        <div className="label-group">
          {theme === 'dark' ? <Moon /> : <Sun />}
          <span>Theme</span>
        </div>
        <SegmentedControl onClick={e => {
          // Prevent dropdown from closing when toggling theme
          e.preventDefault()
          e.stopPropagation()
        }}>
          <Segment 
            $active={theme === 'light'} 
            onClick={() => setTheme('light')}
            aria-label="Light mode"
          >
            <Sun />
          </Segment>
          <Segment 
            $active={theme === 'dark'} 
            onClick={() => setTheme('dark')}
            aria-label="Dark mode"
          >
            <Moon />
          </Segment>
        </SegmentedControl>
      </ThemeRow>
      
      <DropdownMenuSeparator />
      
      <StyledMenuItem onSelect={() => navigate('/support')}>
        <MenuItemContent>
          <LifeBuoy />
          <span className="label">Help center</span>
        </MenuItemContent>
      </StyledMenuItem>
      
      <StyledMenuItem data-destructive="true" onSelect={() => logoutAndRedirect(navigate)}>
        <MenuItemContent>
          <LogOut />
          <span className="label">Sign out</span>
        </MenuItemContent>
      </StyledMenuItem>
      
    </StyledContent>
  )
}
