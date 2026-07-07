import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Command } from 'cmdk'
import { toast } from 'sonner'
import styled, { createGlobalStyle, useTheme } from 'styled-components'
import {
  LayoutDashboard, MessageSquare, Bot, IndianRupee, Heart,
  Briefcase, Rocket, PenLine, Plug, Settings, Sun, Moon,
  Clock, Play, Send, Sparkles, Check, Loader2, ArrowRight
} from 'lucide-react'
import { useUIStore } from '@/stores/uiStore'
import { agentsApi } from '@/api/agents'
import { capturesApi, financeApi, healthApi, type ParsedCapture } from '@/api/areas'
import { Button } from '@ledgr/ui'

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

const DOMAIN_LABELS: Record<string, string> = {
  finance_expense: '💸 Expense',
  finance_income: '💰 Income',
  health_meal: '🍽️ Meal',
  health_water: '💧 Water',
  health_weight: '⚖️ Weight',
  health_gym: '🏋️ Gym session',
  capture: '📝 Note',
}

async function executeParsed(p: ParsedCapture, rawText: string): Promise<string> {
  const f = p.fields
  switch (p.domain) {
    case 'finance_expense':
      await financeApi.createExpense({ amount: Number(f.amount), category: f.category || 'Other', description: f.description || rawText })
      return 'Expense logged'
    case 'finance_income':
      await financeApi.createIncome({ amount: Number(f.amount), source: f.source || 'other', description: f.description || rawText })
      return 'Income logged'
    case 'health_meal':
      await healthApi.logMeal({ food_name: f.food_name || rawText, calories: Number(f.calories) || 0, protein: f.protein ? Number(f.protein) : undefined })
      return 'Meal logged'
    case 'health_water':
      await healthApi.createLog({ entry_type: 'water', value: Number(f.litres) || 0, unit: 'L' })
      return 'Water logged'
    case 'health_weight':
      await healthApi.createLog({ entry_type: 'weight', value: Number(f.kg) || 0, unit: 'kg' })
      return 'Weight logged'
    case 'health_gym':
      await healthApi.createLog({ entry_type: 'gym', notes: f.notes || rawText })
      return 'Gym session logged'
    default:
      await capturesApi.create(rawText)
      return 'Saved to inbox'
  }
}

/* cmdk global overrides */
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
    height: 48px;
    background: transparent;
    border: none;
    outline: none;
    font-size: 16px;
    color: ${({ theme }) => theme.color.foreground};
    &::placeholder { color: ${({ theme }) => theme.color.mutedForeground}; }
  }
`

const ModePrefix = styled.span<{ $color: string }>`
  font-size: 16px;
  font-weight: 600;
  color: ${({ $color }) => $color};
  display: flex;
  align-items: center;
  gap: 6px;
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

const StreamOutput = styled.div`
  padding: 16px;
  font-size: 14px;
  line-height: 1.5;
  color: ${({ theme }) => theme.color.foreground};
`

const ActionArea = styled.div`
  padding: 12px 16px;
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 8px;
  background: ${({ theme }) => theme.color.muted};
  border-top: 1px solid ${({ theme }) => theme.color.border};
`

export function CommandPalette() {
  const { cmdPaletteOpen, setCmdPaletteOpen, theme, toggleTheme, recentPages, captureModalOpen, setCaptureModalOpen, setAddTaskModalOpen } = useUIStore()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const triggerRef = useRef<Element | null>(null)
  
  const [query, setQuery] = useState('')
  const [parsed, setParsed] = useState<ParsedCapture | null>(null)
  const sc = useTheme()
  
  // Combine modals
  const isOpen = cmdPaletteOpen || captureModalOpen

  // Derive mode
  const isLogMode = query.startsWith('>') || captureModalOpen || (query.length > 3 && /\d/.test(query) && !query.startsWith('?'))
  const isAskMode = query.startsWith('?') && !captureModalOpen
  const isNavMode = !isLogMode && !isAskMode

  useEffect(() => {
    if (isOpen) {
      triggerRef.current = document.activeElement
      if (captureModalOpen) setQuery('> ')
    } else {
      if (triggerRef.current instanceof HTMLElement) {
        triggerRef.current.focus()
        triggerRef.current = null
      }
      setQuery('')
      setParsed(null)
      setCaptureModalOpen(false)
      setCmdPaletteOpen(false)
    }
  }, [isOpen, captureModalOpen, setCaptureModalOpen, setCmdPaletteOpen])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        setCmdPaletteOpen(!cmdPaletteOpen)
      }
      if ((e.metaKey || e.ctrlKey) && e.key === 'l') {
        e.preventDefault()
        const path = window.location.pathname
        const projectMatch = path.match(/^\/app\/projects\/([^/]+)/)
        const sprintMatch = path.match(/^\/app\/sprints\/([^/]+)/)
        if (projectMatch) {
          setAddTaskModalOpen(true, projectMatch[1], undefined)
        } else if (sprintMatch) {
          setAddTaskModalOpen(true, undefined, sprintMatch[1])
        } else {
          setCaptureModalOpen(!captureModalOpen)
        }
      }
      if (e.key === 'Escape' && isOpen) {
        setCmdPaletteOpen(false)
        setCaptureModalOpen(false)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [cmdPaletteOpen, captureModalOpen, setCmdPaletteOpen, setCaptureModalOpen, setAddTaskModalOpen, isOpen])

  const { data: agents } = useQuery({
    queryKey: ['agents'],
    queryFn: agentsApi.list,
    enabled: isNavMode && isOpen,
    staleTime: 30_000,
  })

  const triggerMutation = useMutation({
    mutationFn: (taskId: string) => agentsApi.trigger(taskId),
    onSuccess: (_, taskId) => {
      const agent = agents?.find(a => a.task_id === taskId)
      toast.success(`${agent?.name ?? 'Agent'} triggered`)
      queryClient.invalidateQueries({ queryKey: ['agents'] })
    },
  })

  // Quick log parsing
  const rawLogText = query.startsWith('>') ? query.slice(1).trim() : query.trim()
  
  const parseMutation = useMutation({
    mutationFn: (t: string) => capturesApi.parse(t),
    onSuccess: (result) => {
      setParsed(result)
    }
  })

  useEffect(() => {
    if (isLogMode && rawLogText.length > 2) {
      const timer = setTimeout(() => {
        parseMutation.mutate(rawLogText)
      }, 600)
      return () => clearTimeout(timer)
    }
  }, [isLogMode, rawLogText])

  const confirmMutation = useMutation({
    mutationFn: (p: ParsedCapture) => executeParsed(p, rawLogText),
    onSuccess: (msg) => {
      toast.success(msg)
      queryClient.invalidateQueries({ queryKey: ['finance'] })
      queryClient.invalidateQueries({ queryKey: ['health'] })
      queryClient.invalidateQueries({ queryKey: ['captures'] })
      setCmdPaletteOpen(false)
      setCaptureModalOpen(false)
    },
    onError: () => toast.error('Failed to log')
  })

  if (!isOpen) return null

  const sections = [...new Set(NAV_COMMANDS.map(c => c.section))]
  const recentToShow = recentPages.slice(1, 5).filter(p => PATH_LABEL[p])
  const handleNav = (to: string) => {
    setCmdPaletteOpen(false)
    setCaptureModalOpen(false)
    navigate(to)
  }

  // Ask mode hands the question to the chat agent (which has real tools) —
  // the palette never fabricates an answer itself.
  const askQuestion = query.startsWith('?') ? query.slice(1).trim() : ''
  const handleAsk = () => {
    if (!askQuestion) return
    sessionStorage.setItem('aios.chat.prefill', askQuestion)
    handleNav('/app/chat')
  }

  const handleEnter = () => {
    if (isLogMode && parsed && !confirmMutation.isPending) {
      confirmMutation.mutate(parsed)
    } else if (isAskMode) {
      handleAsk()
    }
  }

  return (
    <>
      <CmdkStyles />
      <Overlay onClick={() => { setCmdPaletteOpen(false); setCaptureModalOpen(false) }}>
        <Panel onClick={e => e.stopPropagation()} role="dialog" aria-modal="true" aria-label="Command palette">
          <Command label="Command Palette" onKeyDown={(e) => {
            if (e.key === 'Enter') handleEnter()
          }}>
            <SearchRow>
              {isLogMode && <ModePrefix $color={sc.color.accent}><PenLine size={16} /> Log</ModePrefix>}
              {isAskMode && <ModePrefix $color={sc.color.accent}><Sparkles size={16} /> Ask</ModePrefix>}
              <Command.Input 
                autoFocus 
                value={query} 
                onValueChange={setQuery} 
                placeholder={isLogMode ? " spent 450 on groceries..." : isAskMode ? " what did I spend this week?" : " Search commands, > to log, ? to ask"} 
              />
            </SearchRow>

            <ListWrap>
              {isNavMode && (
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
              )}

              {isLogMode && (
                <div style={{ padding: '16px' }}>
                  {parseMutation.isPending && !parsed && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: sc.color.mutedForeground }}>
                      <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> Parsing intent...
                    </div>
                  )}
                  {parsed && !parseMutation.isPending && (
                    <div style={{ background: `${sc.color.accent}14`, border: `1px solid ${sc.color.accent}33`, padding: '12px', borderRadius: sc.radii.md }}>
                      <div style={{ fontSize: 13, fontWeight: 600, color: sc.color.accent, marginBottom: 4 }}>
                        {DOMAIN_LABELS[parsed.domain] || '📝 Note'}
                      </div>
                      <div style={{ fontSize: 14 }}>{parsed.summary || rawLogText}</div>
                    </div>
                  )}
                </div>
              )}

              {isAskMode && (
                <StreamOutput>
                  {askQuestion
                    ? <>Press <kbd>↵</kbd> to ask AIOS: “{askQuestion}”</>
                    : 'Type your question after the "?" — it opens in Chat with full access to your data.'}
                </StreamOutput>
              )}
            </ListWrap>

            {isLogMode && (
              <ActionArea>
                <Button size="sm" variant="ghost" onClick={() => { setQuery(''); setParsed(null) }}>Cancel</Button>
                <Button size="sm" variant="primary" disabled={!parsed || confirmMutation.isPending} onClick={() => parsed && confirmMutation.mutate(parsed)}>
                  {confirmMutation.isPending ? <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> : <Check size={14} />} Confirm Log (↵)
                </Button>
              </ActionArea>
            )}

            {isAskMode && askQuestion && (
              <ActionArea>
                <Button size="sm" variant="primary" onClick={handleAsk}>
                  Ask in Chat <ArrowRight size={14} style={{ marginLeft: 4 }} />
                </Button>
              </ActionArea>
            )}

            <Footer>
              <span><kbd>↑↓</kbd> navigate</span>
              <span><kbd>↵</kbd> select / confirm</span>
              <span><kbd>esc</kbd> close</span>
              <span style={{ marginLeft: 'auto' }}>
                Type <kbd>&gt;</kbd> to log, <kbd>?</kbd> to ask AI
              </span>
            </Footer>
          </Command>
        </Panel>
      </Overlay>
    </>
  )
}
