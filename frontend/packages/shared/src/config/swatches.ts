/**
 * User-facing colour swatches — the palette a user picks from to tag a project,
 * budget or category with a colour.
 *
 * These are DATA, not theme. The chosen hex is persisted to the database and
 * rendered back as a stripe/dot, so they are deliberately fixed, distinct hues
 * that must NOT track the active theme — a project the user coloured "Rose"
 * should stay rose in every palette and both modes.
 *
 * They live here, and this file is on the token-lint theme allowlist, for two
 * reasons: it removes the near-duplicate 6-colour lists that ProjectsPage and
 * QuickAddBudget each carried (with subtly different hexes for the same names),
 * and it marks these hexes as an intentional palette definition rather than
 * styling drift.
 */
export interface SwatchColor {
  label: string;
  value: string;
}

/** The canonical swatch set. First entry is the no-colour option. */
export const SWATCH_COLORS: SwatchColor[] = [
  { label: 'None', value: '' },
  { label: 'Amber', value: '#CA8A04' },
  { label: 'Teal', value: '#0D9488' },
  { label: 'Emerald', value: '#10B981' },
  { label: 'Blue', value: '#3B82F6' },
  { label: 'Violet', value: '#8B5CF6' },
  { label: 'Rose', value: '#F43F5E' },
  { label: 'Orange', value: '#F97316' },
  { label: 'Slate', value: '#64748B' },
];

/** Swatch options excluding the "None" entry, for pickers that require a colour. */
export const SWATCH_COLORS_REQUIRED: SwatchColor[] = SWATCH_COLORS.filter((c) => c.value !== '');
