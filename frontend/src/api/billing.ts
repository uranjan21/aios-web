import { api } from './client'

export type Plan = 'free' | 'pro' | 'pro_plus' | 'household'

export interface SubscriptionInfo {
  plan: Plan
  status: string
  current_period_end: string | null
  features: Record<string, unknown>
  addons: string[]
  billing_enabled: boolean
}

export const billingApi = {
  subscription: () => api.get<SubscriptionInfo>('/billing/subscription').then(r => r.data),
  checkout: (plan: Exclude<Plan, 'free'>) =>
    api.post<{ url: string }>('/billing/checkout', { plan }).then(r => r.data),
  portal: () => api.post<{ url: string }>('/billing/portal').then(r => r.data),
}
