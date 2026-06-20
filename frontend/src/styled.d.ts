import 'styled-components';
import type { Theme } from '@ledgr/ui';

declare module 'styled-components' {
  export interface DefaultTheme extends Theme {}
}
