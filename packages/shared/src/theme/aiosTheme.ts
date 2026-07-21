/**
 * AIOS theme entry point.
 *
 * This file used to be a second, competing token layer: it overrode the design
 * system's shadows, radii, font families and entire colour set at runtime, so
 * `packages/ui/src/theme/tokens.ts` shipped values that never rendered. As of
 * 2026-07-21 the DS tokens are authoritative and this file does exactly one
 * job — pick a palette and a mode, then hand them to `buildTheme`.
 *
 * Everything else it used to carry is gone:
 *   - the `hud` layer (13 tokens, 12 CSS vars, zero consumers)
 *   - `sharedRadii`, which collapsed lg/xl/2xl to a single 10px
 *   - `sharedFontFamily.mono`, which resolved to a proportional font
 *   - `flatShadowLight/Dark`, whose `ring` was a hardcoded blue in every palette
 */
import { buildTheme, type Theme } from '@ledgr/ui';
import { getPalette, type PaletteColors } from './palettes';

/**
 * Domain identity colours — the single source of truth.
 *
 * Deliberately CONSTANT across palettes: a domain is an identity, like
 * success/destructive, not a decorative accent. Only light/dark varies.
 *
 * `business` and `content` are retained even though those areas were removed
 * on 2026-07-21, because historical records still carry those domain keys —
 * see ACTIVE_DOMAINS vs RETIRED_DOMAINS in `config/domains.ts`. A legacy row
 * must still render with a colour rather than falling through to undefined.
 *
 * Note the deliberate collision: `finance` IS the brand gold, which is also
 * the accent. Anywhere a Finance node sits on accent chrome it needs weight or
 * brightness to separate it, not a different hue.
 */
export type DomainKey =
  | 'finance' | 'health' | 'career' | 'vault' | 'general'
  | 'business' | 'content';

const domainLight: Record<DomainKey, string> = {
  finance: '#CA8A04',
  health: '#16A34A',
  career: '#0EA5E9',
  vault: '#0891B2',
  general: '#57534E',
  business: '#DC2626',
  content: '#A855F7',
};

const domainDark: Record<DomainKey, string> = {
  finance: '#CA8A04',
  health: '#4ADE80',
  career: '#38BDF8',
  vault: '#06B6D4',
  general: '#A8A29E',
  business: '#EF4444',
  content: '#C084FC',
};

export interface AiosTheme extends Theme {
  domain: Record<DomainKey, string>;
  /** The sidebar is always dark, so anything domain-coloured inside it uses these. */
  chromeDomain: Record<DomainKey, string>;
  chrome: { bg: string; border: string; fg: string };
}

/** Build the full theme object for a given palette id + light/dark mode. */
export function getTheme(paletteId: string, mode: 'light' | 'dark'): AiosTheme {
  const palette = getPalette(paletteId);
  const color: PaletteColors = mode === 'dark' ? palette.dark : palette.light;
  // Sidebar chrome is intentionally always-dark regardless of the active mode,
  // sourced from the palette's dark colours so it still repaints per palette.
  const chromeSource = palette.dark;

  return {
    ...buildTheme({ name: `${paletteId}-${mode}`, mode, color }),
    domain: mode === 'dark' ? domainDark : domainLight,
    chromeDomain: domainDark,
    chrome: {
      bg: chromeSource.card,
      border: chromeSource.muted,
      fg: chromeSource.foreground,
    },
  };
}

/** Back-compat named export (default "monochrome" palette). */
export const aiosLightTheme: AiosTheme = getTheme('monochrome', 'light');
