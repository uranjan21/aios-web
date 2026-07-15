import type { DefaultTheme } from 'styled-components'
import type { EventCategory } from '@/stores/dayEventsStore'
import type { DomainKey } from './aiosTheme'

/**
 * Day-event categories borrow the five life domains' identity colours, so a
 * "finance" event on the calendar is the same gold as the Finance area, the
 * Finance pulse tile and the Finance sidebar entry.
 *
 * Two categories aren't life domains and are mapped deliberately:
 *   work     -> career  (the professional domain)
 *   personal -> content (the only remaining distinct hue; see note below)
 *   learning -> vault   (knowledge layer)
 *
 * Note: `personal` sharing Content's violet is inherited from the original
 * hardcoded map, not a considered decision — worth revisiting if `personal`
 * and Content events ever appear side by side.
 */
const CATEGORY_DOMAIN: Record<EventCategory, DomainKey> = {
  work: 'career',
  personal: 'content',
  health: 'health',
  finance: 'finance',
  business: 'business',
  learning: 'vault',
}

/** Resolve a day-event category to its domain identity colour. */
export function categoryColor(category: EventCategory, theme: DefaultTheme): string {
  return theme.domain[CATEGORY_DOMAIN[category] ?? 'general']
}
