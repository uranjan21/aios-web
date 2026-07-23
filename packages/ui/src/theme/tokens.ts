/**
 * Design tokens — THE authoritative layer.
 *
 * Until 2026-07-21 this file was mostly dead: it declared a palette, radii,
 * shadows and font families that `buildTheme()` in
 * `packages/shared/src/theme/ctTheme.ts` overwrote wholesale at runtime. The
 * live radii scale collapsed `lg`, `xl` and `2xl` to a single 10px, `mono`
 * resolved to a proportional font, and `shadow.ring` was a hardcoded blue that
 * never matched the gold focus colour it was supposed to express.
 *
 * That indirection is gone. `ctTheme.ts` now only swaps the active palette
 * and light/dark mode; every scale below is what actually renders.
 *
 * Direction is "Expressive" — layered depth, gradients, glass and spring
 * motion. See the `feedback-expressive-design-system` memory for what that
 * supersedes and what stays binding (no pills, no serif body text, no
 * monospace display face).
 */

/* ── Typography ──────────────────────────────────────────────────────────
 *
 * Named roles, not raw sizes. The old scale was ignored by 88% of the app
 * (55 token usages against 453 hardcoded `font-size:Npx` across 23 distinct
 * values), and its most common size — 11px — was not even in the scale.
 *
 * Body baseline moves 13–14px -> 16px. There is no `mono` family: the old one
 * was `"DM Sans", monospace`, a proportional font wearing a mono name. Use
 * `numeric` below for figure alignment instead.
 * ------------------------------------------------------------------- */

export const typography = {
  fontFamily: {
    sans: "'DM Sans', system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif",
    /** Display only — hero numerals and the wordmark. Never body or UI text. */
    display: "'Playfair Display', Georgia, serif",
  },

  /** Tabular figures for any aligned number. Replaces the removed mono face. */
  numeric: "font-variant-numeric: tabular-nums; font-feature-settings: 'tnum' 1;",

  /**
   * Text roles: [font-size, line-height, letter-spacing, weight].
   * Consume via the `textRole` helper in `mixins.ts` so all four land together.
   */
  role: {
    'display-xl': { size: '56px', line: '60px', tracking: '-0.03em', weight: 600 },
    'display-l':  { size: '40px', line: '44px', tracking: '-0.025em', weight: 600 },
    'display-m':  { size: '32px', line: '36px', tracking: '-0.02em', weight: 600 },
    'title-l':    { size: '24px', line: '30px', tracking: '-0.015em', weight: 600 },
    'title-m':    { size: '20px', line: '26px', tracking: '-0.01em', weight: 600 },
    'title-s':    { size: '17px', line: '24px', tracking: '-0.01em', weight: 600 },
    'body-l':     { size: '16px', line: '26px', tracking: '0', weight: 400 },
    'body-m':     { size: '15px', line: '24px', tracking: '0', weight: 400 },
    'body-s':     { size: '13px', line: '20px', tracking: '0', weight: 400 },
    'label':      { size: '13px', line: '16px', tracking: '0.01em', weight: 500 },
    'micro':      { size: '11px', line: '14px', tracking: '0.06em', weight: 600 },
  },

  fontSize: {
    xs: '11px',
    sm: '13px',
    base: '15px',
    md: '16px',
    lg: '17px',
    xl: '20px',
    '2xl': '24px',
    '3xl': '32px',
    '4xl': '40px',
    '5xl': '56px',
  },
  fontWeight: {
    regular: 400,
    medium: 500,
    semibold: 600,
    bold: 700,
  },
  lineHeight: {
    tight: 1.15,
    snug: 1.3,
    normal: 1.5,
    relaxed: 1.7,
  },
  letterSpacing: {
    tighter: '-0.03em',
    tight: '-0.015em',
    normal: '0',
    wide: '0.04em',
    wider: '0.08em',
  },
} as const;

/* ── Space (4pt grid) ────────────────────────────────────────────────────
 * Component-internal spacing. App-level structural spacing lives on the 12pt
 * scale in `packages/shared/src/theme/layout.ts` — never conflate the two.
 * ------------------------------------------------------------------- */

export const spacing = {
  0: '0',
  /*
   * Half-steps. Added 2026-07-21 after auditing actual usage: 2px, 6px, 10px
   * and 14px account for 245 declarations across the app, overwhelmingly icon
   * gaps and tight insets inside controls. Rounding them onto the whole steps
   * would have changed density everywhere for no design reason, so the grid
   * gains the half-steps it was already being used at.
   */
  0.5: '2px',
  1: '4px',
  1.5: '6px',
  2: '8px',
  2.5: '10px',
  3: '12px',
  3.5: '14px',
  4: '16px',
  4.5: '18px',
  5: '20px',
  6: '24px',
  7: '28px',
  8: '32px',
  10: '40px',
  12: '48px',
  16: '64px',
  20: '80px',
  24: '96px',
} as const;

/* ── Radii ───────────────────────────────────────────────────────────────
 * A real scale. The previous live values were xs 6 / sm 8 / md 10 / lg 10 /
 * xl 10 / 2xl 10 — three distinct corners pretending to be six, so asking for
 * `radii.xl` silently gave you `radii.md`.
 *
 * `full` is for TRUE CIRCLES ONLY (avatars, status dots, Switch thumb). Pills
 * are banned — see the feedback-ui-radius-and-toggle-style memory.
 * ------------------------------------------------------------------- */

export const radii = {
  none: '0',
  xs: '6px',
  sm: '10px',
  md: '14px',
  lg: '20px',
  xl: '28px',
  '2xl': '36px',
  full: '9999px',
} as const;

/* ── Elevation ───────────────────────────────────────────────────────────
 * Six steps, replacing the old flat set. Each is a composite: ambient + key
 * shadow, plus (dark mode only) a 1px top hairline, because on a near-black
 * ground a drop shadow alone is invisible. That hairline is the single
 * documented exception to the no-white-shadows rule.
 * ------------------------------------------------------------------- */

const HAIRLINE = 'inset 0 1px 0 rgba(255,255,255,0.06)';

export const elevationLight = {
  0: 'none',
  1: '0 1px 2px rgba(12,10,9,0.06), 0 1px 1px rgba(12,10,9,0.04)',
  2: '0 4px 12px -2px rgba(12,10,9,0.08), 0 2px 4px -1px rgba(12,10,9,0.05)',
  3: '0 12px 28px -6px rgba(12,10,9,0.11), 0 4px 10px -3px rgba(12,10,9,0.06)',
  4: '0 28px 60px -12px rgba(12,10,9,0.16), 0 10px 20px -8px rgba(12,10,9,0.08)',
  5: '0 48px 100px -20px rgba(12,10,9,0.22), 0 18px 36px -12px rgba(12,10,9,0.10)',
} as const;

export const elevationDark = {
  0: 'none',
  1: `0 1px 2px rgba(0,0,0,0.40), ${HAIRLINE}`,
  2: `0 4px 12px -2px rgba(0,0,0,0.50), ${HAIRLINE}`,
  3: `0 12px 28px -6px rgba(0,0,0,0.58), ${HAIRLINE}`,
  4: `0 28px 60px -12px rgba(0,0,0,0.66), ${HAIRLINE}`,
  5: `0 48px 100px -20px rgba(0,0,0,0.74), ${HAIRLINE}`,
} as const;

/* ── Borders ─────────────────────────────────────────────────────────── */

export const border = {
  hairline: '1px',
  normal: '1px',
  thick: '2px',
  focus: '2px',
} as const;

/* ── Motion ──────────────────────────────────────────────────────────────
 * Springs are framer-motion transition configs. Consume them through the
 * `useMotion()` hook in `@ct/shared/hooks/useMotion`, never directly —
 * the hook is what honours `prefers-reduced-motion`. The global CSS rule in
 * GlobalStyles cannot reach JS-driven animation.
 * ------------------------------------------------------------------- */

export const motion = {
  duration: {
    instant: '0ms',
    fast: '120ms',
    normal: '200ms',
    slow: '320ms',
    slower: '480ms',
  },
  easing: {
    standard: 'cubic-bezier(0.2, 0, 0, 1)',
    enter: 'cubic-bezier(0, 0, 0.2, 1)',
    exit: 'cubic-bezier(0.4, 0, 1, 1)',
    emphasis: 'cubic-bezier(0.2, 0, 0, 1.4)',
    /** Long, soft settle — for large surfaces entering. */
    expressive: 'cubic-bezier(0.16, 1, 0.3, 1)',
  },
  spring: {
    snappy: { type: 'spring', stiffness: 420, damping: 32, mass: 0.8 },
    smooth: { type: 'spring', stiffness: 260, damping: 30, mass: 1 },
    gentle: { type: 'spring', stiffness: 180, damping: 26, mass: 1 },
  },
  /** Delay between siblings in a staggered entrance. */
  stagger: 0.04,
} as const;

/* ── Z-index ─────────────────────────────────────────────────────────── */

export const zIndex = {
  hide: -1,
  base: 0,
  raised: 10,
  dropdown: 100,
  sticky: 200,
  drawer: 900,
  overlay: 1000,
  modal: 1100,
  popover: 1200,
  toast: 1300,
  tooltip: 1400,
} as const;

/* ── Breakpoints (mobile-first) ──────────────────────────────────────────
 * The audit found 24 distinct ad-hoc breakpoint values across 140 media
 * queries, with only 9% using a token — and an off-by-one at exactly 768px
 * where the bottom nav hid while the content area still reserved its height.
 * These five are the only permitted values.
 * ------------------------------------------------------------------- */

export const breakpoint = {
  xs: '480px',
  sm: '640px',
  md: '768px',
  lg: '1024px',
  xl: '1280px',
} as const;

/** `@media ${media.md} { ... }` — the only correct way to write a query. */
export const media = {
  xs: `(min-width: ${breakpoint.xs})`,
  sm: `(min-width: ${breakpoint.sm})`,
  md: `(min-width: ${breakpoint.md})`,
  lg: `(min-width: ${breakpoint.lg})`,
  xl: `(min-width: ${breakpoint.xl})`,
  /** Below a breakpoint. Uses 0.02px to avoid the exact-boundary double-match. */
  belowXs: `(max-width: ${parseInt(breakpoint.xs) - 0.02}px)`,
  belowSm: `(max-width: ${parseInt(breakpoint.sm) - 0.02}px)`,
  belowMd: `(max-width: ${parseInt(breakpoint.md) - 0.02}px)`,
  belowLg: `(max-width: ${parseInt(breakpoint.lg) - 0.02}px)`,
  touch: '(hover: none) and (pointer: coarse)',
  reducedMotion: '(prefers-reduced-motion: reduce)',
} as const;

/* ── Blur (glass layers) ─────────────────────────────────────────────── */

export const blur = {
  thin: '12px',
  regular: '24px',
  thick: '40px',
} as const;

export const tokens = {
  typography,
  spacing,
  radii,
  elevationLight,
  elevationDark,
  border,
  motion,
  zIndex,
  breakpoint,
  media,
  blur,
} as const;

export type Tokens = typeof tokens;
export type TextRole = keyof typeof typography.role;
export type ElevationLevel = keyof typeof elevationLight;
