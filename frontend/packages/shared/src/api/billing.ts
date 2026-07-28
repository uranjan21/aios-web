import { api } from './client'

export type Plan = 'free' | 'pro' | 'pro_plus' | 'household'

export interface SubscriptionInfo {
  plan: Plan
  status: string
  current_period_end: string | null
  features: Record<string, unknown>
  addons: string[]
  // Modular model (Phase 1)
  modules: string[]
  bundle: boolean
  free_area: string | null
  /** Resolved access set (honours admin / billing-disabled). */
  entitled: string[]
  billing_enabled: boolean
}

export interface CatalogModule {
  key: string
  kind: 'area' | 'service'
  metered: boolean
}

export interface Catalog {
  modules: CatalogModule[]
  bundle_key: string
}

export interface UsageSummary {
  used: number
  included: number
  overage: number
  /** True → overage is billed; false → hard-capped at `included`. */
  metered: boolean
}

export const billingApi = {
  subscription: () => api.get<SubscriptionInfo>('/billing/subscription').then(r => r.data),
  catalog: () => api.get<Catalog>('/billing/catalog').then(r => r.data),
  usage: () => api.get<UsageSummary>('/billing/usage').then(r => r.data),
  portal: () => api.post<{ url: string }>('/billing/portal').then(r => r.data),
  /** Set the desired owned-module set. Returns a Stripe checkout URL when billing
   *  is on and payment is required; otherwise `checkout_url` is null. */
  setModules: (modules: string[], bundle: boolean) =>
    api.post<{ checkout_url: string | null; modules?: string[]; bundle?: boolean }>(
      '/billing/modules', { modules, bundle },
    ).then(r => r.data),
  setFreeArea: (area: string | null) =>
    api.post<{ free_area: string | null }>('/billing/free-area', { area }).then(r => r.data),
}
