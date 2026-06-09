import { api } from './client'
import type { Integration } from '@/types'

export const integrationsApi = {
  list: () => api.get<Integration[]>('/integrations').then(r => r.data),
  authUrl: (provider: string) =>
    api.get<{ url: string }>(`/integrations/${provider}/auth-url`).then(r => r.data),
  disconnect: (provider: string) =>
    api.delete(`/integrations/${provider}`).then(r => r.data),
  test: (provider: string) =>
    api.get(`/integrations/${provider}/test`).then(r => r.data),
}
