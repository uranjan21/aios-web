import { useRef, useEffect, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useVirtualizer } from '@tanstack/react-virtual'
import { Send, Plus, ChevronDown, ChevronRight, Wifi, WifiOff, Loader2, Bot } from 'lucide-react'
import ReactMarkdown from 'react-markdown'
import { useChat } from '@/hooks/useChat'
import { chatApi } from '@/api/chat'
import { cn } from '@/lib/utils'

const QUICK_PROMPTS = [
  'Log today\'s gym session',
  'What did I spend this week?',
  'Summarize my career progress',
]

function formatToolInput(tool: string, input: Record<string, unknown>): string {
  switch (tool) {
    case 'append_log': return `Logging to ${input.area}: ${String(input.entry ?? '').slice(0, 60)}${String(input.entry ?? '').length > 60 ? '…' : ''}`
    case 'read_context': return `Reading ${input.area} context`
    case 'update_context': return `Updating ${input.area}: ${Object.keys(input.updates as object ?? {}).join(', ')}`
    case 'search_vault': return `Searching vault: "${input.query}"`
    case 'get_calendar_events': return `Calendar: ${input.date_from} → ${input.date_to}`
    case 'get_github_activity': return `GitHub activity (${input.days ?? 7} days)`
    case 'get_notion_page': return `Reading Notion: "${input.title}"`
    default: return tool
  }
}

function ToolCallBlock({
  tool,
  input,
  result,
  affected,
}: {
  tool: string
  input: Record<string, unknown>
  result?: string
  affected?: string[]
}) {
  const [open, setOpen] = useState(false)
  return (
    <div className="my-2 border border-border rounded-lg overflow-hidden text-xs font-mono">
      <button
        onClick={() => setOpen(o => !o)}
        aria-expanded={open}
        aria-label={`${open ? 'Collapse' : 'Expand'} tool call: ${tool}`}
        className="flex items-center gap-2 w-full px-3 py-2 bg-muted/50 hover:bg-muted text-muted-foreground text-left"
      >
        {open ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
        <span className="text-primary font-semibold">⚙</span>
        <span>{formatToolInput(tool, input)}</span>
        {result === undefined
          ? <Loader2 className="w-3 h-3 ml-auto animate-spin text-muted-foreground" />
          : affected && affected.length > 0
          ? <span className="ml-auto text-emerald-500">✓ saved</span>
          : null
        }
      </button>
      {open && (
        <div className="px-3 py-2 space-y-1 border-t border-border bg-background/50">
          <div className="text-muted-foreground">Input: {JSON.stringify(input, null, 2)}</div>
          {result && <div className="text-foreground mt-1">{result}</div>}
        </div>
      )}
    </div>
  )
}

function Message({ message }: { message: ReturnType<typeof useChat>['messages'][number] }) {
  const isUser = message.role === 'user'
  return (
    <div className={cn('flex gap-3', isUser ? 'justify-end' : 'justify-start')}>
      {!isUser && (
        <div className="w-7 h-7 rounded-full bg-primary/20 flex items-center justify-center shrink-0 mt-0.5">
          <span className="text-[10px] font-bold text-primary">AI</span>
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
              'rounded-2xl px-4 py-3 text-sm',
              isUser
                ? 'bg-primary text-primary-foreground rounded-tr-sm'
                : 'bg-card border border-border text-foreground rounded-tl-sm'
            )}
          >
            {isUser ? (
              message.content
            ) : (
              <div className={cn('prose prose-sm dark:prose-invert max-w-none', message.streaming && !message.content && 'streaming-cursor')}>
                {message.content ? (
                  <ReactMarkdown>{message.content}</ReactMarkdown>
                ) : (
                  message.streaming && <span className="streaming-cursor" />
                )}
              </div>
            )}
          </div>
        )}
        {/* Affected paths */}
        {message.affectedPaths && message.affectedPaths.length > 0 && (
          <div className="text-[11px] text-muted-foreground px-1">
            Updated: {message.affectedPaths.join(', ')}
          </div>
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

export function ChatPage() {
  const { messages, isStreaming, sendMessage, newSession, connected, tokenInfo } = useChat()
  const [input, setInput] = useState('')
  const scrollRef = useRef<HTMLDivElement>(null)
  const { data: sessions } = useQuery({ queryKey: ['chat', 'sessions'], queryFn: chatApi.sessions })

  const virtualizer = useVirtualizer({
    count: messages.length,
    getScrollElement: () => scrollRef.current,
    estimateSize: () => 120,
    overscan: 5,
  })

  // Scroll to bottom on new messages
  useEffect(() => {
    if (messages.length > 0) {
      virtualizer.scrollToIndex(messages.length - 1, { behavior: 'smooth' })
    }
  }, [messages.length]) // eslint-disable-line react-hooks/exhaustive-deps

  const handleSend = () => {
    const trimmed = input.trim()
    if (!trimmed || isStreaming) return
    setInput('')
    sendMessage(trimmed)
  }

  return (
    <div className="flex h-full">
      {/* Session list — desktop only */}
      <div className="hidden lg:flex w-60 flex-col border-r border-border bg-card shrink-0">
        <div className="p-3 border-b border-border flex items-center justify-between">
          <span className="text-sm font-semibold">Sessions</span>
          <button onClick={newSession} className="p-1 rounded-md hover:bg-accent">
            <Plus className="w-4 h-4 text-muted-foreground" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto py-1">
          {sessions?.map(s => (
            <button
              key={s.id}
              className="w-full text-left px-3 py-2 text-sm hover:bg-accent text-muted-foreground hover:text-foreground truncate"
            >
              {s.title || 'New conversation'}
            </button>
          ))}
        </div>
      </div>

      {/* Main chat */}
      <div className="flex flex-col flex-1 min-w-0">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <button onClick={newSession} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
            <Plus className="w-4 h-4" /> New session
          </button>
          <div className="flex items-center gap-2">
            {connected
              ? <Wifi className="w-4 h-4 text-emerald-500" />
              : <WifiOff className="w-4 h-4 text-muted-foreground" />
            }
            {tokenInfo && (
              <span className="text-xs text-muted-foreground font-mono">
                {tokenInfo.daily_remaining.toLocaleString()} tokens left
              </span>
            )}
          </div>
        </div>

        {/* Messages — virtualised for performance */}
        <div
          ref={scrollRef}
          className="flex-1 overflow-y-auto"
          aria-live="polite"
          aria-relevant="additions"
          aria-label="Chat messages"
        >
          {messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center text-muted-foreground p-8">
              <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center mb-4">
                <Bot className="w-6 h-6 text-primary" />
              </div>
              <p className="font-semibold text-foreground">AIOS Agent</p>
              <p className="text-sm mt-1 max-w-xs">Log workouts, expenses, learnings — or ask anything about your life OS.</p>
              <div className="flex flex-wrap gap-2 mt-4 justify-center">
                {QUICK_PROMPTS.map(prompt => (
                  <button
                    key={prompt}
                    onClick={() => setInput(prompt)}
                    className="px-3 py-1.5 text-xs rounded-full border border-border bg-card hover:bg-accent text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {prompt}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div
              style={{ height: virtualizer.getTotalSize(), position: 'relative' }}
            >
              {virtualizer.getVirtualItems().map(vItem => (
                <div
                  key={vItem.key}
                  data-index={vItem.index}
                  ref={virtualizer.measureElement}
                  style={{ position: 'absolute', top: 0, left: 0, width: '100%', transform: `translateY(${vItem.start}px)` }}
                  className="p-4"
                >
                  <Message message={messages[vItem.index]} />
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Input */}
        <div className="p-4 border-t border-border">
          <div className="flex gap-2 items-end">
            <textarea
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
              className="flex-1 resize-none px-4 py-3 rounded-xl bg-muted border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background text-sm min-h-[48px] max-h-32 overflow-y-auto"
            />
            <button
              onClick={handleSend}
              disabled={!input.trim() || isStreaming || !connected}
              aria-label="Send message"
              className="px-4 py-3 rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-40 transition flex items-center gap-2 shrink-0"
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
