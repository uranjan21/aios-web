import { useEffect } from 'react'
import { useUIStore } from '@/stores/uiStore'

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const theme = useUIStore(s => s.theme)

  useEffect(() => {
    const root = document.documentElement
    root.classList.toggle('dark', theme === 'dark')
    root.classList.toggle('light', theme === 'light')
  }, [theme])

  return <>{children}</>
}
