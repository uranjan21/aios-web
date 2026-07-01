import 'styled-components';
import type { Theme } from '@ledgr/ui';

declare module 'styled-components' {
  export interface DefaultTheme extends Theme {
    /** Always-dark sidebar chrome colors, sourced from the active palette's dark set. */
    chrome: { bg: string; border: string; fg: string };
  }
}
