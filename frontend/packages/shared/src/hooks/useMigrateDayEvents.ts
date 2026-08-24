/**
 * One-time rescue of the browser-local day events into server plan blocks.
 *
 * `dayEventsStore` persisted the dashboard's Schedule to localStorage and
 * nothing ever sent it anywhere: entries never reached the server, never synced
 * across devices, and were destroyed by clearing site data — on the app's front
 * door, with no error to tell the user. The Schedule now reads server-backed
 * plan blocks (the same rows `/app/week` writes), which makes the local store
 * dead storage that may still hold real entries somebody typed.
 *
 * So this uploads what is there once, then clears it. It deliberately does NOT
 * run as part of rendering the Schedule: a failed upload must leave the local
 * copy intact so the next load can retry, which is why the store is only
 * cleared after every create has resolved.
 */
import { useEffect, useRef } from 'react'
import { useQueryClient } from '@tanstack/react-query'

import { workspaceApi } from '../api/workspace'
import { useDayEventsStore, type DayEvent } from '../stores/dayEventsStore'

/** `time` + `durationMin` -> the `HH:MM:SS` pair the plan-block API expects. */
function toTimes(e: DayEvent): { start_time: string; end_time: string } {
  // An all-day local event becomes a whole working day rather than a zero-length
  // block, which the server rejects (`_check_block_times` requires end > start).
  if (!e.time) return { start_time: '09:00:00', end_time: '17:00:00' }

  const [h, m] = e.time.split(':').map(Number)
  const startMin = h * 60 + m
  const endMin = Math.min(startMin + (e.durationMin || 60), 23 * 60 + 59)
  const fmt = (mins: number) =>
    `${String(Math.floor(mins / 60)).padStart(2, '0')}:${String(mins % 60).padStart(2, '0')}:00`

  return { start_time: fmt(startMin), end_time: fmt(endMin) }
}

/** Local event categories that happen to name a live domain carry it over. */
const DOMAINS = new Set(['finance', 'health', 'career'])

export function useMigrateDayEvents() {
  const qc = useQueryClient()
  // StrictMode runs effects twice in development; without this the migration
  // would upload every event two times.
  const ran = useRef(false)

  useEffect(() => {
    if (ran.current) return
    ran.current = true

    const { events, clear } = useDayEventsStore.getState()
    if (!events.length) return

    void (async () => {
      try {
        for (const e of events) {
          await workspaceApi.createPlanBlock({
            block_date: e.date,
            title: e.title,
            ...toTimes(e),
            ...(DOMAINS.has(e.category) && { domain: e.category }),
          })
        }
        // Only now: a throw above leaves the local copy for the next attempt.
        clear()
        void qc.invalidateQueries({ queryKey: ['workspace', 'plan-blocks'] })
      } catch {
        // Silent by design — the user did not ask for this and losing nothing
        // is the correct outcome. The entries stay local and it retries later.
      }
    })()
  }, [qc])
}
