import React from 'react'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@ledgr/ui'
import styled from 'styled-components'
import { spacing } from '@aios/shared/theme/layout'

const StyledTabsWrapper = styled.div`
  /* Ensure the tabs list matches the exact spacing requested */
  [role="tablist"] {
    margin-bottom: ${({ theme }) => theme.spacing[6]};
  }

  [role="tab"] {
    /* Icon inside tab label */
    svg {
      margin-right: 6px;
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
  gap: ${({ theme }) => theme.spacing[6]};
  border-bottom: 1px solid ${({ theme }) => theme.color.border};
  width: 100%;
  overflow-x: auto;
  scrollbar-width: none; /* Firefox */
  -ms-overflow-style: none; /* IE and Edge */
  &::-webkit-scrollbar {
    display: none; /* Chrome, Safari and Opera */
  }
`

const StyledTabsTrigger = styled(TabsTrigger)`
  position: relative;
  padding: ${({ theme }) => theme.spacing[3]} 0;
  font-size: 13px;
  font-weight: ${({ theme }) => theme.typography.fontWeight.medium};
  white-space: nowrap;
  transition: all ${({ theme }) => theme.motion.duration.fast} ${({ theme }) => theme.motion.easing.standard};
  border-bottom: 2px solid transparent;
  color: ${({ theme }) => theme.color.mutedForeground};
  background: transparent;
  
  &[data-state="active"] {
    border-color: ${({ theme }) => theme.color.primary};
    color: ${({ theme }) => theme.color.primary};
  }
  
  &[data-state="inactive"]:hover {
    color: ${({ theme }) => theme.color.foreground};
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
