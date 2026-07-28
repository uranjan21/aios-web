import { api } from './client'

export interface SavedQuote {
  id: string
  text: string
  author?: string
  favorite: boolean
  saved_at: string
}

export const quotesApi = {
  // Full collection (newest first)
  list: () => api.get<SavedQuote[]>('/quotes').then(r => r.data),
  random: () => api.get<SavedQuote>('/quotes/random').then(r => r.data),
  get: (id: string) => api.get<SavedQuote>(`/quotes/${id}`).then(r => r.data),
  create: (data: { text: string; author?: string }) =>
    api.post<SavedQuote>('/quotes', data).then(r => r.data),
  save: (data: { text: string; author?: string }) =>
    api.post<SavedQuote>('/quotes/save', data).then(r => r.data),
  update: (id: string, data: Partial<{ text: string; author: string; favorite: boolean }>) =>
    api.patch<SavedQuote>(`/quotes/${id}`, data).then(r => r.data),
  remove: (id: string) => api.delete(`/quotes/${id}`).then(r => r.data),
}
