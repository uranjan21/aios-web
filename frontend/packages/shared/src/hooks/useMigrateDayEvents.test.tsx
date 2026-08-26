/**
 * The localStorage -> plan-blocks rescue.
 *
 * This is the one piece of the 2026-08-23 remediation that touches data a user
 * typed, so its failure mode is the thing worth testing: it must NOT clear the
 * local copy unless every upload actually succeeded. Get that wrong and the
 * migration silently destroys the entries it was written to save.
 */
import { describe, expect, it, vi, beforeEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { ReactNode } from 'react'

import { useDayEventsStore } from '../stores/dayEventsStore'
import { useMigrateDayEvents } from './useMigrateDayEvents'

const createPlanBlock = vi.fn()
vi.mock('../api/workspace', () => ({
  workspaceApi: { createPlanBlock: (...args: unknown[]) => createPlanBlock(...args) },
}))

function wrapper({ children }: { children: ReactNode }) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return <QueryClientProvider client={qc}>{children}</QueryClientProvider>
}

beforeEach(() => {
  createPlanBlock.mockReset().mockResolvedValue({})
  useDayEventsStore.setState({ events: [] })
})

describe('useMigrateDayEvents', () => {
  it('does nothing when there is nothing to rescue', async () => {
    renderHook(() => useMigrateDayEvents(), { wrapper })
    await waitFor(() => expect(createPlanBlock).not.toHaveBeenCalled())
  })

  it('uploads each event then clears the local store', async () => {
    useDayEventsStore.setState({
      events: [
        { id: '1', title: 'Standup', date: '2026-08-24', time: '09:30', durationMin: 30, category: 'work' },
        { id: '2', title: 'Gym', date: '2026-08-24', time: '18:00', category: 'health' },
      ],
    })

    renderHook(() => useMigrateDayEvents(), { wrapper })

    await waitFor(() => expect(createPlanBlock).toHaveBeenCalledTimes(2))
    await waitFor(() => expect(useDayEventsStore.getState().events).toHaveLength(0))

    expect(createPlanBlock).toHaveBeenCalledWith(expect.objectContaining({
      block_date: '2026-08-24',
      title: 'Standup',
      start_time: '09:30:00',
      end_time: '10:00:00',
    }))
    // No durationMin -> a one-hour default rather than a zero-length block,
    // which the server rejects.
    expect(createPlanBlock).toHaveBeenCalledWith(expect.objectContaining({
      title: 'Gym', start_time: '18:00:00', end_time: '19:00:00', domain: 'health',
    }))
  })

  it('KEEPS the local copy when an upload fails', async () => {
    createPlanBlock.mockRejectedValueOnce(new Error('network'))
    useDayEventsStore.setState({
      events: [{ id: '1', title: 'Standup', date: '2026-08-24', time: '09:30', category: 'work' }],
    })

    renderHook(() => useMigrateDayEvents(), { wrapper })

    await waitFor(() => expect(createPlanBlock).toHaveBeenCalled())
    // The whole point: a failed rescue must leave the data for the next attempt.
    expect(useDayEventsStore.getState().events).toHaveLength(1)
  })

  it('turns an all-day event into a working day, not a zero-length block', async () => {
    useDayEventsStore.setState({
      events: [{ id: '1', title: 'Leave', date: '2026-08-24', category: 'personal' }],
    })

    renderHook(() => useMigrateDayEvents(), { wrapper })

    await waitFor(() => expect(createPlanBlock).toHaveBeenCalledWith(
      expect.objectContaining({ start_time: '09:00:00', end_time: '17:00:00' }),
    ))
  })

  it('only carries over a category that names a live domain', async () => {
    useDayEventsStore.setState({
      events: [{ id: '1', title: 'Reading', date: '2026-08-24', time: '20:00', category: 'learning' }],
    })

    renderHook(() => useMigrateDayEvents(), { wrapper })

    await waitFor(() => expect(createPlanBlock).toHaveBeenCalled())
    // 'learning' is not a domain the app still has; passing it through would
    // send a value the server does not recognise.
    expect(createPlanBlock.mock.calls[0][0]).not.toHaveProperty('domain')
  })
})
