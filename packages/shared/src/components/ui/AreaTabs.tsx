import React from 'react'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@ledgr/ui'
import styled from 'styled-components'
import { spacing } from '@ct/shared/theme/layout'

const StyledTabsWrapper = styled.div`
  /* Ensure the tabs list matches the exact spacing requested */
  [role="tablist"] {
    margin-bottom: ${({ theme }) => theme.spacing[4]};
  }

  [role="tab"] {
    /* Icon inside tab label */
    svg {
      margin-right: ${({ theme }) => `${theme.spacing[1.5]}`};
      vertical-align: -2px;
    }
  }
`

const StyledTabsContent = styled(TabsContent)`
  display: flex;
  flex-direction: column;
  gap: ${spacing[2]};
`

export interface AreaTabsProps {
  activeKey?: string;
  defaultActiveKey?: string;
  onChange?: (key: string) => void;
  items: { key: string; label: React.ReactNode; children: React.ReactNode }[];
  /** Unified toolbar rendered between the tab bar and the tab content (FilterBar). */
  toolbar?: React.ReactNode;
  className?: string;
}

const StyledTabsList = styled(TabsList)`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing[2]};
  padding: ${({ theme }) => theme.spacing[1]};
  border-radius: ${({ theme }) => theme.radii.lg};
  background: ${({ theme }) =>
    theme.mode === 'dark'
      ? 'rgba(255, 255, 255, 0.03)'
      : 'rgba(0, 0, 0, 0.03)'};
  border: 1px solid ${({ theme }) =>
    theme.mode === 'dark' ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.05)'};
  width: max-content;
  max-width: 100%;
  overflow-x: auto;
  scrollbar-width: none;
  -ms-overflow-style: none;
  &::-webkit-scrollbar {
    display: none;
  }
`

const StyledTabsTrigger = styled(TabsTrigger)`
  position: relative;
  padding: ${({ theme }) => theme.spacing[2]} ${({ theme }) => theme.spacing[4]};
  font-size: ${({ theme }) => theme.typography.fontSize.sm};
  font-weight: ${({ theme }) => theme.typography.fontWeight.medium};
  white-space: nowrap;
  transition: all ${({ theme }) => theme.motion.duration.fast} ${({ theme }) => theme.motion.easing.standard};
  border-radius: ${({ theme }) => theme.radii.md};
  color: ${({ theme }) => theme.color.mutedForeground};
  background: transparent;
  
  &[data-state="active"] {
    color: ${({ theme }) => theme.mode === 'dark' ? '#fff' : '#000'};
    background: ${({ theme }) => theme.color.card};
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
  }
  
  &[data-state="inactive"]:hover {
    color: ${({ theme }) => theme.color.foreground};
    background: ${({ theme }) =>
      theme.mode === 'dark' ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.05)'};
  }
`

export function AreaTabs({
  activeKey,
  defaultActiveKey,
  onChange,
  items,
  toolbar,
  className
}: AreaTabsProps) {
  return (
    <StyledTabsWrapper className={className}>
      <Tabs value={activeKey} defaultValue={defaultActiveKey} onValueChange={onChange}>
        <StyledTabsList>
          {items.map(item => (
            <StyledTabsTrigger
              key={item.key}
              value={item.key}
            >
              {item.label}
            </StyledTabsTrigger>
          ))}
        </StyledTabsList>
        {toolbar}
        {items.map(item => (
          <StyledTabsContent key={item.key} value={item.key}>
            {item.children}
          </StyledTabsContent>
        ))}
      </Tabs>
    </StyledTabsWrapper>
  )
}
