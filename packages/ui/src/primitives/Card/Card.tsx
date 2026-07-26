import { forwardRef } from 'react';
import type { HTMLAttributes, ReactNode } from 'react';
import styled, { css } from 'styled-components';
import { textRole, truncate } from '../../theme/mixins';

/**
 * Card — the app's primary surface.
 *
 * Rebuilt 2026-07-21 for the Expressive direction. What was wrong before:
 *   - `default` and `glass` hardcoded `box-shadow: 0 1px 2px rgba(0,0,0,0.05)`,
 *     which is invisible on the #0C0A09 dark background. Only `elevated` read
 *     a theme value, so most cards had no elevation cue in dark mode at all.
 *   - `CardTitle` was 11px on mobile and 14px on desktop — a heading smaller
 *     than the body text it sat above.
 *   - Padding was a hand-rolled responsive table of raw px per size.
 *   - `interactive` lifted 4px and scaled 1.01, which reflows text on hover.
 *
 * Variants now map onto the elevation scale, so light and dark both get a
 * real depth cue from one source.
 */

export type CardVariant =
  | 'flat' | 'raised' | 'floating' | 'glass' | 'gradient' | 'outline' | 'ghost'
  /** @deprecated legacy names — `default` -> `flat`, `elevated` -> `raised`. */
  | 'default' | 'elevated';

/** The variants that actually have styles; legacy names resolve into these. */
type ResolvedCardVariant = Exclude<CardVariant, 'default' | 'elevated'>;
export type CardSize = 'sm' | 'md' | 'lg' | 'none';

export interface CardProps extends HTMLAttributes<HTMLDivElement> {
  /** Optional section heading rendered in the card header row. */
  title?: string;
  /** Optional subtitle rendered below the title. */
  subtitle?: string;
  /** Icon rendered left of the title. */
  icon?: ReactNode;
  /** Action element (button/link) rendered right of the title. */
  action?: ReactNode;
  /** Visual style variant. */
  variant?: CardVariant;
  /** Apply hover lift. */
  interactive?: boolean;
  /** Alias for interactive, kept for backwards compatibility. */
  hoverable?: boolean;
  /** Controls the internal padding. */
  size?: CardSize;
  /** Remove padding so children can manage it (equivalent to size="none"). */
  noPadding?: boolean;
  /**
   * Entrance animation. Deprecated — animate at the call site with the
   * `useMotion()` hook instead, so `prefers-reduced-motion` is honoured.
   */
  fadeIn?: 'none' | 'up';
  /** @deprecated paired with `fadeIn`. */
  delay?: 0 | 100 | 200 | 300;
}

const SIZE_PADDING: Record<CardSize, ReturnType<typeof css>> = {
  sm: css`
    padding: ${({ theme }) => theme.spacing[3]};
  `,
  md: css`
    padding: ${({ theme }) => theme.spacing[4]};
    @media ${({ theme }) => theme.media.sm} {
      padding: ${({ theme }) => theme.spacing[5]};
    }
  `,
  lg: css`
    padding: ${({ theme }) => theme.spacing[5]};
    @media ${({ theme }) => theme.media.sm} {
      padding: ${({ theme }) => theme.spacing[6]};
    }
  `,
  none: css`
    padding: 0;
  `,
};

const variantStyles: Record<ResolvedCardVariant, ReturnType<typeof css>> = {
  flat: css`
    border: 1px solid ${({ theme }) =>
      theme.mode === 'dark' ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.05)'};
    background: ${({ theme }) =>
      theme.mode === 'dark'
        ? 'linear-gradient(180deg, rgba(30, 32, 40, 0.8) 0%, rgba(20, 21, 26, 0.6) 100%)'
        : 'linear-gradient(180deg, rgba(255, 255, 255, 0.95) 0%, rgba(250, 250, 252, 0.8) 100%)'};
    backdrop-filter: blur(12px);
    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.05);
  `,
  raised: css`
    border: 1px solid ${({ theme }) =>
      theme.mode === 'dark' ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.08)'};
    background: ${({ theme }) =>
      theme.mode === 'dark'
        ? 'linear-gradient(180deg, rgba(35, 37, 45, 0.85) 0%, rgba(25, 26, 32, 0.7) 100%)'
        : 'linear-gradient(180deg, rgba(255, 255, 255, 1) 0%, rgba(250, 250, 252, 0.9) 100%)'};
    backdrop-filter: blur(16px);
    box-shadow: 0 12px 40px rgba(0, 0, 0, 0.08);
  `,
  floating: css`
    border: 1px solid ${({ theme }) =>
      theme.mode === 'dark' ? 'rgba(255, 255, 255, 0.12)' : 'rgba(0, 0, 0, 0.1)'};
    background: ${({ theme }) =>
      theme.mode === 'dark'
        ? 'linear-gradient(180deg, rgba(40, 42, 50, 0.9) 0%, rgba(30, 31, 38, 0.8) 100%)'
        : 'linear-gradient(180deg, rgba(255, 255, 255, 1) 0%, rgba(255, 255, 255, 0.95) 100%)'};
    backdrop-filter: blur(20px);
    box-shadow: 0 16px 48px rgba(0, 0, 0, 0.12);
  `,
  glass: css`
    background: ${({ theme }) => theme.glass.background};
    border: ${({ theme }) => theme.border.hairline} solid ${({ theme }) => theme.glass.border};
    backdrop-filter: ${({ theme }) => theme.glass.regular};
    -webkit-backdrop-filter: ${({ theme }) => theme.glass.regular};
    box-shadow: ${({ theme }) => theme.elevation[2]};
  `,
  /** Accent-tinted surface for the one hero card per view. */
  gradient: css`
    background:
      ${({ theme }) => theme.gradient.meshA},
      ${({ theme }) => theme.color.card};
    border: ${({ theme }) => theme.border.hairline} solid
      color-mix(in srgb, ${({ theme }) => theme.color.accent} 28%, ${({ theme }) => theme.color.border});
    box-shadow: ${({ theme }) => theme.elevation[2]};
  `,
  outline: css`
    background: transparent;
    border: ${({ theme }) => theme.border.hairline} solid ${({ theme }) => theme.color.border};
    box-shadow: none;
  `,
  ghost: css`
    background: transparent;
    border: none;
    box-shadow: none;
  `,
};

const StyledCard = styled.div<{
  $variant: ResolvedCardVariant;
  $interactive: boolean;
  $size: CardSize;
}>`
  position: relative;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  border-radius: ${({ theme }) => theme.radii.md};
  color: ${({ theme }) => theme.color.cardForeground};
  ${({ $size }) => SIZE_PADDING[$size]}
  ${({ $variant }) => variantStyles[$variant]}

  transition:
    box-shadow ${({ theme }) => theme.motion.duration.normal} ${({ theme }) => theme.motion.easing.standard},
    transform ${({ theme }) => theme.motion.duration.normal} ${({ theme }) => theme.motion.easing.standard},
    border-color ${({ theme }) => theme.motion.duration.normal} ${({ theme }) => theme.motion.easing.standard};

  ${({ $interactive, theme }) =>
    $interactive &&
    css`
      cursor: pointer;
      &:hover {
        box-shadow: ${theme.elevation[3]};
        /* translate only — the old rule also scaled 1.01, which reflowed text */
        transform: translateY(-2px);
        border-color: color-mix(in srgb, ${theme.color.accent} 35%, ${theme.color.border});
      }
      &:active {
        transform: translateY(0);
      }
      &:focus-visible {
        outline: ${theme.border.focus} solid ${theme.color.ring};
        outline-offset: 2px;
      }
    `}
`;

export const CardHeader = styled.div<{ $inset?: boolean }>`
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: ${({ theme }) => theme.spacing[3]};
  padding-bottom: ${({ theme }) => theme.spacing[3]};
  margin-bottom: ${({ theme }) => theme.spacing[4]};
  border-bottom: ${({ theme }) => theme.border.hairline} solid ${({ theme }) => theme.color.border};

  flex-wrap: wrap;
  @media ${({ theme }) => theme.media.sm} {
    flex-wrap: nowrap;
    align-items: center;
  }

  /* When the parent Card has no padding, the header supplies its own inset. */
  ${({ $inset, theme }) =>
    $inset &&
    css`
      padding: ${theme.spacing[5]} ${theme.spacing[5]} ${theme.spacing[3]};
      margin-bottom: 0;
    `}
`;

export const TitleGroup = styled.div`
  display: flex;
  align-items: flex-start;
  gap: ${({ theme }) => theme.spacing[2]};
  min-width: 0;

  & > svg,
  & > [data-card-icon] > svg {
    width: 16px;
    height: 16px;
    flex-shrink: 0;
    margin-top: ${({ theme }) => `${theme.spacing[0.5]}`};
    color: ${({ theme }) => theme.color.mutedForeground};
  }
`;

export const CardTitle = styled.h2`
  ${textRole('title-s')}
  ${truncate}
  margin: 0;
  color: ${({ theme }) => theme.color.foreground};
`;

export const CardSubtitle = styled.p`
  ${textRole('body-s')}
  margin: ${({ theme }) => `${theme.spacing[0.5]} 0 0`};
  color: ${({ theme }) => theme.color.mutedForeground};

  /* Hidden on mobile to protect vertical space for primary content. */
  display: none;
  @media ${({ theme }) => theme.media.sm} {
    display: block;
  }
`;

export const CardDescription = styled.p`
  ${textRole('body-m')}
  color: ${({ theme }) => theme.color.mutedForeground};
  margin: 0;
`;

export const CardContent = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.spacing[3]};
  min-width: 0;
`;

export const CardFooter = styled.div`
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: ${({ theme }) => theme.spacing[2]};
  padding-top: ${({ theme }) => theme.spacing[4]};
  margin-top: ${({ theme }) => theme.spacing[4]};
  border-top: ${({ theme }) => theme.border.hairline} solid ${({ theme }) => theme.color.border};
`;

const ActionSlot = styled.div`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing[2]};
  flex-shrink: 0;
`;

/** Legacy variant names kept working so ~200 call sites need no edit. */
const VARIANT_ALIAS: Record<string, ResolvedCardVariant> = {
  default: 'flat',
  elevated: 'raised',
};

export const Card = forwardRef<HTMLDivElement, CardProps>(function Card(
  {
    title,
    subtitle,
    icon,
    action,
    variant = 'flat',
    interactive = false,
    hoverable = false,
    size = 'lg',
    noPadding = false,
    // Accepted and ignored: entrance animation moved to useMotion() at the
    // call site so it can honour prefers-reduced-motion.
    fadeIn: _fadeIn,
    delay: _delay,
    children,
    ...rest
  },
  ref,
) {
  const effectiveSize = noPadding ? 'none' : size;
  const isInteractive = interactive || hoverable;
  const resolvedVariant = VARIANT_ALIAS[variant] ?? (variant as ResolvedCardVariant);

  return (
    <StyledCard
      ref={ref}
      $variant={resolvedVariant}
      $interactive={isInteractive}
      $size={effectiveSize}
      tabIndex={isInteractive ? 0 : undefined}
      {...rest}
    >
      {(title || subtitle || icon || action) && (
        <CardHeader $inset={effectiveSize === 'none'}>
          <TitleGroup>
            {/*
              Card icons are decorative — the title beside them carries the
              meaning — so they are hidden from assistive tech. PageHeader and
              EmptyState already did this; Card did not, which is why a live
              a11y scan found 15 unhidden SVGs on the dashboard alone.
            */}
            {icon && <span data-card-icon aria-hidden="true">{icon}</span>}
            <div style={{ minWidth: 0 }}>
              {title && <CardTitle>{title}</CardTitle>}
              {subtitle && <CardSubtitle>{subtitle}</CardSubtitle>}
            </div>
          </TitleGroup>
          {action && <ActionSlot>{action}</ActionSlot>}
        </CardHeader>
      )}
      {children}
    </StyledCard>
  );
});
