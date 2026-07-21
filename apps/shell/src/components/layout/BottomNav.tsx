import { PRIMARY_NAV } from '@/config/navigation'
import { focusRing } from '@ledgr/ui'
import { NavLink, useLocation } from 'react-router-dom'
import styled from 'styled-components'
import { BOTTOM_NAV_HEIGHT } from '@aios/shared/theme/layout'

const Nav = styled.nav`
  display: flex;
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  height: ${BOTTOM_NAV_HEIGHT};
  background: color-mix(in srgb, ${({ theme }) => theme.color.card} 80%, transparent);
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
  border-top: 1px solid ${({ theme }) => theme.color.border};
  box-shadow: ${({ theme }) => theme.shadow.lg};
  z-index: ${({ theme }) => theme.zIndex.sticky};

  @media ${({ theme }) => theme.media.md} {
    display: none;
  }
`

const TabLink = styled(NavLink)<{ $active: boolean }>`
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: ${({ theme }) => `${theme.spacing[0.5]}`};
  font-size: ${({ theme }) => theme.typography.fontSize.xs};
  font-weight: 500;
  text-decoration: none;
  color: ${({ theme, $active }) => $active ? theme.color.primary : theme.color.mutedForeground};
  transition: color 120ms;

  ${focusRing}
`

const IconWrap = styled.div<{ $active: boolean }>`
  padding: ${({ theme }) => `${theme.spacing[1.5]}`};
  border-radius: ${({ theme }) => theme.radii.sm};
  background: ${({ theme, $active }) => $active ? `${theme.color.primary}12` : 'transparent'};
  transition: background 120ms;
`


export function BottomNav() {
  const location = useLocation()

  return (
    <Nav aria-label="Mobile navigation">
      {PRIMARY_NAV.map(({ to, icon: Icon, label, shortLabel }) => {
        const active = to === '/app'
          ? location.pathname === '/app'
          : location.pathname.startsWith(to)

        return (
          <TabLink
            key={to}
            to={to}
            $active={active}
            onClick={() => { if (navigator.vibrate) navigator.vibrate(8) }}
          >
            <IconWrap $active={active}><Icon size={20} /></IconWrap>
            {label}
          </TabLink>
        )
      })}
    </Nav>
  )
}
