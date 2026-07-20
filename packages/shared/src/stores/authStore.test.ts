import { describe, it, expect, beforeEach } from 'vitest'
import { useAuthStore } from './authStore'

beforeEach(() => {
  localStorage.clear()
  useAuthStore.setState({ isAuthenticated: false, user: null })
})

describe('authStore', () => {
  describe('partialize', () => {
    it('persists only isAuthenticated — not user, email, or is_admin', () => {
      useAuthStore.getState().setAuthenticated(true)
      useAuthStore.getState().setUser({
        id: 'user-1',
        email: 'test@example.com',
        name: 'Test User',
        picture_url: null,
        auth_provider: 'password',
        is_admin: true,
      })

      const stored = JSON.parse(localStorage.getItem('aios-auth') ?? '{}')
      expect(stored.state).toEqual({ isAuthenticated: true })
      expect(stored.state?.user).toBeUndefined()
    })

    it('persists isAuthenticated=false after logout', () => {
      useAuthStore.getState().setAuthenticated(true)
      useAuthStore.getState().logout()

      const stored = JSON.parse(localStorage.getItem('aios-auth') ?? '{}')
      expect(stored.state).toEqual({ isAuthenticated: false })
    })
  })
})
