/**
 * Module specs — the declarative page language from the redesign canvas.
 *
 * A page is an ORDERED list of modules; each declares its `kind`, its column
 * `span` out of 12, and its own payload. Nothing here describes layout or
 * colour: `colorKey` names a semantic slot ('success', 'finance', 'accent'…)
 * which `useModulePalette` resolves against the active theme, so a page
 * definition is data and stays palette-agnostic.
 *
 * Faithful port of `PAGES` + `buildModules` in `Control Tower Redesign.dc.html`,
 * plus three kinds the canvas draws by hand on its hand-designed pages rather
 * than declaring in `PAGES`: `hero`, `meters` and `agenda`.
 */
import type { ReactNode } from 'react'
import type { LucideIcon } from 'lucide-react'

/** A semantic colour slot. Anything not in the palette is passed through as CSS. */
export type ColorKey =
  | 'accent' | 'success' | 'destructive' | 'warning' | 'info'
  | 'finance' | 'health' | 'career'
  | 'fg' | 'mutedFg' | 'muted' | 'border'
  | (string & {})

interface Base {
  span?: number
  title?: string
  subtitle?: string
  icon?: LucideIcon
  /** Tints the card's icon chip. Defaults to the accent. */
  iconKey?: ColorKey
  /** Ghost button in the card header. */
  action?: string
  /*
   * Optional handler for that button. Without it the button renders inert
   * exactly as the canvas drew it, which is what the design gallery needs; a
   * live page passes one in and the button works.
   */
  onAction?: () => void
  /** `primary` fills the button; `link` drops the border. Defaults to ghost. */
  actionVariant?: 'primary' | 'ghost' | 'link'
  /*
   * Escape hatch for header controls a string cannot express — the Budgets
   * status filter, the Transactions filter, the week navigator. Rendered
   * BEFORE `action`, so a page can have both a select and a button. Everything
   * else about a spec stays data; this is the one slot that takes elements,
   * because the canvas puts real form controls in these headers.
   */
  actionNode?: ReactNode
}

export interface RowsModule extends Base {
  kind: 'rows'
  rows: Array<{
    title: string
    meta?: string
    value?: string
    valueKey?: ColorKey
    tagLabel?: string
    tagColorKey?: ColorKey
    /**
     * Two-letter monogram standing in for a merchant logo, same convention as
     * `queue`. Absent, the row starts at its title as it always has.
     */
    mono?: string
    monoKey?: ColorKey
    busy?: boolean
  }>
  /** Optional row affordance — see `ProgressModule.onRowClick`. */
  onRowClick?: (index: number) => void
}

/**
 * A single lead figure with its supporting split — the net-worth card at the
 * top of Finance → Overview. One number is the point of the module, so it is
 * NOT a one-tile `tiles` row: it carries the card shell and the header.
 */
export interface HeroModule extends Base {
  kind: 'hero'
  value: string
  /** Movement line under the value, e.g. "↑ 4.2% vs last month". */
  delta?: string
  deltaKey?: ColorKey
  /** Right-aligned label/value pairs — assets and liabilities. */
  stats?: Array<{ label: string; value: string; colorKey?: ColorKey }>
}

/**
 * A grid of meter cards inside one shell — the Budgets page. `progress` is the
 * same data as a stacked list; this is the canvas's card treatment, where each
 * category is its own tile with a percentage badge and a spent/limit footer.
 */
export interface MetersModule extends Base {
  kind: 'meters'
  /** Line above the grid, e.g. "July 2026 · ₹68,400 of ₹95,000 budgeted spent". */
  summary?: string
  /** Shown in place of the grid when a filter leaves nothing to draw. */
  emptyLabel?: string
  cols?: number
  meters: Array<{
    title: string
    /** Fill percentage, already clamped by the page if it can exceed 100. */
    pct: number
    badge?: string
    colorKey?: ColorKey
    /** Footer pair beneath the track. */
    left?: string
    right?: string
  }>
  /** Optional card affordance — see `ProgressModule.onRowClick`. */
  onMeterClick?: (index: number) => void
}

/**
 * A day's schedule: time gutter, a domain-coloured rule, then the entry. The
 * dashboard's right-hand card. Distinct from `timeline`, which is a dotted
 * thread of things that already happened.
 */
export interface AgendaModule extends Base {
  kind: 'agenda'
  entries: Array<{ time: string; title: string; meta?: string; colorKey?: ColorKey }>
  /** Shown in place of the list when there is nothing scheduled. */
  emptyLabel?: string
  onEntryClick?: (index: number) => void
}

export interface ProgressModule extends Base {
  kind: 'progress'
  rows: Array<{
    title: string
    meta?: string
    value: string
    pct: number
    colorKey?: ColorKey
    /** Colours the value independently of the bar. Defaults to `colorKey`. */
    valueKey?: ColorKey
  }>
  /*
   * Optional row affordance. A progress row is often the only place a page
   * lists its entities, so a live page can make each one open its editor.
   * Absent, rows are static — the canvas's own behaviour.
   */
  onRowClick?: (index: number) => void
}

export interface BarsModule extends Base {
  kind: 'bars'
  bars: Array<{
    label: string
    /** Bar height on the shared axis. With `segments`, this is their total. */
    v: number
    t?: string
    colorKey?: ColorKey
    dim?: boolean
    /**
     * Split the bar into stacked parts, bottom-first.
     *
     * Added 2026-08-05 for Finance -> Goals, which needs contributions broken
     * out per pot. The axis is still MAGNITUDE, so segment values must be
     * positive; a negative total (a net withdrawal month) keeps using the flat
     * bar with a destructive colour, because there is no honest way to stack
     * parts that point in opposite directions.
     */
    segments?: Array<{ v: number; colorKey?: ColorKey; label?: string }>
  }>
  /** Key for the stacked colours, rendered above the plot when present. */
  legend?: Array<{ label: string; colorKey?: ColorKey }>
  /** Y-axis ceiling. Defaults to the tallest bar. */
  max?: number
  /** Draws a dashed reference line at this value. */
  target?: number
  targetLabel?: string
}

export interface DonutModule extends Base {
  kind: 'donut'
  slices: Array<{ label: string; pct: number; value?: string; colorKey?: ColorKey }>
  centerValue?: string
  centerLabel?: string
}

/**
 * A continuous line/area chart — the one shape `bars` cannot draw.
 *
 * `bars` compares discrete categories side by side; this answers "how did this
 * move over time", which Finance -> Investments needs for invested-vs-value and
 * Health -> Body will want for weight. Points stay opaque records so one row of
 * data can feed several lines without the page reshaping it per series.
 */
export interface SeriesModule extends Base {
  kind: 'series'
  /** One entry per plotted line. `key` indexes into each point. */
  lines: Array<{ key: string; label: string; colorKey?: ColorKey; dashed?: boolean }>
  /** Rows of data. Each carries `xKey` plus every line's `key`. */
  points: Array<Record<string, number | string>>
  /** Which field on a point is the x axis. */
  xKey: string
  /** Shown in place of the plot when there is nothing to draw. */
  emptyLabel?: string
  /** Formats axis ticks and tooltip values. Defaults to a plain number. */
  valueFormat?: (n: number) => string
  /** Plot height in px. Defaults to 220. */
  height?: number
}

export interface HeatModule extends Base {
  kind: 'heat'
  dayLabels: string[]
  /** Cell values are intensity steps 0–3, not raw data. */
  habits: Array<{ label: string; cells: number[]; streak: string; broken?: boolean }>
  colorKey?: ColorKey
}

export interface CalendarModule extends Base {
  kind: 'calendar'
  /** Trailing days of the previous month, dimmed. */
  lead?: number[]
  days: number
  /** Leading days of the next month, dimmed. */
  trail?: number[]
  todayLead?: number
  today?: number
  marks?: Record<number, { t: string; k?: ColorKey }>
  legend?: Array<{ label: string; colorKey?: ColorKey }>
}

export interface WeekModule extends Base {
  kind: 'week'
  days: Array<{
    label: string
    date: string
    today?: boolean
    /**
     * A block is clickable only when it carries an `id` AND the page hands in
     * `onBlockClick`. Keyed by id rather than index because a day can mix
     * entities — the planner interleaves editable focus blocks with read-only
     * calendar meetings, and a positional index would not tell them apart.
     */
    blocks?: Array<{ time: string; title: string; colorKey?: ColorKey; id?: string }>
  }>
  onBlockClick?: (id: string) => void
}

export interface TimelineModule extends Base {
  kind: 'timeline'
  entries: Array<{ title: string; body?: string; date?: string; tagLabel?: string; colorKey?: ColorKey }>
  /** Optional entry affordance — see `ProgressModule.onRowClick`. */
  onEntryClick?: (index: number) => void
}

export type TableCell = string | {
  t: string
  bold?: boolean
  /** Render as a chip rather than plain text. */
  tag?: boolean
  colorKey?: ColorKey
}

export interface TableModule extends Base {
  kind: 'table'
  cols: Array<{ l: string; a?: 'left' | 'right' | 'center' }>
  /** Explicit track sizes, e.g. '1.6fr 1fr 1fr 0.8fr'. Defaults to equal columns. */
  gridCols?: string
  rows: TableCell[][]
  /** Optional row affordance — see `ProgressModule.onRowClick`. */
  onRowClick?: (index: number) => void
}

export interface ControlsModule extends Base {
  kind: 'controls'
  rows: Array<{
    title: string
    meta?: string
    control: 'toggle' | 'segment' | 'swatches' | 'slider' | 'select'
    on?: boolean
    options?: string[]
    swatches?: Array<{ color: string; active?: boolean }>
    pct?: number
    value?: string
    /** Greys the control and blocks its handler while a mutation is in flight. */
    busy?: boolean
  }>
  /*
   * Optional controlled mode, same contract as `notes`. Absent, the controls
   * render inert exactly as the canvas drew them — what the gallery needs.
   */
  onToggle?: (index: number, next: boolean) => void
  /** Fired by `segment` and `select` rows with the chosen option. */
  onSelect?: (index: number, value: string) => void
  /** Fired by `swatches` rows with the index of the chip that was picked. */
  onSwatch?: (index: number, swatchIndex: number) => void
}

export interface QueueModule extends Base {
  kind: 'queue'
  rows: Array<{
    /** Two-letter monogram standing in for a merchant logo. */
    mono: string
    title: string
    meta?: string
    amount: string
    amountKey?: ColorKey
    suggestion?: string
    suggestKey?: ColorKey
    primary?: string
    secondary?: string
    /** Tints the row destructive — needs attention. */
    flag?: boolean
    busy?: boolean
  }>
  /** Optional controlled mode — see `notes`. Absent, the buttons are inert. */
  onPrimary?: (index: number) => void
  onSecondary?: (index: number) => void
}

export interface ChecklistModule extends Base {
  kind: 'checklist'
  items: Array<{ label: string; meta?: string; done?: boolean; tagLabel?: string; tagKey?: ColorKey; busy?: boolean }>
  /** Optional controlled mode — see `notes`. Absent, the boxes are inert. */
  onToggle?: (index: number, next: boolean) => void
  /*
   * Optional second group under the list — the dashboard's habit chips, which
   * belong to Today's Focus but are toggles rather than one-off tasks. Absent,
   * the module renders exactly as the canvas's other checklists do.
   */
  groupLabel?: string
  chips?: Array<{ label: string; done?: boolean; colorKey?: ColorKey; busy?: boolean }>
  onChipToggle?: (index: number, next: boolean) => void
}

export interface NotesModule extends Base {
  kind: 'notes'
  prompts: Array<{ label: string; placeholder?: string; height?: string }>
  cta?: string
  /*
   * Optional controlled mode. Without these the module renders as the canvas
   * designed it — an inert composer — which is what the design gallery wants.
   * A real page passes them in and the textareas become live.
   */
  values?: string[]
  onValueChange?: (index: number, value: string) => void
  onSubmit?: () => void
  /** Hides the secondary "Save draft" button when the page has no draft concept. */
  hideDraft?: boolean
  submitting?: boolean
}

/**
 * The Synergy Engine's output — cross-domain correlations the nightly job
 * found, each with a 👍/👎 control.
 *
 * The rating is not decoration. `services/insights/synergy.py::_get_threshold`
 * raises the required |r| from 0.6 to 0.7 once a user's recent 👎 rate passes
 * 40%, which is the product's only defence against correlation slop. Between
 * 2026-08-02 and 2026-08-23 no surface rendered these, so no feedback could be
 * recorded and that guardrail could never engage. If you are tempted to drop
 * this module from a page again: the engine keeps computing and metering
 * either way — removing the surface only hides the result.
 */
/**
 * A block of generated markdown prose — the daily briefing, an agent's last
 * output. Kept deliberately small: headings, emphasis, lists and links, which
 * is everything the briefing prompt actually emits.
 */
export interface ProseModule extends Base {
  kind: 'prose'
  /** Markdown. Rendered with GFM; no raw HTML is allowed through. */
  markdown?: string
  /** Shown instead of the body when `markdown` is empty or absent. */
  emptyTitle?: string
  emptyLabel?: string
}

export interface DiscoveriesModule extends Base {
  kind: 'discoveries'
  items: Array<{
    title: string
    body: string
    /** e.g. "spend x sleep - last 34 days". Rendered under the body. */
    attribution?: string
    /** Already-rated items dim their controls rather than hiding them. */
    rated?: 1 | -1 | null
    busy?: boolean
  }>
  /** Absent, the controls render inert — what the design gallery wants. */
  onRate?: (index: number, feedback: 1 | -1) => void
  onDismiss?: (index: number) => void
  /** Shown when `items` is empty, in place of the list. */
  emptyTitle?: string
  emptyLabel?: string
}

export interface SpansModule extends Base {
  kind: 'spans'
  /** Tick labels across the fixed axis. */
  axis: string[]
  nights: Array<{
    label: string
    /** Percentages along the axis. */
    start: number
    width: number
    duration: string
    quality: string
    colorKey?: ColorKey
  }>
}

export interface TilesModule extends Base {
  kind: 'tiles'
  /** Explicit grid tracks. Defaults to auto-fit at 190px. */
  tileCols?: string
  cols?: number
  tiles: Array<{
    label: string
    value: string
    sub?: string
    subKey?: ColorKey
    badge?: string
    badgeKey?: ColorKey
    dotKey?: ColorKey
    bar?: number
    barKey?: ColorKey
    /** Fills the tile with the accent wash. */
    accent?: boolean
  }>
  /** Optional tile affordance — see `ProgressModule.onRowClick`. */
  onTileClick?: (index: number) => void
}

export interface KanbanModule extends Base {
  kind: 'kanban'
  tileCols?: string
  cols?: number
  columns: Array<{
    label: string
    count: number | string
    colorKey?: ColorKey
    cards: Array<{ title: string; meta?: string; tagLabel?: string; tagKey?: ColorKey }>
  }>
  /**
   * Optional card affordance. The index counts cards across ALL columns in
   * column order, so a page flattens its own list the same way to map back.
   */
  onCardClick?: (index: number) => void
}

export interface AgentsModule extends Base {
  kind: 'agents'
  tileCols?: string
  cols?: number
  agents: Array<{
    name: string
    schedule: string
    icon?: LucideIcon
    iconKey?: ColorKey
    on?: boolean
    /** Success ratio per recent run, 0–1. 0 renders as "did not run". */
    runs: number[]
    lastRun: string
    successPct: string
    statusKey?: ColorKey
    log: string
  }>
  /** Optional controlled mode — see `notes`. Absent, the cards are inert. */
  onToggle?: (index: number, next: boolean) => void
  onCardClick?: (index: number) => void
}

export interface ChatModule extends Base {
  kind: 'chat'
  placeholder?: string
  context?: Array<{ label: string; colorKey?: ColorKey }>
  threads: Array<{ title: string; meta: string; active?: boolean; colorKey?: ColorKey }>
  messages: Array<{ role: 'user' | 'assistant'; text: string; time: string }>
  suggestions?: Array<{ label: string }>
}

export type ModuleSpec =
  | RowsModule | ProgressModule | BarsModule | DonutModule | SeriesModule | HeatModule
  | CalendarModule | WeekModule | TimelineModule | TableModule | ControlsModule
  | QueueModule | ChecklistModule | NotesModule | SpansModule
  | TilesModule | KanbanModule | AgentsModule | ChatModule
  | HeroModule | MetersModule | AgendaModule | DiscoveriesModule | ProseModule

/**
 * Kinds that render WITHOUT the card shell — they are grids of their own
 * cards, so wrapping them would double the chrome.
 */
export const BARE_KINDS = new Set(['tiles', 'kanban', 'chat', 'agents'])
