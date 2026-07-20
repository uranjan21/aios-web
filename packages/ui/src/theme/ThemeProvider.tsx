import type { ReactNode } from 'react';
import { ThemeProvider as StyledThemeProvider } from 'styled-components';
import { GlobalStyles } from './GlobalStyles';
import { lightTheme } from './theme';
import type { Theme } from './theme';

export interface ThemeProviderProps {
  /** The theme to apply. Defaults to lightTheme. */
  theme?: Theme;
  /** Inject global styles + CSS reset. Defaults to true. Disable if your app provides its own reset. */
  globalStyles?: boolean;
  children: ReactNode;
}

/**
 * Wraps styled-components ThemeProvider, injects GlobalStyles, and provides
 * the semantic theme to every component in this package.
 *
 * @example
 * ```tsx
 * import { ThemeProvider, lightTheme } from '@ledgr/ui';
 * <ThemeProvider theme={lightTheme}>
 *   <App />
 * </ThemeProvider>
 * ```
 */
export function ThemeProvider({
  theme = lightTheme,
  globalStyles = true,
  children,
}: ThemeProviderProps) {
  return (
    <StyledThemeProvider theme={theme}>
      {globalStyles && <GlobalStyles />}
      {children}
    </StyledThemeProvider>
  );
}
