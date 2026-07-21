import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useUIStore } from '@aios/shared/stores/uiStore'

export function useKeyboardShortcuts() {
  const navigate = useNavigate()
  const { setCmdPaletteOpen, toggleTheme, toggleAssistant } = useUIStore()

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement).tagName
      const isTyping = tag === 'INPUT' || tag === 'TEXTAREA' || (e.target as HTMLElement).isContentEditable

      // Cmd+K — command palette (handled in CommandPalette itself, but duplicate-guard here)
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') return

      // Cmd+L — quick capture (handled in CommandPalette itself)
      if ((e.metaKey || e.ctrlKey) && e.key === 'l') return

      // Cmd+J — toggle the assistant drawer (works while typing too)
      if ((e.metaKey || e.ctrlKey) && e.key === 'j') {
        e.preventDefault()
        toggleAssistant()
        return
      }

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
            case 'd': navigate('/app'); break
            case 'c': navigate('/app/chat'); break
            case 'a': navigate('/app/agents'); break
            case 'f': navigate('/app/areas/finance'); break
            case 'h': navigate('/app/areas/health'); break
            case 'r': navigate('/app/areas/career'); break
            case 'i': navigate('/app/integrations'); break
            case 's': navigate('/app/settings'); break
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
  }, [navigate, setCmdPaletteOpen, toggleTheme, toggleAssistant])
}
