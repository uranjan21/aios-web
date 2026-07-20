/**
 * App-level layout constants — the single source of truth for structural
 * dimensions. Import from here; never hardcode these values in components.
 *
 * All values are multiples of the 12pt base unit where applicable.
 */

/**
 * 12pt spacing scale for app-level structural spacing (section gaps, page
 * padding, card-to-card distance). Key × 12 = pixel value.
 *
 * Use this for layout decisions. For component-internal spacing (button
 * padding, form field gaps) use theme.spacing from the DS instead.
 */
export const spacing = {
  0:   '0',
  px:  '1px',
  0.5: '6px',
  1:   '12px',
  2:   '24px',
  3:   '36px',
  4:   '48px',
  5:   '60px',
  6:   '72px',
  8:   '96px',
  10:  '120px',
  12:  '144px',
  16:  '192px',
  20:  '240px',
  24:  '288px',
} as const

/** Left navigation sidebar — expanded and collapsed widths */
export const SIDEBAR_NAV_WIDTH = '228px'            // 19 × 12pt
export const SIDEBAR_NAV_COLLAPSED_WIDTH = '60px'   // 5 × 12pt

/** Workspace layout secondary rail (WorkspaceLayout) */
export const SIDEBAR_WIDTH = '288px'        // 24 × 12pt

/** Settings page side-rail width */
export const SETTINGS_RAIL_WIDTH = '264px'  // 22 × 12pt

/** Global top bar height */
export const TOPBAR_HEIGHT = '48px'         // 4 × 12pt

/** Mobile bottom nav height */
export const BOTTOM_NAV_HEIGHT = '60px'     // 5 × 12pt

/** Maximum content column width */
export const PAGE_MAX_WIDTH = '1440px'

/** Page-level horizontal padding at each breakpoint */
export const PAGE_PADDING = {
  mobile:  '12px',   // 1 × 12pt
  tablet:  '24px',   // 2 × 12pt
  desktop: '36px',   // 3 × 12pt
} as const

/** Command palette max-width */
export const COMMAND_PALETTE_WIDTH = '504px'  // 42 × 12pt

/** Assistant drawer default dimensions */
export const ASSISTANT = {
  width:      '420px',   // 35 × 12pt
  minHeight:  '480px',   // 40 × 12pt
  historyRail: '264px',  // 22 × 12pt — matches SETTINGS_RAIL_WIDTH
} as const
