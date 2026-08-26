/**
 * Render coverage for the two module kinds added on 2026-08-23.
 *
 * These carry the product's differentiator onto the dashboard, and NEITHER was
 * verified in a browser — `/app/*` is auth-gated and the remediation session had
 * no credentials, so typecheck and build were the only gates they passed. These
 * tests are the substitute: they assert the things a walk-through would have
 * caught, namely that each kind mounts, renders its empty state rather than
 * vanishing, and that the handlers a page wires up are actually invoked.
 *
 * The rating handler matters most. `services/insights/synergy.py::_get_threshold`
 * tightens the required correlation once a user's thumbs-down rate passes 40%,
 * so if `onRate` silently stops firing, the engine's only defence against
 * correlation slop goes quiet again with nothing failing.
 */
import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ThemeProvider } from 'styled-components'

import { getTheme } from '../../theme/ctTheme'
import { ModuleGrid } from './ModuleGrid'
import type { ModuleSpec } from './types'

function renderModules(modules: ModuleSpec[]) {
  return render(
    <ThemeProvider theme={getTheme('monochrome', 'light')}>
      <ModuleGrid modules={modules} />
    </ThemeProvider>,
  )
}

describe('discoveries kind', () => {
  const insight = {
    title: 'You spend more on days you sleep less.',
    body: 'Try protecting bedtime for a week and watch the dining-out line.',
    attribution: 'spend x sleep - 34 days',
  }

  it('renders each insight with its title, body and attribution', () => {
    renderModules([{ kind: 'discoveries', title: 'Discoveries', items: [insight] }])

    expect(screen.getByText(insight.title)).toBeDefined()
    expect(screen.getByText(insight.body)).toBeDefined()
    expect(screen.getByText(insight.attribution)).toBeDefined()
  })

  it('shows an empty state instead of rendering nothing', () => {
    // Rendering nothing was the old behaviour and it hid the feature's
    // existence from every user who had no correlations yet.
    renderModules([{ kind: 'discoveries', title: 'Discoveries', items: [] }])

    expect(screen.getByText('Nothing spotted yet')).toBeDefined()
  })

  it('fires onRate with the index and direction', async () => {
    const onRate = vi.fn()
    renderModules([{ kind: 'discoveries', items: [insight], onRate }])

    await userEvent.click(screen.getByLabelText('Helpful'))
    expect(onRate).toHaveBeenCalledWith(0, 1)

    await userEvent.click(screen.getByLabelText('Not helpful'))
    expect(onRate).toHaveBeenCalledWith(0, -1)
  })

  it('renders no rating controls when the page wires no handler', () => {
    // The design gallery mounts every kind without handlers; an inert control
    // is correct there, a crash is not.
    renderModules([{ kind: 'discoveries', items: [insight] }])
    expect(screen.queryByLabelText('Helpful')).toBeNull()
  })

  it('does not fire while a row is busy', async () => {
    const onRate = vi.fn()
    renderModules([{ kind: 'discoveries', items: [{ ...insight, busy: true }], onRate }])

    expect(screen.queryByLabelText('Helpful')).toBeNull()
    expect(onRate).not.toHaveBeenCalled()
  })
})

describe('prose kind', () => {
  it('renders markdown as real elements, not raw text', () => {
    renderModules([{
      kind: 'prose',
      title: 'Your brief',
      markdown: '## Yesterday\n\nYou logged **three** things.\n\n- gym\n- dinner',
    }])

    expect(screen.getByRole('heading', { name: 'Yesterday' })).toBeDefined()
    expect(screen.getByText('three').tagName).toBe('STRONG')
    expect(screen.getAllByRole('listitem')).toHaveLength(2)
  })

  it('falls back to an empty state for a missing or blank brief', () => {
    renderModules([{ kind: 'prose', markdown: '   ', emptyTitle: 'No brief yet' }])
    expect(screen.getByText('No brief yet')).toBeDefined()
  })

  it('does not execute HTML embedded in the markdown', () => {
    // No rehype-raw: this text comes back from an LLM, so live HTML in the
    // dashboard would be an injection surface.
    const { container } = renderModules([{
      kind: 'prose',
      markdown: 'Hello <img src=x onerror="window.__x=1"> world',
    }])

    expect(container.querySelector('img')).toBeNull()
  })
})
