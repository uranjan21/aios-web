import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { cleanup, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ThemeProvider } from 'styled-components'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ctLightTheme } from '@ct/shared/theme/ctTheme'

/**
 * Settings → AI & knowledge: the BYOK surface.
 *
 * This is the one screen in the product that handles a live credential, and it
 * is behind auth, so nobody walks it in a browser. These tests assert the
 * SECURITY properties rather than the layout:
 *
 *   - the plaintext key is never rendered after saving — only `sk-…4f2a`;
 *   - the input that accepts it is masked;
 *   - the key never reaches a URL;
 *   - save / test / remove hit their own endpoints and report honestly.
 *
 * Everything below the API layer is mocked; no request leaves the process.
 */

/** Last-4 hints as the server returns them: provider → 4 characters. */
const OPENAI_HINT = '4f2a'
const FULL_KEY = 'sk-proj-SUPERSECRETVALUE0123456789abcdef'

const listKeys = vi.fn()
const saveKey = vi.fn()
const removeKey = vi.fn()
const testKey = vi.fn()

vi.mock('@ct/shared/api/keys', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@ct/shared/api/keys')>()
  return {
    ...actual,
    keysApi: {
      list: () => listKeys(),
      save: (p: string, k: string) => saveKey(p, k),
      remove: (p: string) => removeKey(p),
      test: (p: string) => testKey(p),
    },
  }
})

vi.mock('@ct/shared/api/knowledge', () => ({
  knowledgeApi: {
    get: () => Promise.resolve({ configured: false, folder_sync_available: false }),
    save: () => Promise.resolve({}),
    remove: () => Promise.resolve({}),
    syncNow: () => Promise.resolve({}),
  },
}))

vi.mock('@ct/shared/api/chat', () => ({
  chatApi: {
    models: () => Promise.resolve({ providers: { openai: ['gpt-4o-mini'], anthropic: ['claude-haiku-4-5'] } }),
  },
}))

vi.mock('@ct/shared/api/client', () => ({
  api: { patch: () => Promise.resolve({ data: {} }) },
}))

const toastSuccess = vi.fn()
const toastError = vi.fn()
vi.mock('sonner', () => ({ toast: { success: (m: string) => toastSuccess(m), error: (m: string) => toastError(m) } }))

const { AiModules } = await import('./AiModules')

function renderSection() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={qc}>
      <ThemeProvider theme={ctLightTheme}>
        <AiModules />
      </ThemeProvider>
    </QueryClientProvider>,
  )
}

/** The one dialog the tests drive: open it on a provider by clicking its row. */
async function openKeyDialog(provider: 'OpenAI' | 'Anthropic') {
  const row = await screen.findByRole('button', { name: new RegExp(provider, 'i') })
  await userEvent.click(row)
  return screen.getByRole('dialog')
}

/**
 * The credential field, looked up fresh each time — it re-renders on every
 * keystroke and on every validation pass, so a captured reference goes stale.
 * Queried by its label, which also asserts the field HAS an accessible name.
 */
function keyInput(): HTMLInputElement {
  return screen.getByLabelText(/API key|Replace with a new key/i) as HTMLInputElement
}

beforeEach(() => {
  vi.clearAllMocks()
  listKeys.mockResolvedValue({})
  saveKey.mockResolvedValue({ provider: 'openai', key_hint: OPENAI_HINT })
  removeKey.mockResolvedValue({ status: 'ok', provider: 'openai' })
  testKey.mockResolvedValue({ ok: true, provider: 'openai' })
})
afterEach(cleanup)

describe('AiModules — key state rendering', () => {
  it('offers both providers as their own actionable row', async () => {
    renderSection()
    expect(await screen.findByRole('button', { name: /OpenAI/i })).toBeDefined()
    expect(screen.getByRole('button', { name: /Anthropic/i })).toBeDefined()
  })

  it('shows "Not set" and an Add affordance when no key is configured', async () => {
    renderSection()
    const row = await screen.findByRole('button', { name: /OpenAI/i })
    expect(within(row).getByText('Not set')).toBeDefined()
    expect(within(row).getByText('Add key')).toBeDefined()
  })

  it('renders ONLY the masked hint for a configured key, never the key', async () => {
    listKeys.mockResolvedValue({ openai: OPENAI_HINT })
    const { container } = renderSection()

    await screen.findByText('Connected')
    const row = screen.getByRole('button', { name: /OpenAI/i })
    expect(within(row).getByText(`sk-…${OPENAI_HINT}`)).toBeDefined()

    // Nothing anywhere in the document resembles a full key.
    expect(container.textContent).not.toContain(FULL_KEY)
    expect(document.body.textContent).not.toMatch(/sk-[A-Za-z0-9-]{12,}/)
  })
})

describe('AiModules — the key input', () => {
  it('masks the field that accepts the key', async () => {
    renderSection()
    await openKeyDialog('OpenAI')
    const input = keyInput()
    // A `type="text"` here would print the credential on screen and hand it to
    // every password manager and screen recorder.
    expect(input.getAttribute('type')).toBe('password')
    expect(input.getAttribute('autocomplete')).toBe('off')
  })

  it('reports a too-short key on the field and does NOT send it', async () => {
    renderSection()
    const dialog = await openKeyDialog('OpenAI')

    await userEvent.type(keyInput(), 'sk-short')
    await userEvent.click(within(dialog).getByRole('button', { name: /save key/i }))

    expect(saveKey).not.toHaveBeenCalled()
    const input = keyInput()
    expect(input.getAttribute('aria-invalid')).toBe('true')
    // The message is reachable from the field, and never quotes the value.
    const described = input.getAttribute('aria-describedby')
    expect(described).toBeTruthy()
    const message = document.getElementById(described as string)
    expect(message?.textContent).toMatch(/too short/i)
    expect(message?.textContent).not.toContain('sk-short')
  })

  it('reports an empty submit as a field error, not silence', async () => {
    renderSection()
    const dialog = await openKeyDialog('OpenAI')
    await userEvent.click(within(dialog).getByRole('button', { name: /save key/i }))

    expect(saveKey).not.toHaveBeenCalled()
    expect(keyInput().getAttribute('aria-invalid')).toBe('true')
  })

  it('accepts a full-length key and clears the error state', async () => {
    renderSection()
    const dialog = await openKeyDialog('OpenAI')

    await userEvent.type(keyInput(), 'sk-short')
    await userEvent.click(within(dialog).getByRole('button', { name: /save key/i }))
    expect(keyInput().getAttribute('aria-invalid')).toBe('true')

    await userEvent.clear(keyInput())
    await userEvent.type(keyInput(), FULL_KEY)
    // Typing clears the error — a stale red border on a corrected field is a lie.
    expect(keyInput().getAttribute('aria-invalid')).not.toBe('true')

    await userEvent.click(within(dialog).getByRole('button', { name: /save key/i }))
    await waitFor(() => expect(saveKey).toHaveBeenCalledWith('openai', FULL_KEY))
  })

  it('opens with an empty field even when a key is already stored', async () => {
    listKeys.mockResolvedValue({ openai: OPENAI_HINT })
    renderSection()
    await screen.findByText('Connected')
    const dialog = await openKeyDialog('OpenAI')
    // Prefilling the stored key is impossible (the server never returns it),
    // and prefilling anything else would be a lie about what will be saved.
    expect(keyInput().value).toBe('')
    // The masked current value is shown instead.
    expect(within(dialog).getByText(`sk-…${OPENAI_HINT}`)).toBeDefined()
  })
})

describe('AiModules — save', () => {
  it('sends the key to the right provider and confirms', async () => {
    renderSection()
    const dialog = await openKeyDialog('Anthropic')
    await userEvent.type(keyInput(), FULL_KEY)
    await userEvent.click(within(dialog).getByRole('button', { name: /save key/i }))

    await waitFor(() => expect(saveKey).toHaveBeenCalledWith('anthropic', FULL_KEY))
    await waitFor(() => expect(toastSuccess).toHaveBeenCalledWith('Anthropic key saved'))
    // The dialog closes, so the plaintext leaves the DOM.
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
  })

  it('reports a rejected key without echoing the value back', async () => {
    saveKey.mockRejectedValue({ response: { status: 422 } })
    renderSection()
    const dialog = await openKeyDialog('OpenAI')
    await userEvent.type(keyInput(), FULL_KEY)
    await userEvent.click(within(dialog).getByRole('button', { name: /save key/i }))

    await waitFor(() => expect(toastError).toHaveBeenCalled())
    const message = String(toastError.mock.calls[0][0])
    expect(message).not.toContain(FULL_KEY)
    expect(toastSuccess).not.toHaveBeenCalled()
  })
})

describe('AiModules — test and remove', () => {
  it('offers Test and Remove only once a key exists', async () => {
    renderSection()
    const empty = await openKeyDialog('OpenAI')
    expect(within(empty).queryByRole('button', { name: /test key/i })).toBeNull()
    expect(within(empty).queryByRole('button', { name: /^remove$/i })).toBeNull()

    cleanup()
    listKeys.mockResolvedValue({ openai: OPENAI_HINT })
    renderSection()
    await screen.findByText('Connected')
    const configured = await openKeyDialog('OpenAI')
    expect(within(configured).getByRole('button', { name: /test key/i })).toBeDefined()
    expect(within(configured).getByRole('button', { name: /^remove$/i })).toBeDefined()
  })

  it('reports a passing key test as success', async () => {
    listKeys.mockResolvedValue({ openai: OPENAI_HINT })
    renderSection()
    await screen.findByText('Connected')
    const dialog = await openKeyDialog('OpenAI')
    await userEvent.click(within(dialog).getByRole('button', { name: /test key/i }))

    await waitFor(() => expect(testKey).toHaveBeenCalledWith('openai'))
    await waitFor(() => expect(toastSuccess).toHaveBeenCalledWith('Key works — the provider accepted it'))
  })

  it('reports ok:false as a FAILURE, not a success', async () => {
    // The endpoint answers 200 with `{ok:false}` when the provider rejects the
    // key. Reading only the HTTP status would tell the user it works.
    listKeys.mockResolvedValue({ openai: OPENAI_HINT })
    testKey.mockResolvedValue({ ok: false, provider: 'openai', error: 'invalid_api_key' })
    renderSection()
    const dialog = await openKeyDialog('OpenAI')
    await userEvent.click(within(dialog).getByRole('button', { name: /test key/i }))

    await waitFor(() => expect(toastError).toHaveBeenCalledWith('The provider rejected that key'))
    expect(toastSuccess).not.toHaveBeenCalled()
  })

  it('distinguishes "could not reach the provider" from "key rejected"', async () => {
    listKeys.mockResolvedValue({ openai: OPENAI_HINT })
    testKey.mockRejectedValue(new Error('ECONNRESET'))
    renderSection()
    const dialog = await openKeyDialog('OpenAI')
    await userEvent.click(within(dialog).getByRole('button', { name: /test key/i }))

    await waitFor(() =>
      expect(toastError).toHaveBeenCalledWith('Could not reach the provider to test the key'))
  })

  it('removes the key at its own provider endpoint and closes', async () => {
    listKeys.mockResolvedValue({ openai: OPENAI_HINT })
    renderSection()
    await screen.findByText('Connected')
    const dialog = await openKeyDialog('OpenAI')
    await userEvent.click(within(dialog).getByRole('button', { name: /^remove$/i }))

    await waitFor(() => expect(removeKey).toHaveBeenCalledWith('openai'))
    await waitFor(() => expect(toastSuccess).toHaveBeenCalledWith('OpenAI key removed'))
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
  })
})

describe('AiModules — no billing anywhere', () => {
  it('never mentions credits, plans or usage cost', async () => {
    listKeys.mockResolvedValue({ openai: OPENAI_HINT })
    renderSection()
    await screen.findByRole('button', { name: /OpenAI/i })
    const text = document.body.textContent ?? ''
    expect(text).not.toMatch(/credit/i)
    expect(text).not.toMatch(/upgrade/i)
    expect(text).not.toMatch(/\bplan\b/i)
    expect(text).toMatch(/free/i)
  })
})
