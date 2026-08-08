/**
 * Control Tower theme entry point.
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
 *
 * FULL-COLOUR pass (2026-08-06): pushed past the previous values — LIGHT takes
 * the deeper, more saturated step of each ramp (a domain colour is frequently
 * rendered as TEXT on a card, and #0EA5E9 sat at 2.6:1 there, which read as
 * washed rather than bold); DARK takes the brighter end, since on a near-black
 * card brightness is what boldness means. See the soft-vs-bold note in
 * `palettes.ts` — do not mute these.
 *
 * `finance` is the ONE value held constant in both modes: it is the brand gold
 * and the accent collision documented above, so it does not move with the rest.
 * It is consequently the palest of the light set — give Finance text weight
 * rather than re-tinting it.
 */
export type DomainKey =
  | 'finance' | 'health' | 'career' | 'vault' | 'general'
  | 'business' | 'content';

const domainLight: Record<DomainKey, string> = {
  finance: '#CA8A04',
  health: '#15803D',
  career: '#0284C7',
  vault: '#0E7490',
  general: '#44403C',
  business: '#C81E1E',
  content: '#7E22CE',
};

const domainDark: Record<DomainKey, string> = {
  finance: '#CA8A04',
  health: '#4ADE80',
  career: '#38BDF8',
  vault: '#22D3EE',
  general: '#B8B2AC',
  business: '#F05252',
  content: '#C084FC',
};

/**
 * Categorical chart series — the fixed slot order for data-viz.
 *
 * Assign in order and never cycle: slot 1 to the first series, slot 2 to the
 * second, and so on. The ORDER is the colourblind-safety mechanism, not a
 * cosmetic choice — adjacent slots are the pairs a reader must tell apart in a
 * stack or a grouped bar, so they carry the separation guarantee.
 *
 * Validated against THIS app's real chart surfaces (light #FFFFFF, dark
 * #1C1917), both modes passing every gate: lightness band, chroma floor,
 * adjacent-pair CVD separation (worst ΔE 9.1 light / 8.4 dark, target ≥8) and
 * the normal-vision floor (worst 19.6 light / 19.3 dark, floor ≥15).
 *
 * Two caveats that come with the palette:
 *  - On the LIGHT surface, aqua/yellow/magenta sit below 3:1 contrast. Charts
 *    using them need direct labels or a table view — do not rely on the fill
 *    alone to carry the value.
 *  - Beyond THREE series on a scatter/bubble/small-multiple (where every pair
 *    is adjacent, not just neighbours), the set no longer clears the floors.
 *    Fold the tail into "Other" or facet instead of adding a 4th hue.
 *
 * These are deliberately NOT the domain colours: a domain is an identity that
 * must stay put, whereas a chart slot is positional.
 */
const chartLight = [
  '#2a78d6', // 1 blue
  '#eb6834', // 2 orange
  '#1baf7a', // 3 aqua
  '#eda100', // 4 yellow
  '#e87ba4', // 5 magenta
  '#008300', // 6 green
  '#4a3aa7', // 7 violet
  '#e34948', // 8 red
] as const;

/** Same eight hues, re-stepped for the dark surface — not an automatic flip. */
const chartDark = [
  '#3987e5',
  '#d95926',
  '#199e70',
  '#c98500',
  '#d55181',
  '#008300',
  '#9085e9',
  '#e66767',
] as const;

export interface CtTheme extends Theme {
  domain: Record<DomainKey, string>;
  /**
   * Domain colours for an always-dark surface, regardless of the active mode.
   * Only the login/marketing page needs these — the app sidebar follows the
   * mode as of 2026-08-01, so in-app chrome uses `domain`, not this.
   */
  chromeDomain: Record<DomainKey, string>;
  /** Categorical chart series, in fixed slot order. See `chartLight` above. */
  chart: readonly string[];
}

/** Build the full theme object for a given palette id + light/dark mode. */
export function getTheme(paletteId: string, mode: 'light' | 'dark'): CtTheme {
  const palette = getPalette(paletteId);
  const color: PaletteColors = mode === 'dark' ? palette.dark : palette.light;

  // `chrome` used to be built here as an always-dark {bg,border,fg} triple. It
  // had zero call sites, and the redesign gives light mode a light sidebar, so
  // the full mode-following chrome group now comes from buildTheme.
  return {
    ...buildTheme({ name: `${paletteId}-${mode}`, mode, color }),
    domain: mode === 'dark' ? domainDark : domainLight,
    chromeDomain: domainDark,
    chart: mode === 'dark' ? chartDark : chartLight,
  };
}

/** Back-compat named export (default "monochrome" palette). */
export const ctLightTheme: CtTheme = getTheme('monochrome', 'light');
