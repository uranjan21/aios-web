import { createContext, useCallback, useContext, useEffect, useId, useMemo, useState, Fragment } from 'react';
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

  /* Below sm the actions take their own row — see Actions. */
  @media ${({ theme }) => theme.media.belowSm} {
    grid-template-columns: auto minmax(0, 1fr);
  }
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

/*
 * Actions share the title's row on desktop. Below `sm` they take row 2 instead.
 *
 * They used to stay on row 1 at every width, on the reasoning that a second row
 * costs ~44px of vertical on every mobile page view and the title column is
 * `minmax(0, 1fr)` so it merely ellipsises. That held while the header was on
 * every page carrying one small button. It stopped holding on 2026-08-02, when
 * the header became the home for page-scoped controls: a Select plus a button
 * at 375px left the title rendering as "Pro…", and a page whose title is three
 * characters is not worth the 44px it saved.
 *
 * Row 2 is free below `sm` — the subtitle that also claims it is `display: none`
 * at that width.
 */
const Actions = styled.div`
  grid-column: 3;
  grid-row: 1;
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing[2]};
  flex-shrink: 0;
  justify-self: end;

  @media ${({ theme }) => theme.media.belowSm} {
    grid-column: 1 / -1;
    grid-row: 2;
    justify-self: start;
    flex-wrap: wrap;
  }
`;

/* Aligned to the title's left edge, not the icon's — the three text lines read
   as one block. Hidden below sm to protect vertical space on mobile, which is
   also what frees row 2 for the actions at that width (see Actions). */
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
  const portalled = usePageHeaderActions();
  const finalActions = portalled || actions ? <>{portalled}{actions}</> : null;

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

interface Slot {
  id: string;
  node: ReactNode;
}

interface PageHeaderActionsContextValue {
  slots: Slot[];
  setSlot: (id: string, node: ReactNode | null) => void;
}

const PageHeaderActionsContext = createContext<PageHeaderActionsContextValue | null>(null);

/*
 * A registry, not one slot (2026-08-02, later).
 *
 * It held a single `actions` node, so two portals mounted at once fought over
 * it: the second `setActions` overwrote the first, and whichever unmounted
 * first nulled BOTH. That is the normal case now — an area page portals its
 * Settings link while the section rendered inside it portals its own month
 * navigator or filter — so slots are keyed and rendered together.
 *
 * Order is registration order, and React runs child effects before parent
 * effects, so a section's controls land to the LEFT of the page's own. That is
 * the order you want: specific first, page-wide (Settings) last.
 */
export function PageHeaderProvider({ children }: { children: ReactNode }) {
  const [slots, setSlots] = useState<Slot[]>([]);

  const setSlot = useCallback((id: string, node: ReactNode | null) => {
    setSlots((prev) => {
      if (node === null) return prev.filter((s) => s.id !== id);
      const i = prev.findIndex((s) => s.id === id);
      if (i === -1) return [...prev, { id, node }];
      const next = [...prev];
      next[i] = { id, node };
      return next;
    });
  }, []);

  const value = useMemo(() => ({ slots, setSlot }), [slots, setSlot]);

  return (
    <PageHeaderActionsContext.Provider value={value}>
      {children}
    </PageHeaderActionsContext.Provider>
  );
}

export function HeaderActionPortal({ children }: { children: ReactNode }) {
  const ctx = useContext(PageHeaderActionsContext);
  const id = useId();
  const setSlot = ctx?.setSlot;

  useEffect(() => {
    if (!setSlot) return;
    setSlot(id, children);
    return () => setSlot(id, null);
  }, [children, id, setSlot]);

  return null;
}

/**
 * Everything the current page and its section have portalled up, in
 * registration order — or `null` when there is nothing, which is what tells a
 * caller not to render a header at all.
 *
 * Consumed by `PageContent` in `@ct/shared`, which renders the header inside
 * the page's own content column. It briefly fed the global TopBar instead
 * (2026-08-02); that put one page's controls in permanent app chrome and was
 * reverted the same day.
 */
export function usePageHeaderActions(): ReactNode | null {
  const slots = useContext(PageHeaderActionsContext)?.slots;
  if (!slots?.length) return null;
  return <>{slots.map((s) => <Fragment key={s.id}>{s.node}</Fragment>)}</>;
}
