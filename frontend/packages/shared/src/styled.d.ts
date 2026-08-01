import 'styled-components';
import type { Theme } from '@ledgr/ui';
import type { DomainKey } from '@ct/shared/theme/ctTheme';

/**
 * Control Tower-local theme augmentation. Deliberately declared here and not in
 * @ledgr/ui's own styled.d.ts — the library is shared with Ledgr, and domain
 * identity colours are a Control Tower concept, not part of the library contract.
 *
 * The `hud` block that used to live here was removed on 2026-07-21: it
 * declared 13 tokens and 12 CSS variables that no component ever read. Its
 * genuinely useful parts (glass, accent gradient, focus ring, hairline) are
 * now first-class on the Theme itself, built from the palette.
 */
declare module 'styled-components' {
  export interface DefaultTheme extends Theme {
    /** Domain identity colours for the active mode. */
    domain: Record<DomainKey, string>;
    /**
     * Domain colours for an always-dark surface, regardless of mode — the
     * login/marketing page only. In-app chrome follows the mode as of
     * 2026-08-01, so use `domain` there. `chrome` itself now comes from
     * @ledgr/ui's Theme (mode-following, full set), not from here.
     */
    chromeDomain: Record<DomainKey, string>;
  }
}
