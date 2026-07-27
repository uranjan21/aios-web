import { createContext, useContext, useState, useEffect } from 'react';
import type { ReactNode } from 'react';
import styled from 'styled-components';

export interface PageHeaderProps {
  /** Small uppercase label that appears before the title (e.g. "Finance"). */
  eyebrow?: ReactNode;
  /** Decorative icon — typically a Lucide icon at 16px. */
  icon?: ReactNode;
  /** Page title (h1). */
  title: ReactNode;
  /** Optional subtitle — rendered as a small muted line below the glass bar. */
  subtitle?: ReactNode;
  /** Right-aligned slot — typically action buttons. */
  actions?: ReactNode;
  className?: string;
}

const Wrapper = styled.div`
  margin-bottom: ${({ theme }) => theme.spacing[4]};
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.spacing[1.5]};
`;

const Root = styled.header`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: ${({ theme }) => theme.spacing[3]};
  padding: ${({ theme }) => `${theme.spacing[2.5]} ${theme.spacing[4]}`};

  background: ${({ theme }) =>
    theme.mode === 'dark'
      ? 'rgba(12, 10, 9, 0.72)'
      : 'rgba(250, 250, 249, 0.82)'};
  backdrop-filter: blur(20px) saturate(180%);
  -webkit-backdrop-filter: blur(20px) saturate(180%);
  border: 1px solid ${({ theme }) =>
    theme.mode === 'dark'
      ? 'rgba(255, 255, 255, 0.07)'
      : 'rgba(0, 0, 0, 0.06)'};
  border-radius: ${({ theme }) => theme.radii.lg};
  box-shadow:
    0 2px 12px rgba(0, 0, 0, 0.04),
    inset 0 1px 0 ${({ theme }) =>
      theme.mode === 'dark' ? 'rgba(255, 255, 255, 0.04)' : 'rgba(255, 255, 255, 0.9)'};
`;

const Left = styled.div`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing[2.5]};
  flex: 1;
  min-width: 0;
`;

const IconWrap = styled.div`
  flex-shrink: 0;
  width: 28px;
  height: 28px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: ${({ theme }) => theme.radii.md};
  background: ${({ theme }) => theme.color.accent + '18'};
  color: ${({ theme }) => theme.color.accent};

  & svg {
    width: 14px;
    height: 14px;
  }
`;

const TextRow = styled.div`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing[2]};
  min-width: 0;
  flex: 1;
`;

/* Below sm the eyebrow duplicates context the nav already gives, and it costs
   the title enough width to truncate it — so it yields on small screens. */
const Eyebrow = styled.span`
  display: none;
  font-size: ${({ theme }) => theme.typography.fontSize.xs};
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: ${({ theme }) => theme.color.mutedForeground};
  flex-shrink: 0;
  white-space: nowrap;

  @media ${({ theme }) => theme.media.sm} {
    display: inline;
  }
`;

const Sep = styled.span`
  display: none;
  width: 3px;
  height: 3px;
  border-radius: 50%;
  flex-shrink: 0;
  background: ${({ theme }) =>
    theme.mode === 'dark' ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.2)'};

  @media ${({ theme }) => theme.media.sm} {
    display: block;
  }
`;

const Title = styled.h1`
  font-family: ${({ theme }) => theme.typography.fontFamily.sans};
  font-size: ${({ theme }) => theme.typography.fontSize.sm};
  font-weight: ${({ theme }) => theme.typography.fontWeight.semibold};
  color: ${({ theme }) => theme.color.foreground};
  margin: 0;
  line-height: 1;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`;

const Actions = styled.div`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing[2]};
  flex-shrink: 0;
`;

const Subtitle = styled.p`
  font-size: ${({ theme }) => theme.typography.fontSize.xs};
  color: ${({ theme }) => theme.color.mutedForeground};
  margin: 0;
  padding: ${({ theme }) => `0 ${theme.spacing[1]}`};
  line-height: 1.4;

  /* Hidden on mobile to protect vertical space for primary content. */
  display: none;
  @media ${({ theme }) => theme.media.sm} {
    display: block;
  }
`;

export function PageHeader({ eyebrow, icon, title, subtitle, actions, className }: PageHeaderProps) {
  const ctx = useContext(PageHeaderActionsContext);
  const finalActions = ctx?.actions || actions
    ? <>{ctx?.actions}{actions}</>
    : null;

  return (
    <Wrapper className={className}>
      <Root>
        <Left>
          {icon && <IconWrap aria-hidden="true">{icon}</IconWrap>}
          <TextRow>
            {eyebrow && <Eyebrow>{eyebrow}</Eyebrow>}
            {eyebrow && <Sep aria-hidden="true" />}
            <Title>{title}</Title>
          </TextRow>
        </Left>
        {finalActions && <Actions>{finalActions}</Actions>}
      </Root>
      {subtitle && <Subtitle>{subtitle}</Subtitle>}
    </Wrapper>
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
