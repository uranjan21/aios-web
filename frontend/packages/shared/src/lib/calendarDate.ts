/**
 * Calendar-date helpers — for `YYYY-MM-DD` values that mean "a day", not "an
 * instant".
 *
 * `toISOString().slice(0,10)` is wrong for these: it converts local midnight
 * to UTC, so east of UTC (IST is +5:30) every date shifts back a day — Monday
 * 27 July is stored as Sunday 26 July. Symmetrically, `new Date('2026-08-09')`
 * parses as UTC midnight, which renders as 8 August anywhere west of UTC.
 *
 * The same trap already bit the finance `logged_at` fields; see the note in
 * `frontend/CLAUDE.md`. Use these two helpers for any date-only field.
 */

/** A `Date` (in local time) -> `YYYY-MM-DD` for that LOCAL day. */
export function toCalendarDate(d: Date): string {
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${d.getFullYear()}-${month}-${day}`
}

/** `YYYY-MM-DD` -> a `Date` at LOCAL midnight on that day. */
export function fromCalendarDate(value: string): Date {
  const [y, m, d] = value.slice(0, 10).split('-').map(Number)
  return new Date(y, (m ?? 1) - 1, d ?? 1)
}

/** Whole days from today to `value`. Negative is in the past; null if absent. */
export function daysUntil(value?: string | null): number | null {
  if (!value) return null
  const target = fromCalendarDate(value)
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  return Math.round((target.getTime() - today.getTime()) / 86_400_000)
}
