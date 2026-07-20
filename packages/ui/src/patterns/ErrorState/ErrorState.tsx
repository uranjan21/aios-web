import type { ReactNode } from 'react';
import styled from 'styled-components';
import { Button } from '../../primitives/Button';

export interface ErrorStateProps {
  /** Decorative icon. Defaults to an alert-circle. */
  icon?: ReactNode;
  /** Headline. Defaults to "Something went wrong". */
  title?: ReactNode;
  /** Optional supporting text. */
  description?: ReactNode;
  /** Retry handler — renders a retry button when provided. */
  onRetry?: () => void;
  /** Label for the retry button. */
  retryLabel?: string;
  /** Optional short error/reference code shown under the description. */
  errorCode?: string;
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
  gap: ${({ theme }) => theme.spacing[3]};
  padding: ${({ theme }) => `${theme.spacing[10]} ${theme.spacing[6]}`};
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
  color: ${({ theme }) => theme.color.destructive};
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

const Code = styled.code`
  font-family: ${({ theme }) => theme.typography.fontFamily.sans};
  font-size: ${({ theme }) => theme.typography.fontSize.xs};
  color: ${({ theme }) => theme.color.mutedForeground};
  opacity: 0.85;
`;

/** Dependency-free default icon (alert-circle) so ledgr-ui needs no icon lib. */
const DefaultIcon = (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <circle cx="12" cy="12" r="10" />
    <line x1="12" y1="8" x2="12" y2="12" />
    <line x1="12" y1="16" x2="12.01" y2="16" />
  </svg>
);

/**
 * Error-display surface — the error counterpart to EmptyState. For inline
 * "failed to load, retry" states. (ErrorBoundary is for caught render errors.)
 */
export function ErrorState({
  icon,
  title = 'Something went wrong',
  description,
  onRetry,
  retryLabel = 'Try again',
  errorCode,
  fullHeight = false,
  className,
}: ErrorStateProps) {
  return (
    <Root $fullHeight={fullHeight} className={className} role="alert">
      <IconWrap aria-hidden="true">{icon ?? DefaultIcon}</IconWrap>
      <Title>{title}</Title>
      {description && <Description>{description}</Description>}
      {errorCode && <Code>{errorCode}</Code>}
      {onRetry && (
        <Button variant="secondary" size="sm" onClick={onRetry}>
          {retryLabel}
        </Button>
      )}
    </Root>
  );
}
