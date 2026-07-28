import type { NavigateFunction } from 'react-router-dom'
import { api } from '@ct/shared/api/client'
import { useAuthStore } from '@ct/shared/stores/authStore'

export async function logoutAndRedirect(navigate: NavigateFunction) {
  try {
    await api.post('/auth/logout')
  } catch (e) {
    console.error('Logout failed:', e)
  } finally {
    useAuthStore.getState().logout()
    navigate('/login')
  }
}
