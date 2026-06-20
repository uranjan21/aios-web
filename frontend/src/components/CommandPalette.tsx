import { useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Command } from 'cmdk'
import { toast } from 'sonner'
import styled, { createGlobalStyle } from 'styled-components'
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

/* cmdk global overrides (uses theme via ThemeProvider context) */
const CmdkStyles = createGlobalStyle`
  [cmdk-group-heading] {
    padding: 6px 12px 4px;
    font-size: 10px;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    color: ${({ theme }) => theme.color.mutedForeground};
    opacity: 0.7;
  }
  [cmdk-item] {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 10px 12px;
    font-size: 14px;
    color: ${({ theme }) => theme.color.foreground};
    cursor: pointer;
    border-radius: 8px;
    margin: 0 4px;
    outline: none;
    transition: background 100ms;
  }
  [cmdk-item][data-selected="true"] {
    background: ${({ theme }) => theme.color.primary}14;
    color: ${({ theme }) => theme.color.primary};
  }
  [cmdk-list] { padding: 4px 0; }
  [cmdk-empty] {
    padding: 24px;
    text-align: center;
    font-size: 14px;
    color: ${({ theme }) => theme.color.mutedForeground};
  }
`

const Overlay = styled.div`
  position: fixed;
  inset: 0;
  z-index: ${({ theme }) => theme.zIndex.modal};
  display: flex;
  align-items: flex-start;
  justify-content: center;
  padding-top: 20vh;
  background: ${({ theme }) => theme.color.overlay};
`

const Panel = styled.div`
  position: relative;
  width: 100%;
  max-width: 512px;
  margin: 0 16px;
  background: ${({ theme }) => theme.color.card};
  border: 1px solid ${({ theme }) => theme.color.border};
  border-radius: ${({ theme }) => theme.radii['2xl']};
  box-shadow: ${({ theme }) => theme.shadow.xl};
  overflow: hidden;
`

const SearchRow = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 0 12px;
  border-bottom: 1px solid ${({ theme }) => theme.color.border};

  [cmdk-input] {
    flex: 1;
    height: 44px;
    background: transparent;
    border: none;
    outline: none;
    font-size: 14px;
    color: ${({ theme }) => theme.color.foreground};
    &::placeholder { color: ${({ theme }) => theme.color.mutedForeground}; }
  }
`

const EscKbd = styled.kbd`
  font-size: 10px;
  color: ${({ theme }) => theme.color.mutedForeground};
  background: ${({ theme }) => theme.color.muted};
  border: 1px solid ${({ theme }) => theme.color.border};
  border-radius: 6px;
  padding: 2px 6px;
  font-family: ${({ theme }) => theme.typography.fontFamily.mono};
`

const ListWrap = styled.div`
  max-height: 384px;
  overflow-y: auto;
`

const Footer = styled.div`
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 8px 12px;
  border-top: 1px solid ${({ theme }) => theme.color.border};
  font-size: 10px;
  color: ${({ theme }) => theme.color.mutedForeground};

  kbd {
    font-family: ${({ theme }) => theme.typography.fontFamily.mono};
    background: ${({ theme }) => theme.color.muted};
    border-radius: 4px;
    padding: 1px 4px;
    margin-right: 2px;
  }
`

const PausedBadge = styled.span`
  margin-left: auto;
  font-size: 10px;
  color: ${({ theme }) => theme.color.mutedForeground};
  background: ${({ theme }) => theme.color.muted};
  padding: 2px 6px;
  border-radius: 4px;
`

export function CommandPalette() {
  const { cmdPaletteOpen, setCmdPaletteOpen, theme, toggleTheme, recentPages } = useUIStore()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const triggerRef = useRef<Element | null>(null)

  useEffect(() => {
    if (cmdPaletteOpen) {
      triggerRef.current = document.activeElement
    } else if (triggerRef.current instanceof HTMLElement) {
      triggerRef.current.focus()
      triggerRef.current = null
    }
  }, [cmdPaletteOpen])

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
      if (e.key === 'Escape' && cmdPaletteOpen) setCmdPaletteOpen(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [cmdPaletteOpen, setCmdPaletteOpen])

  if (!cmdPaletteOpen) return null

  const sections = [...new Set(NAV_COMMANDS.map(c => c.section))]
  const recentToShow = recentPages.slice(1, 5).filter(p => PATH_LABEL[p])
  const handleNav = (to: string) => { setCmdPaletteOpen(false); navigate(to) }

  return (
    <>
      <CmdkStyles />
      <Overlay onClick={() => setCmdPaletteOpen(false)}>
        <Panel onClick={e => e.stopPropagation()} role="dialog" aria-modal="true" aria-label="Command palette">
          <Command>
            <SearchRow>
              <Command.Input autoFocus placeholder="Search commands…" />
              <EscKbd>ESC</EscKbd>
            </SearchRow>

            <ListWrap>
              <Command.List>
                <Command.Empty>No commands found.</Command.Empty>

                {recentToShow.length > 0 && (
                  <Command.Group heading="Recent">
                    {recentToShow.map(path => {
                      const label = PATH_LABEL[path]
                      const Icon = PATH_ICON[path] ?? Clock
                      return (
                        <Command.Item key={`recent-${path}`} value={`recent ${label}`} onSelect={() => handleNav(path)}>
                          <Clock size={16} aria-hidden />
                          <span>{label}</span>
                          <Icon size={14} style={{ marginLeft: 'auto', opacity: 0.4 }} aria-hidden />
                        </Command.Item>
                      )
                    })}
                  </Command.Group>
                )}

                {sections.map(section => (
                  <Command.Group key={section} heading={section}>
                    {NAV_COMMANDS.filter(c => c.section === section).map(cmd => (
                      <Command.Item key={cmd.to} value={cmd.label} onSelect={() => handleNav(cmd.to)}>
                        <cmd.icon size={16} aria-hidden />
                        {cmd.label}
                      </Command.Item>
                    ))}
                  </Command.Group>
                ))}

                {agents && agents.length > 0 && (
                  <Command.Group heading="Run Agent">
                    {agents.map(agent => (
                      <Command.Item
                        key={`run-${agent.task_id}`}
                        value={`run agent ${agent.name}`}
                        onSelect={() => { setCmdPaletteOpen(false); triggerMutation.mutate(agent.task_id) }}
                      >
                        <Play size={16} aria-hidden />
                        <span>Run <strong>{agent.name}</strong></span>
                        {!agent.is_active && <PausedBadge>paused</PausedBadge>}
                      </Command.Item>
                    ))}
                  </Command.Group>
                )}

                <Command.Group heading="Actions">
                  <Command.Item
                    value={`switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
                    onSelect={() => { toggleTheme(); setCmdPaletteOpen(false) }}
                  >
                    {theme === 'dark' ? <Sun size={16} aria-hidden /> : <Moon size={16} aria-hidden />}
                    Switch to {theme === 'dark' ? 'Light' : 'Dark'} mode
                  </Command.Item>
                </Command.Group>
              </Command.List>
            </ListWrap>

            <Footer>
              <span><kbd>↑↓</kbd> navigate</span>
              <span><kbd>↵</kbd> select</span>
              <span><kbd>esc</kbd> close</span>
            </Footer>
          </Command>
        </Panel>
      </Overlay>
    </>
  )
}
