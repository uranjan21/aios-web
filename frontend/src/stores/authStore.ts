import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export interface UserProfile {
  id: string
  email: string
  name: string
  picture_url: string | null
  auth_provider: string
}

interface AuthState {
  isAuthenticated: boolean
  user: UserProfile | null
  setAuthenticated: (v: boolean) => void
  setUser: (user: UserProfile | null) => void
  logout: () => void
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      isAuthenticated: false,
      user: null,
      setAuthenticated: (v) => set({ isAuthenticated: v }),
      setUser: (user) => set({ user }),
      logout: () => set({ isAuthenticated: false, user: null }),
    }),
    { name: 'aios-auth' }
  )
)
