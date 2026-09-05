import { describe, it, expect, afterEach } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ThemeProvider } from 'styled-components'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { ctLightTheme } from '../theme/ctTheme'
import { AI_KEYS_SETTINGS_PATH, NeedsApiKey, isMissingKeyError } from './NeedsApiKey'

/**
 * The BYOK refusal path.
 *
 * With billing deleted there is exactly ONE reason an AI surface can refuse:
 * the account has no provider key. The backend says so with **428**, chosen
 * precisely because 402 used to mean "pay us" and must never be revived.
 *
 * The discrimination is the whole point. Treating every failure as "add a key"
 * would tell a user with a perfectly good key to go re-enter it while the real
 * fault (a 500) goes unreported — so the negative cases below matter more than
 * the positive one.
 */
afterEach(cleanup)

function renderPrompt(feature?: string) {
  return render(
    <ThemeProvider theme={ctLightTheme}>
      <MemoryRouter initialEntries={['/app/chat']}>
        <Routes>
          <Route path="/app/chat" element={<NeedsApiKey feature={feature} />} />
          <Route path={AI_KEYS_SETTINGS_PATH} element={<div>AI settings landed</div>} />
        </Routes>
      </MemoryRouter>
    </ThemeProvider>,
  )
}

describe('isMissingKeyError', () => {
  it('is true for 428 — the only status that means "no key configured"', () => {
    expect(isMissingKeyError({ response: { status: 428 } })).toBe(true)
  })

  it('is FALSE for a 500 — a server fault must surface as a server fault', () => {
    expect(isMissingKeyError({ response: { status: 500 } })).toBe(false)
    expect(isMissingKeyError({ response: { status: 502 } })).toBe(false)
  })

  it('is FALSE for 402 — billing is gone and must never resurrect this prompt', () => {
    expect(isMissingKeyError({ response: { status: 402 } })).toBe(false)
  })

  it('is FALSE for the other 4xx the app handles elsewhere', () => {
    // 401 belongs to the axios refresh interceptor; 403/404 are legitimate
    // "not yours / not there" answers.
    for (const status of [400, 401, 403, 404, 422, 429]) {
      expect(isMissingKeyError({ response: { status } })).toBe(false)
    }
  })

  it('is FALSE for a transport error with no response at all', () => {
    expect(isMissingKeyError(new Error('Network Error'))).toBe(false)
    expect(isMissingKeyError(null)).toBe(false)
    expect(isMissingKeyError(undefined)).toBe(false)
    expect(isMissingKeyError({})).toBe(false)
  })

  it('does not match on a status hidden somewhere other than `response`', () => {
    expect(isMissingKeyError({ status: 428 })).toBe(false)
  })
})

describe('NeedsApiKey', () => {
  it('explains the cost model rather than implying a paywall', () => {
    renderPrompt()
    expect(screen.getByText('Add your AI key')).toBeDefined()
    // The copy must keep saying Control Tower charges nothing — this is the
    // sentence that stops it reading as the old UpgradeWall.
    expect(screen.getByText(/charges nothing/i)).toBeDefined()
    expect(screen.queryByText(/upgrade/i)).toBeNull()
    expect(screen.queryByText(/subscri/i)).toBeNull()
  })

  it('names the feature that was refused, so the prompt is not generic', () => {
    renderPrompt('AI area analysis')
    expect(screen.getByText(/AI area analysis/)).toBeDefined()
  })

  it('deep-links to the one page where a key is entered', async () => {
    renderPrompt()
    await userEvent.click(screen.getByRole('button', { name: /add a key/i }))
    expect(screen.getByText('AI settings landed')).toBeDefined()
  })

  it('points at the AI settings tab, not the settings root', () => {
    // A regression to '/app/settings' would drop the user on Profile with no
    // sign of where the key goes.
    expect(AI_KEYS_SETTINGS_PATH).toBe('/app/settings/ai')
  })
})
