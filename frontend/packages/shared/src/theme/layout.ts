/**
 * App-level layout constants — the single source of truth for structural
 * dimensions. Import from here; never hardcode these values in components.
 *
 * All values are multiples of the 12pt base unit where applicable.
 */

/*
 * NOTE: this file deliberately exports NO `spacing` scale.
 *
 * It used to export a 12pt one whose keys collided with `@ledgr/ui`'s 4pt
 * `theme.spacing` — same shape, 3× the value at every step (`spacing[4]` was
 * 48px here and 16px there). That exact collision already cost this project
 * once (2026-07-13: a `buildTheme()` spacing override tripled all 121 internal
 * ledgr-ui usages). Its last importer is gone; it stays gone.
 *
 * Structural dimensions belong here as NAMED constants. Anything measured on a
 * scale comes from `theme.spacing`.
 */

/** Left navigation sidebar — expanded and collapsed widths */
export const SIDEBAR_NAV_WIDTH = '228px'            // 19 × 12pt
export const SIDEBAR_NAV_COLLAPSED_WIDTH = '60px'   // 5 × 12pt

/** Workspace layout secondary rail (WorkspaceLayout) */
export const SIDEBAR_WIDTH = '288px'        // 24 × 12pt

/** Settings page side-rail width */
export const SETTINGS_RAIL_WIDTH = '264px'  // 22 × 12pt

/** Global top bar height */
export const TOPBAR_HEIGHT = '60px'         // 5 × 12pt

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
