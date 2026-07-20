import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export type EventCategory = 'work' | 'personal' | 'health' | 'finance' | 'business' | 'learning'

export interface DayEvent {
  id: string
  title: string
  /** YYYY-MM-DD */
  date: string
  /** HH:MM (24h) — omit for all-day */
  time?: string
  /** minutes */
  durationMin?: number
  category: EventCategory
  notes?: string
  done?: boolean
}

interface DayEventsState {
  events: DayEvent[]
  addEvent: (e: Omit<DayEvent, 'id'>) => DayEvent
  updateEvent: (id: string, patch: Partial<DayEvent>) => void
  removeEvent: (id: string) => void
  toggleDone: (id: string) => void
  /** Events on a given YYYY-MM-DD, sorted by time (all-day first). */
  forDate: (date: string) => DayEvent[]
  /** Map of YYYY-MM-DD → count, for the calendar dot indicator. */
  countsByDate: () => Record<string, number>
}

const newId = () =>
  (typeof crypto !== 'undefined' && 'randomUUID' in crypto)
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2)

export const useDayEventsStore = create<DayEventsState>()(
  persist(
    (set, get) => ({
      events: [],
      addEvent: (e) => {
        const event: DayEvent = { id: newId(), ...e }
        set((s) => ({ events: [...s.events, event] }))
        return event
      },
      updateEvent: (id, patch) =>
        set((s) => ({ events: s.events.map((e) => (e.id === id ? { ...e, ...patch } : e)) })),
      removeEvent: (id) => set((s) => ({ events: s.events.filter((e) => e.id !== id) })),
      toggleDone: (id) =>
        set((s) => ({ events: s.events.map((e) => (e.id === id ? { ...e, done: !e.done } : e)) })),
      forDate: (date) =>
        get()
          .events.filter((e) => e.date === date)
          .sort((a, b) => {
            if (!a.time && !b.time) return 0
            if (!a.time) return -1
            if (!b.time) return 1
            return a.time.localeCompare(b.time)
          }),
      countsByDate: () => {
        const map: Record<string, number> = {}
        for (const e of get().events) map[e.date] = (map[e.date] ?? 0) + 1
        return map
      },
    }),
    { name: 'aios-day-events' },
  ),
)

export const fmtDateKey = (d: Date): string => {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

/** Parse a YYYY-MM-DD key as a local date (avoids UTC midnight off-by-one). */
export const parseLocalDate = (key: string): Date => {
  const [y, m, d] = key.split('-').map(Number)
  return new Date(y, m - 1, d)
}
