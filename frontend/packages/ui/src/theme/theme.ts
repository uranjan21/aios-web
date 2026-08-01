/**
 * Semantic theme — the single build step from tokens to what components read.
 *
 * This used to be a pair of hardcoded Ledgr-branded objects (`lightTheme` /
 * `darkTheme`) that `ctTheme.ts` imported purely to spread and then
 * overwrite. Every colour in them was dead. It is now a builder: pass a
 * palette and a mode, get the complete theme. `ctTheme.ts` is the only
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

/** `#2D2622` + 0.72 -> `rgba(45, 38, 34, 0.72)`. */
const alpha = (hex: string, a: number) => `rgba(${rgbChannels(hex)}, ${a})`;

/**
 * Blend two hex colours. `mix('#2D2622', '#F3EFEA', 0.08)` = 8% of the second.
 * Used to derive the redesign's lifted card-gradient stop and the sidebar's
 * darkened bottom stop from the palette, rather than hardcoding taupe hexes.
 */
function mix(from: string, to: string, ratio: number): string {
  const parse = (h: string) => {
    const m = /^#?([0-9a-f]{6})$/i.exec(h.trim());
    const n = m ? parseInt(m[1], 16) : 0;
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  };
  const [r1, g1, b1] = parse(from);
  const [r2, g2, b2] = parse(to);
  const c = (x: number, y: number) =>
    Math.round(x + (y - x) * ratio).toString(16).padStart(2, '0');
  return `#${c(r1, r2)}${c(g1, g2)}${c(b1, b2)}`;
}

/**
 * The palette's colours plus the ones the builder derives from them. Palettes
 * declare `SemanticColor`; components read this.
 */
export interface DerivedColor extends SemanticColor {
  /**
   * Border under hover/focus. Derived rather than authored: every palette's
   * hover border in the design canvas is its base border pulled ~12% toward
   * the foreground, so there is nothing for a palette to get wrong.
   */
  borderHover: string;
}

export interface Theme {
  name: string;
  mode: 'light' | 'dark';
  color: DerivedColor;

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

    /* ── Added 2026-08-01 for the redesign's glass chrome ── */
    /** `backdrop-filter` value including saturation — for overlay chrome. */
    filter: string;
    /** Stronger line for a raised/open glass control. */
    borderStrong: string;
    /**
     * 1px top inner highlight. DARK MODE ONLY — `'none'` in light, because a
     * white inset on a light surface is banned (feedback-no-white-shadows).
     */
    hi: string;
    /** Translucent control fill sitting on glass (search field, icon buttons). */
    ctl: string;
    ctlHover: string;
    /** Header / sidebar sheet: a vertical two-stop translucent gradient. */
    shell: string;
    /** Floating panel (notification tray, user menu) — more opaque than `shell`. */
    panel: string;
    /** Drop shadow for a floating glass panel. */
    shadow: string;
  };

  /**
   * The redesign's card treatment: a translucent 150° gradient over a blur,
   * not a flat `color.card` fill. Distinct from `elevation`, which stays the
   * scale for opaque surfaces.
   */
  surface: {
    card: string;
    border: string;
    filter: string;
    shadow: string;
  };

  /**
   * Sidebar + header chrome. Mode-FOLLOWING as of 2026-08-01 — the sidebar was
   * previously always dark regardless of mode (a `{bg,border,fg}` object built
   * in ctTheme.ts with zero call sites). The redesign gives light mode a light
   * sidebar, so chrome now tracks the active mode and lives here.
   */
  chrome: {
    bg: string;
    border: string;
    borderStrong: string;
    fg: string;
    fgMuted: string;
    hoverBg: string;
    ctl: string;
    ctlHover: string;
    /** Top inner highlight. Dark mode only — `'none'` in light. */
    hi: string;
    /** Outer edge shadow separating the sidebar from the content area. */
    edge: string;
    filter: string;
  };

  /** Accent treatments used by badges, avatars and the logo mark. */
  accent: {
    /** 135° gradient, accent -> a darker accent. */
    gradient: string;
    /** Small coloured glow under an accent-filled chip. */
    glow: string;
    /** Faint accent wash — active nav rows, soft badges. */
    soft: string;
    /** Accent ring for a focused control on glass. */
    ring: string;
  };

  /**
   * Full-page backdrop: three ambient radial tints over `color.background`.
   * Chrome only — never render dense data directly on it.
   */
  appBackground: string;

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

  /*
   * Hairlines and inner highlights key off pure white on dark and off the
   * palette's own foreground on light — matching the redesign, where every
   * `rgba(255,255,255,x)` in dark mode has an `rgba(<fg>,x)` twin in light.
   */
  const hairline = dark ? '255, 255, 255' : rgbChannels(color.foreground);
  const hl = (o: number) => `rgba(${hairline}, ${o})`;

  /** Inner top highlight — dark mode only. See feedback-no-white-shadows. */
  const innerHi = dark ? 'inset 0 1px 0 rgba(255,255,255,0.08)' : 'none';

  /** Card gradient's lifted top stop: the card colour pulled toward the text. */
  const cardLift = mix(color.card, color.foreground, 0.08);
  /** Sidebar gradient's darkened bottom stop. */
  const chromeSink = dark ? mix(color.background, '#000000', 0.20)
                          : mix(color.background, '#ffffff', 0.30);

  return {
    name,
    mode,
    color: { ...color, borderHover: mix(color.border, color.foreground, 0.12) },

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
      // Redesign direction (2026-08-01): accent -> DARKER accent, not
      // lighter-to-accent. Reads as a solid weighted fill on a logo mark or
      // avatar rather than a sheen.
      accent: `linear-gradient(135deg, ${color.accent} 0%, ${mix(color.accent, '#000000', 0.12)} 100%)`,
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
      border: hl(0.10),

      filter: 'saturate(180%) blur(22px)',
      borderStrong: hl(0.18),
      hi: innerHi,
      ctl: dark ? 'rgba(255, 255, 255, 0.06)' : alpha(color.card, 0.66),
      ctlHover: dark ? 'rgba(255, 255, 255, 0.13)' : alpha(color.card, 0.95),
      shell: dark
        ? `linear-gradient(180deg, ${alpha(color.muted, 0.74)}, ${alpha(color.background, 0.60)})`
        : `linear-gradient(180deg, ${alpha(color.card, 0.82)}, ${alpha(color.card, 0.62)})`,
      panel: dark
        ? `linear-gradient(180deg, ${alpha(color.muted, 0.94)}, ${alpha(color.card, 0.90)})`
        : `linear-gradient(180deg, ${alpha(color.card, 0.96)}, ${alpha(color.background, 0.92)})`,
      shadow: dark
        ? '0 16px 44px rgba(0, 0, 0, 0.46)'
        : `0 16px 44px ${alpha(color.foreground, 0.16)}`,
    },

    surface: {
      card: dark
        ? `linear-gradient(150deg, ${alpha(cardLift, 0.72)}, ${alpha(color.card, 0.56)})`
        : `linear-gradient(150deg, ${alpha(color.card, 0.86)}, ${alpha(color.card, 0.66)})`,
      border: hl(0.10),
      filter: 'saturate(150%) blur(14px)',
      shadow: dark
        ? `0 1px 2px rgba(0,0,0,0.32), 0 14px 34px -26px rgba(0,0,0,0.9), ${innerHi}`
        : `0 1px 2px ${alpha(color.foreground, 0.05)}, 0 14px 34px -26px ${alpha(color.foreground, 0.55)}`,
    },

    chrome: {
      bg: `linear-gradient(160deg, ${alpha(dark ? color.muted : color.card, dark ? 0.72 : 0.80)}, ${alpha(chromeSink, dark ? 0.58 : 0.58)})`,
      border: hl(0.09),
      borderStrong: hl(0.16),
      fg: color.foreground,
      fgMuted: alpha(color.foreground, 0.55),
      hoverBg: hl(dark ? 0.07 : 0.05),
      ctl: dark ? 'rgba(255, 255, 255, 0.06)' : alpha(color.card, 0.62),
      ctlHover: dark ? 'rgba(255, 255, 255, 0.13)' : alpha(color.card, 0.95),
      hi: innerHi,
      edge: dark
        ? '1px 0 34px -14px rgba(0,0,0,0.75)'
        : `1px 0 34px -16px ${alpha(color.foreground, 0.45)}`,
      filter: 'saturate(180%) blur(24px)',
    },

    accent: {
      gradient: `linear-gradient(135deg, ${color.accent}, ${mix(color.accent, '#000000', 0.12)})`,
      glow: `0 2px 8px rgba(${a}, ${dark ? 0.35 : 0.28})`,
      soft: `rgba(${a}, ${dark ? 0.16 : 0.11})`,
      ring: `rgba(${a}, ${dark ? 0.33 : 0.19})`,
    },

    // Three ambient radial tints — accent, info, success — over the base. Low
    // alpha by design: this reads as a tint on the page, not as visible blobs.
    appBackground: [
      `radial-gradient(1000px 560px at 8% -12%, rgba(${a}, ${dark ? 0.20 : 0.16}), transparent 62%)`,
      `radial-gradient(760px 520px at 98% -4%, ${alpha(color.info, dark ? 0.14 : 0.12)}, transparent 58%)`,
      `radial-gradient(900px 640px at 62% 112%, ${alpha(color.success, dark ? 0.12 : 0.10)}, transparent 62%)`,
      color.background,
    ].join(', '),

    // One categorical ramp for every chart. Previously each chart file
    // declared its own COLORS array — three different ones existed, and the
    // DS's own useChartColors() hook had no consumers at all.
    chart: dark
      ? [color.accent, '#38BDF8', '#4ADE80', '#C084FC', '#FB923C', '#F472B6']
      : [color.accent, '#0EA5E9', '#16A34A', '#A855F7', '#EA580C', '#DB2777'],

    focusRing,
  };
}
