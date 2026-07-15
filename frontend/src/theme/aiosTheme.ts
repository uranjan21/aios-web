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

/* ── HUD layer ──────────────────────────────────────────────────────────
 * The visual language proven on the login page, expressed as tokens.
 *
 * Everything here is DERIVED from the active palette's own accent rather
 * than hand-authored per palette. Consequence: all 6 palettes x 2 modes get
 * a coherent HUD for free, and a 7th palette needs no HUD work at all.
 *
 * Rule of thumb for consumers: these are *chrome*. Ambient/animated HUD
 * (the constellation) is a component, not a token, and never renders on a
 * surface that shows data.
 * ------------------------------------------------------------------- */

/** "#CA8A04" → "202, 138, 4". Falls back to the brand gold. */
function rgbChannels(hex: string): string {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim());
  if (!m) return "202, 138, 4";
  const n = parseInt(m[1], 16);
  return `${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}`;
}

/**
 * Domain identity colours — the single source of truth.
 *
 * Deliberately CONSTANT across palettes: a domain is an identity, like
 * success/destructive, not a decorative accent. Only light/dark varies.
 *
 * Values are the convention the app already used consistently across
 * DomainPulseCard, MonthlyCalendar, OverviewInsightCard and HabitsCard —
 * NOT the set from the login mockup, which had Finance and Business inverted
 * (decided 2026-07-15: the app wins, Finance stays gold for money=gold).
 *
 * Note the deliberate collision: `finance` IS the brand gold, which is also
 * the HUD's chrome colour. Anywhere a Finance node sits on gold chrome it
 * needs weight/brightness to separate it, not a different hue.
 *
 * Dark variants are lightened for contrast on a near-black ground.
 */
const domainLight = {
  finance: "#CA8A04",
  health: "#16A34A",
  career: "#0EA5E9",
  business: "#DC2626",
  content: "#A855F7",
  vault: "#0891B2",
  general: "#57534E",
} as const;

const domainDark = {
  finance: "#CA8A04",
  health: "#4ADE80",
  career: "#38BDF8",
  business: "#EF4444",
  content: "#C084FC",
  vault: "#06B6D4",
  general: "#A8A29E",
} as const;

export type DomainKey = keyof typeof domainLight;

function buildHud(colors: PaletteColors, mode: "light" | "dark") {
  const a = rgbChannels(colors.accent);
  const dark = mode === "dark";
  return {
    /** 1px rule that fades at both ends — section dividers, card top edges. */
    hairline: `linear-gradient(90deg, transparent, rgba(${a}, ${dark ? 0.3 : 0.24}), transparent)`,
    /** Vertical variant, for left-edge accents. */
    hairlineV: `linear-gradient(180deg, transparent, rgba(${a}, ${dark ? 0.3 : 0.24}), transparent)`,
    /** Corner L-brackets on Card variant="hud". */
    cornerTick: `rgba(${a}, ${dark ? 0.5 : 0.4})`,
    /** Halo behind a status/domain node dot. */
    nodeGlow: `0 0 8px rgba(${a}, ${dark ? 0.55 : 0.35})`,
    /** Dot-grid page texture — chrome only (sidebar, empty states, marketing). */
    gridDot: `rgba(${a}, ${dark ? 0.07 : 0.05})`,
    gridPitch: "28px",
    /** Translucent surfaces: Dialog, Sheet, Popover, Toast, palette. */
    glass: dark ? "rgba(14, 16, 14, 0.72)" : "rgba(255, 255, 255, 0.72)",
    glassBorder: dark ? "rgba(255, 255, 255, 0.09)" : "rgba(12, 10, 9, 0.08)",
    glassBlur: "blur(28px)",
    /** Focus treatment, lifted verbatim from the login inputs. */
    focusRing: `0 0 0 3px rgba(${a}, ${dark ? 0.16 : 0.14})`,
    /** The single primary action per view. Never two. */
    accentGrad: `linear-gradient(135deg, color-mix(in srgb, ${colors.accent} 78%, #FFFFFF) 0%, ${colors.accent} 100%)`,
    accentGradFg: dark ? "#100C02" : colors.accentForeground,
    /** Tracked uppercase micro-label (the login's EMAIL/PASSWORD scale). */
    microLabel: {
      fontSize: "10px",
      fontWeight: 700,
      letterSpacing: "0.12em",
      textTransform: "uppercase" as const,
    },
  };
}

function buildTheme(base: AnyTheme, colors: PaletteColors, chrome: PaletteColors, mode: 'light' | 'dark'): AnyTheme {
  return {
    ...base,
    /** Active mode, so components can branch without reading uiStore. */
    mode,
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
    hud: buildHud(colors, mode),
    domain: mode === 'dark' ? domainDark : domainLight,
    // The sidebar is always-dark, so anything domain-coloured inside it must
    // use the dark variants regardless of the active mode.
    chromeDomain: domainDark,
  };
}

/** Build the full theme object for a given palette id + light/dark mode. */
export function getTheme(paletteId: string, mode: 'light' | 'dark'): AnyTheme {
  const palette = getPalette(paletteId);
  const base = mode === 'dark' ? darkTheme : lightTheme;
  return buildTheme(base, mode === 'dark' ? palette.dark : palette.light, palette.dark, mode);
}

// Back-compat named export (default "monochrome" palette) for any stray imports.
// `aiosDarkTheme` was removed — it had zero importers; live theming goes through
// getTheme(palette, mode) via ThemeProvider, driven by uiStore.
export const aiosLightTheme: AnyTheme = getTheme('monochrome', 'light');
