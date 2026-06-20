/**
 * Module augmentation so `props.theme.color.primary` etc.
 * is typed in every styled-component across this package and any consumer.
 */
import 'styled-components';
import type { Theme } from './theme';

declare module 'styled-components' {
  // eslint-disable-next-line @typescript-eslint/no-empty-object-type
  export interface DefaultTheme extends Theme {}
}
