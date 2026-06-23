import { forwardRef } from 'react';
import type { HTMLAttributes, ReactNode } from 'react';
import styled, { css, keyframes } from 'styled-components';

export type CardVariant = 'default' | 'elevated' | 'glass' | 'outline' | 'ghost';
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
  /** Apply hover lift effect. */
  interactive?: boolean;
  /** Alias for interactive, kept for backwards compatibility. */
  hoverable?: boolean;
  /** Controls the internal padding. */
  size?: CardSize;
  /** Remove padding so children can manage it (equivalent to size="none"). */
  noPadding?: boolean;
  /** Slide-up entrance animation. */
  fadeIn?: 'none' | 'up';
  /** Animation delay in ms (used with fadeIn="up"). */
  delay?: 0 | 100 | 200 | 300;
}

const fadeInUp = keyframes`
  from { opacity: 0; transform: translateY(10px); }
  to   { opacity: 1; transform: translateY(0); }
`;

const SIZE_PADDING: Record<CardSize, string> = {
  sm:   '12px',
  md:   '16px',
  lg:   '24px',
  none: '0',
};

const SIZE_PADDING_BOTTOM: Record<CardSize, string> = {
  sm:   '8px',
  md:   '12px',
  lg:   '16px',
  none: '0',
};

const variantStyles = {
  default: css`
    background: ${({ theme }) => theme.color.card};
    border: 1px solid ${({ theme }) => theme.color.border};
    box-shadow: 0 1px 2px rgba(0,0,0,0.05);
  `,
  elevated: css`
    background: ${({ theme }) => theme.color.card};
    border: 1px solid ${({ theme }) => theme.color.border};
    box-shadow: ${({ theme }) => theme.shadow.md};
  `,
  glass: css`
    background: color-mix(in srgb, ${({ theme }) => theme.color.card} 70%, transparent);
    border: 1px solid color-mix(in srgb, ${({ theme }) => theme.color.border} 70%, transparent);
    backdrop-filter: blur(12px);
    -webkit-backdrop-filter: blur(12px);
    box-shadow: 0 1px 2px rgba(0,0,0,0.05);
  `,
  outline: css`
    background: transparent;
    border: 1px solid ${({ theme }) => theme.color.border};
    box-shadow: none;
  `,
  ghost: css`
    background: transparent;
    border: none;
    box-shadow: none;
  `,
};

const StyledCard = styled.div<{
  $variant: CardVariant;
  $interactive: boolean;
  $size: CardSize;
  $fadeIn: 'none' | 'up';
  $delay: number;
}>`
  border-radius: ${({ theme }) => theme.radii.lg};
  color: ${({ theme }) => theme.color.cardForeground};
  padding: ${({ $size }) => SIZE_PADDING[$size]};
  padding-bottom: ${({ $size }) => SIZE_PADDING_BOTTOM[$size]};
  ${({ $variant }) => variantStyles[$variant]}
  transition: box-shadow ${({ theme }) => theme.motion.duration.normal} ${({ theme }) => theme.motion.easing.standard},
              transform ${({ theme }) => theme.motion.duration.normal} ${({ theme }) => theme.motion.easing.standard},
              border-color ${({ theme }) => theme.motion.duration.normal} ${({ theme }) => theme.motion.easing.standard};

  ${({ $interactive, theme }) => $interactive && css`
    cursor: pointer;
    &:hover {
      box-shadow: ${theme.shadow.md};
      transform: translateY(-4px) scale(1.01);
      border-color: ${theme.color.accent}55;
    }
    &:focus-visible {
      outline: 2px solid ${theme.color.ring};
      outline-offset: 2px;
    }
  `}

  display: flex;
  flex-direction: column;
  overflow: hidden;

  ${({ $fadeIn, $delay }) => $fadeIn === 'up' && css`
    animation: ${fadeInUp} 0.35s cubic-bezier(0.16, 1, 0.3, 1) ${$delay}ms both;
  `}
`;

export const CardHeader = styled.div<{ $inset?: boolean }>`
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  border-bottom: 1px solid ${({ theme }) => theme.color.border};
  padding-bottom: 12px;
  margin-bottom: 16px;
  
  flex-wrap: wrap;
  gap: 12px;
  
  @media (min-width: 640px) {
    align-items: center;
    flex-wrap: nowrap;
  }

  /* When the parent Card has no padding, the header needs its own horizontal
     inset so icon/title don't sit flush at the card edge. */
  ${({ $inset }) => $inset && css`
    padding-top: 16px;
    padding-left: 20px;
    padding-right: 20px;
    margin-bottom: 0;
  `}
`;

export const TitleGroup = styled.div`
  display: flex;
  align-items: flex-start;
  gap: 8px;

  & svg {
    width: 16px;
    height: 16px;
    flex-shrink: 0;
    margin-top: 2px;
  }
  
  @media (min-width: 640px) {
    align-items: center;
    & svg { margin-top: 0; }
  }
`;

export const CardTitle = styled.h2`
  margin: 0;
  font-family: ${({ theme }) => theme.typography.fontFamily.sans};
  font-size: 14px;
  font-weight: 600;
  color: ${({ theme }) => theme.color.foreground};
  line-height: 1.2;
`;

export const CardSubtitle = styled.p`
  margin: 0;
  margin-top: 2px;
  font-family: ${({ theme }) => theme.typography.fontFamily.sans};
  font-size: 11px;
  color: ${({ theme }) => theme.color.mutedForeground};
  line-height: 1.2;
  
  display: none;
  @media (min-width: 640px) {
    display: block;
  }
`;

export const CardDescription = styled.p`
  font-size: ${({ theme }) => theme.typography.fontSize.base};
  color: ${({ theme }) => theme.color.mutedForeground};
  margin: 0;
`;

export const CardContent = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.spacing[3]};
`;

export const CardFooter = styled.div`
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: ${({ theme }) => theme.spacing[2]};
  padding-top: ${({ theme }) => theme.spacing[4]};
  margin-top: ${({ theme }) => theme.spacing[4]};
`;

export const Card = forwardRef<HTMLDivElement, CardProps>(function Card(
  { 
    title,
    subtitle,
    icon,
    action,
    variant = 'default', 
    interactive = false, 
    hoverable = false,
    size = 'lg',
    noPadding = false, 
    fadeIn = 'none',
    delay = 0,
    children,
    ...rest 
  },
  ref,
) {
  const effectiveSize = noPadding ? 'none' : size;
  const isInteractive = interactive || hoverable;

  return (
    <StyledCard
      ref={ref}
      $variant={variant}
      $interactive={isInteractive}
      $size={effectiveSize}
      $fadeIn={fadeIn}
      $delay={delay}
      tabIndex={isInteractive ? 0 : undefined}
      {...rest}
    >
      {(title || subtitle || icon || action) && (
        <CardHeader $inset={effectiveSize === 'none'}>
          <TitleGroup>
            {icon}
            <div>
              {title && <CardTitle>{title}</CardTitle>}
              {subtitle && <CardSubtitle>{subtitle}</CardSubtitle>}
            </div>
          </TitleGroup>
          {action && <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>{action}</div>}
        </CardHeader>
      )}
      {children}
    </StyledCard>
  );
});
