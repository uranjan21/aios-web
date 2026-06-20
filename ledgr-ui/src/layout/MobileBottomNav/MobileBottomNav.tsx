import type { ReactNode } from 'react';
import styled from 'styled-components';

export interface MobileBottomNavItem {
  to: string;
  label: string;
  icon: ReactNode;
  active?: boolean;
  badge?: ReactNode;
}

export interface MobileBottomNavProps {
  items: MobileBottomNavItem[];
  /** Override link rendering — wire to React Router Link, etc. */
  renderItem?: (item: MobileBottomNavItem) => ReactNode;
  className?: string;
}

const Nav = styled.nav`
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  z-index: ${({ theme }) => theme.zIndex.sticky};
  display: flex;
  align-items: stretch;
  height: 56px;
  background: ${({ theme }) => theme.color.card};
  border-top: 1px solid ${({ theme }) => theme.color.border};

  @media (min-width: ${({ theme }) => theme.breakpoint.md}) {
    display: none;
  }
`;

const Item = styled.a<{ $active: boolean }>`
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 2px;
  text-decoration: none;
  color: ${({ theme, $active }) => ($active ? theme.color.primary : theme.color.mutedForeground)};
  font-size: 10px;
  font-weight: ${({ theme, $active }) =>
    $active ? theme.typography.fontWeight.semibold : theme.typography.fontWeight.medium};
  position: relative;
  & svg { width: 18px; height: 18px; }
  &:hover { color: ${({ theme }) => theme.color.foreground}; }
`;

const ActiveIndicator = styled.span`
  position: absolute;
  top: 0;
  left: 50%;
  transform: translateX(-50%);
  width: 24px;
  height: 2px;
  background: ${({ theme }) => theme.color.primary};
  border-radius: 0 0 2px 2px;
`;

export function MobileBottomNav({ items, renderItem, className }: MobileBottomNavProps) {
  return (
    <Nav aria-label="Primary mobile navigation" className={className}>
      {items.map(item =>
        renderItem ? (
          <span key={item.to}>{renderItem(item)}</span>
        ) : (
          <Item key={item.to} href={item.to} $active={!!item.active} aria-current={item.active ? 'page' : undefined}>
            {item.active && <ActiveIndicator aria-hidden="true" />}
            {item.icon}
            <span>{item.label}</span>
          </Item>
        ),
      )}
    </Nav>
  );
}
