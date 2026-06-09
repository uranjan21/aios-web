import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface AuthState {
  isAuthenticated: boolean
  setAuthenticated: (v: boolean) => void
  logout: () => void
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      isAuthenticated: false,
      setAuthenticated: (v) => set({ isAuthenticated: v }),
      logout: () => set({ isAuthenticated: false }),
    }),
    { name: 'aios-auth' }
  )
)
