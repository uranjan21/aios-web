import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { resetAnalytics } from '../lib/analytics'

export interface UserProfile {
  id: string
  email: string
  name: string
  picture_url: string | null
  auth_provider: string
  is_admin?: boolean
  email_verified?: boolean
  llm_provider?: string | null
  openai_chat_model?: string | null
  claude_model?: string | null
  has_openai_key?: boolean
  has_anthropic_key?: boolean
  /** ISO timestamp, or null when the welcome flow was never finished. */
  onboarded_at?: string | null
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
      logout: () => { resetAnalytics(); set({ isAuthenticated: false, user: null }) },
    }),
    {
      name: 'ct-auth',
      partialize: (s) => ({ isAuthenticated: s.isAuthenticated }),
    }
  )
)
