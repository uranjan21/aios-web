import styled from "styled-components";
import { PAGE_MAX_WIDTH, PAGE_PADDING } from "@ct/shared/theme/layout";

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

export const PageContent = styled.div`
  width: 100%;
  max-width: ${PAGE_MAX_WIDTH};
  margin: 0 auto;

  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.spacing[6]};
`;
