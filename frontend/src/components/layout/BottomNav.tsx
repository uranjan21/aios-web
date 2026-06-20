import { NavLink, useLocation } from 'react-router-dom'
import { LayoutDashboard, MessageSquare, Bot, Grid3X3, MoreHorizontal } from 'lucide-react'
import styled from 'styled-components'

const Nav = styled.nav`
  display: flex;
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  height: 64px;
  background: ${({ theme }) => theme.color.card};
  border-top: 1px solid ${({ theme }) => theme.color.border};
  box-shadow: ${({ theme }) => theme.shadow.lg};
  z-index: ${({ theme }) => theme.zIndex.sticky};

  @media (min-width: 768px) {
    display: none;
  }
`

const TabLink = styled(NavLink)<{ $active: boolean }>`
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 2px;
  font-size: 10px;
  font-weight: 500;
  text-decoration: none;
  color: ${({ theme, $active }) => $active ? theme.color.primary : theme.color.mutedForeground};
  transition: color 120ms;
`

const IconWrap = styled.div<{ $active: boolean }>`
  padding: 6px;
  border-radius: 10px;
  background: ${({ theme, $active }) => $active ? `${theme.color.primary}12` : 'transparent'};
  transition: background 120ms;
`

const TABS = [
  { to: '/', icon: LayoutDashboard, label: 'Home' },
  { to: '/chat', icon: MessageSquare, label: 'Chat' },
  { to: '/areas', icon: Grid3X3, label: 'Areas' },
  { to: '/agents', icon: Bot, label: 'Agents' },
  { to: '/settings', icon: MoreHorizontal, label: 'More' },
]

export function BottomNav() {
  const location = useLocation()

  return (
    <Nav>
      {TABS.map(({ to, icon: Icon, label }) => {
        const active = to === '/'
          ? location.pathname === '/'
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
