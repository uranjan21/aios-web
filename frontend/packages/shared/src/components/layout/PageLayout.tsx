import { createContext, useContext, type ReactNode } from "react";
import styled, { useTheme } from "styled-components";
import { PageHeader, usePageHeaderActions } from "@ledgr/ui";
import { PAGE_MAX_WIDTH, PAGE_PADDING } from "@ct/shared/theme/layout";
import type { DomainKey } from "@ct/shared/theme/ctTheme";

/**
 * Page shell.
 *
 * The ambient mesh is the Expressive direction's one page-level gesture: two
 * accent-tinted radial gradients pinned to the top of the page, fading out
 * before the content region. It paints on a `::before` pseudo-element so it
 * composites once and never sits behind scrolling data — per the direction's
 * own rule, ambient gradient is chrome, not a backdrop for dense content.
 *
 * `background-attachment: fixed` is deliberately avoided: it forces a repaint
 * every scroll frame, which is exactly the cost a data-heavy dashboard cannot
 * afford.
 */
/*
 * A `div`, not a `main`. AppShell already renders the single `main` landmark
 * (`#main-content`, the skip-link target); nesting a second one inside it put
 * two `main` elements in the document, which is invalid and leaves assistive
 * technology with two competing "main content" regions.
 */
export const PageContainer = styled.div`
  position: relative;
  min-height: 100vh;
  width: 100%;
  background: ${({ theme }) => theme.color.background};
  isolation: isolate;

  &::before {
    content: '';
    position: absolute;
    inset: 0 0 auto 0;
    height: 520px;
    background:
      ${({ theme }) => theme.gradient.meshA},
      ${({ theme }) => theme.gradient.meshB};
    pointer-events: none;
    z-index: -1;
  }

  padding: ${PAGE_PADDING.mobile};

  @media ${({ theme }) => theme.media.md} {
    padding: ${PAGE_PADDING.tablet};
  }

  @media ${({ theme }) => theme.media.xl} {
    padding: ${PAGE_PADDING.desktop};
  }
`;

const ContentColumn = styled.div`
  width: 100%;
  max-width: ${PAGE_MAX_WIDTH};
  margin: 0 auto;

  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.spacing[6]};
`;

/**
 * Who the current page is, published by the shell (which owns the nav tree) and
 * read here. Pages live in domain packages that cannot import the shell's
 * `navigation.ts`, so the alternative was a hand-written section→label map in
 * every area page — a second nav list, which is the exact drift the single
 * source of truth exists to prevent.
 */
interface PageIdentity {
  title: string;
  /**
   * The meta line under the title. Today that is the area the destination sits
   * in ("Finance" under "Loans"); it used to render as an uppercase eyebrow
   * ABOVE the title and moved below it on 2026-08-03 with the header redesign.
   */
  subtitle?: string;
  /** The destination's own nav icon, already rendered. */
  icon?: ReactNode;
  /** Area identity colour key, resolved against `theme.domain` here. */
  domain?: DomainKey;
}

const PageIdentityContext = createContext<PageIdentity | null>(null);

export function PageIdentityProvider({
  value,
  children,
}: {
  value: PageIdentity | null;
  children: ReactNode;
}) {
  return <PageIdentityContext.Provider value={value}>{children}</PageIdentityContext.Provider>;
}

/**
 * The page's own header block, 2026-08-02 (later).
 *
 * Page-scoped controls — a per-area Settings link, the workspace domain filter,
 * Career's "Log entry" — used to be portalled into the global TopBar, which put
 * one page's controls into the app's permanent chrome. They render here instead:
 * a titled header at the top of the page's own content column.
 *
 * It appears ONLY when a page has portalled something. A page with no
 * page-scoped control keeps the redesign canvas's clean start — content under
 * the breadcrumbs, no title block — and card-scoped controls still belong in
 * their card's header, not up here.
 */
export function PageContent({ children, className }: { children: ReactNode; className?: string }) {
  const actions = usePageHeaderActions();
  const identity = useContext(PageIdentityContext);
  const theme = useTheme();

  return (
    <ContentColumn className={className}>
      {actions && identity && (
        <PageHeader
          icon={identity.icon}
          title={identity.title}
          subtitle={identity.subtitle}
          tone={theme.domain[identity.domain ?? 'general']}
        />
      )}
      {children}
    </ContentColumn>
  );
}
