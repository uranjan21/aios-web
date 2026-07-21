import { createContext, useContext, useState, useEffect } from 'react';
import type { ReactNode } from 'react';
import styled from 'styled-components';
import { MoreHorizontal } from 'lucide-react';
import { Popover, PopoverTrigger, PopoverContent } from '../../interactive/Popover';
import { Button } from '../../primitives/Button';

export interface PageHeaderProps {
  /** Small uppercase label above the title (e.g. "Client Management"). */
  eyebrow?: ReactNode;
  /** Decorative icon — typically a Lucide icon. */
  icon?: ReactNode;
  /** Page title (h1). */
  title: ReactNode;
  /** Optional subtitle — always rendered as its own line below the title row. */
  subtitle?: ReactNode;
  /** Right-aligned slot — typically a primary action button or stack of actions. */
  actions?: ReactNode;
  className?: string;
}

const Root = styled.header`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.spacing[2]};
`;

const MainRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: ${({ theme }) => theme.spacing[3]};
  flex-wrap: wrap;
`;

const Left = styled.div`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing[2]};
  flex: 1;
  min-width: 0;

  @media (min-width: ${({ theme }) => theme.breakpoint.sm}) {
    align-items: flex-start;
    gap: ${({ theme }) => theme.spacing[3]};
  }
`;

const IconWrap = styled.div`
  flex-shrink: 0;
  width: 32px;
  height: 32px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: ${({ theme }) => theme.radii.md};
  background: ${({ theme }) => theme.color.primary + '15'};
  color: ${({ theme }) => theme.color.primary};
  & svg { width: 16px; height: 16px; }

  @media (min-width: ${({ theme }) => theme.breakpoint.sm}) {
    width: 40px;
    height: 40px;
    border-radius: ${({ theme }) => theme.radii.lg};
    & svg { width: 20px; height: 20px; }
  }
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
  color: ${({ theme }) => theme.color.mutedForeground};

  &::before {
    content: '';
    width: 14px;
    height: 2px;
    background: ${({ theme }) => theme.color.accent};
    border-radius: ${({ theme }) => theme.radii.xs};
  }
`;

const Title = styled.h1`
  font-family: ${({ theme }) => theme.typography.fontFamily.sans};
  font-size: ${({ theme }) => theme.typography.fontSize.lg};
  font-weight: ${({ theme }) => theme.typography.fontWeight.semibold};
  color: ${({ theme }) => theme.color.foreground};
  line-height: ${({ theme }) => theme.typography.lineHeight.tight};
  margin: 0;

  @media (min-width: ${({ theme }) => theme.breakpoint.sm}) {
    font-size: ${({ theme }) => theme.typography.fontSize['2xl']};
    white-space: nowrap;
  }
`;

const Subtitle = styled.p`
  font-size: ${({ theme }) => theme.typography.fontSize.sm};
  color: ${({ theme }) => theme.color.mutedForeground};
  margin: 0;
  line-height: 1.4;
`;

const MobileActions = styled.div`
  display: flex;
  align-items: center;

  @media (min-width: ${({ theme }) => theme.breakpoint.sm}) {
    display: none;
  }
`;

const DesktopActions = styled.div`
  display: none;

  @media (min-width: ${({ theme }) => theme.breakpoint.sm}) {
    display: flex;
    align-items: center;
    gap: ${({ theme }) => theme.spacing[2]};
    flex-shrink: 0;
    flex-wrap: wrap;
  }
`;

const MobileActionsMenu = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => `${theme.spacing[2]}`};
  padding: ${({ theme }) => `${theme.spacing[2]}`};
`;

export function PageHeader({ eyebrow, icon, title, subtitle, actions, className }: PageHeaderProps) {
  const ctx = useContext(PageHeaderActionsContext);
  const finalActions = (ctx?.actions || actions) ? (
    <>{ctx?.actions}{actions}</>
  ) : null;

  return (
    <Root className={className}>
      <MainRow>
        <Left>
          {icon && <IconWrap aria-hidden="true">{icon}</IconWrap>}
          <TextCol>
            {eyebrow && <Eyebrow>{eyebrow}</Eyebrow>}
            <Title>{title}</Title>
          </TextCol>
        </Left>
        {finalActions && (
          <>
            <MobileActions>
              <Popover>
                <PopoverTrigger>
                  <Button variant="ghost" size="sm" aria-label="More actions">
                    <MoreHorizontal size={20} />
                  </Button>
                </PopoverTrigger>
                <PopoverContent align="end" gap={8}>
                  <MobileActionsMenu>{finalActions}</MobileActionsMenu>
                </PopoverContent>
              </Popover>
            </MobileActions>
            <DesktopActions>{finalActions}</DesktopActions>
          </>
        )}
      </MainRow>
      {subtitle && <Subtitle>{subtitle}</Subtitle>}
    </Root>
  );
}

/* ── Portal System ──────────────────────────────────────────────────── */

interface PageHeaderActionsContextValue {
  actions: ReactNode | null;
  setActions: (actions: ReactNode | null) => void;
}

const PageHeaderActionsContext = createContext<PageHeaderActionsContextValue | null>(null);

export function PageHeaderProvider({ children }: { children: ReactNode }) {
  const [actions, setActions] = useState<ReactNode | null>(null);
  return (
    <PageHeaderActionsContext.Provider value={{ actions, setActions }}>
      {children}
    </PageHeaderActionsContext.Provider>
  );
}

export function HeaderActionPortal({ children }: { children: ReactNode }) {
  const ctx = useContext(PageHeaderActionsContext);

  useEffect(() => {
    ctx?.setActions(children);
    return () => ctx?.setActions(null);
  }, [children, ctx]);

  return null;
}
