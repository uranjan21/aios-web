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

/*
 * Radii are deliberately one step below the surface scale. `radii.md` (14px)
 * on a 32px control and `radii.lg` (20px) on a 44px one are pills in all but
 * name — half the height IS the pill threshold. `sm` (10px) reads as a flat
 * corner at every button height, which is what the no-pill rule is after.
 */
const sizeStyles = {
  sm: css`
    height: 32px;
    padding: 0 ${({ theme }) => theme.spacing[3]};
    font-size: ${({ theme }) => theme.typography.fontSize.xs};
    gap: ${({ theme }) => theme.spacing[1]};
    border-radius: ${({ theme }) => theme.radii.sm};
  `,
  md: css`
    height: 36px;
    padding: 0 ${({ theme }) => theme.spacing[4]};
    font-size: ${({ theme }) => theme.typography.fontSize.base};
    gap: ${({ theme }) => theme.spacing[2]};
    border-radius: ${({ theme }) => theme.radii.sm};
  `,
  lg: css`
    height: 44px;
    padding: 0 ${({ theme }) => theme.spacing[5]};
    font-size: ${({ theme }) => theme.typography.fontSize.md};
    gap: ${({ theme }) => theme.spacing[2]};
    border-radius: ${({ theme }) => theme.radii.md};
  `,
  icon: css`
    height: 36px;
    width: 36px;
    padding: 0;
    border-radius: ${({ theme }) => theme.radii.sm};
  `,
};

/*
 * De-clayed 2026-07-27. Every filled variant used to carry the full
 * claymorphic recipe: a 135° gradient body, a white top bevel
 * (`inset 0 1px 0 rgba(255,255,255,0.2)`) over a dark bottom bevel, a coloured
 * ambient glow, and a `translateY` squish that pressed the button into a
 * sunken `inset 0 2px 4px` well on `:active`. The outline/secondary variants
 * added `backdrop-filter: blur(12px)` over translucent black — a frosted body
 * with nothing behind it to frost, costing a compositing layer per button.
 *
 * All of it is gone. Fills are flat semantic colours, depth comes from the
 * `elevation` scale (which carries the one sanctioned dark-mode hairline and
 * nothing in light mode), state changes are colour-only, and nothing moves on
 * press. This is the "no white/highlight shadows on buttons or inputs" rule
 * the design system already declared but the component never followed.
 */
const variantStyles = {
  primary: css`
    background: ${({ theme }) => theme.color.primary};
    color: ${({ theme }) => theme.color.primaryForeground};
    border: 1px solid transparent;
    box-shadow: ${({ theme }) => theme.elevation[1]};
    &:hover:not(:disabled) {
      background: ${({ theme }) => theme.color.primaryHover};
    }
    &:active:not(:disabled) {
      background: ${({ theme }) => theme.color.primaryHover};
      box-shadow: ${({ theme }) => theme.elevation[0]};
    }
  `,
  secondary: css`
    background: ${({ theme }) => theme.color.muted};
    color: ${({ theme }) => theme.color.foreground};
    border: 1px solid ${({ theme }) => theme.color.border};
    box-shadow: none;
    &:hover:not(:disabled) {
      background: ${({ theme }) =>
        `color-mix(in srgb, ${theme.color.muted} 88%, ${theme.color.foreground})`};
      border-color: ${({ theme }) => theme.color.foreground}30;
    }
    &:active:not(:disabled) {
      background: ${({ theme }) => theme.color.muted};
    }
  `,
  outline: css`
    background: transparent;
    color: ${({ theme }) => theme.color.foreground};
    border: 1px solid ${({ theme }) => theme.color.border};
    box-shadow: none;
    &:hover:not(:disabled) {
      background: ${({ theme }) => theme.color.muted};
      border-color: ${({ theme }) => theme.color.foreground}30;
    }
  `,
  ghost: css`
    background: transparent;
    color: ${({ theme }) => theme.color.foreground};
    border: 1px solid transparent;
    box-shadow: none;
    &:hover:not(:disabled) {
      background: ${({ theme }) => theme.color.muted};
    }
  `,
  destructive: css`
    background: ${({ theme }) => theme.color.destructive};
    color: ${({ theme }) => theme.color.destructiveForeground};
    border: 1px solid transparent;
    box-shadow: ${({ theme }) => theme.elevation[1]};
    &:hover:not(:disabled) {
      filter: brightness(1.08);
    }
    &:active:not(:disabled) {
      box-shadow: ${({ theme }) => theme.elevation[0]};
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
