import { api } from './client'

/**
 * BYOK provider keys.
 *
 * Control Tower spends nothing on anyone's behalf — every LLM call runs on the
 * user's own key. The plaintext key travels in a request BODY only (never a
 * path or query param, so it cannot land in an access log or browser history)
 * and is never returned: the server answers with `key_hint`, the last 4
 * characters, which is all the UI ever renders.
 */
export type KeyProvider = 'openai' | 'anthropic'

/** `{ openai: '4f2a' }` — provider → last-4 hint. Absent key = absent entry. */
export type ConfiguredKeys = Partial<Record<KeyProvider, string>>

export interface KeyTestResult {
  ok: boolean
  provider: string
  error?: string
}

export const keysApi = {
  list: () => api.get<ConfiguredKeys>('/keys').then(r => r.data),
  save: (provider: KeyProvider, apiKey: string) =>
    api.put<{ provider: string; key_hint: string }>(`/keys/${provider}`, { api_key: apiKey })
      .then(r => r.data),
  remove: (provider: KeyProvider) =>
    api.delete<{ status: string; provider: string }>(`/keys/${provider}`).then(r => r.data),
  test: (provider: KeyProvider) =>
    api.post<KeyTestResult>(`/keys/${provider}/test`).then(r => r.data),
}

/** Where each provider issues keys — linked from Settings, not hardcoded in JSX. */
export const KEY_CONSOLE_URL: Record<KeyProvider, string> = {
  openai: 'https://platform.openai.com/api-keys',
  anthropic: 'https://console.anthropic.com/settings/keys',
}

export const KEY_PROVIDER_LABEL: Record<KeyProvider, string> = {
  openai: 'OpenAI',
  anthropic: 'Anthropic',
}

/** Masked display form for a stored key — the hint is all the server returns. */
export function maskedKey(provider: KeyProvider, hint: string): string {
  return `${provider === 'anthropic' ? 'sk-ant-' : 'sk-'}…${hint}`
}
