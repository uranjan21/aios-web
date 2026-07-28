import type { ReactNode } from 'react';
import styled from 'styled-components';

export interface EmptyStateProps {
  /** Optional decorative icon — typically a Lucide icon. */
  icon?: ReactNode;
  /** Headline. */
  title: ReactNode;
  /** Subheading or hint text. */
  description?: ReactNode;
  /** Primary CTA (typically a <Button>). */
  action?: ReactNode;
  /** Secondary action — rendered to the right of `action`. */
  secondaryAction?: ReactNode;
  /** Stretch to fill parent height. */
  fullHeight?: boolean;
  className?: string;
}

const Root = styled.div<{ $fullHeight: boolean }>`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  gap: ${({ theme }) => theme.spacing[2]};
  /* Inside a card the old spacing[10] block made an empty card taller than a
     populated one. The state is a placeholder — it should not dominate. */
  padding: ${({ theme }) => `${theme.spacing[6]} ${theme.spacing[4]}`};
  min-height: ${({ $fullHeight }) => ($fullHeight ? '60vh' : 'auto')};
  width: 100%;
  color: ${({ theme }) => theme.color.mutedForeground};
`;

const IconWrap = styled.div`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 56px;
  height: 56px;
  border-radius: ${({ theme }) => theme.radii.xl};
  background: ${({ theme }) => theme.color.muted};
  color: ${({ theme }) => theme.color.mutedForeground};
  & svg { width: 24px; height: 24px; }
`;

const Title = styled.h3`
  font-family: ${({ theme }) => theme.typography.fontFamily.sans};
  font-size: ${({ theme }) => theme.typography.fontSize.lg};
  font-weight: ${({ theme }) => theme.typography.fontWeight.semibold};
  color: ${({ theme }) => theme.color.foreground};
  margin: 0;
`;

const Description = styled.p`
  font-size: ${({ theme }) => theme.typography.fontSize.base};
  color: ${({ theme }) => theme.color.mutedForeground};
  max-width: 38ch;
  line-height: ${({ theme }) => theme.typography.lineHeight.relaxed};
  margin: 0;
`;

const Actions = styled.div`
  display: flex;
  gap: ${({ theme }) => theme.spacing[2]};
  margin-top: ${({ theme }) => theme.spacing[2]};
`;

export function EmptyState({
  icon,
  title,
  description,
  action,
  secondaryAction,
  fullHeight = false,
  className,
}: EmptyStateProps) {
  return (
    <Root $fullHeight={fullHeight} className={className}>
      {icon && <IconWrap aria-hidden="true">{icon}</IconWrap>}
      <Title>{title}</Title>
      {description && <Description>{description}</Description>}
      {(action || secondaryAction) && (
        <Actions>
          {secondaryAction}
          {action}
        </Actions>
      )}
    </Root>
  );
}
