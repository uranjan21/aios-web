import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { ReactNode } from 'react'

type Theme = 'dark' | 'light'

interface UIState {
  sidebarOpen: boolean
  setSidebarOpen: (v: boolean) => void
  toggleSidebar: () => void

  theme: Theme
  setTheme: (t: Theme) => void
  toggleTheme: () => void

  cmdPaletteOpen: boolean
  setCmdPaletteOpen: (v: boolean) => void

  captureModalOpen: boolean
  setCaptureModalOpen: (v: boolean) => void

  recentPages: string[]
  pushRecentPage: (path: string) => void
}

export const useUIStore = create<UIState>()(
  persist(
    (set) => ({
      sidebarOpen: false,  // starts closed — desktop CSS always shows it; mobile starts hidden
      setSidebarOpen: (v) => set({ sidebarOpen: v }),
      toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),

      theme: 'light',
      setTheme: (t) => set({ theme: t }),
      toggleTheme: () => set((s) => ({ theme: s.theme === 'dark' ? 'light' : 'dark' })),

      cmdPaletteOpen: false,
      setCmdPaletteOpen: (v) => set({ cmdPaletteOpen: v }),

      captureModalOpen: false,
      setCaptureModalOpen: (v) => set({ captureModalOpen: v }),

      recentPages: [],
      pushRecentPage: (path) => set((s) => {
        const filtered = s.recentPages.filter(p => p !== path)
        return { recentPages: [path, ...filtered].slice(0, 5) }
      }),
    }),
    { name: 'aios-ui', partialize: (s) => ({ theme: s.theme }) }  // don't persist sidebarOpen — desktop always shows; mobile always starts closed
  )
)

