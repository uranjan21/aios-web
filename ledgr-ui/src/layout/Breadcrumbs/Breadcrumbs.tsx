import type { ReactNode, ComponentType } from 'react';
import { Fragment } from 'react';
import styled from 'styled-components';

export interface BreadcrumbCrumb {
  label: ReactNode;
  href?: string;
  icon?: ComponentType<{ size?: number }> | ReactNode;
}

export interface BreadcrumbsProps {
  crumbs: BreadcrumbCrumb[];
  /** Optional render override — wire React Router Link or similar. */
  renderLink?: (crumb: BreadcrumbCrumb, isLast: boolean) => ReactNode;
  /** Custom separator. Defaults to "/". */
  separator?: ReactNode;
  className?: string;
}

const Nav = styled.nav`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing[1]};
  font-size: ${({ theme }) => theme.typography.fontSize.xs};
  color: ${({ theme }) => theme.color.mutedForeground};
  overflow-x: auto;
  scrollbar-width: none;
  &::-webkit-scrollbar { display: none; }
`;

const Crumb = styled.span<{ $current: boolean }>`
  display: inline-flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing[1]};
  white-space: nowrap;
  color: ${({ theme, $current }) =>
    $current ? theme.color.foreground : theme.color.mutedForeground};
  font-weight: ${({ theme, $current }) =>
    $current ? theme.typography.fontWeight.medium : theme.typography.fontWeight.regular};
  & svg { width: 12px; height: 12px; }
`;

const CrumbLink = styled.a`
  display: inline-flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing[1]};
  color: ${({ theme }) => theme.color.mutedForeground};
  text-decoration: none;
  white-space: nowrap;
  border-radius: ${({ theme }) => theme.radii.sm};
  padding: 2px 4px;
  &:hover { color: ${({ theme }) => theme.color.foreground}; }
  &:focus-visible { outline: 2px solid ${({ theme }) => theme.color.ring}; outline-offset: 1px; }
  & svg { width: 12px; height: 12px; }
`;

const Separator = styled.span`
  color: ${({ theme }) => theme.color.border};
  user-select: none;
`;

export function Breadcrumbs({ crumbs, renderLink, separator = '›', className }: BreadcrumbsProps) {
  return (
    <Nav aria-label="Breadcrumb" className={className}>
      {crumbs.map((c, i) => {
        const isLast = i === crumbs.length - 1;
        const content = (
          <>
            {c.icon}
            {c.label}
          </>
        );
        return (
          <Fragment key={i}>
            {isLast || !c.href ? (
              <Crumb $current={isLast} aria-current={isLast ? 'page' : undefined}>{content}</Crumb>
            ) : renderLink ? (
              renderLink(c, false)
            ) : (
              <CrumbLink href={c.href}>{content}</CrumbLink>
            )}
            {!isLast && <Separator aria-hidden="true">{separator}</Separator>}
          </Fragment>
        );
      })}
    </Nav>
  );
}
