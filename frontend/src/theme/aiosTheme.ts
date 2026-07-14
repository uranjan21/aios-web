/**
 * AIOS theme builder — flat shadows (no claymorphism), shared radii/typography,
 * color set swapped per palette (see palettes.ts). `getTheme(paletteId, mode)`
 * is the single entry point; ThemeProvider calls it whenever palette or
 * light/dark mode changes.
 */
import { darkTheme, lightTheme } from "@ledgr/ui";
import { getPalette, type PaletteColors } from "./palettes";
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyTheme = any;

/** Override shadow tokens — flat/clean, no clay inset */
const flatShadowLight = {
  none: "none",
  xs: "0 1px 2px rgba(14,23,38,0.05)",
  sm: "0 2px 6px rgba(14,23,38,0.07), 0 1px 2px rgba(14,23,38,0.04)",
  md: "0 4px 12px rgba(14,23,38,0.09), 0 2px 4px rgba(14,23,38,0.05)",
  lg: "0 12px 24px rgba(14,23,38,0.11), 0 4px 8px rgba(14,23,38,0.06)",
  xl: "0 20px 40px rgba(14,23,38,0.14), 0 8px 16px rgba(14,23,38,0.08)",
  ring: "0 0 0 3px rgba(30,80,208,0.18)",
  // Map clay → flat so no component edits needed
  clay: "0 2px 8px rgba(14,23,38,0.08), 0 1px 3px rgba(14,23,38,0.05)",
  clayActive: "0 1px 4px rgba(14,23,38,0.06)",
  claySunken:
    "inset 0 1px 3px rgba(14,23,38,0.08), inset 0 1px 1px rgba(14,23,38,0.04)",
} as const;

const flatShadowDark = {
  ...flatShadowLight,
  xs: "0 1px 2px rgba(0,0,0,0.35)",
  sm: "0 2px 6px rgba(0,0,0,0.45), 0 1px 2px rgba(0,0,0,0.35)",
  md: "0 4px 12px rgba(0,0,0,0.55), 0 2px 4px rgba(0,0,0,0.40)",
  lg: "0 12px 24px rgba(0,0,0,0.60), 0 4px 8px rgba(0,0,0,0.45)",
  xl: "0 20px 40px rgba(0,0,0,0.65), 0 8px 16px rgba(0,0,0,0.50)",
  ring: "0 0 0 3px rgba(77,130,255,0.25)",
  clay: "0 2px 8px rgba(0,0,0,0.50), 0 1px 3px rgba(0,0,0,0.40)",
  clayActive: "0 1px 4px rgba(0,0,0,0.40)",
  claySunken: "inset 0 1px 3px rgba(0,0,0,0.45)",
} as const;


const sharedRadii = {
  xs: "6px",
  sm: "8px",
  md: "10px",
  lg: "10px",
  xl: "10px",
  "2xl": "10px",
  full: "9999px",
} as const;

const sharedFontFamily = {
  sans: '"DM Sans", sans-serif',
  serif: '"Playfair Display", serif',
  mono: '"DM Sans", monospace',
} as const;

function buildTheme(base: AnyTheme, colors: PaletteColors, chrome: PaletteColors, mode: 'light' | 'dark'): AnyTheme {
  return {
    ...base,
    shadow: mode === 'dark' ? flatShadowDark : flatShadowLight,
    radii: sharedRadii,
    typography: { ...base.typography, fontFamily: sharedFontFamily },
    color: colors,
    // Sidebar chrome is intentionally always-dark regardless of light/dark mode
    // (see Sidebar.tsx) — sourced from the palette's dark colors so it still
    // repaints with the selected palette instead of a hardcoded black+gold.
    chrome: {
      bg: chrome.card,
      border: chrome.muted,
      fg: chrome.foreground,
    },
  };
}

/** Build the full theme object for a given palette id + light/dark mode. */
export function getTheme(paletteId: string, mode: 'light' | 'dark'): AnyTheme {
  const palette = getPalette(paletteId);
  const base = mode === 'dark' ? darkTheme : lightTheme;
  return buildTheme(base, mode === 'dark' ? palette.dark : palette.light, palette.dark, mode);
}

// Back-compat named exports (default "monochrome" palette) for any stray imports.
export const aiosLightTheme: AnyTheme = getTheme('monochrome', 'light');
export const aiosDarkTheme: AnyTheme = getTheme('monochrome', 'dark');
