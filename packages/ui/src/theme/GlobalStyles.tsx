import { createGlobalStyle } from 'styled-components';

/**
 * Modern, minimal CSS reset + base typography + reduced-motion.
 * Inject once at the app root, inside the ThemeProvider.
 */
export const GlobalStyles = createGlobalStyle`
  *,
  *::before,
  *::after {
    box-sizing: border-box;
  }

  html, body {
    margin: 0;
    padding: 0;
    height: 100%;
  }

  body {
    background: ${({ theme }) => theme.color.background};
    color: ${({ theme }) => theme.color.foreground};
    font-family: ${({ theme }) => theme.typography.fontFamily.sans};
    font-size: ${({ theme }) => theme.typography.role['body-m'].size};
    line-height: ${({ theme }) => theme.typography.role['body-m'].line};
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
    text-rendering: optimizeLegibility;
  }

  /*
   * Headings inherit the sans body face. They previously defaulted to the
   * serif family here, which violated the AIOS "no serif in UI" rule and
   * forced an equal-specificity override in the app's ThemeProvider that only
   * won by stylesheet injection order. Opt into the display face explicitly
   * (hero numerals, wordmark) rather than opting out of it everywhere.
   */
  h1, h2, h3, h4, h5, h6 {
    margin: 0;
    font-family: inherit;
    font-weight: ${({ theme }) => theme.typography.fontWeight.semibold};
    line-height: ${({ theme }) => theme.typography.lineHeight.tight};
    letter-spacing: ${({ theme }) => theme.typography.letterSpacing.tight};
    color: inherit;
  }

  p { margin: 0; }
  ul, ol { margin: 0; padding: 0; list-style: none; }

  button {
    font: inherit;
    cursor: pointer;
    border: none;
    background: none;
    padding: 0;
    color: inherit;
  }

  a {
    color: inherit;
    text-decoration: none;
  }

  input, textarea, select {
    font: inherit;
    color: inherit;
  }

  img, svg, video {
    display: block;
    max-width: 100%;
  }

  /* Focus management — visible only for keyboard users */
  :focus { outline: none; }
  :focus-visible {
    outline: ${({ theme }) => theme.border.focus} solid ${({ theme }) => theme.color.ring};
    outline-offset: 2px;
  }

  /*
   * Respect user motion preferences. NOTE: this only reaches CSS animation and
   * transitions — framer-motion drives values in JS and is unaffected. Route
   * all JS animation through the useMotion() hook, which reads the same
   * preference and returns still variants.
   */
  @media (prefers-reduced-motion: reduce) {
    *,
    *::before,
    *::after {
      animation-duration: 0.01ms !important;
      animation-iteration-count: 1 !important;
      transition-duration: 0.01ms !important;
      scroll-behavior: auto !important;
    }
  }

  /* Selection */
  ::selection {
    background: ${({ theme }) => theme.color.primary};
    color: ${({ theme }) => theme.color.primaryForeground};
  }
`;
