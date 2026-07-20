/**
 * Dedicated chat page (/app/chat) — same engine as the GlobalAssistant drawer
 * (useChat + shared Message/SessionList/AssistantChatInput), in a roomier
 * two-column layout with a persistent history rail.
 *
 * ⌘K "Ask AI" lands here with the question in router state (survives
 * StrictMode double-mounts; consumed once, then cleared from history).
 */
import { useEffect, useRef, useState } from 'react'
import styled, { useTheme } from 'styled-components'
import { useLocation, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { Bot, MessageSquare, Wifi, WifiOff } from 'lucide-react'
import { PageHeader, Spinner } from '@ledgr/ui'
import { PageContainer, PageContent } from '@aios/shared/components/layout/PageLayout'
import { PageDivider } from '@aios/shared/components/layout/PageDivider'
import { useChat } from '@aios/shared/hooks/useChat'
import { chatApi } from '@aios/shared/api/chat'
import { AssistantChatInput, AttachedFile } from '@/components/assistant/AssistantChatInput'
import { buildHiddenContext } from '@/components/assistant/chatUtils'
import { Message } from '@/components/assistant/messages'
import { SessionList } from '@/components/assistant/SessionList'

const ChatShell = styled.div`
  display: grid;
  grid-template-columns: 260px 1fr;
  gap: ${({ theme }) => theme.spacing[4]};
  height: calc(100vh - 230px);
  min-height: 480px;

  @media (max-width: 900px) {
    grid-template-columns: 1fr;
    height: calc(100vh - 200px);
  }
`

const Rail = styled.aside`
  display: flex;
  flex-direction: column;
  min-height: 0;
  border: 1px solid ${({ theme }) => theme.color.border};
  border-radius: ${({ theme }) => theme.radii.lg};
  background: ${({ theme }) => theme.color.card};
  overflow: hidden;

  @media (max-width: 900px) {
    display: none;
  }
`

const RailHeader = styled.div`
  padding: ${({ theme }) => theme.spacing[3]};
  border-bottom: 1px solid ${({ theme }) => theme.color.border};
  font-weight: 600;
  font-size: 13px;
`

const Thread = styled.section`
  display: flex;
  flex-direction: column;
  min-height: 0;
  border: 1px solid ${({ theme }) => theme.color.border};
  border-radius: ${({ theme }) => theme.radii.lg};
  background: ${({ theme }) => theme.color.card};
  overflow: hidden;
`

const ThreadHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: ${({ theme }) => theme.spacing[2]} ${({ theme }) => theme.spacing[4]};
  border-bottom: 1px solid ${({ theme }) => theme.color.border};
  font-size: 12px;
  color: ${({ theme }) => theme.color.mutedForeground};
`

const MessagesScroll = styled.div`
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  overflow-x: hidden;
  padding: ${({ theme }) => theme.spacing[4]};
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.spacing[4]};
`

const Composer = styled.div`
  padding: ${({ theme }) => theme.spacing[3]} ${({ theme }) => theme.spacing[4]} ${({ theme }) => theme.spacing[4]};
  position: relative;
`

const QuotaLine = styled.div`
  font-size: 10px;
  color: ${({ theme }) => theme.color.mutedForeground};
  text-align: right;
  padding: 0 4px 4px;
`

const EmptyState = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  text-align: center;
  color: ${({ theme }) => theme.color.mutedForeground};
  gap: 4px;
`

export function ChatPage() {
  const theme = useTheme()
  const location = useLocation()
  const navigate = useNavigate()
  const { messages, sessionId, isStreaming, tokenInfo, sendMessage, retryLast, canRetry, connected, newSession, loadSession, loadingMessages, confirmTool, cancelTool } = useChat()

  const [input, setInput] = useState('')
  const [model, setModel] = useState('system')
  const [pendingPrefill, setPendingPrefill] = useState<string | null>(null)
  const sentPrefillRef = useRef<string | null>(null)
  const scrollRef = useRef<HTMLDivElement>(null)
  const pinnedRef = useRef(true)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const { data: modelsInfo } = useQuery({
    queryKey: ['chat', 'models'],
    queryFn: chatApi.models,
    staleTime: Infinity,
  })
  const { data: budget } = useQuery({
    queryKey: ['chat', 'token-budget'],
    queryFn: chatApi.tokenBudget,
    staleTime: 60_000,
  })

  // Capture the ⌘K question from router state — must also fire when already
  // on /app/chat (navigation only swaps state, no remount) — then clear it
  // from history so a refresh doesn't re-send.
  useEffect(() => {
    const prefill = (location.state as { prefill?: string } | null)?.prefill
    if (prefill) {
      setPendingPrefill(prefill)
      navigate(location.pathname, { replace: true })
    }
  }, [location.state, location.pathname, navigate])

  // Auto-send once the socket is up (ref guard: StrictMode runs effects twice).
  useEffect(() => {
    if (connected && pendingPrefill && sentPrefillRef.current !== pendingPrefill) {
      sentPrefillRef.current = pendingPrefill
      sendMessage(pendingPrefill, buildHiddenContext(pendingPrefill, location.pathname))
      setPendingPrefill(null)
    }
  }, [connected, pendingPrefill, sendMessage, location.pathname])

  const handleScroll = () => {
    const el = scrollRef.current
    if (!el) return
    pinnedRef.current = el.scrollHeight - el.scrollTop - el.clientHeight < 80
  }

  useEffect(() => {
    const el = scrollRef.current
    if (el && pinnedRef.current) {
      el.scrollTop = el.scrollHeight
    }
  }, [messages])

  const defaultProvider = modelsInfo?.default_provider ?? 'openai'
  const chatModels = [
    { id: 'system', name: 'System Default', description: 'Default configured model' },
    ...(modelsInfo?.providers[defaultProvider] ?? []).map(id => ({ id, name: id, description: '' })),
  ]

  const handleSend = (data: {
    message: string
    files: AttachedFile[]
    pastedContent: { id: string; content: string; timestamp: Date }[]
    model: string
  }) => {
    const trimmed = data.message.trim()
    let finalMessage = trimmed
    if (data.pastedContent.length > 0) {
      finalMessage += '\n\n' + data.pastedContent.map(c => c.content).join('\n\n')
    }
    if (!finalMessage && data.files.length === 0) return

    pinnedRef.current = true
    const overrides = data.model === 'system' ? undefined : {
      provider: defaultProvider,
      openaiModel: defaultProvider === 'openai' ? data.model : undefined,
      claudeModel: defaultProvider === 'anthropic' ? data.model : undefined,
    }
    sendMessage(finalMessage, buildHiddenContext(finalMessage, location.pathname), data.files.map(f => f.file), overrides)
  }

  const remaining = tokenInfo?.daily_remaining ?? (budget ? budget.daily_limit - budget.used_today : null)

  return (
    <PageContainer>
      <PageContent>
        <PageHeader
          icon={<MessageSquare />}
          eyebrow="Assistant"
          title="Chat"
          subtitle="Talk to AIOS — it can log data, search your knowledge, and act across every area"
        />
        <PageDivider />

        <ChatShell>
          <Rail>
            <RailHeader>Chats</RailHeader>
            <SessionList
              activeSessionId={sessionId}
              onSelect={loadSession}
              onNew={newSession}
            />
          </Rail>

          <Thread>
            <ThreadHeader>
              <span>{messages.length > 0 ? `${messages.length} messages` : 'New conversation'}</span>
              {connected
                ? <Wifi style={{ width: 13, height: 13, color: theme.color.success }} />
                : <WifiOff style={{ width: 13, height: 13, color: theme.color.mutedForeground }} />}
            </ThreadHeader>

            <MessagesScroll ref={scrollRef} onScroll={handleScroll}>
              {loadingMessages ? (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
                  <Spinner size="md" tone="primary" />
                </div>
              ) : messages.length === 0 ? (
                <EmptyState>
                  <Bot style={{ width: 22, height: 22, color: theme.color.primary }} />
                  <span style={{ fontSize: 13, fontWeight: 500, color: theme.color.foreground }}>How can I help?</span>
                  <span style={{ fontSize: 12 }}>Ask a question, or log anything — expenses, workouts, tasks, ideas.</span>
                </EmptyState>
              ) : (
                messages.map((message, idx) => (
                  <Message
                    key={message.id}
                    message={message}
                    onEdit={(content) => {
                      setInput(content)
                      textareaRef.current?.focus()
                    }}
                    onRetry={canRetry && idx === messages.length - 1 && message.error ? retryLast : undefined}
                    onConfirmTool={confirmTool}
                    onCancelTool={cancelTool}
                  />
                ))
              )}
            </MessagesScroll>

            <Composer>
              {remaining !== null && remaining !== undefined && (
                <QuotaLine title="Daily AI token budget remaining">
                  {remaining.toLocaleString()} tokens left today
                </QuotaLine>
              )}
              <AssistantChatInput
                onSendMessage={handleSend}
                disabled={isStreaming || !connected}
                models={chatModels}
                defaultModel={model}
                onModelChange={setModel}
                message={input}
                onChangeMessage={setInput}
                inputRef={textareaRef}
              />
            </Composer>
          </Thread>
        </ChatShell>
      </PageContent>
    </PageContainer>
  )
}
