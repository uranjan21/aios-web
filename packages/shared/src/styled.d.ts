import 'styled-components';
import type { Theme } from '@ledgr/ui';
import type { DomainKey } from '@aios/shared/theme/aiosTheme';

/**
 * AIOS-local theme augmentation. Deliberately declared here and not in
 * ledgr-ui's own styled.d.ts — @ledgr/ui is shared with Ledgr, and these
 * tokens are AIOS's HUD language, not part of the library contract.
 */
declare module 'styled-components' {
  export interface DefaultTheme extends Theme {
    /** Active light/dark mode, so components can branch without reading uiStore. */
    mode: 'light' | 'dark';

    /** Always-dark sidebar chrome colors, sourced from the active palette's dark set. */
    chrome: { bg: string; border: string; fg: string };

    /** HUD chrome — derived per palette+mode in aiosTheme.buildHud(). */
    hud: {
      hairline: string;
      hairlineV: string;
      cornerTick: string;
      nodeGlow: string;
      gridDot: string;
      gridPitch: string;
      glass: string;
      glassBorder: string;
      glassBlur: string;
      focusRing: string;
      accentGrad: string;
      accentGradFg: string;
      microLabel: {
        fontSize: string;
        fontWeight: number;
        letterSpacing: string;
        textTransform: 'uppercase';
      };
    };

    /** Domain identity colours for the active mode. */
    domain: Record<DomainKey, string>;
    /** Domain colours for the always-dark sidebar, regardless of mode. */
    chromeDomain: Record<DomainKey, string>;
  }
}
