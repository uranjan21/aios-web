import type { ReactNode } from 'react';
import { ThemeProvider as StyledThemeProvider } from 'styled-components';
import { GlobalStyles } from './GlobalStyles';
import { buildTheme } from './theme';
import type { Theme } from './theme';

export interface ThemeProviderProps {
  /** The theme to apply. Defaults to a neutral light theme. */
  theme?: Theme;
  /** Inject global styles + CSS reset. Defaults to true. */
  globalStyles?: boolean;
  children: ReactNode;
}

/**
 * Neutral fallback so the package is usable standalone. Applications supply
 * their own palette — aios-web builds one per palette+mode in
 * `@aios/shared/theme/aiosTheme`.
 */
const defaultTheme: Theme = buildTheme({
  name: 'default-light',
  mode: 'light',
  color: {
    background: '#FAFAF9', foreground: '#0C0A09',
    card: '#FFFFFF', cardForeground: '#0C0A09',
    popover: '#FFFFFF', popoverForeground: '#0C0A09',
    muted: '#F5F5F4', mutedForeground: '#57534E',
    primary: '#1C1917', primaryForeground: '#FAFAF9', primaryHover: '#292524',
    accent: '#CA8A04', accentForeground: '#FFFFFF',
    destructive: '#DC2626', destructiveForeground: '#FFFFFF',
    success: '#16A34A', successForeground: '#FFFFFF',
    warning: '#D97706', warningForeground: '#0C0A09',
    info: '#0284C7', infoForeground: '#FFFFFF',
    border: '#E7E5E4', input: '#E7E5E4', ring: '#CA8A04',
    overlay: 'rgba(12,10,9,0.45)',
  },
});

/**
 * Wraps styled-components ThemeProvider, injects GlobalStyles, and provides
 * the semantic theme to every component in this package.
 */
export function ThemeProvider({
  theme = defaultTheme,
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
