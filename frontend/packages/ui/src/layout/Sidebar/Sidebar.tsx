import type { ReactNode, ComponentType } from 'react';
import styled, { css } from 'styled-components';

export interface SidebarNavItem {
  to: string;
  label: string;
  icon?: ComponentType<{ size?: number }> | ReactNode;
  badge?: ReactNode;
  /** Show only to users with one of these roles. */
  allowedRoles?: string[];
}

export interface SidebarNavCategory {
  label: string;
  items: SidebarNavItem[];
}

export interface SidebarProps {
  collapsed?: boolean;
  onCollapseToggle?: () => void;
  /** Brand area at the top — usually a logo + name. */
  brand?: ReactNode;
  /** Footer area — usually user mini-profile. */
  footer?: ReactNode;
  /** Optional render override per item — lets the host wire React Router NavLink. */
  renderItem: (item: SidebarNavItem, collapsed: boolean) => ReactNode;
  categories: SidebarNavCategory[];
  /** Role to filter visibility against `allowedRoles`. */
  role?: string;
  className?: string;
}

const Root = styled.nav<{ $collapsed: boolean }>`
  display: flex;
  flex-direction: column;
  width: ${({ $collapsed }) => ($collapsed ? '64px' : '240px')};
  height: 100vh;
  background: ${({ theme }) => theme.color.primary};
  color: ${({ theme }) => theme.color.primaryForeground};
  border-right: 1px solid ${({ theme }) => theme.color.border};
  transition: width ${({ theme }) => theme.motion.duration.normal} ${({ theme }) => theme.motion.easing.standard};
`;

const Brand = styled.div<{ $collapsed: boolean }>`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing[2]};
  padding: ${({ theme, $collapsed }) => $collapsed ? theme.spacing[3] : theme.spacing[4]};
  border-bottom: 1px solid ${({ theme }) => theme.color.primaryHover};
  min-height: 56px;
`;

const Scroll = styled.div`
  flex: 1;
  overflow-y: auto;
  padding: ${({ theme }) => `${theme.spacing[3]} ${theme.spacing[2]}`};
  scrollbar-width: thin;
`;

const Category = styled.div<{ $collapsed: boolean }>`
  margin-bottom: ${({ theme }) => theme.spacing[3]};
  ${({ $collapsed }) => $collapsed && css`& > p { display: none; }`}
`;

const CategoryLabel = styled.p`
  margin: 0 0 ${({ theme }) => theme.spacing[1]};
  padding: 0 ${({ theme }) => theme.spacing[2]};
  font-size: ${({ theme }) => theme.typography.fontSize.xs};
  font-weight: ${({ theme }) => theme.typography.fontWeight.semibold};
  text-transform: uppercase;
  letter-spacing: ${({ theme }) => theme.typography.letterSpacing.wider};
  color: ${({ theme }) => theme.color.primaryForeground + 'A0'};
`;

const Items = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => `${theme.spacing[0.5]}`};
`;

const Footer = styled.div<{ $collapsed: boolean }>`
  padding: ${({ theme }) => theme.spacing[3]};
  border-top: 1px solid ${({ theme }) => theme.color.primaryHover};
  ${({ $collapsed }) => $collapsed && css`padding: ${({ theme }) => `${theme.spacing[2]}`};`}
`;

const CollapseToggle = styled.button<{ $collapsed: boolean }>`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  border-radius: ${({ theme }) => theme.radii.sm};
  margin-left: auto;
  color: ${({ theme }) => theme.color.primaryForeground + 'B0'};
  cursor: pointer;
  &:hover { background: ${({ theme }) => theme.color.primaryHover}; color: ${({ theme }) => theme.color.primaryForeground}; }
  & svg {
    width: 14px;
    height: 14px;
    transform: ${({ $collapsed }) => ($collapsed ? 'rotate(180deg)' : 'none')};
    transition: transform ${({ theme }) => theme.motion.duration.normal} ${({ theme }) => theme.motion.easing.standard};
  }
`;

export function Sidebar({
  collapsed = false,
  onCollapseToggle,
  brand,
  footer,
  renderItem,
  categories,
  role,
  className,
}: SidebarProps) {
  return (
    <Root $collapsed={collapsed} aria-label="Primary navigation" className={className}>
      <Brand $collapsed={collapsed}>
        {brand}
        {onCollapseToggle && (
          <CollapseToggle
            type="button"
            onClick={onCollapseToggle}
            aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            $collapsed={collapsed}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <polyline points="15 18 9 12 15 6" />
            </svg>
          </CollapseToggle>
        )}
      </Brand>
      <Scroll>
        {categories.map(cat => {
          const visibleItems = cat.items.filter(it => !it.allowedRoles || (role && it.allowedRoles.includes(role)));
          if (visibleItems.length === 0) return null;
          return (
            <Category key={cat.label} $collapsed={collapsed}>
              {!collapsed && <CategoryLabel>{cat.label}</CategoryLabel>}
              <Items>
                {visibleItems.map(item => (
                  <span key={item.to}>{renderItem(item, collapsed)}</span>
                ))}
              </Items>
            </Category>
          );
        })}
      </Scroll>
      {footer && <Footer $collapsed={collapsed}>{footer}</Footer>}
    </Root>
  );
}

/* ── Item building blocks (host renders these via `renderItem`) ──────── */

export const SidebarLink = styled.a<{ $active?: boolean; $collapsed?: boolean }>`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing[2]};
  padding: ${({ theme }) => `${theme.spacing[2]} ${theme.spacing[3]}`};
  border-radius: ${({ theme }) => theme.radii.md};
  font-size: ${({ theme }) => theme.typography.fontSize.base};
  font-weight: ${({ theme }) => theme.typography.fontWeight.medium};
  color: ${({ theme, $active }) =>
    $active ? theme.color.primaryForeground : theme.color.primaryForeground + 'C0'};
  background: ${({ theme, $active }) =>
    $active ? theme.color.primaryHover : 'transparent'};
  text-decoration: none;
  transition: background-color ${({ theme }) => theme.motion.duration.fast} ${({ theme }) => theme.motion.easing.standard},
              color ${({ theme }) => theme.motion.duration.fast} ${({ theme }) => theme.motion.easing.standard};

  ${({ $collapsed }) => $collapsed && css`justify-content: center; padding: ${({ theme }) => `${theme.spacing[2]}`};`}

  &:hover {
    background: ${({ theme }) => theme.color.primaryHover};
    color: ${({ theme }) => theme.color.primaryForeground};
  }
  &:focus-visible { outline: 2px solid ${({ theme }) => theme.color.accent}; outline-offset: -2px; }

  & svg { width: 18px; height: 18px; flex-shrink: 0; }
  & > span:not(.icon) { ${({ $collapsed }) => $collapsed && 'display: none;'} flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; }
`;
