import { api } from './client'
import type {
  FinanceSnapshot, FinanceExpense, HealthLog, HealthStreak,
  SkillInventory, CareerEvent, BusinessEvent, ContentItem,
} from '@/types'

// Finance
export const financeApi = {
  snapshots: () => api.get<FinanceSnapshot[]>('/areas/finance/snapshots').then(r => r.data),
  latestSnapshot: () => api.get<FinanceSnapshot | null>('/areas/finance/snapshots/latest').then(r => r.data),
  expenses: (month?: string, category?: string, limit = 50, offset = 0) =>
    api.get<{ items: FinanceExpense[]; total: number; has_more: boolean }>(
      '/areas/finance/expenses', { params: { month, category, limit, offset } }
    ).then(r => r.data),
  createExpense: (data: { amount: number; category: string; description?: string }) =>
    api.post<FinanceExpense>('/areas/finance/expenses', data).then(r => r.data),
  goals: () => api.get('/areas/finance/goals').then(r => r.data),
}

// Health
export const healthApi = {
  logs: (entry_type?: string) =>
    api.get<HealthLog[]>('/areas/health/logs', { params: { entry_type } }).then(r => r.data),
  createLog: (data: { entry_type: string; value?: number; unit?: string; notes?: string }) =>
    api.post<HealthLog>('/areas/health/logs', data).then(r => r.data),
  streak: () => api.get<HealthStreak>('/areas/health/streak').then(r => r.data),
  summary: () => api.get('/areas/health/summary').then(r => r.data),
}

// Career
export const careerApi = {
  summary: () => api.get<{ total_skills: number; last_skill_update: string | null; last_event_title: string | null; last_event_at: string | null }>('/areas/career/summary').then(r => r.data),
  skills: () => api.get<SkillInventory[]>('/areas/career/skills').then(r => r.data),
  updateSkill: (id: string, data: { level: string; notes?: string }) =>
    api.put<SkillInventory>(`/areas/career/skills/${id}`, data).then(r => r.data),
  events: () => api.get<CareerEvent[]>('/areas/career/events').then(r => r.data),
  createEvent: (data: { event_type: string; title: string; description?: string }) =>
    api.post<CareerEvent>('/areas/career/events', data).then(r => r.data),
  roadmap: () => api.get('/areas/career/roadmap').then(r => r.data),
}

// Business
export const businessApi = {
  events: () => api.get<BusinessEvent[]>('/areas/business/events').then(r => r.data),
  createEvent: (data: { event_type: string; title: string; description?: string; mrr?: number }) =>
    api.post<BusinessEvent>('/areas/business/events', data).then(r => r.data),
  summary: () => api.get('/areas/business/summary').then(r => r.data),
}

// Captures (quick log inbox)
export const capturesApi = {
  create: (raw_text: string) => api.post('/captures', { raw_text }).then(r => r.data),
  list: () => api.get('/captures').then(r => r.data),
}

// Content
export const contentApi = {
  items: (status?: string, platform?: string) =>
    api.get<ContentItem[]>('/areas/content/items', { params: { status, platform } }).then(r => r.data),
  createItem: (data: { title: string; platform: string; content_type?: string; notes?: string }) =>
    api.post<ContentItem>('/areas/content/items', data).then(r => r.data),
  patchItem: (id: string, data: { status?: string; publish_date?: string; notes?: string }) =>
    api.patch<ContentItem>(`/areas/content/items/${id}`, data).then(r => r.data),
  twitterQueue: () => api.get('/areas/content/twitter-queue').then(r => r.data),
}
