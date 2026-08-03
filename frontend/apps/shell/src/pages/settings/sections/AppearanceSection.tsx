/**
 * Settings → Appearance.
 *
 * Phase 4 conversion to the canvas's `settings:appearance` composition —
 * controls(12) · rows(6) · controls(6) — driven by the uiStore.
 *
 * ONE DEPARTURE: the canvas's Theme module carries a Density segment and a
 * base-font-size slider. Type scale is a design-system decision made in
 * `packages/ui`, not a user preference; exposing a slider that writes nowhere
 * would be a dead control. Mode and Palette — which are real — stay.
 *
 * TRIMMED TO ONE MODULE, 2026-08-03. Two others were deleted for reporting
 * things rather than setting them: "Layout and motion" showed a count of
 * collapsed nav sections and whether the OS asks for reduced motion, and
 * "Domain colours" was a three-row legend explaining that area colours are
 * fixed. Neither could be acted on.
 *
 * `uiStore` persists exactly three things — `theme`, `palette` and
 * `collapsedSections` — and the first two ARE the module below. So one card is
 * not this tab being thin; it is this tab being complete. Anything more would
 * have to be invented.
 */
import { useMemo } from 'react'
import { Layers } from 'lucide-react'
import { ModuleGrid, type ModuleSpec } from '@ct/shared/components/modules'
import { useUIStore } from '@ct/shared/stores/uiStore'
import { PALETTES } from '@ct/shared/theme/palettes'

export function AppearanceSection() {
  const { theme: mode, setTheme, palette, setPalette } = useUIStore()

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
            /*
             * Each chip shows the whole palette, not one stop: `swatch[0]` is
             * the background, so a chip built from it would render every
             * palette as the same near-neutral. The three stops as a gradient
             * is what the old picker drew, and it is what tells them apart.
             */
            swatches: PALETTES.map((p, i) => ({
              color: `linear-gradient(135deg, ${p.swatch[0]} 0%, ${p.swatch[0]} 33%, ${p.swatch[1]} 33%, ${p.swatch[1]} 66%, ${p.swatch[2]} 66%)`,
              active: i === paletteIndex,
            })),
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
    ]
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, palette])

  return <ModuleGrid modules={modules} />
}
