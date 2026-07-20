import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { ReactNode } from 'react'
import { DEFAULT_PALETTE_ID } from '@aios/shared/theme/palettes'

type Theme = 'dark' | 'light'

interface UIState {
  sidebarOpen: boolean
  setSidebarOpen: (v: boolean) => void
  toggleSidebar: () => void

  theme: Theme
  setTheme: (t: Theme) => void
  toggleTheme: () => void

  palette: string
  setPalette: (p: string) => void

  cmdPaletteOpen: boolean
  setCmdPaletteOpen: (v: boolean) => void

  assistantOpen: boolean
  setAssistantOpen: (v: boolean) => void
  toggleAssistant: () => void

  captureModalOpen: boolean
  setCaptureModalOpen: (v: boolean) => void

  addTaskModalOpen: boolean
  addTaskDefaultProjectId: string | undefined
  addTaskDefaultSprintId: string | undefined
  setAddTaskModalOpen: (open: boolean, projectId?: string, sprintId?: string) => void

  recentPages: string[]
  pushRecentPage: (path: string) => void

  collapsedSections: Record<string, boolean>
  setSectionCollapsed: (key: string, collapsed: boolean) => void
  toggleSectionCollapsed: (key: string) => void
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

      palette: DEFAULT_PALETTE_ID,
      setPalette: (p) => set({ palette: p }),

      cmdPaletteOpen: false,
      setCmdPaletteOpen: (v) => set({ cmdPaletteOpen: v }),

      assistantOpen: false,
      setAssistantOpen: (v) => set({ assistantOpen: v }),
      toggleAssistant: () => set((s) => ({ assistantOpen: !s.assistantOpen })),

      captureModalOpen: false,
      setCaptureModalOpen: (v) => set({ captureModalOpen: v }),

      addTaskModalOpen: false,
      addTaskDefaultProjectId: undefined,
      addTaskDefaultSprintId: undefined,
      setAddTaskModalOpen: (open, projectId, sprintId) => set({
        addTaskModalOpen: open,
        addTaskDefaultProjectId: projectId,
        addTaskDefaultSprintId: sprintId,
      }),

      recentPages: [],
      pushRecentPage: (path) => set((s) => {
        const filtered = s.recentPages.filter(p => p !== path)
        return { recentPages: [path, ...filtered].slice(0, 5) }
      }),

      collapsedSections: {},
      setSectionCollapsed: (key, collapsed) => set((s) => ({
        collapsedSections: { ...s.collapsedSections, [key]: collapsed }
      })),
      toggleSectionCollapsed: (key) => set((s) => ({
        collapsedSections: { ...s.collapsedSections, [key]: !s.collapsedSections[key] }
      })),
    }),
    { name: 'aios-ui', partialize: (s) => ({ theme: s.theme, palette: s.palette, collapsedSections: s.collapsedSections }) }  // don't persist sidebarOpen — desktop always shows; mobile always starts closed
  )
)

