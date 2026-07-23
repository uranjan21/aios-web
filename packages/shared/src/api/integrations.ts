import { api } from './client'
import type { Integration } from '@ct/shared/types'

export const integrationsApi = {
  list: () => api.get<Integration[]>('/integrations').then(r => r.data),
  authUrl: (provider: string) =>
    api.get<{ url: string }>(`/integrations/${provider}/auth-url`).then(r => r.data),
  disconnect: (provider: string, accountEmail?: string) =>
    api.delete(`/integrations/${provider}`, {
      params: accountEmail ? { account_email: accountEmail } : undefined,
    }).then(r => r.data),
  status: (provider: string) =>
    api.get(`/integrations/${provider}/status`).then(r => r.data),
  test: (provider: string) =>
    api.get(`/integrations/${provider}/test`).then(r => r.data),
  sync: (provider: string) =>
    api.post<{ synced: number; provider: string }>(
      `/integrations/${provider}/sync`,
    ).then(r => r.data),
}
