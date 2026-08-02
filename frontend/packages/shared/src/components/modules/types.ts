/**
 * Module specs — the declarative page language from the redesign canvas.
 *
 * A page is an ORDERED list of modules; each declares its `kind`, its column
 * `span` out of 12, and its own payload. Nothing here describes layout or
 * colour: `colorKey` names a semantic slot ('success', 'finance', 'accent'…)
 * which `useModulePalette` resolves against the active theme, so a page
 * definition is data and stays palette-agnostic.
 *
 * Faithful port of `PAGES` + `buildModules` in `Control Tower Redesign.dc.html`.
 */
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
}

export interface RowsModule extends Base {
  kind: 'rows'
  rows: Array<{ title: string; meta?: string; value?: string; tagLabel?: string; tagColorKey?: ColorKey; busy?: boolean }>
  /** Optional row affordance — see `ProgressModule.onRowClick`. */
  onRowClick?: (index: number) => void
}

export interface ProgressModule extends Base {
  kind: 'progress'
  rows: Array<{ title: string; meta?: string; value: string; pct: number; colorKey?: ColorKey }>
  /*
   * Optional row affordance. A progress row is often the only place a page
   * lists its entities, so a live page can make each one open its editor.
   * Absent, rows are static — the canvas's own behaviour.
   */
  onRowClick?: (index: number) => void
}

export interface BarsModule extends Base {
  kind: 'bars'
  bars: Array<{ label: string; v: number; t?: string; colorKey?: ColorKey; dim?: boolean }>
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
    blocks?: Array<{ time: string; title: string; colorKey?: ColorKey }>
  }>
}

export interface TimelineModule extends Base {
  kind: 'timeline'
  entries: Array<{ title: string; body?: string; date?: string; tagLabel?: string; colorKey?: ColorKey }>
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
  | RowsModule | ProgressModule | BarsModule | DonutModule | HeatModule
  | CalendarModule | WeekModule | TimelineModule | TableModule | ControlsModule
  | QueueModule | ChecklistModule | NotesModule | SpansModule
  | TilesModule | KanbanModule | AgentsModule | ChatModule

/**
 * Kinds that render WITHOUT the card shell — they are grids of their own
 * cards, so wrapping them would double the chrome.
 */
export const BARE_KINDS = new Set(['tiles', 'kanban', 'chat', 'agents'])
