import { forwardRef } from 'react';
import type { ButtonHTMLAttributes, ElementType, ReactNode } from 'react';
import styled, { css } from 'styled-components';
import { focusRing } from '../../utils/focusRing';

export type ButtonVariant =
  | 'primary'
  | 'secondary'
  | 'outline'
  | 'ghost'
  | 'destructive'
  | 'link';

export type ButtonSize = 'sm' | 'md' | 'lg' | 'icon';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  /** Show a spinner and disable interaction. */
  loading?: boolean;
  /** Slot before the label (e.g. <Icon />). */
  startIcon?: ReactNode;
  /** Slot after the label. */
  endIcon?: ReactNode;
  /** Stretch to fill parent width. */
  fullWidth?: boolean;
  /**
   * Render as a different element or component (polymorphic).
   * e.g. `as="a"` for an external link, or `as={Link}` for a router link.
   * styled-components forwards the element; the props below cover the common
   * anchor / router-link attributes used alongside it.
   */
  as?: ElementType;
  /** Anchor href when rendered with `as="a"`. */
  href?: string;
  /** Anchor target when rendered with `as="a"`. */
  target?: string;
  /** Anchor rel when rendered with `as="a"`. */
  rel?: string;
  /** Router destination when rendered with `as={Link}`. */
  to?: string;
}

/* ── Style maps ──────────────────────────────────────────────────────── */

const sizeStyles = {
  sm: css`
    height: 32px;
    padding: 0 ${({ theme }) => theme.spacing[3]};
    font-size: ${({ theme }) => theme.typography.fontSize.xs};
    gap: ${({ theme }) => theme.spacing[1]};
    border-radius: ${({ theme }) => theme.radii.md};
  `,
  md: css`
    height: 36px;
    padding: 0 ${({ theme }) => theme.spacing[4]};
    font-size: ${({ theme }) => theme.typography.fontSize.base};
    gap: ${({ theme }) => theme.spacing[2]};
    border-radius: ${({ theme }) => theme.radii.md};
  `,
  lg: css`
    height: 44px;
    padding: 0 ${({ theme }) => theme.spacing[5]};
    font-size: ${({ theme }) => theme.typography.fontSize.md};
    gap: ${({ theme }) => theme.spacing[2]};
    border-radius: ${({ theme }) => theme.radii.lg};
  `,
  icon: css`
    height: 36px;
    width: 36px;
    padding: 0;
    border-radius: ${({ theme }) => theme.radii.md};
  `,
};

const variantStyles = {
  primary: css`
    background: linear-gradient(135deg, ${({ theme }) => theme.color.primary} 0%, ${({ theme }) => theme.color.primaryHover} 100%);
    color: ${({ theme }) => theme.color.primaryForeground};
    border: none;
    box-shadow: 
      inset 0 1px 0 rgba(255, 255, 255, 0.2), 
      inset 0 -1px 0 rgba(0, 0, 0, 0.1), 
      0 4px 12px ${({ theme }) => theme.color.primary}40;
    &:hover:not(:disabled) {
      background: linear-gradient(135deg, ${({ theme }) => theme.color.primaryHover} 0%, ${({ theme }) => theme.color.primary} 100%);
      box-shadow: 
        inset 0 1px 0 rgba(255, 255, 255, 0.3), 
        inset 0 -1px 0 rgba(0, 0, 0, 0.1), 
        0 6px 16px ${({ theme }) => theme.color.primary}50;
      transform: translateY(-1px);
    }
    &:active:not(:disabled) {
      box-shadow: 
        inset 0 2px 4px rgba(0, 0, 0, 0.2), 
        0 2px 4px ${({ theme }) => theme.color.primary}30;
      transform: translateY(1px);
    }
  `,
  secondary: css`
    background: ${({ theme }) => theme.mode === 'dark' ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.03)'};
    color: ${({ theme }) => theme.color.foreground};
    border: 1px solid ${({ theme }) => theme.mode === 'dark' ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.08)'};
    backdrop-filter: blur(12px);
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
    &:hover:not(:disabled) {
      background: ${({ theme }) => theme.mode === 'dark' ? 'rgba(255, 255, 255, 0.09)' : 'rgba(0, 0, 0, 0.06)'};
      border-color: ${({ theme }) => theme.mode === 'dark' ? 'rgba(255, 255, 255, 0.15)' : 'rgba(0, 0, 0, 0.15)'};
    }
    &:active:not(:disabled) {
      box-shadow: none;
      transform: translateY(1px);
    }
  `,
  outline: css`
    background: transparent;
    color: ${({ theme }) => theme.color.foreground};
    border: 1px solid ${({ theme }) => theme.color.border};
    box-shadow: none;
    &:hover:not(:disabled) {
      background: ${({ theme }) => theme.mode === 'dark' ? 'rgba(255, 255, 255, 0.04)' : 'rgba(0, 0, 0, 0.03)'};
      border-color: ${({ theme }) => theme.color.foreground}30;
    }
    &:active:not(:disabled) {
      transform: translateY(1px);
    }
  `,
  ghost: css`
    background: transparent;
    color: ${({ theme }) => theme.color.foreground};
    border: 1px solid transparent;
    box-shadow: none;
    &:hover:not(:disabled) {
      background: ${({ theme }) => theme.mode === 'dark' ? 'rgba(255, 255, 255, 0.06)' : 'rgba(0, 0, 0, 0.04)'};
    }
    &:active:not(:disabled) {
      transform: translateY(1px);
    }
  `,
  destructive: css`
    background: linear-gradient(135deg, ${({ theme }) => theme.color.destructive} 0%, #B91C1C 100%);
    color: ${({ theme }) => theme.color.destructiveForeground};
    border: none;
    box-shadow: 
      inset 0 1px 0 rgba(255, 255, 255, 0.2), 
      inset 0 -1px 0 rgba(0, 0, 0, 0.1), 
      0 4px 12px ${({ theme }) => theme.color.destructive}40;
    &:hover:not(:disabled) {
      background: linear-gradient(135deg, #EF4444 0%, ${({ theme }) => theme.color.destructive} 100%);
      box-shadow: 
        inset 0 1px 0 rgba(255, 255, 255, 0.3), 
        0 6px 16px ${({ theme }) => theme.color.destructive}50;
      transform: translateY(-1px);
    }
    &:active:not(:disabled) {
      box-shadow: inset 0 2px 4px rgba(0, 0, 0, 0.2);
      transform: translateY(1px);
    }
  `,
  link: css`
    background: transparent;
    color: ${({ theme }) => theme.color.primary};
    border: none;
    padding: 0;
    height: auto;
    &:hover:not(:disabled) {
      text-decoration: underline;
      text-underline-offset: 3px;
    }
  `,
};

/* ── Styled element ──────────────────────────────────────────────────── */

const StyledButton = styled.button<{
  $variant: ButtonVariant;
  $size: ButtonSize;
  $fullWidth: boolean;
  $loading: boolean;
}>`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: ${({ theme }) => theme.spacing[2]};
  white-space: nowrap;
  font-family: ${({ theme }) => theme.typography.fontFamily.sans};
  font-weight: ${({ theme }) => theme.typography.fontWeight.medium};
  letter-spacing: ${({ theme }) => theme.typography.letterSpacing.normal};
  cursor: pointer;
  user-select: none;
  transition: background-color ${({ theme }) => theme.motion.duration.fast} ${({ theme }) => theme.motion.easing.standard},
              border-color ${({ theme }) => theme.motion.duration.fast} ${({ theme }) => theme.motion.easing.standard},
              color ${({ theme }) => theme.motion.duration.fast} ${({ theme }) => theme.motion.easing.standard},
              filter ${({ theme }) => theme.motion.duration.fast} ${({ theme }) => theme.motion.easing.standard};

  ${focusRing}
  ${({ $size }) => sizeStyles[$size]}
  ${({ $variant }) => variantStyles[$variant]}

  ${({ $fullWidth }) => $fullWidth && css`width: 100%;`}

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  ${({ $loading }) => $loading && css`
    cursor: progress;
    pointer-events: none;
  `}

  & > svg {
    width: 1em;
    height: 1em;
    flex-shrink: 0;
  }
`;

const Spinner = styled.span`
  display: inline-block;
  width: 1em;
  height: 1em;
  border: 2px solid currentColor;
  border-right-color: transparent;
  border-radius: 50%;
  animation: ledgr-spin 0.6s linear infinite;
  @keyframes ledgr-spin {
    to { transform: rotate(360deg); }
  }
`;

/* ── Component ───────────────────────────────────────────────────────── */

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  {
    variant = 'primary',
    size = 'md',
    loading = false,
    startIcon,
    endIcon,
    fullWidth = false,
    children,
    disabled,
    type = 'button',
    ...rest
  },
  ref,
) {
  return (
    <StyledButton
      ref={ref}
      type={type}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      $variant={variant}
      $size={size}
      $fullWidth={fullWidth}
      $loading={loading}
      {...rest}
    >
      {loading ? <Spinner aria-hidden="true" /> : startIcon}
      {children}
      {!loading && endIcon}
    </StyledButton>
  );
});
