import { useQuery } from '@tanstack/react-query'
import { api } from '@/api/client'

interface Features {
  vault_sync: boolean
  billing_enabled: boolean
  stripe_publishable_key: string
}

const DEFAULT_FEATURES: Features = { vault_sync: false, billing_enabled: false, stripe_publishable_key: '' }

/**
 * Backend feature flags (e.g. self-host-only features hidden in hosted SaaS mode).
 * Flags don't change at runtime, so cache them for the session.
 */
export function useFeatures(): Features {
  const { data } = useQuery({
    queryKey: ['features'],
    queryFn: () => api.get<Features>('/features').then(r => r.data),
    staleTime: Infinity,
    gcTime: Infinity,
    retry: false,
  })
  return data ?? DEFAULT_FEATURES
}
