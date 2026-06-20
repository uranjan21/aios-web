/**
 * Primitive design tokens — raw values.
 * Never consumed directly by components. Mapped into semantic theme below.
 *
 * To rebrand: change values here OR override the theme at the ThemeProvider.
 */

/* ── Palette ─────────────────────────────────────────────────────────── */

export const palette = {
  // Ledgr brand
  teal: {
    50:  '#e8f0ed',
    100: '#c7d9d0',
    200: '#a0bdaf',
    300: '#79a18e',
    400: '#5b8b76',
    500: '#3d7a5f',
    600: '#266a4f',
    700: '#114b3f', // brand primary
    800: '#0c372e',
    900: '#082720',
  },
  gold: {
    50:  '#fbf5e6',
    100: '#f4e5b9',
    200: '#ecd58a',
    300: '#e4c45c',
    400: '#dab73f',
    500: '#c8a449', // accent
    600: '#a8893a',
    700: '#7e6628',
    800: '#544216',
    900: '#2c2208',
  },
  cream: {
    50:  '#fbf9f3',
    100: '#f4f1e9', // background
    200: '#ebe6d6',
    300: '#dcd5be',
    400: '#c8c0a3',
  },
  neutral: {
    0:    '#ffffff',
    50:   '#fafafa',
    100:  '#f4f4f5',
    200:  '#e4e4e7',
    300:  '#d4d4d8',
    400:  '#a1a1aa',
    500:  '#71717a',
    600:  '#52525b',
    700:  '#3f3f46',
    800:  '#27272a',
    900:  '#18181b',
    950:  '#09090b',
    1000: '#000000',
  },
  red: {
    50:  '#fef2f2',
    100: '#fee2e2',
    500: '#ef4444',
    600: '#dc2626',
    700: '#b91c1c',
  },
  amber: {
    50:  '#fffbeb',
    100: '#fef3c7',
    500: '#f59e0b',
    600: '#d97706',
    700: '#b45309',
  },
  green: {
    50:  '#f0fdf4',
    100: '#dcfce7',
    500: '#22c55e',
    600: '#16a34a',
    700: '#15803d',
  },
  blue: {
    50:  '#eff6ff',
    100: '#dbeafe',
    500: '#3b82f6',
    600: '#2563eb',
    700: '#1d4ed8',
  },
} as const;

/* ── Typography ──────────────────────────────────────────────────────── */

export const typography = {
  fontFamily: {
    sans:   "'Archivo', system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif",
    serif:  "'Fraunces', Georgia, 'Times New Roman', serif",
    mono:   "ui-monospace, SFMono-Regular, 'SF Mono', Menlo, monospace",
  },
  fontSize: {
    xs:   '0.75rem',  // 12
    sm:   '0.8125rem',// 13
    base: '0.875rem', // 14
    md:   '1rem',     // 16
    lg:   '1.125rem', // 18
    xl:   '1.25rem',  // 20
    '2xl':'1.5rem',   // 24
    '3xl':'1.875rem', // 30
    '4xl':'2.25rem',  // 36
  },
  fontWeight: {
    regular:  400,
    medium:   500,
    semibold: 600,
    bold:     700,
  },
  lineHeight: {
    tight:   1.2,
    snug:    1.35,
    normal:  1.5,
    relaxed: 1.7,
  },
  letterSpacing: {
    tight:  '-0.01em',
    normal: '0',
    wide:   '0.04em',
    wider:  '0.08em',
  },
} as const;

/* ── Space scale (4-pt grid) ─────────────────────────────────────────── */

export const spacing = {
  0:  '0',
  1:  '4px',
  2:  '8px',
  3:  '12px',
  4:  '16px',
  5:  '20px',
  6:  '24px',
  7:  '28px',
  8:  '32px',
  10: '40px',
  12: '48px',
  16: '64px',
  20: '80px',
  24: '96px',
} as const;

/* ── Radii ───────────────────────────────────────────────────────────── */

export const radii = {
  none: '0',
  sm:   '6px',
  md:   '12px',
  lg:   '16px',
  xl:   '24px',
  '2xl':'30px',
  full: '9999px',
} as const;

/* ── Shadows ─────────────────────────────────────────────────────────── */

export const shadow = {
  none: 'none',
  xs:   '0 1px 2px rgba(15, 23, 42, 0.04)',
  sm:   '0 2px 4px rgba(15, 23, 42, 0.06), 0 1px 2px rgba(15, 23, 42, 0.04)',
  md:   '0 4px 12px rgba(15, 23, 42, 0.08), 0 2px 4px rgba(15, 23, 42, 0.04)',
  lg:   '0 12px 24px rgba(15, 23, 42, 0.10), 0 4px 8px rgba(15, 23, 42, 0.06)',
  xl:   '0 24px 48px rgba(15, 23, 42, 0.14), 0 8px 16px rgba(15, 23, 42, 0.08)',
  ring: '0 0 0 3px var(--ring-color, rgba(17, 75, 63, 0.20))',
  clay: '8px 8px 16px rgba(0,0,0,0.06), inset 4px 4px 8px rgba(255, 255, 255, 0.25), inset -4px -4px 8px rgba(0, 0, 0, 0.05)',
  clayActive: '4px 4px 8px rgba(0,0,0,0.04), inset 6px 6px 12px rgba(255, 255, 255, 0.15), inset -6px -6px 12px rgba(0, 0, 0, 0.08)',
  claySunken: 'inset 4px 4px 8px rgba(0, 0, 0, 0.06), inset -4px -4px 8px rgba(255, 255, 255, 0.25)',
} as const;

/* ── Borders ─────────────────────────────────────────────────────────── */

export const border = {
  thin:   '1px',
  normal: '1px',
  thick:  '2px',
} as const;

/* ── Motion ──────────────────────────────────────────────────────────── */

export const motion = {
  duration: {
    instant: '0ms',
    fast:    '120ms',
    normal:  '200ms',
    slow:    '320ms',
  },
  easing: {
    standard:  'cubic-bezier(0.2, 0, 0, 1)',
    enter:     'cubic-bezier(0, 0, 0.2, 1)',
    exit:      'cubic-bezier(0.4, 0, 1, 1)',
    emphasis:  'cubic-bezier(0.2, 0, 0, 1.4)',
  },
} as const;

/* ── Z-index scale ───────────────────────────────────────────────────── */

export const zIndex = {
  hide:      -1,
  base:      0,
  dropdown:  100,
  sticky:    200,
  overlay:   1000,
  modal:     1100,
  popover:   1200,
  toast:     1300,
  tooltip:   1400,
} as const;

/* ── Breakpoints (mobile-first) ──────────────────────────────────────── */

export const breakpoint = {
  sm: '640px',
  md: '768px',
  lg: '1024px',
  xl: '1280px',
} as const;

export const tokens = {
  palette,
  typography,
  spacing,
  radii,
  shadow,
  border,
  motion,
  zIndex,
  breakpoint,
} as const;

export type Tokens = typeof tokens;
