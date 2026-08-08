/**
 * Palette catalog — Appearance → Settings lets the user pick one of these.
 * Each palette supplies a full light + dark color set; mode (light/dark) stays
 * an orthogonal toggle. Shadows, radii, and typography are shared across all
 * palettes (see ctTheme.ts) so switching palette only repaints color.
 *
 * FULL-COLOUR RULE (set 2026-08-06). Colour here is deliberately SATURATED —
 * vivid semantic hues, high-contrast near-black/near-white text, bright accents.
 * A brief soft/muted pass the same day was reversed on Utsav's call; do not
 * re-mute these values.
 *
 * Bold is not the same as unreadable, and the two are easy to confuse. The
 * hues below are vivid AND legible, which mostly means picking the deeper step
 * of a bright ramp for fills that carry white text (green-700 rather than
 * green-600), and pairing genuinely bright colours with dark ink instead of
 * dimming them. Enforced by
 * `node --experimental-strip-types scripts/palette-contrast.ts` — AA (4.5:1) on
 * text pairs, 7:1 foreground-on-surface. Run it after touching any value here.
 */
export interface PaletteColors {
  background: string
  foreground: string
  card: string
  cardForeground: string
  popover: string
  popoverForeground: string
  muted: string
  mutedForeground: string
  primary: string
  primaryForeground: string
  primaryHover: string
  accent: string
  accentForeground: string
  destructive: string
  destructiveForeground: string
  success: string
  successForeground: string
  warning: string
  warningForeground: string
  info: string
  infoForeground: string
  border: string
  input: string
  ring: string
  overlay: string
}

export interface Palette {
  id: string
  label: string
  /** Swatch preview shown in the picker: [background, primary, accent] */
  swatch: [string, string, string]
  light: PaletteColors
  dark: PaletteColors
}

/**
 * Semantic hues are CONSTANT across palettes — "destructive" is an identity,
 * not decoration, same rationale as the domain colours in ctTheme.ts. They used
 * to drift per palette (#DC2626 in monochrome, a dusty #C0392B elsewhere) for
 * no stated reason, which is also how half of them ended up below AA.
 *
 * LIGHT: the deepest-but-still-vivid step that clears 4.5:1 BOTH as text on the
 * most tinted background in the catalog (#F2E9DC, beige-cashmere) and under
 * white text as a fill. Roughly the 700 step. The old 600s were failing badly
 * as text — #16A34A at 3.16:1, #D97706 at 3.05:1 — so this is more saturated
 * than what shipped before, not less.
 *
 * DARK: the BRIGHT end of each ramp (these are the boldest values in the file)
 * paired with dark ink. Pairing #F87171 with white was the old bug — 2.77:1;
 * dimming the red would have been the wrong fix, so the ink changed instead.
 */
const SEMANTIC_LIGHT = {
  destructive: '#CA2323', destructiveForeground: '#FFFFFF',
  success: '#147839', successForeground: '#FFFFFF',
  warning: '#A94E08', warningForeground: '#FFFFFF',
  info: '#0369A1', infoForeground: '#FFFFFF',
} as const

const SEMANTIC_DARK = {
  destructive: '#F87171', destructiveForeground: '#450A0A',
  success: '#4ADE80', successForeground: '#052E16',
  warning: '#FCD34D', warningForeground: '#3A2606',
  info: '#38BDF8', infoForeground: '#082F49',
} as const

export const PALETTES: Palette[] = [
  {
    id: 'monochrome',
    label: 'Monochrome',
    swatch: ['#FAFAF9', '#1C1917', '#CA8A04'],
    light: {
      background: '#FAFAF9', foreground: '#0C0A09', card: '#FFFFFF', cardForeground: '#0C0A09',
      popover: '#FFFFFF', popoverForeground: '#0C0A09', muted: '#F5F5F4', mutedForeground: '#57534E',
      primary: '#1C1917', primaryForeground: '#FAFAF9', primaryHover: '#292524',
      accent: '#CA8A04', accentForeground: '#1A1200',
      ...SEMANTIC_LIGHT,
      border: '#E7E5E4', input: '#E7E5E4', ring: '#CA8A04', overlay: 'rgba(12, 10, 9, 0.45)',
    },
    dark: {
      background: '#0C0A09', foreground: '#FAFAF9', card: '#1C1917', cardForeground: '#FAFAF9',
      popover: '#1C1917', popoverForeground: '#FAFAF9', muted: '#292524', mutedForeground: '#A8A29E',
      primary: '#FAFAF9', primaryForeground: '#0C0A09', primaryHover: '#E7E5E4',
      accent: '#CA8A04', accentForeground: '#0C0A09',
      ...SEMANTIC_DARK,
      border: '#44403C', input: '#44403C', ring: '#CA8A04', overlay: 'rgba(0, 0, 0, 0.70)',
    },
  },
  {
    id: 'mushroom-taupe',
    label: 'Mushroom Taupe',
    swatch: ['#F3EFEA', '#6B5B4F', '#C2703F'],
    light: {
      background: '#F3EFEA', foreground: '#2B2521', card: '#FFFFFF', cardForeground: '#2B2521',
      popover: '#FFFFFF', popoverForeground: '#2B2521', muted: '#EDE6DE', mutedForeground: '#6F6155',
      primary: '#6B5B4F', primaryForeground: '#FAF7F3', primaryHover: '#584A40',
      accent: '#C2703F', accentForeground: '#211004',
      ...SEMANTIC_LIGHT,
      border: '#E0D6CB', input: '#E0D6CB', ring: '#C2703F', overlay: 'rgba(43, 37, 33, 0.45)',
    },
    dark: {
      background: '#211C19', foreground: '#F3EFEA', card: '#2D2622', cardForeground: '#F3EFEA',
      popover: '#2D2622', popoverForeground: '#F3EFEA', muted: '#382F29', mutedForeground: '#B3A395',
      primary: '#C9B8A8', primaryForeground: '#211C19', primaryHover: '#D9CBBE',
      accent: '#C68A68', accentForeground: '#211C19',
      ...SEMANTIC_DARK,
      border: '#453B34', input: '#453B34', ring: '#C68A68', overlay: 'rgba(0, 0, 0, 0.70)',
    },
  },
  {
    id: 'seashell-mauve',
    label: 'Seashell + Mauve',
    swatch: ['#FBF3F0', '#8E5B6E', '#D1728F'],
    light: {
      background: '#FBF3F0', foreground: '#2E1F26', card: '#FFFFFF', cardForeground: '#2E1F26',
      popover: '#FFFFFF', popoverForeground: '#2E1F26', muted: '#F4E4E6', mutedForeground: '#7D6169',
      primary: '#8E5B6E', primaryForeground: '#FFFFFF', primaryHover: '#764A5B',
      accent: '#D1728F', accentForeground: '#2B0C18',
      ...SEMANTIC_LIGHT,
      border: '#E9D3D8', input: '#E9D3D8', ring: '#D1728F', overlay: 'rgba(46, 31, 38, 0.45)',
    },
    dark: {
      background: '#241820', foreground: '#FBF3F0', card: '#301F29', cardForeground: '#FBF3F0',
      popover: '#301F29', popoverForeground: '#FBF3F0', muted: '#3B2732', mutedForeground: '#C2A6B0',
      primary: '#D9A8B8', primaryForeground: '#241820', primaryHover: '#E5BCC9',
      accent: '#D296AA', accentForeground: '#241820',
      ...SEMANTIC_DARK,
      border: '#4A3440', input: '#4A3440', ring: '#D296AA', overlay: 'rgba(0, 0, 0, 0.70)',
    },
  },
  {
    id: 'beige-cashmere',
    label: 'Beige + Cashmere',
    swatch: ['#F2E9DC', '#7F6A4E', '#D4A45C'],
    light: {
      background: '#F2E9DC', foreground: '#2A2118', card: '#FFFFFF', cardForeground: '#2A2118',
      popover: '#FFFFFF', popoverForeground: '#2A2118', muted: '#EAE0CF', mutedForeground: '#736247',
      primary: '#7F6A4E', primaryForeground: '#FFFFFF', primaryHover: '#6B583F',
      accent: '#D4A45C', accentForeground: '#231A08',
      ...SEMANTIC_LIGHT,
      border: '#DDCEB4', input: '#DDCEB4', ring: '#D4A45C', overlay: 'rgba(42, 33, 24, 0.45)',
    },
    dark: {
      background: '#1E1811', foreground: '#F2E9DC', card: '#2A2118', cardForeground: '#F2E9DC',
      popover: '#2A2118', popoverForeground: '#F2E9DC', muted: '#352B1F', mutedForeground: '#BCAB8D',
      primary: '#D8C4A4', primaryForeground: '#1E1811', primaryHover: '#E6D6BC',
      accent: '#CBA97C', accentForeground: '#1E1811',
      ...SEMANTIC_DARK,
      border: '#453824', input: '#453824', ring: '#CBA97C', overlay: 'rgba(0, 0, 0, 0.70)',
    },
  },
  {
    id: 'vanilla-noir',
    label: 'Vanilla + Noir',
    swatch: ['#FBF6E9', '#171512', '#E8C46A'],
    light: {
      background: '#FBF6E9', foreground: '#1A1815', card: '#FFFFFF', cardForeground: '#1A1815',
      popover: '#FFFFFF', popoverForeground: '#1A1815', muted: '#F3EACD', mutedForeground: '#6B6350',
      primary: '#171512', primaryForeground: '#FBF6E9', primaryHover: '#2A2621',
      accent: '#E8C46A', accentForeground: '#1E1703',
      ...SEMANTIC_LIGHT,
      border: '#E8DDB8', input: '#E8DDB8', ring: '#E8C46A', overlay: 'rgba(26, 24, 21, 0.50)',
    },
    dark: {
      background: '#100E0C', foreground: '#FBF6E9', card: '#1A1815', cardForeground: '#FBF6E9',
      popover: '#1A1815', popoverForeground: '#FBF6E9', muted: '#242017', mutedForeground: '#B5AC93',
      primary: '#F3EACD', primaryForeground: '#100E0C', primaryHover: '#FFF6DE',
      accent: '#E0C88A', accentForeground: '#100E0C',
      ...SEMANTIC_DARK,
      border: '#37311F', input: '#37311F', ring: '#E0C88A', overlay: 'rgba(0, 0, 0, 0.75)',
    },
  },
  {
    id: 'smoky-blue-ivory',
    label: 'Smoky Blue + Ivory',
    swatch: ['#F7F3EA', '#4A6373', '#5B93AB'],
    light: {
      background: '#F7F3EA', foreground: '#1E262C', card: '#FFFFFF', cardForeground: '#1E262C',
      popover: '#FFFFFF', popoverForeground: '#1E262C', muted: '#ECE6D6', mutedForeground: '#56646B',
      primary: '#4A6373', primaryForeground: '#FFFFFF', primaryHover: '#3B5160',
      accent: '#5B93AB', accentForeground: '#07161C',
      ...SEMANTIC_LIGHT,
      border: '#DAD2BE', input: '#DAD2BE', ring: '#5B93AB', overlay: 'rgba(30, 38, 44, 0.45)',
    },
    dark: {
      background: '#141A1E', foreground: '#F7F3EA', card: '#1E262C', cardForeground: '#F7F3EA',
      popover: '#1E262C', popoverForeground: '#F7F3EA', muted: '#28323A', mutedForeground: '#A9B7BE',
      primary: '#9FB6C0', primaryForeground: '#141A1E', primaryHover: '#B4C7CF',
      accent: '#8CA9B6', accentForeground: '#141A1E',
      ...SEMANTIC_DARK,
      border: '#38434B', input: '#38434B', ring: '#8CA9B6', overlay: 'rgba(0, 0, 0, 0.70)',
    },
  },
]

export const DEFAULT_PALETTE_ID = 'monochrome'

export function getPalette(id: string): Palette {
  return PALETTES.find(p => p.id === id) ?? PALETTES[0]
}
