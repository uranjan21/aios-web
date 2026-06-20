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
    font-size: ${({ theme }) => theme.typography.fontSize.base};
    line-height: ${({ theme }) => theme.typography.lineHeight.normal};
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
    text-rendering: optimizeLegibility;
  }

  h1, h2, h3, h4, h5, h6 {
    margin: 0;
    font-family: ${({ theme }) => theme.typography.fontFamily.serif};
    font-weight: ${({ theme }) => theme.typography.fontWeight.semibold};
    line-height: ${({ theme }) => theme.typography.lineHeight.tight};
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
    outline: 2px solid ${({ theme }) => theme.color.ring};
    outline-offset: 2px;
  }

  /* Respect user motion preferences */
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
