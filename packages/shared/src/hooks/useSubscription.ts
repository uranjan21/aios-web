import { useQuery } from '@tanstack/react-query'
import { billingApi } from '@ct/shared/api/billing'
import { useAuthStore } from '@ct/shared/stores/authStore'

export function useSubscription() {
  const isAuthenticated = useAuthStore(s => s.isAuthenticated)

  return useQuery({
    queryKey: ['subscription'],
    queryFn: () => billingApi.subscription(),
    enabled: isAuthenticated,
    staleTime: 5 * 60 * 1000, // 5 minutes
  })
}
