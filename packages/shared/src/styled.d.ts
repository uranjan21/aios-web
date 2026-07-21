import 'styled-components';
import type { Theme } from '@ledgr/ui';
import type { DomainKey } from '@aios/shared/theme/aiosTheme';

/**
 * AIOS-local theme augmentation. Deliberately declared here and not in
 * @ledgr/ui's own styled.d.ts — the library is shared with Ledgr, and domain
 * identity colours are an AIOS concept, not part of the library contract.
 *
 * The `hud` block that used to live here was removed on 2026-07-21: it
 * declared 13 tokens and 12 CSS variables that no component ever read. Its
 * genuinely useful parts (glass, accent gradient, focus ring, hairline) are
 * now first-class on the Theme itself, built from the palette.
 */
declare module 'styled-components' {
  export interface DefaultTheme extends Theme {
    /** Always-dark sidebar chrome colours, from the active palette's dark set. */
    chrome: { bg: string; border: string; fg: string };

    /** Domain identity colours for the active mode. */
    domain: Record<DomainKey, string>;
    /** Domain colours for the always-dark sidebar, regardless of mode. */
    chromeDomain: Record<DomainKey, string>;
  }
}
