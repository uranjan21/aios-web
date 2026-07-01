import type { HTMLAttributes } from 'react';
import styled, { css } from 'styled-components';

export type BadgeTone =
  | 'neutral'
  | 'primary'
  | 'success'
  | 'warning'
  | 'destructive'
  | 'info'
  | 'accent';

export type BadgeSize = 'sm' | 'md';

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  tone?: BadgeTone;
  size?: BadgeSize;
  /** Display as a stroked outline instead of filled. */
  outline?: boolean;
  /** Render a coloured dot before the label. */
  dot?: boolean;
}

const toneStyles = (outline: boolean) => ({
  neutral: css`
    background: ${({ theme }) => (outline ? 'transparent' : theme.color.muted)};
    color: ${({ theme }) => theme.color.mutedForeground};
  `,
  primary: css`
    background: ${({ theme }) => (outline ? 'transparent' : theme.color.primary + '15')};
    color: ${({ theme }) => theme.color.primary};
  `,
  success: css`
    background: ${({ theme }) => (outline ? 'transparent' : theme.color.success + '15')};
    color: ${({ theme }) => theme.color.success};
  `,
  warning: css`
    background: ${({ theme }) => (outline ? 'transparent' : theme.color.warning + '20')};
    color: ${({ theme }) => theme.color.warning};
  `,
  destructive: css`
    background: ${({ theme }) => (outline ? 'transparent' : theme.color.destructive + '12')};
    color: ${({ theme }) => theme.color.destructive};
  `,
  info: css`
    background: ${({ theme }) => (outline ? 'transparent' : theme.color.info + '12')};
    color: ${({ theme }) => theme.color.info};
  `,
  accent: css`
    background: ${({ theme }) => (outline ? 'transparent' : theme.color.accent + '20')};
    color: ${({ theme }) => theme.color.accent};
  `,
});

const StyledBadge = styled.span<{ $tone: BadgeTone; $size: BadgeSize; $outline: boolean }>`
  display: inline-flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing[1]};
  font-family: ${({ theme }) => theme.typography.fontFamily.sans};
  font-weight: ${({ theme }) => theme.typography.fontWeight.medium};
  line-height: 1;
  border-radius: ${({ theme }) => theme.radii.md};
  border: none;
  box-shadow: ${({ theme, $outline }) => ($outline ? theme.shadow.claySunken : theme.shadow.clay)};
  white-space: nowrap;
  user-select: none;

  ${({ $size, theme }) => $size === 'sm'
    ? css`font-size: ${theme.typography.fontSize.xs}; padding: 2px ${theme.spacing[2]}; height: 20px;`
    : css`font-size: ${theme.typography.fontSize.sm}; padding: 3px ${theme.spacing[3]}; height: 24px;`}

  ${({ $tone, $outline }) => toneStyles($outline)[$tone]}
`;

const Dot = styled.span<{ $tone: BadgeTone }>`
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: currentColor;
  flex-shrink: 0;
`;

export function Badge({
  tone = 'neutral',
  size = 'md',
  outline = false,
  dot = false,
  children,
  ...rest
}: BadgeProps) {
  return (
    <StyledBadge $tone={tone} $size={size} $outline={outline} {...rest}>
      {dot && <Dot $tone={tone} aria-hidden="true" />}
      {children}
    </StyledBadge>
  );
}
