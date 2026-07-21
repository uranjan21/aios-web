/**
 * Semantic theme — the single build step from tokens to what components read.
 *
 * This used to be a pair of hardcoded Ledgr-branded objects (`lightTheme` /
 * `darkTheme`) that `aiosTheme.ts` imported purely to spread and then
 * overwrite. Every colour in them was dead. It is now a builder: pass a
 * palette and a mode, get the complete theme. `aiosTheme.ts` is the only
 * caller, and its whole job is choosing which palette to pass.
 *
 * Derived layers (elevation, gradient, glass, chart) are computed from the
 * palette rather than hand-authored, so a new palette gets a coherent
 * Expressive treatment for free.
 */
import {
  typography, spacing, radii, border, motion, zIndex, breakpoint, media, blur,
  elevationLight, elevationDark,
} from './tokens';

export interface SemanticColor {
  /* Surfaces */
  background:            string;
  foreground:            string;
  card:                  string;
  cardForeground:        string;
  popover:               string;
  popoverForeground:     string;
  muted:                 string;
  mutedForeground:       string;

  /* Brand */
  primary:               string;
  primaryForeground:     string;
  primaryHover:          string;
  accent:                string;
  accentForeground:      string;

  /* States */
  destructive:           string;
  destructiveForeground: string;
  success:               string;
  successForeground:     string;
  warning:               string;
  warningForeground:     string;
  info:                  string;
  infoForeground:        string;

  /* Lines + focus */
  border:                string;
  input:                 string;
  ring:                  string;
  overlay:               string;
}

/** "#CA8A04" -> "202, 138, 4". Falls back to the brand gold on a bad value. */
export function rgbChannels(hex: string): string {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim());
  if (!m) return '202, 138, 4';
  const n = parseInt(m[1], 16);
  return `${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}`;
}

export interface Theme {
  name: string;
  mode: 'light' | 'dark';
  color: SemanticColor;

  typography: typeof typography;
  spacing: typeof spacing;
  radii: typeof radii;
  /** Alias for `radii` — convenience shorthand. */
  radius: typeof radii;
  border: typeof border;
  motion: typeof motion;
  zIndex: typeof zIndex;
  breakpoint: typeof breakpoint;
  media: typeof media;
  blur: typeof blur;

  /** Six-step depth scale. Dark adds a top hairline; light does not. */
  elevation: Record<0 | 1 | 2 | 3 | 4 | 5, string>;

  /**
   * Legacy alias so the ~79 existing `theme.shadow.*` call sites keep
   * compiling while they migrate to `theme.elevation`. The `clay*` keys are
   * historical names from the retired claymorphic system and map to flat
   * depths — they do NOT reintroduce clay.
   */
  shadow: {
    none: string; xs: string; sm: string; md: string; lg: string; xl: string;
    ring: string; clay: string; clayActive: string; claySunken: string;
  };

  /** Expressive gradients, all derived from the active accent/palette. */
  gradient: {
    /** The single primary action per view. Never two on one screen. */
    accent: string;
    /** Ambient page backdrops. Chrome only — never behind dense data. */
    meshA: string;
    meshB: string;
    /** Faint top sheen on a raised surface. */
    surface: string;
    /** Fade-to-transparent rule for section dividers. */
    hairline: string;
  };

  /** Translucent layers: Dialog, Sheet, Popover, CommandPalette, TopBar. */
  glass: {
    thin: string; regular: string; thick: string;
    background: string; border: string;
  };

  /** Categorical series colours for charts, in draw order. */
  chart: readonly string[];

  focusRing: string;
}

export interface BuildThemeInput {
  name: string;
  mode: 'light' | 'dark';
  color: SemanticColor;
}

export function buildTheme({ name, mode, color }: BuildThemeInput): Theme {
  const dark = mode === 'dark';
  const elevation = dark ? elevationDark : elevationLight;
  const a = rgbChannels(color.accent);
  const focusRing = `0 0 0 3px rgba(${a}, ${dark ? 0.30 : 0.22})`;

  return {
    name,
    mode,
    color,

    typography,
    spacing,
    radii,
    radius: radii,
    border,
    motion,
    zIndex,
    breakpoint,
    media,
    blur,

    elevation,

    shadow: {
      none: elevation[0],
      xs: elevation[1],
      sm: elevation[1],
      md: elevation[2],
      lg: elevation[3],
      xl: elevation[4],
      // Now tracks the palette's own ring colour. It used to be a hardcoded
      // blue in every palette, which never matched the gold focus treatment.
      ring: focusRing,
      clay: elevation[2],
      clayActive: elevation[1],
      claySunken: elevation[1],
    },

    gradient: {
      accent: `linear-gradient(135deg, color-mix(in srgb, ${color.accent} 82%, #FFFFFF) 0%, ${color.accent} 100%)`,
      meshA: `radial-gradient(120% 120% at 0% 0%, rgba(${a}, ${dark ? 0.16 : 0.10}) 0%, transparent 60%)`,
      meshB: `radial-gradient(100% 100% at 100% 0%, rgba(${a}, ${dark ? 0.10 : 0.06}) 0%, transparent 55%)`,
      surface: dark
        ? 'linear-gradient(180deg, rgba(255,255,255,0.045) 0%, transparent 42%)'
        : 'linear-gradient(180deg, rgba(255,255,255,0.85) 0%, transparent 40%)',
      hairline: `linear-gradient(90deg, transparent, rgba(${a}, ${dark ? 0.32 : 0.24}), transparent)`,
    },

    glass: {
      thin: `blur(${blur.thin})`,
      regular: `blur(${blur.regular})`,
      thick: `blur(${blur.thick})`,
      background: dark ? 'rgba(14, 16, 14, 0.72)' : 'rgba(255, 255, 255, 0.72)',
      border: dark ? 'rgba(255, 255, 255, 0.09)' : 'rgba(12, 10, 9, 0.08)',
    },

    // One categorical ramp for every chart. Previously each chart file
    // declared its own COLORS array — three different ones existed, and the
    // DS's own useChartColors() hook had no consumers at all.
    chart: dark
      ? [color.accent, '#38BDF8', '#4ADE80', '#C084FC', '#FB923C', '#F472B6']
      : [color.accent, '#0EA5E9', '#16A34A', '#A855F7', '#EA580C', '#DB2777'],

    focusRing,
  };
}
