import { api } from './client'

export interface KnowledgeSourceState {
  configured: boolean
  folder_sync_available: boolean
  source_type?: 'obsidian' | 'notion'
  config?: { path?: string }
  enabled?: boolean
  sync_interval_minutes?: number
  last_synced_at?: string | null
  last_status?: 'ok' | 'error' | null
  last_error?: string | null
}

export interface KnowledgeSourceBody {
  source_type: 'obsidian' | 'notion'
  config?: { path?: string }
  sync_interval_minutes?: number
  enabled?: boolean
}

export const knowledgeApi = {
  get: () => api.get('/knowledge/source').then(r => r.data as KnowledgeSourceState),
  save: (body: KnowledgeSourceBody) => api.put('/knowledge/source', body).then(r => r.data as KnowledgeSourceState),
  syncNow: () => api.post('/knowledge/source/sync').then(r => r.data as { status: string }),
  remove: () => api.delete('/knowledge/source').then(r => r.data as { status: string }),
}
