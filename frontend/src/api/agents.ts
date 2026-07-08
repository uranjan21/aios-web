import { api } from './client'
import type { Agent } from '@/types'

export const agentsApi = {
  list: () => api.get<Agent[]>('/agents').then(r => r.data),
  get: (id: string) => api.get<Agent>(`/agents/${id}`).then(r => r.data),
  patch: (id: string, data: { is_active?: boolean; cron_expression?: string }) =>
    api.patch<Agent>(`/agents/${id}`, data).then(r => r.data),
  trigger: (id: string) => api.post(`/agents/${id}/trigger`).then(r => r.data),
}
