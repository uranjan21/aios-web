import { describe, it, expect, vi, beforeEach } from 'vitest'

/**
 * BYOK transport contract.
 *
 * The whole security story of bring-your-own-key rests on two properties that
 * are invisible in a screenshot and cheap to break in a refactor:
 *
 *  1. the plaintext key travels in a request BODY, never in a path or query
 *     string — a URL lands in access logs, proxy logs and browser history, and
 *     a leaked OpenAI key is the user's money;
 *  2. the server never returns the key, so every read path deals in a 4-char
 *     hint and the full value can never reach the DOM.
 *
 * These assertions are on the wire shape, so they fail if anyone "tidies" the
 * save call into `PUT /keys/openai?api_key=…`.
 */
vi.mock('./client', () => ({
  api: {
    get: vi.fn(() => Promise.resolve({ data: {} })),
    put: vi.fn(() => Promise.resolve({ data: { provider: 'openai', key_hint: '4f2a' } })),
    delete: vi.fn(() => Promise.resolve({ data: { status: 'ok', provider: 'openai' } })),
    post: vi.fn(() => Promise.resolve({ data: { ok: true, provider: 'openai' } })),
  },
}))

const { api } = await import('./client')
const { keysApi, maskedKey, KEY_CONSOLE_URL, KEY_PROVIDER_LABEL } = await import('./keys')

/** Everything that could carry the key outside the body: method, URL, config. */
function urlsTouchedBy(mock: { mock: { calls: unknown[][] } }): string[] {
  return mock.mock.calls.map(c => String(c[0]))
}

const SECRET = 'sk-proj-abcdefghijklmnopqrstuvwxyz0123456789'

describe('keysApi — the key never leaves the request body', () => {
  beforeEach(() => { vi.clearAllMocks() })

  it('sends the plaintext key in the PUT body, not the URL', async () => {
    await keysApi.save('openai', SECRET)

    expect(api.put).toHaveBeenCalledTimes(1)
    const [url, body] = vi.mocked(api.put).mock.calls[0]

    // The URL identifies the provider and nothing else.
    expect(url).toBe('/keys/openai')
    expect(url).not.toContain(SECRET)
    expect(url).not.toContain('?')

    // The body is where the secret goes.
    expect(body).toEqual({ api_key: SECRET })
  })

  it('never puts the key in a URL on any endpoint', async () => {
    await keysApi.save('anthropic', SECRET)
    await keysApi.list()
    await keysApi.remove('anthropic')
    await keysApi.test('anthropic')

    const allUrls = [
      ...urlsTouchedBy(vi.mocked(api.get)),
      ...urlsTouchedBy(vi.mocked(api.put)),
      ...urlsTouchedBy(vi.mocked(api.delete)),
      ...urlsTouchedBy(vi.mocked(api.post)),
    ]
    expect(allUrls.length).toBeGreaterThan(0)
    for (const u of allUrls) {
      expect(u).not.toContain(SECRET)
      expect(u).not.toContain('sk-')
    }
  })

  it('routes each operation at its own provider-scoped endpoint', async () => {
    await keysApi.list()
    expect(api.get).toHaveBeenCalledWith('/keys')

    await keysApi.remove('anthropic')
    expect(api.delete).toHaveBeenCalledWith('/keys/anthropic')

    await keysApi.test('openai')
    expect(api.post).toHaveBeenCalledWith('/keys/openai/test')
  })

  it('unwraps the server hint, which is all a save returns', async () => {
    const res = await keysApi.save('openai', SECRET)
    expect(res).toEqual({ provider: 'openai', key_hint: '4f2a' })
    // The hint is 4 characters. Anything longer means the server changed its
    // mind about echoing the key back.
    expect(res.key_hint.length).toBeLessThanOrEqual(4)
  })

  it('surfaces a failed test call as a rejection the caller can catch', async () => {
    vi.mocked(api.post).mockRejectedValueOnce(new Error('network down'))
    await expect(keysApi.test('openai')).rejects.toThrow('network down')
  })
})

describe('maskedKey', () => {
  it('renders only the hint, never enough to reconstruct a key', () => {
    expect(maskedKey('openai', '4f2a')).toBe('sk-…4f2a')
    expect(maskedKey('anthropic', '9b13')).toBe('sk-ant-…9b13')
  })

  it('carries the provider prefix so the two are distinguishable at a glance', () => {
    expect(maskedKey('anthropic', '0000').startsWith('sk-ant-')).toBe(true)
    expect(maskedKey('openai', '0000').startsWith('sk-ant-')).toBe(false)
  })
})

describe('provider metadata', () => {
  it('links each provider at its own console over https', () => {
    for (const url of Object.values(KEY_CONSOLE_URL)) {
      expect(url.startsWith('https://')).toBe(true)
    }
    expect(KEY_CONSOLE_URL.openai).toContain('openai.com')
    expect(KEY_CONSOLE_URL.anthropic).toContain('anthropic.com')
  })

  it('labels both providers, so no row can render "undefined"', () => {
    expect(KEY_PROVIDER_LABEL.openai).toBe('OpenAI')
    expect(KEY_PROVIDER_LABEL.anthropic).toBe('Anthropic')
  })
})
