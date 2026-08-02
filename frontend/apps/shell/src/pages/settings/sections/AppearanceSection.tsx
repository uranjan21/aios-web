/**
 * Settings → Appearance.
 *
 * Phase 4 conversion to the canvas's `settings:appearance` composition —
 * controls(12) · rows(6) · controls(6) — driven by the uiStore.
 *
 * TWO DEPARTURES, both because the setting the canvas draws does not exist:
 *  - Its Theme module carries a Density segment and a base-font-size slider.
 *    Type scale is a design-system decision made in `packages/ui`, not a user
 *    preference; exposing a slider that writes nowhere would be a dead control.
 *    Mode and Palette — which are real — stay.
 *  - Its "Layout and motion" module lists four toggles. Only "start with the
 *    sidebar collapsed" is stored; reduce-motion already follows the OS
 *    `prefers-reduced-motion`, and is shown as a read-only state rather than a
 *    switch that would silently disagree with the system setting.
 */
import { useMemo } from 'react'
import { Layers, LayoutGrid, Settings as SettingsIcon } from 'lucide-react'
import { useTheme } from 'styled-components'
import { ModuleGrid, type ModuleSpec } from '@ct/shared/components/modules'
import { useUIStore } from '@ct/shared/stores/uiStore'
import { PALETTES } from '@ct/shared/theme/palettes'
import { ACTIVE_DOMAINS } from '@ct/shared/config/domains'

export function AppearanceSection() {
  const theme = useTheme()
  const { theme: mode, setTheme, palette, setPalette, collapsedSections } = useUIStore()

  const prefersReducedMotion = typeof window !== 'undefined'
    && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches

  const modules = useMemo<ModuleSpec[]>(() => {
    const paletteIndex = PALETTES.findIndex(p => p.id === palette)

    return [
      {
        kind: 'controls',
        span: 12,
        title: 'Theme',
        subtitle: 'Applies instantly across every area',
        icon: Layers,
        rows: [
          {
            title: 'Palette',
            meta: PALETTES[paletteIndex]?.label ?? 'Custom',
            control: 'swatches',
            // One chip per palette, its own first swatch as the colour.
            swatches: PALETTES.map((p, i) => ({ color: p.swatch[0], active: i === paletteIndex })),
          },
          {
            title: 'Mode',
            meta: 'Light or dark chrome',
            control: 'segment',
            options: ['Light', 'Dark'],
            value: mode === 'dark' ? 'Dark' : 'Light',
          },
        ],
        onSelect: (i: number, value: string) => {
          if (i === 1) setTheme(value === 'Dark' ? 'dark' : 'light')
        },
        onSwatch: (i: number, swatchIndex: number) => {
          if (i === 0) setPalette(PALETTES[swatchIndex].id)
        },
      },
      {
        kind: 'rows',
        span: 6,
        title: 'Domain colours',
        subtitle: 'Fixed per area so nav keeps its meaning',
        icon: LayoutGrid,
        rows: ACTIVE_DOMAINS.map(d => ({
          title: d.label,
          meta: (theme.color as Record<string, string>)[d.key] ?? 'Theme default',
          tagLabel: '●●●',
          tagColorKey: d.key,
        })),
      },
      /*
       * Read-only `rows`, not `controls`: both of these are state the app
       * derives rather than a preference it stores, so rendering switches here
       * would put controls on screen that write nowhere.
       */
      {
        kind: 'rows',
        span: 6,
        title: 'Layout and motion',
        subtitle: 'Chrome behaviour and animation',
        icon: SettingsIcon,
        rows: [
          {
            title: 'Collapsed nav sections',
            meta: 'Remembered per section as you collapse them in the sidebar',
            value: String(Object.values(collapsedSections ?? {}).filter(Boolean).length),
          },
          {
            title: 'Reduce motion',
            meta: 'Follows your system setting',
            tagLabel: prefersReducedMotion ? 'On' : 'Off',
            tagColorKey: prefersReducedMotion ? 'success' : 'mutedFg',
          },
        ],
      },
    ]
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, palette, collapsedSections, prefersReducedMotion, theme])

  return <ModuleGrid modules={modules} />
}
