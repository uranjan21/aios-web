/**
 * Palette contrast gate.
 *
 *   node --experimental-strip-types scripts/palette-contrast.ts
 *   node --experimental-strip-types scripts/palette-contrast.ts --all   # + advisory
 *
 * Guards the soft-colour rule in `packages/shared/src/theme/palettes.ts`. The
 * palettes are deliberately muted, and the failure mode of "make it softer" is
 * washing text out until it stops being readable. This is the floor that stops
 * that: every pair a user actually reads must clear WCAG AA.
 *
 * ENFORCED (exit 1):
 *   - foreground / cardForeground / popoverForeground on their own surface  7:1
 *   - mutedForeground on background, card and muted                       4.5:1
 *   - every *Foreground on the fill it sits on (primary, accent, semantics) 4.5:1
 *   - semantic hues used AS TEXT on background and card                   4.5:1
 *
 * ADVISORY (--all, never fails the build):
 *   - accent-as-text, and semantic-as-text on the `muted` surface. No palette
 *     has ever passed these, including every pre-soften version — an accent is
 *     a fill and a tint, and holding it to a body-text floor would force it to
 *     collapse into `primary`. Listed so the numbers stay visible, not to gate.
 *   - border against its surrounding surfaces (decorative, no WCAG floor).
 */
import { PALETTES, type PaletteColors } from '../packages/shared/src/theme/palettes.ts'

const AA = 4.5
const AAA_BODY = 7

function luminance(hex: string): number {
  const h = hex.replace('#', '')
  const [r, g, b] = [0, 2, 4]
    .map(i => parseInt(h.slice(i, i + 2), 16) / 255)
    .map(c => (c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4)))
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}

function contrast(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x)
  return (hi + 0.05) / (lo + 0.05)
}

interface Check { label: string; fg: string; bg: string; floor: number }

function enforced(c: PaletteColors): Check[] {
  const out: Check[] = [
    { label: 'foreground on background', fg: c.foreground, bg: c.background, floor: AAA_BODY },
    { label: 'cardForeground on card', fg: c.cardForeground, bg: c.card, floor: AAA_BODY },
    { label: 'popoverForeground on popover', fg: c.popoverForeground, bg: c.popover, floor: AAA_BODY },
    { label: 'primaryForeground on primary', fg: c.primaryForeground, bg: c.primary, floor: AA },
    { label: 'primaryForeground on primaryHover', fg: c.primaryForeground, bg: c.primaryHover, floor: AA },
    { label: 'accentForeground on accent', fg: c.accentForeground, bg: c.accent, floor: AA },
    { label: 'destructiveForeground on destructive', fg: c.destructiveForeground, bg: c.destructive, floor: AA },
    { label: 'successForeground on success', fg: c.successForeground, bg: c.success, floor: AA },
    { label: 'warningForeground on warning', fg: c.warningForeground, bg: c.warning, floor: AA },
    { label: 'infoForeground on info', fg: c.infoForeground, bg: c.info, floor: AA },
  ]
  for (const [name, surface] of [['background', c.background], ['card', c.card], ['muted', c.muted]] as const) {
    out.push({ label: `mutedForeground on ${name}`, fg: c.mutedForeground, bg: surface, floor: AA })
  }
  // Semantic hues are used as text far more often than as fills (63 `color.destructive`
  // sites at last count, 18 of them backgrounds), so they carry a text floor too.
  for (const [name, surface] of [['background', c.background], ['card', c.card]] as const) {
    for (const k of ['destructive', 'success', 'warning', 'info'] as const) {
      out.push({ label: `${k} as text on ${name}`, fg: c[k], bg: surface, floor: AA })
    }
  }
  return out
}

function advisory(c: PaletteColors): Check[] {
  const out: Check[] = []
  for (const [name, surface] of [['background', c.background], ['card', c.card], ['muted', c.muted]] as const) {
    out.push({ label: `accent as text on ${name}`, fg: c.accent, bg: surface, floor: AA })
    out.push({ label: `border on ${name}`, fg: c.border, bg: surface, floor: 1.2 })
  }
  for (const k of ['destructive', 'success', 'warning', 'info'] as const) {
    out.push({ label: `${k} as text on muted`, fg: c[k], bg: c.muted, floor: AA })
  }
  return out
}

const showAdvisory = process.argv.includes('--all')
let failures = 0
let passes = 0

for (const palette of PALETTES) {
  for (const mode of ['light', 'dark'] as const) {
    for (const { label, fg, bg, floor } of enforced(palette[mode])) {
      const r = contrast(fg, bg)
      if (r < floor) {
        failures++
        console.error(
          `FAIL  ${palette.id}/${mode}  ${label} — ${r.toFixed(2)}:1 < ${floor}:1  (${fg} on ${bg})`,
        )
      } else passes++
    }
    if (showAdvisory) {
      for (const { label, fg, bg, floor } of advisory(palette[mode])) {
        const r = contrast(fg, bg)
        if (r < floor) console.warn(`  advisory  ${palette.id}/${mode}  ${label} — ${r.toFixed(2)}:1`)
      }
    }
  }
}

if (failures) {
  console.error(`\n${failures} contrast failure(s) across ${PALETTES.length} palettes.`)
  process.exit(1)
}
console.log(`palette-contrast: ${passes} enforced pairs pass across ${PALETTES.length} palettes (light + dark).`)
