import { NavLink, Outlet } from 'react-router-dom'
import {
  BookOpen, Rocket, MessageSquare, Bot,
  IndianRupee, Heart, Briefcase, PenLine,
} from 'lucide-react'
import styled from 'styled-components'

const GUIDE_NAV = [
  { to: '/guide', label: 'Overview', icon: BookOpen, end: true },
  { divider: true, label: 'Features' },
  { to: '/guide/chat', label: 'Chat', icon: MessageSquare },
  { to: '/guide/agents', label: 'Agents', icon: Bot },
  { divider: true, label: 'Areas' },
  { to: '/guide/areas/finance', label: 'Finance', icon: IndianRupee },
  { to: '/guide/areas/health', label: 'Health', icon: Heart },
  { to: '/guide/areas/career', label: 'Career', icon: Briefcase },
  { to: '/guide/areas/business', label: 'Business', icon: Rocket },
  { to: '/guide/areas/content', label: 'Content', icon: PenLine },
]

const Shell = styled.div`
  display: flex;
  flex-direction: column;
  height: 100%;
`

const NavShell = styled.div`
  width: 100%;
  flex-shrink: 0;
  border-bottom: 1px solid ${({ theme }) => theme.color.border};
  background: ${({ theme }) => `${theme.color.card}80`};
  display: flex;
  flex-direction: column;
`

const NavHeader = styled.div`
  padding: 12px 24px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  border-bottom: 1px solid ${({ theme }) => `${theme.color.border}80`};
`

const NavTitle = styled.h2`
  font-size: 16px;
  font-weight: 600;
  letter-spacing: -0.01em;
  color: ${({ theme }) => theme.color.foreground};
  display: flex;
  align-items: center;
  gap: 8px;
  margin: 0;
`

const NavSubtitle = styled.p`
  font-size: 12px;
  color: ${({ theme }) => theme.color.mutedForeground};
  margin: 0;
  @media (max-width: 768px) { display: none; }
`

const NavScroll = styled.nav`
  width: 100%;
  overflow-x: auto;
  padding: 8px;
  scrollbar-width: none;
  &::-webkit-scrollbar { display: none; }
`

const NavRow = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: max-content;
  padding: 0 8px;
`

const Divider = styled.div`
  padding: 0 12px;
  display: flex;
  align-items: center;
`

const DividerLabel = styled.span`
  font-size: 10px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: ${({ theme }) => `${theme.color.mutedForeground}b3`};
`

const NavItemLink = styled(NavLink)<{ $active?: boolean }>`
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 12px;
  border-radius: 999px;
  font-size: 14px;
  font-weight: 500;
  text-decoration: none;
  transition: all 200ms;
  border: 1px solid transparent;
  &.active {
    background: rgba(30,80,208,0.1);
    color: ${({ theme }) => theme.color.primary};
    border-color: rgba(30,80,208,0.2);
  }
  &:not(.active) {
    color: ${({ theme }) => theme.color.mutedForeground};
    &:hover {
      background: ${({ theme }) => `${theme.color.muted}cc`};
      color: ${({ theme }) => theme.color.foreground};
    }
  }
`

const Main = styled.main`
  flex: 1;
  overflow-y: auto;
  position: relative;
  background: ${({ theme }) => theme.color.background};
`

const MainContent = styled.div`
  max-width: 56rem;
  margin: 0 auto;
  width: 100%;
  padding: 16px;
  @media (min-width: 768px) { padding: 32px; }
  @media (min-width: 1024px) { padding: 48px; }
`

export function GuideLayout() {
  return (
    <Shell>
      <NavShell>
        <NavHeader>
          <NavTitle>
            <BookOpen size={20} style={{ color: '#1e50d0' }} />
            App Guide
          </NavTitle>
          <NavSubtitle>Learn how to use AiOs effectively</NavSubtitle>
        </NavHeader>

        <NavScroll>
          <NavRow>
            {GUIDE_NAV.map((item, i) => {
              if (item.divider) {
                return (
                  <Divider key={i}>
                    <DividerLabel>{item.label}</DividerLabel>
                  </Divider>
                )
              }
              const Icon = item.icon!
              return (
                <NavItemLink key={item.to} to={item.to!} end={item.end}>
                  {({ isActive }) => (
                    <>
                      <Icon
                        size={14}
                        style={{ flexShrink: 0, color: isActive ? '#1e50d0' : undefined }}
                      />
                      {item.label}
                    </>
                  )}
                </NavItemLink>
              )
            })}
          </NavRow>
        </NavScroll>
      </NavShell>

      <Main>
        <MainContent>
          <Outlet />
        </MainContent>
      </Main>
    </Shell>
  )
}
