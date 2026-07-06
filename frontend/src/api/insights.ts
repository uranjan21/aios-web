import { api } from './client'

export interface Insight {
  id: string
  kind: string
  title: string
  body: string
  metric_a: string
  metric_b: string
  r: number
  n: number
  lag: number
  score: number
  status: 'new' | 'kept' | 'dismissed'
  feedback: number | null
  created_at: string
}

export interface BriefingToday {
  status: 'ready' | 'not_generated'
  briefing?: {
    id: string
    date: string
    content_md: string
    facts: Record<string, unknown>
    created_at: string
  }
}

export interface BriefingPreferences {
  enabled: boolean
  deliver_at: string
  channels: { push?: boolean; email?: boolean }
  tz: string
}

export interface HeatmapData {
  days: Record<string, number>
  streak: number
}

export const insightsApi = {
  discoveries: () => api.get<Insight[]>('/insights/discoveries').then(r => r.data),
  feedback: (id: string, feedback: 1 | -1) =>
    api.post<Insight>(`/insights/discoveries/${id}`, { feedback }).then(r => r.data),
  briefingToday: () => api.get<BriefingToday>('/insights/briefing/today').then(r => r.data),
  briefingPreferences: () => api.get<BriefingPreferences>('/insights/briefing/preferences').then(r => r.data),
  updateBriefingPreferences: (prefs: BriefingPreferences) =>
    api.post<BriefingPreferences>('/insights/briefing/preferences', prefs).then(r => r.data),
  heatmap: (days = 180) => api.get<HeatmapData>('/insights/heatmap', { params: { days } }).then(r => r.data),
}
