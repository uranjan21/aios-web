import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useUIStore } from '@ct/shared/stores/uiStore'

/**
 * Global keyboard shortcuts.
 *
 * `gotoMap` is injected rather than hardcoded here: the destinations belong to
 * the shell's navigation config, and packages/shared must not import from
 * apps/shell — that would invert the dependency graph. Passing the map keeps
 * the goto shortcuts in sync with the sidebar, bottom nav and command palette
 * without shared knowing any routes.
 */
export function useKeyboardShortcuts(gotoMap: Record<string, string> = {}) {
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
          const dest = gotoMap[e2.key]
          if (dest) navigate(dest)
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
  }, [navigate, gotoMap, setCmdPaletteOpen, toggleTheme, toggleAssistant])
}
