import React, { ReactNode } from 'react'
import styled from 'styled-components'
import { ChevronDown, ChevronRight } from 'lucide-react'
import { focusRing } from '@ledgr/ui'
import { SETTINGS_RAIL_WIDTH, TOPBAR_HEIGHT } from '@ct/shared/theme/layout'

const SidebarRoot = styled.nav`
  width: ${SETTINGS_RAIL_WIDTH};
  flex-shrink: 0;

  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => `${theme.spacing[4.5]}`};

  padding: ${({ theme }) => `${theme.spacing[3.5]} ${theme.spacing[3]}`};

  border-radius: ${({ theme }) => theme.radii.lg};
  border: 1px solid ${({ theme }) =>
    theme.mode === 'dark' ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.05)'};
  background: ${({ theme }) =>
    theme.mode === 'dark'
      ? 'linear-gradient(180deg, rgba(30, 32, 40, 0.8) 0%, rgba(20, 21, 26, 0.6) 100%)'
      : 'linear-gradient(180deg, rgba(255, 255, 255, 0.95) 0%, rgba(250, 250, 252, 0.8) 100%)'};
  backdrop-filter: blur(12px);
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.05);

  @media ${({ theme }) => theme.media.lg} {
    position: sticky;
    top: 24px;
    max-height: calc(100dvh - ${TOPBAR_HEIGHT});
    overflow-y: auto;
  }

  @media ${({ theme }) => theme.media.belowLg} {
    width: 100%;
  }
`

const NavSection = styled.section`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => `${theme.spacing[0.5]}`};
`

const NavHeader = styled.button`
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  margin: 0;
  padding: ${({ theme }) => `0 ${theme.spacing[2.5]} ${theme.spacing[1.5]}`};
  background: transparent;
  border: none;
  font-size: ${({ theme }) => theme.typography.fontSize.xs};
  font-weight: 600;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: ${({ theme }) => theme.color.mutedForeground};
  cursor: pointer;
  border-radius: ${({ theme }) => theme.radii.sm};

  &:hover {
    color: ${({ theme }) => theme.color.foreground};
  }

  svg {
    width: 14px;
    height: 14px;
    opacity: 0.6;
    transition: transform 150ms ease;
  }
  
  ${focusRing}
`

const NavItemLink = styled.button<{ $active: boolean }>`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => `${theme.spacing[2]}`};

  width: 100%;
  padding: ${({ theme }) => `${theme.spacing[2]} ${theme.spacing[2.5]}`};

  border: none;
  border-radius: ${({ theme }) => theme.radii.md};

  background: ${({ $active, theme }) =>
    $active ? `linear-gradient(90deg, ${theme.color.accent}14 0%, ${theme.color.accent}02 100%)` : "transparent"};
  box-shadow: ${({ $active, theme }) =>
    $active ? `inset 3px 0 0 ${theme.color.accent}` : "none"};

  color: ${({ $active, theme }) =>
    $active ? theme.color.accent : theme.color.foreground};

  text-align: left;
  font-size: ${({ theme }) => theme.typography.fontSize.sm};
  font-weight: ${({ $active }) => ($active ? 600 : 500)};

  cursor: pointer;

  transition:
    background 150ms ease,
    color 150ms ease,
    transform 200ms cubic-bezier(0.16, 1, 0.3, 1),
    box-shadow 150ms ease;

  &:hover {
    background: ${({ theme, $active }) =>
      $active ? `linear-gradient(90deg, ${theme.color.accent}1A 0%, ${theme.color.accent}05 100%)` : theme.color.muted};
    transform: ${({ $active }) => $active ? 'none' : 'translateX(2px)'};
  }

  ${focusRing}

  svg {
    flex-shrink: 0;
    color: ${({ $active, theme }) =>
      $active ? theme.color.accent : theme.color.mutedForeground};
  }
`

const GroupContainer = styled.div<{ $open: boolean }>`
  display: ${({ $open }) => ($open ? 'flex' : 'none')};
  flex-direction: column;
  gap: ${({ theme }) => `${theme.spacing[0.5]}`};

  margin-left: ${({ theme }) => `${theme.spacing[3]}`};
  padding-left: ${({ theme }) => `${theme.spacing[2]}`};

  border-left: 1px solid ${({ theme }) => theme.color.border};
`

export interface SidebarItem {
  key: string
  label: string
  icon?: ReactNode
}

export interface SidebarGroup {
  label: string
  items: SidebarItem[]
  defaultOpen?: boolean
}

export interface ModuleSidebarProps {
  groups: SidebarGroup[]
  activeKey: string
  onChange: (key: string) => void
}

export function ModuleSidebar({ groups, activeKey, onChange }: ModuleSidebarProps) {
  const [openGroups, setOpenGroups] = React.useState<Record<string, boolean>>(() => {
    const init: Record<string, boolean> = {}
    groups.forEach(g => {
      init[g.label] = g.defaultOpen ?? true
    })
    return init
  })

  const toggleGroup = (label: string) => {
    setOpenGroups(prev => ({ ...prev, [label]: !prev[label] }))
  }

  return (
    <SidebarRoot>
      {groups.map(group => {
        const isOpen = openGroups[group.label]
        return (
          <NavSection key={group.label}>
            {group.label && (
              <NavHeader onClick={() => toggleGroup(group.label)}>
                <span>{group.label}</span>
                {isOpen ? <ChevronDown /> : <ChevronRight />}
              </NavHeader>
            )}
            <GroupContainer $open={isOpen || !group.label}>
              {group.items.map(item => (
                <NavItemLink
                  key={item.key}
                  $active={activeKey === item.key}
                  onClick={() => onChange(item.key)}
                >
                  {item.icon}
                  <span>{item.label}</span>
                </NavItemLink>
              ))}
            </GroupContainer>
          </NavSection>
        )
      })}
    </SidebarRoot>
  )
}
