/**
 * Semantic theme — what components actually consume.
 * Maps raw palette tokens into role-based names.
 * Swap the right-hand side to rebrand without changing any component.
 */
import { palette, typography, spacing, radii, shadow, border, motion, zIndex, breakpoint } from './tokens';

export interface SemanticColor {
  /* Surfaces */
  background:          string;
  foreground:          string;
  card:                string;
  cardForeground:      string;
  popover:             string;
  popoverForeground:   string;
  muted:               string;
  mutedForeground:     string;

  /* Brand */
  primary:             string;
  primaryForeground:   string;
  primaryHover:        string;
  accent:              string;
  accentForeground:    string;

  /* States */
  destructive:         string;
  destructiveForeground: string;
  success:             string;
  successForeground:   string;
  warning:             string;
  warningForeground:   string;
  info:                string;
  infoForeground:      string;

  /* Lines + focus */
  border:              string;
  input:               string;
  ring:                string;
  overlay:             string;
}

export interface Theme {
  name:         'light' | 'dark' | string;
  color:        SemanticColor;
  /** Raw design palette — use for bespoke brand panels that need specific tones */
  palette:      typeof palette;
  typography:   typeof typography;
  spacing:      typeof spacing;
  radii:        typeof radii;
  /** Alias for `radii` — convenience shorthand */
  radius:       typeof radii;
  shadow:       typeof shadow;
  border:       typeof border;
  motion:       typeof motion;
  zIndex:       typeof zIndex;
  breakpoint:   typeof breakpoint;
}

/* ── Light theme (Ledgr default) ─────────────────────────────────────── */

export const lightTheme: Theme = {
  name: 'light',
  palette,
  radius: radii,
  color: {
    background:           '#f4f5f7',
    foreground:           '#111827',
    card:                 '#ffffff',
    cardForeground:       '#111827',
    popover:              '#ffffff',
    popoverForeground:    '#111827',
    muted:                '#f3f4f6',
    mutedForeground:      '#6b7280',

    primary:              '#1b6f5d',
    primaryForeground:    '#ffffff',
    primaryHover:         '#145346',
    accent:               '#f58220',
    accentForeground:     '#ffffff',

    destructive:          '#ef4444',
    destructiveForeground:'#ffffff',
    success:              '#1b6f5d',
    successForeground:    '#ffffff',
    warning:              '#f58220',
    warningForeground:    '#ffffff',
    info:                 '#0ea5e9',
    infoForeground:       '#ffffff',

    border:               '#e5e7eb',
    input:                '#e5e7eb',
    ring:                 '#1b6f5d',
    overlay:              'rgba(17, 24, 39, 0.45)',
  },
  typography,
  spacing,
  radii,
  shadow,
  border,
  motion,
  zIndex,
  breakpoint,
};


/* ── Dark theme ──────────────────────────────────────────────────────── */

export const darkTheme: Theme = {
  ...lightTheme,
  name: 'dark',
  color: {
    background:           '#111827',
    foreground:           '#f9fafb',
    card:                 '#1f2937',
    cardForeground:       '#f9fafb',
    popover:              '#1f2937',
    popoverForeground:    '#f9fafb',
    muted:                '#374151',
    mutedForeground:      '#9ca3af',

    primary:              '#34d399',
    primaryForeground:    '#111827',
    primaryHover:         '#6ee7b7',
    accent:               '#f58220',
    accentForeground:     '#111827',

    destructive:          '#f87171',
    destructiveForeground:'#f9fafb',
    success:              '#34d399',
    successForeground:    '#111827',
    warning:              '#f58220',
    warningForeground:    '#111827',
    info:                 '#38bdf8',
    infoForeground:       '#ffffff',

    border:               '#374151',
    input:                '#374151',
    ring:                 '#34d399',
    overlay:              'rgba(0, 0, 0, 0.65)',
  },
};
