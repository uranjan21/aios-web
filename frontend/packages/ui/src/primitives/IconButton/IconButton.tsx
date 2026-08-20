import { forwardRef } from 'react';
import type { ButtonHTMLAttributes, ReactNode } from 'react';
import styled, { css } from 'styled-components';
import { focusRing } from '../../theme/mixins';

/**
 * The square icon-only control.
 *
 * It exists because `Button size="icon"` covers exactly one geometry (36px) and
 * nothing else, so every 32px toolbar affordance was hand-rolled — fourteen
 * times, two of them inside this package. Fourteen implementations could not
 * hold one height, one focus ring or one hover state, which is what the 32px
 * toolbar contract in `frontend/CLAUDE.md` actually asks for.
 *
 * `aria-label` is required by the type, not by convention: an icon-only button
 * has no accessible name otherwise, and that was the defect every hand-rolled
 * copy shared.
 */

export type IconButtonVariant = 'ghost' | 'outline' | 'secondary' | 'primary' | 'destructive';

/** Icon colour when the variant does not already dictate one. */
export type IconButtonTone = 'default' | 'muted' | 'primary' | 'destructive';

export type IconButtonSize = 'sm' | 'md';

export interface IconButtonProps
  extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'aria-label' | 'children'> {
  /** Required — an icon-only control has no other accessible name. */
  'aria-label': string;
  /** The icon. Sized to 1em by the container. */
  children: ReactNode;
  /** `sm` = 32px (the toolbar contract), `md` = 36px (matches Button `md`). */
  size?: IconButtonSize;
  variant?: IconButtonVariant;
  tone?: IconButtonTone;
}

/* ── Style maps ──────────────────────────────────────────────────────── */

const sizeStyles = {
  sm: css`
    height: 32px;
    width: 32px;
    font-size: ${({ theme }) => theme.typography.fontSize.md};
  `,
  md: css`
    height: 36px;
    width: 36px;
    font-size: ${({ theme }) => theme.typography.fontSize.lg};
  `,
};

const toneColor = {
  default: css`
    color: ${({ theme }) => theme.color.foreground};
  `,
  muted: css`
    color: ${({ theme }) => theme.color.mutedForeground};
  `,
  primary: css`
    color: ${({ theme }) => theme.color.primary};
  `,
  destructive: css`
    color: ${({ theme }) => theme.color.destructive};
  `,
};

/*
 * Variants mirror `Button`'s: flat semantic fills, depth from the elevation
 * scale, colour-only state changes, nothing moves on press.
 */
const variantStyles = {
  ghost: css`
    background: transparent;
    border: 1px solid transparent;
    &:hover:not(:disabled) {
      background: ${({ theme }) => theme.color.muted};
      color: ${({ theme }) => theme.color.foreground};
    }
  `,
  outline: css`
    background: transparent;
    border: 1px solid ${({ theme }) => theme.color.border};
    &:hover:not(:disabled) {
      background: ${({ theme }) => theme.color.muted};
      color: ${({ theme }) => theme.color.foreground};
    }
  `,
  secondary: css`
    background: ${({ theme }) => theme.color.card};
    border: 1px solid ${({ theme }) => theme.color.border};
    &:hover:not(:disabled) {
      background: ${({ theme }) => theme.color.muted};
      color: ${({ theme }) => theme.color.foreground};
    }
  `,
  primary: css`
    background: ${({ theme }) => theme.color.primary};
    border: 1px solid transparent;
    box-shadow: ${({ theme }) => theme.elevation[1]};
    &&& {
      color: ${({ theme }) => theme.color.primaryForeground};
    }
    &:hover:not(:disabled) {
      background: ${({ theme }) => theme.color.primaryHover};
    }
  `,
  destructive: css`
    background: ${({ theme }) => theme.color.destructive};
    border: 1px solid transparent;
    box-shadow: ${({ theme }) => theme.elevation[1]};
    &&& {
      color: ${({ theme }) => theme.color.destructiveForeground};
    }
    &:hover:not(:disabled) {
      filter: brightness(1.08);
    }
  `,
};

const StyledIconButton = styled.button<{
  $variant: IconButtonVariant;
  $size: IconButtonSize;
  $tone: IconButtonTone;
}>`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  padding: 0;
  border-radius: ${({ theme }) => theme.radii.sm};
  cursor: pointer;
  transition: background-color ${({ theme }) => theme.motion.duration.fast} ${({ theme }) => theme.motion.easing.standard},
              border-color ${({ theme }) => theme.motion.duration.fast} ${({ theme }) => theme.motion.easing.standard},
              color ${({ theme }) => theme.motion.duration.fast} ${({ theme }) => theme.motion.easing.standard},
              filter ${({ theme }) => theme.motion.duration.fast} ${({ theme }) => theme.motion.easing.standard};

  ${focusRing}
  ${({ $tone }) => toneColor[$tone]}
  ${({ $size }) => sizeStyles[$size]}
  ${({ $variant }) => variantStyles[$variant]}

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  & > svg {
    width: 1em;
    height: 1em;
    flex-shrink: 0;
  }
`;

export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(function IconButton(
  { size = 'sm', variant = 'ghost', tone = 'muted', type = 'button', children, ...rest },
  ref,
) {
  return (
    <StyledIconButton
      ref={ref}
      type={type}
      $variant={variant}
      $size={size}
      $tone={tone}
      {...rest}
    >
      {children}
    </StyledIconButton>
  );
});
