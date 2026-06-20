import type { ReactNode } from 'react';
import styled from 'styled-components';

export interface PageHeaderProps {
  /** Small uppercase label above the title (e.g. "Client Management"). */
  eyebrow?: ReactNode;
  /** Decorative icon — typically a Lucide icon. */
  icon?: ReactNode;
  /** Page title (h1). */
  title: ReactNode;
  /** Optional subtitle. */
  subtitle?: ReactNode;
  /** Right-aligned slot — typically a primary action button or stack of actions. */
  actions?: ReactNode;
  className?: string;
}

const Root = styled.header`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.spacing[3]};

  @media (min-width: ${({ theme }) => theme.breakpoint.sm}) {
    flex-direction: row;
    align-items: flex-start;
    justify-content: space-between;
    gap: ${({ theme }) => theme.spacing[4]};
  }
`;

const Left = styled.div`
  display: flex;
  align-items: flex-start;
  gap: ${({ theme }) => theme.spacing[3]};
  flex: 1;
  min-width: 0;
`;

const IconWrap = styled.div`
  flex-shrink: 0;
  width: 40px;
  height: 40px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: ${({ theme }) => theme.radii.lg};
  background: ${({ theme }) => theme.color.primary + '15'};
  color: ${({ theme }) => theme.color.primary};
  & svg { width: 20px; height: 20px; }
`;

const TextCol = styled.div`
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.spacing[1]};
`;

const Eyebrow = styled.span`
  display: inline-flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing[2]};
  font-size: ${({ theme }) => theme.typography.fontSize.xs};
  font-weight: ${({ theme }) => theme.typography.fontWeight.semibold};
  text-transform: uppercase;
  letter-spacing: ${({ theme }) => theme.typography.letterSpacing.wider};
  color: ${({ theme }) => theme.color.accent};

  &::before {
    content: '';
    width: 14px;
    height: 2px;
    background: ${({ theme }) => theme.color.accent};
    border-radius: 1px;
  }
`;

const Title = styled.h1`
  font-family: ${({ theme }) => theme.typography.fontFamily.serif};
  font-size: ${({ theme }) => theme.typography.fontSize.xl};
  font-weight: ${({ theme }) => theme.typography.fontWeight.bold};
  color: ${({ theme }) => theme.color.foreground};
  line-height: ${({ theme }) => theme.typography.lineHeight.tight};
  margin: 0;

  @media (min-width: ${({ theme }) => theme.breakpoint.sm}) {
    font-size: ${({ theme }) => theme.typography.fontSize['2xl']};
    white-space: nowrap;
  }
`;

const Subtitle = styled.p`
  font-size: ${({ theme }) => theme.typography.fontSize.base};
  color: ${({ theme }) => theme.color.mutedForeground};
  margin: 0;
`;

const Actions = styled.div`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing[2]};
  flex-shrink: 0;
  /* Wrap action buttons onto a new line instead of overflowing on narrow
     screens (the header stacks vertically below sm, so Actions gets full width). */
  flex-wrap: wrap;
`;

export function PageHeader({ eyebrow, icon, title, subtitle, actions, className }: PageHeaderProps) {
  return (
    <Root className={className}>
      <Left>
        {icon && <IconWrap aria-hidden="true">{icon}</IconWrap>}
        <TextCol>
          {eyebrow && <Eyebrow>{eyebrow}</Eyebrow>}
          <Title>{title}</Title>
          {subtitle && <Subtitle>{subtitle}</Subtitle>}
        </TextCol>
      </Left>
      {actions && <Actions>{actions}</Actions>}
    </Root>
  );
}
