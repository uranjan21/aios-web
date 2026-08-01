import { useMemo } from 'react'
import { useTheme } from 'styled-components'
import type { ColorKey } from './types'

/**
 * Resolves a module spec's semantic `colorKey` to a real colour.
 *
 * The design canvas did this with a flat `c` lookup object per mode. Here the
 * same slots are assembled from the live theme, so modules repaint with the
 * active palette instead of being pinned to the taupe hexes the canvas hardcoded.
 *
 * Unknown keys pass THROUGH unchanged, matching the canvas: that lets a spec
 * hand in a literal colour where a semantic slot would be wrong (chart series,
 * a brand colour), without needing a token for it.
 */
export interface ModulePalette {
  (key?: ColorKey): string
  /** `alpha('success', 0.12)` -> the success colour at 12% — for chip fills. */
  alpha: (key: ColorKey | undefined, a: number) => string
}

export function useModulePalette(): ModulePalette {
  const theme = useTheme()

  return useMemo(() => {
    const slots: Record<string, string> = {
      accent: theme.color.accent,
      accentForeground: theme.color.accentForeground,
      success: theme.color.success,
      destructive: theme.color.destructive,
      warning: theme.color.warning,
      info: theme.color.info,
      finance: theme.domain.finance,
      health: theme.domain.health,
      career: theme.domain.career,
      fg: theme.color.foreground,
      mutedFg: theme.color.mutedForeground,
      muted: theme.color.muted,
      border: theme.color.border,
      card: theme.color.card,
      bg: theme.color.background,
    }

    const resolve = ((key?: ColorKey) =>
      (key && slots[key]) || key || theme.color.mutedForeground) as ModulePalette

    /*
     * Hex + 2-digit alpha suffix, exactly as the canvas composed its chip
     * fills (`${color}20`). Falls back to color-mix for non-hex inputs so a
     * literal rgb()/named colour still produces a translucent wash.
     */
    resolve.alpha = (key, a) => {
      const base = resolve(key)
      if (/^#[0-9a-f]{6}$/i.test(base)) {
        return base + Math.round(Math.max(0, Math.min(1, a)) * 255).toString(16).padStart(2, '0')
      }
      return `color-mix(in srgb, ${base} ${Math.round(a * 100)}%, transparent)`
    }

    return resolve
  }, [theme])
}

/** Clamp to a CSS percentage. */
export const pct = (n: number) => `${Math.max(0, Math.min(100, n))}%`
