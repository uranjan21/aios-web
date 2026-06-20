import { forwardRef } from 'react';
import type { HTMLAttributes, ReactNode } from 'react';
import styled, { css, keyframes } from 'styled-components';

export type CardVariant = 'default' | 'elevated' | 'glass' | 'outline' | 'ghost';
export type CardSize = 'sm' | 'md' | 'lg' | 'none';

export interface CardProps extends HTMLAttributes<HTMLDivElement> {
  /** Optional section heading rendered in the card header row. */
  title?: string;
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
    background: ${({ theme }) => theme.color.card};
    border: 1px solid ${({ theme }) => theme.color.border};
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
  ${({ $variant }) => variantStyles[$variant]}
  transition: box-shadow ${({ theme }) => theme.motion.duration.normal} ${({ theme }) => theme.motion.easing.standard},
              transform ${({ theme }) => theme.motion.duration.normal} ${({ theme }) => theme.motion.easing.standard},
              border-color ${({ theme }) => theme.motion.duration.normal} ${({ theme }) => theme.motion.easing.standard};

  ${({ $interactive, theme }) => $interactive && css`
    cursor: pointer;
    &:hover {
      box-shadow: ${theme.shadow.md};
      transform: translateY(-2px);
    }
  `}

  display: flex;
  flex-direction: column;

  ${({ $fadeIn, $delay }) => $fadeIn === 'up' && css`
    animation: ${fadeInUp} 0.35s cubic-bezier(0.16, 1, 0.3, 1) ${$delay}ms both;
  `}
`;

export const CardHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 12px;
`;

export const TitleGroup = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
`;

export const CardTitle = styled.h2`
  margin: 0;
  font-family: ${({ theme }) => theme.typography.fontFamily.sans};
  font-size: 14px;
  font-weight: 600;
  color: ${({ theme }) => theme.color.foreground};
  line-height: 1.2;
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
      {...rest}
    >
      {(title || icon || action) && (
        <CardHeader>
          <TitleGroup>
            {icon}
            {title && <CardTitle>{title}</CardTitle>}
          </TitleGroup>
          {action}
        </CardHeader>
      )}
      {children}
    </StyledCard>
  );
});
