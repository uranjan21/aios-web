import { createContext, useContext, useState, useEffect } from 'react';
import type { ReactNode } from 'react';
import styled from 'styled-components';
import { textRole, truncate } from '../../theme/mixins';

export interface PageHeaderProps {
  /** Small uppercase label stacked above the title (e.g. "Wellness"). */
  eyebrow?: ReactNode;
  /** Decorative icon — rendered inside an accent chip, normalised to 20px. */
  icon?: ReactNode;
  /** Page title (h1). */
  title: ReactNode;
  /** Optional subtitle — sits under the title, aligned to the same text column. */
  subtitle?: ReactNode;
  /** Right-aligned slot — typically action buttons. */
  actions?: ReactNode;
  className?: string;
}

/*
 * The header used to be a full-bleed glass capsule holding a 13px title: the
 * heaviest surface on the page wrapped around its lightest text, with ~85% of
 * the bar left empty on a desktop viewport, and the subtitle stranded outside
 * it at a different left inset. It also blurred a backdrop that is flat page
 * background — a compositing layer bought nothing.
 *
 * It is a typographic block now. Hierarchy comes from the type scale, the
 * accent chip carries the domain identity, and the three text lines share one
 * left edge. No rule underneath: `PageDivider` owns that decision per the
 * workspace-vs-area convention.
 */
const Root = styled.header`
  display: grid;
  grid-template-columns: auto minmax(0, 1fr) auto;
  align-items: center;
  column-gap: ${({ theme }) => theme.spacing[3.5]};
  row-gap: ${({ theme }) => theme.spacing[2]};
`;

const IconWrap = styled.div`
  grid-column: 1;
  grid-row: 1;
  flex-shrink: 0;
  width: 40px;
  height: 40px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: ${({ theme }) => theme.radii.md};
  background: ${({ theme }) =>
    `color-mix(in oklab, ${theme.color.accent} 14%, ${theme.color.background})`};
  color: ${({ theme }) => theme.color.accent};

  & svg {
    width: 20px;
    height: 20px;
  }

  @media ${({ theme }) => theme.media.belowSm} {
    width: 34px;
    height: 34px;

    & svg {
      width: 17px;
      height: 17px;
    }
  }
`;

const Titles = styled.div`
  grid-column: 2;
  grid-row: 1;
  min-width: 0;
`;

const Eyebrow = styled.span`
  display: block;
  ${textRole('micro')}
  text-transform: uppercase;
  color: ${({ theme }) => theme.color.mutedForeground};
  ${truncate}
`;

const Title = styled.h1`
  font-family: ${({ theme }) => theme.typography.fontFamily.sans};
  ${textRole('title-m')}
  color: ${({ theme }) => theme.color.foreground};
  margin: 0;
  ${truncate}

  @media ${({ theme }) => theme.media.sm} {
    ${textRole('title-l')}
  }
`;

const Actions = styled.div`
  grid-column: 3;
  grid-row: 1;
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing[2]};
  flex-shrink: 0;
  justify-self: end;
`;

/* Aligned to the title's left edge, not the icon's — the three text lines read
   as one block. Hidden below sm to protect vertical space on mobile.
   Actions stay on row 1 at every width: dropping them to their own row costs
   ~44px of vertical on every mobile page view, and the title column is
   `minmax(0, 1fr)` so it ellipsises rather than overflowing. */
const Subtitle = styled.p`
  grid-column: 2 / -1;
  grid-row: 2;
  ${textRole('body-s')}
  color: ${({ theme }) => theme.color.mutedForeground};
  margin: 0;
  max-width: 68ch;

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
    <Root className={className}>
      {icon && <IconWrap aria-hidden="true">{icon}</IconWrap>}
      <Titles>
        {eyebrow && <Eyebrow>{eyebrow}</Eyebrow>}
        <Title>{title}</Title>
      </Titles>
      {finalActions && <Actions>{finalActions}</Actions>}
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
