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
  min-width: 280px;
  border-radius: ${({ theme }) => theme.radii.xl};
  background: ${({ theme }) =>
    theme.mode === 'dark'
      ? 'rgba(15, 17, 23, 0.72)'
      : 'rgba(255, 255, 255, 0.75)'};
  backdrop-filter: blur(24px) saturate(180%);
  -webkit-backdrop-filter: blur(24px) saturate(180%);
  border: 1px solid ${({ theme }) =>
    theme.mode === 'dark' ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.05)'};
  box-shadow: 0 12px 40px rgba(0, 0, 0, 0.12), 0 4px 16px rgba(0, 0, 0, 0.04);
  padding: 6px;
`

const IdentityHeader = styled.div`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing[3]};
  padding: ${({ theme }) => `${theme.spacing[3]} ${theme.spacing[4]}`};
  margin: 2px 2px 6px 2px;
  border-radius: ${({ theme }) => theme.radii.lg};
  background: ${({ theme }) =>
    theme.mode === 'dark' ? 'rgba(255, 255, 255, 0.03)' : 'rgba(0, 0, 0, 0.02)'};
  border: 1px solid ${({ theme }) =>
    theme.mode === 'dark' ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.03)'};
  
  .avatar {
    width: 40px;
    height: 40px;
    border-radius: 50%;
    background: linear-gradient(135deg, ${({ theme }) => theme.color.primary} 0%, ${({ theme }) => theme.color.accent} 100%);
    color: ${({ theme }) => theme.color.primaryForeground};
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: ${({ theme }) => theme.typography.fontSize.md};
    font-weight: 600;
    flex-shrink: 0;
    box-shadow: 0 4px 10px ${({ theme }) => theme.color.primary}44;
  }
  
  .user-details {
    display: flex;
    flex-direction: column;
    overflow: hidden;
    
    .name {
      font-size: 14px;
      font-weight: 600;
      color: ${({ theme }) => theme.color.foreground};
      white-space: nowrap;
      text-overflow: ellipsis;
      overflow: hidden;
      letter-spacing: -0.01em;
      line-height: 1.2;
      margin-bottom: 3px;
    }
    
    .meta {
      font-size: 12px;
      color: ${({ theme }) => theme.color.mutedForeground};
      white-space: nowrap;
      text-overflow: ellipsis;
      overflow: hidden;
      line-height: 1.2;
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
  padding: ${({ theme }) => `${theme.spacing[2.5]} ${theme.spacing[3.5]}`};
  margin: 2px 4px;
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
  padding: ${({ theme }) => `${theme.spacing[2.5]} ${theme.spacing[3.5]}`};
  margin: 2px 4px;
  
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
  border-radius: 9999px;
  padding: 2px;
  gap: 2px;
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
      ? theme.mode === 'dark' ? 'rgba(255, 255, 255, 0.12)' : '#ffffff' 
      : 'transparent'};
  color: ${({ $active, theme }) => $active ? theme.color.foreground : theme.color.mutedForeground};
  border-radius: 9999px;
  box-shadow: ${({ $active, theme }) => 
    $active 
      ? theme.mode === 'dark' ? '0 2px 8px rgba(0,0,0,0.2)' : '0 1px 3px rgba(0,0,0,0.1)' 
      : 'none'};
  cursor: pointer;
  transition: all 200ms cubic-bezier(0.4, 0, 0.2, 1);
  
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
