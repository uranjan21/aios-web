import type { DefaultTheme } from 'styled-components'

/**
 * Shared tone vocabulary for the lumina primitives (StatusPill, IconBadge).
 *
 * Previously each component carried its own hardcoded hex map with light-tuned
 * `rgba(...)` surfaces, so both were wrong in dark mode. Resolving through the
 * theme here means one place to change, and both modes work for free.
 *
 * Tones split into two kinds:
 *   - SEMANTIC (primary/emerald/blue/red/amber/accent/neutral) → theme tokens.
 *   - DECORATIVE (purple/indigo) → fixed hues with no semantic meaning. These
 *     are deliberately NOT mapped onto domain tokens: a domain colour is an
 *     identity, and colouring a random badge violet doesn't make it Content.
 *     Both are currently unused by any call site — kept because they're part of
 *     the exported type.
 */
export type LuminaTone =
  | 'neutral'
  | 'primary'
  | 'emerald'
  | 'blue'
  | 'indigo'
  | 'purple'
  | 'red'
  | 'amber'
  | 'accent'
  | 'muted'

/** Decorative-only hues, mode-aware. Not semantic, not domain identity. */
const DECORATIVE = {
  purple: { light: '#7C3AED', dark: '#8B5CF6' },
  indigo: { light: '#4F46E5', dark: '#6366F1' },
} as const

/** Foreground colour for a tone. */
export function toneColor(tone: LuminaTone, theme: DefaultTheme): string {
  switch (tone) {
    case 'primary': return theme.color.accent
    case 'emerald': return theme.color.success
    case 'blue': return theme.color.info
    case 'red': return theme.color.destructive
    // `accent` was a one-off terracotta (#f4a261) used only for the "expired"
    // integration state — warning is what it actually means.
    case 'amber':
    case 'accent': return theme.color.warning
    case 'purple': return DECORATIVE.purple[theme.mode]
    case 'indigo': return DECORATIVE.indigo[theme.mode]
    case 'neutral': return theme.color.mutedForeground
    case 'muted': return 'inherit'
  }
}

/** Matching low-alpha surface behind a tone. */
export function toneSurface(tone: LuminaTone, theme: DefaultTheme): string {
  if (tone === 'muted') return 'transparent'
  if (tone === 'neutral') {
    return `color-mix(in srgb, ${theme.color.foreground} 6%, transparent)`
  }
  // Dark grounds need a slightly hotter wash to read at the same weight.
  const pct = theme.mode === 'dark' ? 16 : 10
  return `color-mix(in srgb, ${toneColor(tone, theme)} ${pct}%, transparent)`
}
