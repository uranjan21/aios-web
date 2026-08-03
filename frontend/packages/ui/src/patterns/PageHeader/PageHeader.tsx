import { createContext, useCallback, useContext, useEffect, useId, useMemo, useState, Fragment } from 'react';
import type { ReactNode } from 'react';
import styled from 'styled-components';
import { textRole, truncate } from '../../theme/mixins';

export interface PageHeaderProps {
  /** Small uppercase label stacked above the title (e.g. "Wellness"). */
  eyebrow?: ReactNode;
  /** Decorative icon — rendered inside a tinted chip, normalised to 20px. */
  icon?: ReactNode;
  /** Page title (h1). */
  title: ReactNode;
  /** Meta line under the title — counts, status, "last updated". One line. */
  subtitle?: ReactNode;
  /** Right-aligned slot — typically action buttons. */
  actions?: ReactNode;
  /**
   * Colour the icon chip carries. Defaults to the accent. Pass an area's
   * identity colour to keep the header recognisable per domain.
   */
  tone?: string;
  className?: string;
}

/*
 * A solid card, 2026-08-03.
 *
 * It was a bare typographic block that the shared `PageContent` wrapper then
 * dressed in glass plus a domain-tinted radial wash. Two owners for one
 * surface, and the glass put a compositing layer over the page's own ambient
 * mesh to show a title. The surface lives here now, in the component the app
 * actually calls: card background, hairline border, one elevation step, and
 * `radii.md` — the same corner as `Card`, `KpiCard` and every module tile, so
 * the header reads as the first card on the page rather than a different
 * material. The domain colour survives as the icon chip's tint (`tone`), which
 * is the whole of the identity the wash was carrying.
 *
 * The three text lines share one left edge and the subtitle is a meta line
 * *under* the title — visible at every width, unlike the old one, which was
 * `display: none` below `sm` to free a grid row for the actions. The actions
 * take their own row there instead; the meta line is the header's content, not
 * decoration to drop first.
 */
const Root = styled.header`
  display: grid;
  grid-template-columns: auto minmax(0, 1fr) auto;
  align-items: center;
  column-gap: ${({ theme }) => theme.spacing[3.5]};
  row-gap: ${({ theme }) => theme.spacing[3]};

  background: ${({ theme }) => theme.color.card};
  border: ${({ theme }) => theme.border.hairline} solid ${({ theme }) => theme.color.border};
  border-radius: ${({ theme }) => theme.radii.md};
  box-shadow: ${({ theme }) => theme.elevation[1]};
  padding: ${({ theme }) => `${theme.spacing[4]}`};

  @media ${({ theme }) => theme.media.sm} {
    padding: ${({ theme }) => `${theme.spacing[5]} ${theme.spacing[6]}`};
  }

  /* Below sm the actions take their own row — see Actions. */
  @media ${({ theme }) => theme.media.belowSm} {
    grid-template-columns: auto minmax(0, 1fr);
  }
`;

const IconWrap = styled.div<{ $tone?: string }>`
  grid-column: 1;
  grid-row: 1;
  flex-shrink: 0;
  width: 40px;
  height: 40px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: ${({ theme }) => theme.radii.sm};
  background: ${({ theme, $tone }) =>
    `color-mix(in oklab, ${$tone ?? theme.color.accent} 14%, ${theme.color.card})`};
  color: ${({ theme, $tone }) => $tone ?? theme.color.accent};

  & svg {
    width: 20px;
    height: 20px;
  }

  @media ${({ theme }) => theme.media.belowSm} {
    width: 36px;
    height: 36px;

    & svg {
      width: 18px;
      height: 18px;
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

/* The meta line: "24 Projects · 8 Active · Last updated 2h ago". One line,
   aligned to the title's left edge, truncating rather than wrapping — a header
   that grows a second text row pushes the page's real content down. */
const Subtitle = styled.p`
  ${textRole('body-s')}
  color: ${({ theme }) => theme.color.mutedForeground};
  margin: ${({ theme }) => `${theme.spacing[0.5]} 0 0`};
  ${truncate}
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

export function PageHeader({
  eyebrow,
  icon,
  title,
  subtitle,
  actions,
  tone,
  className,
}: PageHeaderProps) {
  const portalled = usePageHeaderActions();
  const finalActions = portalled || actions ? <>{portalled}{actions}</> : null;

  return (
    <Root className={className}>
      {icon && <IconWrap $tone={tone} aria-hidden="true">{icon}</IconWrap>}
      <Titles>
        {eyebrow && <Eyebrow>{eyebrow}</Eyebrow>}
        <Title>{title}</Title>
        {subtitle && <Subtitle>{subtitle}</Subtitle>}
      </Titles>
      {finalActions && <Actions>{finalActions}</Actions>}
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
