import { create } from 'zustand'
import { persist } from 'zustand/middleware'

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
}

export const useUIStore = create<UIState>()(
  persist(
    (set) => ({
      sidebarOpen: true,
      setSidebarOpen: (v) => set({ sidebarOpen: v }),
      toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),

      theme: 'dark',
      setTheme: (t) => set({ theme: t }),
      toggleTheme: () => set((s) => ({ theme: s.theme === 'dark' ? 'light' : 'dark' })),

      cmdPaletteOpen: false,
      setCmdPaletteOpen: (v) => set({ cmdPaletteOpen: v }),

      captureModalOpen: false,
      setCaptureModalOpen: (v) => set({ captureModalOpen: v }),
    }),
    { name: 'aios-ui', partialize: (s) => ({ sidebarOpen: s.sidebarOpen, theme: s.theme }) }
  )
)
