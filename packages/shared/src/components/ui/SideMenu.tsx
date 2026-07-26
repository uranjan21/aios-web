import React from 'react'
import styled from 'styled-components'
import { Button } from '@ledgr/ui'

const MenuContainer = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.spacing[1]};
`

export interface SideMenuProps {
  activeKey: string;
  onChange: (key: string) => void;
  items: { key: string; label: string; icon?: React.ReactNode }[];
}

export function SideMenu({ activeKey, onChange, items }: SideMenuProps) {
  return (
    <MenuContainer role="navigation">
      {items.map((item) => (
        <Button
          key={item.key}
          variant={activeKey === item.key ? 'secondary' : 'ghost'}
          onClick={() => onChange(item.key)}
          style={{ justifyContent: 'flex-start', width: '100%' }}
        >
          {item.icon && <span style={{ marginRight: 8, display: 'inline-flex', alignItems: 'center' }}>{item.icon}</span>}
          {item.label}
        </Button>
      ))}
    </MenuContainer>
  )
}
