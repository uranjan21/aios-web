import { useRef, useEffect, useState } from 'react'
import { Modal, Input } from 'antd'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useVirtualizer } from '@tanstack/react-virtual'
import {
  Send, Plus, ChevronDown, ChevronRight, Wifi, WifiOff, Loader2,
  Bot, FileText, Database, Calendar, Github, BookOpen, Search, Edit2, Archive, Trash2
} from 'lucide-react'
import ReactMarkdown from 'react-markdown'
import { motion, AnimatePresence } from 'framer-motion'
import { useChat } from '@/hooks/useChat'
import { chatApi } from '@/api/chat'
import { cn } from '@/lib/utils'

// ─── Quick prompts ────────────────────────────────────────────────────────────

const QUICK_PROMPTS = [
  { label: '🏋️ Log gym session', value: "Log today's gym session" },
  { label: '💸 Week spending?', value: 'What did I spend this week?' },
  { label: '📈 Career summary', value: 'Summarize my career progress this month' },
  { label: '📅 Upcoming events', value: "What's on my calendar this week?" },
]

// ─── Tool metadata ────────────────────────────────────────────────────────────

type ToolMeta = { icon: React.FC<{ className?: string }>; color: string; summary: (input: Record<string, unknown>) => string }

const TOOL_META: Record<string, ToolMeta> = {
  append_log:           { icon: FileText,  color: 'text-blue-400',    summary: i => `Logging to ${i.area}: ${String(i.entry ?? '').slice(0, 50)}${String(i.entry ?? '').length > 50 ? '…' : ''}` },
  read_context:         { icon: BookOpen,  color: 'text-violet-400',  summary: i => `Reading ${i.area} context` },
  update_context:       { icon: FileText,  color: 'text-amber-400',   summary: i => `Updating ${i.area}: ${Object.keys((i.updates as object) ?? {}).join(', ')}` },
  search_vault:         { icon: Search,    color: 'text-primary',     summary: i => `Searching vault: "${i.query}"` },
  get_calendar_events:  { icon: Calendar,  color: 'text-emerald-400', summary: i => `Calendar: ${i.date_from} → ${i.date_to}` },
  get_github_activity:  { icon: Github,    color: 'text-foreground',  summary: i => `GitHub activity (${i.days ?? 7} days)` },
  get_notion_page:      { icon: Database,  color: 'text-pink-400',    summary: i => `Reading Notion: "${i.title}"` },
}

function getToolMeta(tool: string): ToolMeta {
  return TOOL_META[tool] ?? { icon: Bot, color: 'text-muted-foreground', summary: () => tool }
}

// ─── Tool call block ──────────────────────────────────────────────────────────

function ToolCallBlock({ tool, input, result, affected }: {
  tool: string
  input: Record<string, unknown>
  result?: string
  affected?: string[]
}) {
  const [open, setOpen] = useState(false)
  const { icon: Icon, color, summary } = getToolMeta(tool)

  return (
    <div className="my-1.5 border border-border rounded-lg overflow-hidden text-xs">
      <button
        onClick={() => setOpen(o => !o)}
        aria-expanded={open}
        aria-label={`${open ? 'Collapse' : 'Expand'} tool: ${tool}`}
        className="flex items-center gap-2 w-full px-3 py-2 bg-muted/50 hover:bg-muted/70 text-muted-foreground text-left transition-colors"
      >
        <Icon className={cn('w-3 h-3 shrink-0', color)} aria-hidden="true" />
        <span className="flex-1 truncate font-mono">{summary(input)}</span>
        {result === undefined
          ? <Loader2 className="w-3 h-3 ml-auto animate-spin shrink-0" />
          : affected && affected.length > 0
          ? <span className="ml-auto text-kpi-emerald text-[10px] font-semibold shrink-0">✓ saved</span>
          : <span className="ml-auto text-muted-foreground text-[10px] shrink-0">done</span>
        }
        {open ? <ChevronDown className="w-3 h-3 shrink-0" /> : <ChevronRight className="w-3 h-3 shrink-0" />}
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="overflow-hidden"
          >
            <div className="px-3 py-2 space-y-1 border-t border-border bg-background/30 font-mono text-[11px]">
              <p className="text-muted-foreground whitespace-pre-wrap break-all">{JSON.stringify(input, null, 2)}</p>
              {result && <p className="text-foreground mt-1 whitespace-pre-wrap">{result.slice(0, 500)}{result.length > 500 ? '…' : ''}</p>}
              {affected && affected.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-1">
                  {affected.map(path => (
                    <span key={path} className="px-1.5 py-0.5 rounded bg-kpi-emerald/10 text-kpi-emerald text-[10px]">
                      {path.split('/').pop() ?? path}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

// ─── Affected paths chips ─────────────────────────────────────────────────────

function AffectedPaths({ paths }: { paths: string[] }) {
  if (!paths.length) return null
  return (
    <div className="flex flex-wrap gap-1 mt-2 px-1">
      {paths.slice(0, 5).map(path => {
        const parts = path.split('/')
        const filename = parts.pop() ?? path
        const area = parts.pop() ?? ''
        return (
          <span
            key={path}
            title={path}
            className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-primary/8 text-primary/70 border border-primary/20"
          >
            <FileText className="w-2.5 h-2.5 shrink-0" aria-hidden="true" />
            {area ? `${area}/` : ''}{filename}
          </span>
        )
      })}
      {paths.length > 5 && (
        <span className="text-[10px] text-muted-foreground self-center">+{paths.length - 5} more</span>
      )}
    </div>
  )
}

// ─── Message bubble ───────────────────────────────────────────────────────────

function Message({ message }: { message: ReturnType<typeof useChat>['messages'][number] }) {
  const isUser = message.role === 'user'
  return (
    <div className={cn('flex gap-3', isUser ? 'justify-end' : 'justify-start')}>
      {!isUser && (
        <div className="w-7 h-7 rounded-full bg-primary/15 flex items-center justify-center shrink-0 mt-0.5 border border-primary/20">
          <Bot className="w-3.5 h-3.5 text-primary" aria-hidden="true" />
        </div>
      )}
      <div className={cn('max-w-[85%] space-y-1', isUser && 'items-end')}>
        {/* Tool calls */}
        {message.toolCalls?.map((tc, i) => (
          <ToolCallBlock
            key={i}
            tool={tc.tool}
            input={tc.input}
            result={message.toolResults?.[i]?.result}
            affected={message.toolResults?.[i]?.affected}
          />
        ))}

        {/* Message bubble */}
        {(message.content || message.streaming) && (
          <div
            className={cn(
              'rounded-xl px-3 py-2 text-sm',
              isUser
                ? 'bg-primary/10 text-foreground rounded-tr-sm'
                : 'bg-card border border-border text-foreground rounded-tl-sm'
            )}
          >
            {isUser ? (
              <p className="whitespace-pre-wrap">{message.content}</p>
            ) : (
              <div className={cn('prose prose-sm dark:prose-invert max-w-none')}>
                {message.content ? (
                  <ReactMarkdown>{message.content}</ReactMarkdown>
                ) : (
                  message.streaming && <span className="streaming-cursor" />
                )}
              </div>
            )}
          </div>
        )}

        {/* Affected paths — RAG source pills */}
        {!isUser && message.affectedPaths && (
          <AffectedPaths paths={message.affectedPaths} />
        )}
      </div>
      {isUser && (
        <div className="w-7 h-7 rounded-full bg-primary flex items-center justify-center shrink-0 mt-0.5">
          <span className="text-[10px] font-bold text-primary-foreground">U</span>
        </div>
      )}
    </div>
  )
}

// ─── Main page ────────────────────────────────────────────────────────────────

export function ChatPage() {
  const { messages, isStreaming, sendMessage, newSession, connected, tokenInfo } = useChat()
  const [input, setInput] = useState('')
  const scrollRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const queryClient = useQueryClient()
  const { data: sessions } = useQuery({ queryKey: ['chat', 'sessions'], queryFn: chatApi.sessions })

  const updateSessionMut = useMutation({
    mutationFn: ({ id, data }: { id: string, data: any }) => chatApi.updateSession(id, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['chat', 'sessions'] })
  })

  const deleteSessionMut = useMutation({
    mutationFn: (id: string) => chatApi.deleteSession(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['chat', 'sessions'] })
  })

  const handleRename = (id: string, current: string | null) => {
    let inputValue = current || ''
    Modal.confirm({
      title: 'Rename session',
      content: (
        <Input 
          defaultValue={inputValue} 
          onChange={e => inputValue = e.target.value} 
          placeholder="New conversation"
          className="mt-4"
        />
      ),
      onOk: () => {
        if (inputValue && inputValue.trim()) {
          updateSessionMut.mutate({ id, data: { title: inputValue.trim() } })
        }
      }
    })
  }

  const handleArchive = (id: string) => {
    updateSessionMut.mutate({ id, data: { is_archived: true } })
  }

  const handleDelete = (id: string) => {
    Modal.confirm({
      title: 'Delete Session',
      content: 'Are you sure you want to permanently delete this chat session?',
      okText: 'Delete',
      okType: 'danger',
      onOk: () => deleteSessionMut.mutate(id)
    })
  }

  const virtualizer = useVirtualizer({
    count: messages.length,
    getScrollElement: () => scrollRef.current,
    estimateSize: () => 120,
    overscan: 5,
  })

  useEffect(() => {
    if (messages.length > 0) {
      virtualizer.scrollToIndex(messages.length - 1, { behavior: 'auto' })
    }
  }, [messages]) // Track the full messages array reference so it scrolls on every chunk

  const handleSend = () => {
    const trimmed = input.trim()
    if (!trimmed || isStreaming) return
    setInput('')
    if (textareaRef.current) textareaRef.current.style.height = 'auto'
    sendMessage(trimmed)
  }

  function handleQuickPrompt(value: string) {
    setInput(value)
    textareaRef.current?.focus()
  }

  const budgetPct = tokenInfo ? Math.round((1 - tokenInfo.daily_remaining / 100_000) * 100) : null

  return (
    <div className="flex h-full">
      {/* Session list — desktop only */}
      <div className="hidden lg:flex w-60 flex-col border-r border-border bg-card/50 shrink-0">
        <div className="px-4 py-3 border-b border-border flex items-center justify-between">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Sessions</span>
          <button
            onClick={newSession}
            aria-label="New session"
            className="p-1 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground transition focus-ring"
          >
            <Plus className="w-3.5 h-3.5" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-2 space-y-0.5">
          {(!sessions || sessions.length === 0) && (
            <p className="text-[11px] text-muted-foreground/50 text-center py-4">No past sessions</p>
          )}
          {sessions?.map(s => (
            <div key={s.id} className="group flex items-center justify-between rounded-lg hover:bg-muted transition focus-within:ring-2 focus-within:ring-primary">
              <button
                className="flex-1 text-left px-3 py-1.5 text-[13px] text-muted-foreground hover:text-foreground truncate outline-none"
              >
                {s.title || 'New conversation'}
              </button>
              <div className="hidden group-hover:flex items-center gap-0.5 pr-1.5 shrink-0">
                <button onClick={() => handleRename(s.id, s.title)} className="p-1 hover:bg-background rounded text-muted-foreground hover:text-foreground transition" title="Rename">
                  <Edit2 className="w-3 h-3" />
                </button>
                <button onClick={() => handleArchive(s.id)} className="p-1 hover:bg-background rounded text-muted-foreground hover:text-kpi-amber transition" title="Archive">
                  <Archive className="w-3 h-3" />
                </button>
                <button onClick={() => handleDelete(s.id)} className="p-1 hover:bg-background rounded text-muted-foreground hover:text-destructive transition" title="Delete">
                  <Trash2 className="w-3 h-3" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Main chat */}
      <div className="flex flex-col flex-1 min-w-0">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-2.5 border-b border-border bg-card/30">
          <button
            onClick={newSession}
            className="flex items-center gap-1.5 text-[13px] text-muted-foreground hover:text-foreground transition focus-ring rounded-md px-2 py-1 hover:bg-muted/50"
          >
            <Plus className="w-3.5 h-3.5" /> New session
          </button>
          <div className="flex items-center gap-3 pr-2">
            {tokenInfo && (
              <div className="flex items-center gap-2">
                <div className="h-1 w-20 rounded-full bg-muted overflow-hidden" aria-hidden="true">
                  <div
                    className={cn(
                      'h-full rounded-full transition-all',
                      (budgetPct ?? 0) > 80 ? 'bg-kpi-amber' : 'bg-primary'
                    )}
                    style={{ width: `${budgetPct ?? 0}%` }}
                  />
                </div>
                <span className="text-xs text-muted-foreground font-mono">
                  {tokenInfo.daily_remaining.toLocaleString()} left
                </span>
              </div>
            )}
            {connected
              ? <Wifi className="w-4 h-4 text-kpi-emerald" aria-label="Connected" />
              : <WifiOff className="w-4 h-4 text-muted-foreground" aria-label="Disconnected" />
            }
          </div>
        </div>

        {/* Messages */}
        <div
          ref={scrollRef}
          className="flex-1 overflow-y-auto"
          aria-live="polite"
          aria-relevant="additions"
          aria-label="Chat messages"
        >
          {messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center text-muted-foreground p-8">
              <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-4 border border-primary/20 shadow-premium-sm">
                <Bot className="w-6 h-6 text-primary" />
              </div>
              <p className="font-semibold text-foreground text-base tracking-tight">AIOS Agent</p>
              <p className="text-[13px] mt-1 max-w-xs text-muted-foreground">
                Log workouts, expenses, learnings — or ask anything about your life OS.
              </p>
              <div className="grid grid-cols-2 gap-2 mt-6 w-full max-w-md">
                {QUICK_PROMPTS.map(({ label, value }) => (
                  <button
                    key={value}
                    onClick={() => handleQuickPrompt(value)}
                    className={cn(
                      'px-3.5 py-2.5 text-[11px] rounded-xl border border-border bg-card shadow-premium-sm',
                      'hover:bg-muted/50 hover:border-border text-muted-foreground hover:text-foreground',
                      'transition-all text-left focus-ring font-medium tracking-wide'
                    )}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div style={{ height: virtualizer.getTotalSize(), position: 'relative' }}>
              {virtualizer.getVirtualItems().map(vItem => (
                <div
                  key={vItem.key}
                  data-index={vItem.index}
                  ref={virtualizer.measureElement}
                  style={{ position: 'absolute', top: 0, left: 0, width: '100%', transform: `translateY(${vItem.start}px)` }}
                  className="px-4 py-2"
                >
                  <Message message={messages[vItem.index]} />
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Input */}
        <div className="p-4 border-t border-border bg-card/30">
          <div className="flex gap-2 items-end max-w-4xl mx-auto w-full">
            <textarea
              ref={textareaRef}
              value={input}
              onChange={e => setInput(e.target.value)}
              onInput={e => {
                const el = e.currentTarget
                el.style.height = 'auto'
                el.style.height = `${Math.min(el.scrollHeight, 128)}px`
              }}
              onKeyDown={e => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault()
                  handleSend()
                }
              }}
              placeholder="Message AIOS… (Enter to send, Shift+Enter for newline)"
              rows={1}
              aria-label="Chat message input"
              aria-multiline="true"
              className={cn(
                'flex-1 resize-none px-3.5 py-2.5 rounded-xl text-sm min-h-[40px] max-h-32 overflow-y-auto',
                'bg-background border border-border text-foreground placeholder:text-muted-foreground shadow-premium-sm',
                'focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background',
                'transition-shadow'
              )}
            />
            <button
              onClick={handleSend}
              disabled={!input.trim() || isStreaming || !connected}
              aria-label="Send message"
              className={cn(
                'w-[40px] h-[40px] rounded-xl bg-primary text-primary-foreground',
                'hover:bg-primary/90 disabled:opacity-40 transition flex items-center justify-center shrink-0',
                'focus-ring shadow-premium-sm'
              )}
            >
              {isStreaming
                ? <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
                : <Send className="w-4 h-4" aria-hidden="true" />
              }
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
