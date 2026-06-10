import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useUIStore } from '@/stores/uiStore'

export function useKeyboardShortcuts() {
  const navigate = useNavigate()
  const { setCmdPaletteOpen, toggleTheme } = useUIStore()

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement).tagName
      const isTyping = tag === 'INPUT' || tag === 'TEXTAREA' || (e.target as HTMLElement).isContentEditable

      // Cmd+K — command palette (handled in CommandPalette itself, but duplicate-guard here)
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') return

      // Cmd+L — quick capture (handled in GlobalCapture itself)
      if ((e.metaKey || e.ctrlKey) && e.key === 'l') return

      // Cmd+Shift+T — toggle theme
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key === 't') {
        e.preventDefault()
        toggleTheme()
        return
      }

      if (isTyping) return

      // G then key — goto shortcuts
      if (e.key === 'g') {
        const onSecond = (e2: KeyboardEvent) => {
          window.removeEventListener('keydown', onSecond)
          switch (e2.key) {
            case 'd': navigate('/'); break
            case 'c': navigate('/chat'); break
            case 'a': navigate('/agents'); break
            case 'f': navigate('/areas/finance'); break
            case 'h': navigate('/areas/health'); break
            case 'r': navigate('/areas/career'); break
            case 'b': navigate('/areas/business'); break
            case 'n': navigate('/areas/content'); break
            case 'i': navigate('/integrations'); break
            case 's': navigate('/settings'); break
          }
        }
        window.addEventListener('keydown', onSecond, { once: true })
        return
      }

      // ? — open command palette
      if (e.key === '?') {
        e.preventDefault()
        setCmdPaletteOpen(true)
      }
    }

    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [navigate, setCmdPaletteOpen, toggleTheme])
}
