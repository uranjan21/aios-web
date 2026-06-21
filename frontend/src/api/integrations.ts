import { api } from './client'
import type { Integration } from '@/types'

export const integrationsApi = {
  list: () => api.get<Integration[]>('/integrations').then(r => r.data),
  authUrl: (provider: string) =>
    api.get<{ url: string }>(`/integrations/${provider}/auth-url`).then(r => r.data),
  callback: (provider: string, code: string, state: string) =>
    api.post<{ status: string; email: string; provider: string }>(
      `/integrations/${provider}/callback`,
      { code, state },
    ).then(r => r.data),
  disconnect: (provider: string) =>
    api.delete(`/integrations/${provider}`).then(r => r.data),
  status: (provider: string) =>
    api.get(`/integrations/${provider}/status`).then(r => r.data),
  test: (provider: string) =>
    api.get(`/integrations/${provider}/test`).then(r => r.data),
  sync: (provider: string) =>
    api.post<{ synced: number; provider: string }>(
      `/integrations/${provider}/sync`,
    ).then(r => r.data),
  calendarEvents: (dateFrom?: string, dateTo?: string) =>
    api.get('/integrations/google/calendar', {
      params: { date_from: dateFrom, date_to: dateTo },
    }).then(r => r.data),
  fitnessMetrics: (dateFrom?: string, dateTo?: string) =>
    api.get('/integrations/google/fitness', {
      params: { date_from: dateFrom, date_to: dateTo },
    }).then(r => r.data),
}
