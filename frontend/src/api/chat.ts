import { api } from './client'
import type { ChatSession, TokenBudget } from '@/types'

export const chatApi = {
  sessions: () => api.get<ChatSession[]>('/chat/sessions').then(r => r.data),
  session: (id: string) => api.get(`/chat/sessions/${id}`).then(r => r.data),
  deleteSession: (id: string) => api.delete(`/chat/sessions/${id}`).then(r => r.data),
  tokenBudget: () => api.get<TokenBudget>('/chat/token-budget').then(r => r.data),
}
