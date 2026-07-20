/**
 * Palette catalog — Appearance → Settings lets the user pick one of these.
 * Each palette supplies a full light + dark color set; mode (light/dark) stays
 * an orthogonal toggle. Shadows, radii, and typography are shared across all
 * palettes (see aiosTheme.ts) so switching palette only repaints color.
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

export const PALETTES: Palette[] = [
  {
    id: 'monochrome',
    label: 'Monochrome',
    swatch: ['#FAFAF9', '#1C1917', '#CA8A04'],
    light: {
      background: '#FAFAF9', foreground: '#0C0A09', card: '#FFFFFF', cardForeground: '#0C0A09',
      popover: '#FFFFFF', popoverForeground: '#0C0A09', muted: '#F5F5F4', mutedForeground: '#57534E',
      primary: '#1C1917', primaryForeground: '#FAFAF9', primaryHover: '#292524',
      accent: '#CA8A04', accentForeground: '#FFFFFF',
      destructive: '#DC2626', destructiveForeground: '#FFFFFF', success: '#16A34A', successForeground: '#FFFFFF',
      warning: '#D97706', warningForeground: '#0C0A09', info: '#0284C7', infoForeground: '#FFFFFF',
      border: '#E7E5E4', input: '#E7E5E4', ring: '#CA8A04', overlay: 'rgba(12, 10, 9, 0.45)',
    },
    dark: {
      background: '#0C0A09', foreground: '#FAFAF9', card: '#1C1917', cardForeground: '#FAFAF9',
      popover: '#1C1917', popoverForeground: '#FAFAF9', muted: '#292524', mutedForeground: '#A8A29E',
      primary: '#FAFAF9', primaryForeground: '#0C0A09', primaryHover: '#E7E5E4',
      accent: '#CA8A04', accentForeground: '#0C0A09',
      destructive: '#F87171', destructiveForeground: '#FFFFFF', success: '#4ADE80', successForeground: '#0C0A09',
      warning: '#FCD34D', warningForeground: '#0C0A09', info: '#38BDF8', infoForeground: '#FFFFFF',
      border: '#44403C', input: '#44403C', ring: '#CA8A04', overlay: 'rgba(0, 0, 0, 0.70)',
    },
  },
  {
    id: 'mushroom-taupe',
    label: 'Mushroom Taupe',
    swatch: ['#F3EFEA', '#6B5B4F', '#B4795A'],
    light: {
      background: '#F3EFEA', foreground: '#2B2521', card: '#FFFFFF', cardForeground: '#2B2521',
      popover: '#FFFFFF', popoverForeground: '#2B2521', muted: '#EDE6DE', mutedForeground: '#7A6C60',
      primary: '#6B5B4F', primaryForeground: '#FAF7F3', primaryHover: '#584A40',
      accent: '#B4795A', accentForeground: '#FFFFFF',
      destructive: '#C0392B', destructiveForeground: '#FFFFFF', success: '#5A8A5F', successForeground: '#FFFFFF',
      warning: '#B8873C', warningForeground: '#2B2521', info: '#4E7A8C', infoForeground: '#FFFFFF',
      border: '#E0D6CB', input: '#E0D6CB', ring: '#B4795A', overlay: 'rgba(43, 37, 33, 0.45)',
    },
    dark: {
      background: '#211C19', foreground: '#F3EFEA', card: '#2D2622', cardForeground: '#F3EFEA',
      popover: '#2D2622', popoverForeground: '#F3EFEA', muted: '#382F29', mutedForeground: '#B3A395',
      primary: '#C9B8A8', primaryForeground: '#211C19', primaryHover: '#D9CBBE',
      accent: '#C68A68', accentForeground: '#211C19',
      destructive: '#E07567', destructiveForeground: '#FFFFFF', success: '#7FAE83', successForeground: '#211C19',
      warning: '#D6A966', warningForeground: '#211C19', info: '#7CA6B6', infoForeground: '#211C19',
      border: '#453B34', input: '#453B34', ring: '#C68A68', overlay: 'rgba(0, 0, 0, 0.70)',
    },
  },
  {
    id: 'seashell-mauve',
    label: 'Seashell + Mauve',
    swatch: ['#FBF3F0', '#8E5B6E', '#C98BA0'],
    light: {
      background: '#FBF3F0', foreground: '#2E1F26', card: '#FFFFFF', cardForeground: '#2E1F26',
      popover: '#FFFFFF', popoverForeground: '#2E1F26', muted: '#F4E4E6', mutedForeground: '#7D6169',
      primary: '#8E5B6E', primaryForeground: '#FFFFFF', primaryHover: '#764A5B',
      accent: '#C98BA0', accentForeground: '#FFFFFF',
      destructive: '#C0392B', destructiveForeground: '#FFFFFF', success: '#5A8A6E', successForeground: '#FFFFFF',
      warning: '#C08A4E', warningForeground: '#2E1F26', info: '#6E7FA6', infoForeground: '#FFFFFF',
      border: '#E9D3D8', input: '#E9D3D8', ring: '#C98BA0', overlay: 'rgba(46, 31, 38, 0.45)',
    },
    dark: {
      background: '#241820', foreground: '#FBF3F0', card: '#301F29', cardForeground: '#FBF3F0',
      popover: '#301F29', popoverForeground: '#FBF3F0', muted: '#3B2732', mutedForeground: '#C2A6B0',
      primary: '#D9A8B8', primaryForeground: '#241820', primaryHover: '#E5BCC9',
      accent: '#D296AA', accentForeground: '#241820',
      destructive: '#E88A7D', destructiveForeground: '#FFFFFF', success: '#8FBBA0', successForeground: '#241820',
      warning: '#DDB57C', warningForeground: '#241820', info: '#9AACD1', infoForeground: '#241820',
      border: '#4A3440', input: '#4A3440', ring: '#D296AA', overlay: 'rgba(0, 0, 0, 0.70)',
    },
  },
  {
    id: 'beige-cashmere',
    label: 'Beige + Cashmere',
    swatch: ['#F2E9DC', '#9C8567', '#C6A97E'],
    light: {
      background: '#F2E9DC', foreground: '#2A2118', card: '#FFFFFF', cardForeground: '#2A2118',
      popover: '#FFFFFF', popoverForeground: '#2A2118', muted: '#EAE0CF', mutedForeground: '#736247',
      primary: '#9C8567', primaryForeground: '#FFFFFF', primaryHover: '#846E54',
      accent: '#C6A97E', accentForeground: '#2A2118',
      destructive: '#C0392B', destructiveForeground: '#FFFFFF', success: '#6E8A54', successForeground: '#FFFFFF',
      warning: '#B8873C', warningForeground: '#2A2118', info: '#5E82A0', infoForeground: '#FFFFFF',
      border: '#DDCEB4', input: '#DDCEB4', ring: '#C6A97E', overlay: 'rgba(42, 33, 24, 0.45)',
    },
    dark: {
      background: '#1E1811', foreground: '#F2E9DC', card: '#2A2118', cardForeground: '#F2E9DC',
      popover: '#2A2118', popoverForeground: '#F2E9DC', muted: '#352B1F', mutedForeground: '#BCAB8D',
      primary: '#D8C4A4', primaryForeground: '#1E1811', primaryHover: '#E6D6BC',
      accent: '#CBA97C', accentForeground: '#1E1811',
      destructive: '#E0897A', destructiveForeground: '#FFFFFF', success: '#9BB57E', successForeground: '#1E1811',
      warning: '#DDB56E', warningForeground: '#1E1811', info: '#8CACC4', infoForeground: '#1E1811',
      border: '#453824', input: '#453824', ring: '#CBA97C', overlay: 'rgba(0, 0, 0, 0.70)',
    },
  },
  {
    id: 'vanilla-noir',
    label: 'Vanilla + Noir',
    swatch: ['#FBF6E9', '#171512', '#E0C88A'],
    light: {
      background: '#FBF6E9', foreground: '#1A1815', card: '#FFFFFF', cardForeground: '#1A1815',
      popover: '#FFFFFF', popoverForeground: '#1A1815', muted: '#F3EACD', mutedForeground: '#6B6350',
      primary: '#171512', primaryForeground: '#FBF6E9', primaryHover: '#2A2621',
      accent: '#E0C88A', accentForeground: '#1A1815',
      destructive: '#C0392B', destructiveForeground: '#FFFFFF', success: '#5A8A5F', successForeground: '#FFFFFF',
      warning: '#B8873C', warningForeground: '#1A1815', info: '#4E7A8C', infoForeground: '#FFFFFF',
      border: '#E8DDB8', input: '#E8DDB8', ring: '#E0C88A', overlay: 'rgba(26, 24, 21, 0.50)',
    },
    dark: {
      background: '#100E0C', foreground: '#FBF6E9', card: '#1A1815', cardForeground: '#FBF6E9',
      popover: '#1A1815', popoverForeground: '#FBF6E9', muted: '#242017', mutedForeground: '#B5AC93',
      primary: '#F3EACD', primaryForeground: '#100E0C', primaryHover: '#FFF6DE',
      accent: '#E0C88A', accentForeground: '#100E0C',
      destructive: '#E88A7D', destructiveForeground: '#FFFFFF', success: '#8FBB94', successForeground: '#100E0C',
      warning: '#E0C171', warningForeground: '#100E0C', info: '#8FB2C4', infoForeground: '#100E0C',
      border: '#37311F', input: '#37311F', ring: '#E0C88A', overlay: 'rgba(0, 0, 0, 0.75)',
    },
  },
  {
    id: 'smoky-blue-ivory',
    label: 'Smoky Blue + Ivory',
    swatch: ['#F7F3EA', '#4A6373', '#7A98A6'],
    light: {
      background: '#F7F3EA', foreground: '#1E262C', card: '#FFFFFF', cardForeground: '#1E262C',
      popover: '#FFFFFF', popoverForeground: '#1E262C', muted: '#ECE6D6', mutedForeground: '#5C6B73',
      primary: '#4A6373', primaryForeground: '#FFFFFF', primaryHover: '#3B5160',
      accent: '#7A98A6', accentForeground: '#FFFFFF',
      destructive: '#C0392B', destructiveForeground: '#FFFFFF', success: '#5A8A6E', successForeground: '#FFFFFF',
      warning: '#B8873C', warningForeground: '#1E262C', info: '#4E7A8C', infoForeground: '#FFFFFF',
      border: '#DAD2BE', input: '#DAD2BE', ring: '#7A98A6', overlay: 'rgba(30, 38, 44, 0.45)',
    },
    dark: {
      background: '#141A1E', foreground: '#F7F3EA', card: '#1E262C', cardForeground: '#F7F3EA',
      popover: '#1E262C', popoverForeground: '#F7F3EA', muted: '#28323A', mutedForeground: '#A9B7BE',
      primary: '#9FB6C0', primaryForeground: '#141A1E', primaryHover: '#B4C7CF',
      accent: '#8CA9B6', accentForeground: '#141A1E',
      destructive: '#E0897A', destructiveForeground: '#FFFFFF', success: '#8FBBA0', successForeground: '#141A1E',
      warning: '#DDB56E', warningForeground: '#141A1E', info: '#8FB2C4', infoForeground: '#141A1E',
      border: '#38434B', input: '#38434B', ring: '#8CA9B6', overlay: 'rgba(0, 0, 0, 0.70)',
    },
  },
]

export const DEFAULT_PALETTE_ID = 'monochrome'

export function getPalette(id: string): Palette {
  return PALETTES.find(p => p.id === id) ?? PALETTES[0]
}
