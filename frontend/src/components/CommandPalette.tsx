import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Command } from 'cmdk'
import {
  LayoutDashboard, MessageSquare, Bot, IndianRupee, Heart,
  Briefcase, Rocket, PenLine, Plug, Settings, Sun, Moon,
} from 'lucide-react'
import { useUIStore } from '@/stores/uiStore'

const NAV_COMMANDS = [
  { label: 'Dashboard', icon: LayoutDashboard, to: '/', section: 'Navigate' },
  { label: 'Chat', icon: MessageSquare, to: '/chat', section: 'Navigate' },
  { label: 'Agents', icon: Bot, to: '/agents', section: 'Navigate' },
  { label: 'Finance', icon: IndianRupee, to: '/areas/finance', section: 'Areas' },
  { label: 'Health', icon: Heart, to: '/areas/health', section: 'Areas' },
  { label: 'Career', icon: Briefcase, to: '/areas/career', section: 'Areas' },
  { label: 'Business', icon: Rocket, to: '/areas/business', section: 'Areas' },
  { label: 'Content', icon: PenLine, to: '/areas/content', section: 'Areas' },
  { label: 'Integrations', icon: Plug, to: '/integrations', section: 'System' },
  { label: 'Settings', icon: Settings, to: '/settings', section: 'System' },
]

export function CommandPalette() {
  const { cmdPaletteOpen, setCmdPaletteOpen, theme, toggleTheme } = useUIStore()
  const navigate = useNavigate()

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        setCmdPaletteOpen(!cmdPaletteOpen)
      }
      if (e.key === 'Escape' && cmdPaletteOpen) {
        setCmdPaletteOpen(false)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [cmdPaletteOpen, setCmdPaletteOpen])

  if (!cmdPaletteOpen) return null

  const sections = [...new Set(NAV_COMMANDS.map(c => c.section))]

  const handleNav = (to: string) => {
    setCmdPaletteOpen(false)
    navigate(to)
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center pt-[20vh]"
      onClick={() => setCmdPaletteOpen(false)}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60" aria-hidden="true" />

      {/* Panel */}
      <div
        className="relative w-full max-w-lg mx-4 rounded-xl bg-card border border-border shadow-2xl overflow-hidden"
        onClick={e => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label="Command palette"
      >
        <Command>
          <div className="flex items-center border-b border-border px-3">
            <Command.Input
              autoFocus
              placeholder="Search commands…"
              className="flex-1 py-3.5 bg-transparent text-foreground placeholder:text-muted-foreground text-sm outline-none"
            />
            <kbd className="text-[10px] text-muted-foreground border border-border rounded px-1.5 py-0.5 font-mono">ESC</kbd>
          </div>

          <Command.List className="max-h-80 overflow-y-auto py-1">
            <Command.Empty className="py-6 text-center text-sm text-muted-foreground">
              No commands found.
            </Command.Empty>

            {sections.map(section => (
              <Command.Group key={section} heading={section} className="[&>[cmdk-group-heading]]:px-3 [&>[cmdk-group-heading]]:py-1.5 [&>[cmdk-group-heading]]:text-[10px] [&>[cmdk-group-heading]]:font-semibold [&>[cmdk-group-heading]]:uppercase [&>[cmdk-group-heading]]:tracking-wide [&>[cmdk-group-heading]]:text-muted-foreground/60">
                {NAV_COMMANDS.filter(c => c.section === section).map(cmd => {
                  const Icon = cmd.icon
                  return (
                    <Command.Item
                      key={cmd.to}
                      value={cmd.label}
                      onSelect={() => handleNav(cmd.to)}
                      className="flex items-center gap-3 px-3 py-2.5 text-sm text-foreground cursor-pointer data-[selected=true]:bg-primary/10 data-[selected=true]:text-primary outline-none"
                    >
                      <Icon className="w-4 h-4 text-muted-foreground shrink-0" aria-hidden="true" />
                      {cmd.label}
                    </Command.Item>
                  )
                })}
              </Command.Group>
            ))}

            <Command.Group heading="Actions" className="[&>[cmdk-group-heading]]:px-3 [&>[cmdk-group-heading]]:py-1.5 [&>[cmdk-group-heading]]:text-[10px] [&>[cmdk-group-heading]]:font-semibold [&>[cmdk-group-heading]]:uppercase [&>[cmdk-group-heading]]:tracking-wide [&>[cmdk-group-heading]]:text-muted-foreground/60">
              <Command.Item
                value={`switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
                onSelect={() => { toggleTheme(); setCmdPaletteOpen(false) }}
                className="flex items-center gap-3 px-3 py-2.5 text-sm text-foreground cursor-pointer data-[selected=true]:bg-primary/10 data-[selected=true]:text-primary outline-none"
              >
                {theme === 'dark'
                  ? <Sun className="w-4 h-4 text-muted-foreground shrink-0" aria-hidden="true" />
                  : <Moon className="w-4 h-4 text-muted-foreground shrink-0" aria-hidden="true" />
                }
                Switch to {theme === 'dark' ? 'Light' : 'Dark'} mode
              </Command.Item>
            </Command.Group>
          </Command.List>

          <div className="border-t border-border px-3 py-2 flex items-center gap-4 text-[10px] text-muted-foreground">
            <span><kbd className="font-mono">↑↓</kbd> navigate</span>
            <span><kbd className="font-mono">↵</kbd> select</span>
            <span><kbd className="font-mono">esc</kbd> close</span>
          </div>
        </Command>
      </div>
    </div>
  )
}
