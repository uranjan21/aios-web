import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Command } from 'cmdk'
import { toast } from 'sonner'
import {
  LayoutDashboard, MessageSquare, Bot, IndianRupee, Heart,
  Briefcase, Rocket, PenLine, Plug, Settings, Sun, Moon,
  Clock, Play,
} from 'lucide-react'
import { useUIStore } from '@/stores/uiStore'
import { agentsApi } from '@/api/agents'

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

const PATH_LABEL: Record<string, string> = Object.fromEntries(NAV_COMMANDS.map(c => [c.to, c.label]))
const PATH_ICON: Record<string, typeof LayoutDashboard> = Object.fromEntries(NAV_COMMANDS.map(c => [c.to, c.icon]))

const GROUP_CLASS = '[&>[cmdk-group-heading]]:px-3 [&>[cmdk-group-heading]]:py-1.5 [&>[cmdk-group-heading]]:text-[10px] [&>[cmdk-group-heading]]:font-semibold [&>[cmdk-group-heading]]:uppercase [&>[cmdk-group-heading]]:tracking-wide [&>[cmdk-group-heading]]:text-muted-foreground/60'
const ITEM_CLASS = 'flex items-center gap-3 px-3 py-2.5 text-sm text-foreground cursor-pointer data-[selected=true]:bg-primary/10 data-[selected=true]:text-primary outline-none'

export function CommandPalette() {
  const { cmdPaletteOpen, setCmdPaletteOpen, theme, toggleTheme, recentPages } = useUIStore()
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  // Fetch agents only when palette is open
  const { data: agents } = useQuery({
    queryKey: ['agents'],
    queryFn: agentsApi.list,
    enabled: cmdPaletteOpen,
    staleTime: 30_000,
  })

  const triggerMutation = useMutation({
    mutationFn: (taskId: string) => agentsApi.trigger(taskId),
    onSuccess: (_, taskId) => {
      const agent = agents?.find(a => a.task_id === taskId)
      toast.success(`${agent?.name ?? 'Agent'} triggered`)
      queryClient.invalidateQueries({ queryKey: ['agents'] })
    },
    onError: () => toast.error('Failed to trigger agent'),
  })

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

  // Recent pages: exclude current route (index 0 is current), show up to 4
  const recentToShow = recentPages.slice(1, 5).filter(p => PATH_LABEL[p])

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center pt-[20vh]"
      onClick={() => setCmdPaletteOpen(false)}
    >
      <div className="absolute inset-0 bg-black/60" aria-hidden="true" />

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

          <Command.List className="max-h-96 overflow-y-auto py-1">
            <Command.Empty className="py-6 text-center text-sm text-muted-foreground">
              No commands found.
            </Command.Empty>

            {/* Recent pages */}
            {recentToShow.length > 0 && (
              <Command.Group heading="Recent" className={GROUP_CLASS}>
                {recentToShow.map(path => {
                  const label = PATH_LABEL[path]
                  const Icon = PATH_ICON[path] ?? Clock
                  return (
                    <Command.Item
                      key={`recent-${path}`}
                      value={`recent ${label}`}
                      onSelect={() => handleNav(path)}
                      className={ITEM_CLASS}
                    >
                      <Clock className="w-4 h-4 text-muted-foreground shrink-0" aria-hidden="true" />
                      <span>{label}</span>
                      <Icon className="w-3.5 h-3.5 text-muted-foreground/40 ml-auto" aria-hidden="true" />
                    </Command.Item>
                  )
                })}
              </Command.Group>
            )}

            {/* Nav sections */}
            {sections.map(section => (
              <Command.Group key={section} heading={section} className={GROUP_CLASS}>
                {NAV_COMMANDS.filter(c => c.section === section).map(cmd => {
                  const Icon = cmd.icon
                  return (
                    <Command.Item
                      key={cmd.to}
                      value={cmd.label}
                      onSelect={() => handleNav(cmd.to)}
                      className={ITEM_CLASS}
                    >
                      <Icon className="w-4 h-4 text-muted-foreground shrink-0" aria-hidden="true" />
                      {cmd.label}
                    </Command.Item>
                  )
                })}
              </Command.Group>
            ))}

            {/* Agent trigger commands */}
            {agents && agents.length > 0 && (
              <Command.Group heading="Run Agent" className={GROUP_CLASS}>
                {agents.map(agent => (
                  <Command.Item
                    key={`run-${agent.task_id}`}
                    value={`run agent ${agent.name}`}
                    onSelect={() => {
                      setCmdPaletteOpen(false)
                      triggerMutation.mutate(agent.task_id)
                    }}
                    className={ITEM_CLASS}
                  >
                    <Play className="w-4 h-4 text-primary shrink-0" aria-hidden="true" />
                    <span>Run <span className="font-medium">{agent.name}</span></span>
                    {!agent.is_active && (
                      <span className="ml-auto text-[10px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded font-mono">paused</span>
                    )}
                  </Command.Item>
                ))}
              </Command.Group>
            )}

            {/* Actions */}
            <Command.Group heading="Actions" className={GROUP_CLASS}>
              <Command.Item
                value={`switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
                onSelect={() => { toggleTheme(); setCmdPaletteOpen(false) }}
                className={ITEM_CLASS}
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
