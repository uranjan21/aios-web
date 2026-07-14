import { useRef, useEffect, useState } from 'react'
import { useTheme } from 'styled-components'
import { Spinner, Select } from '@ledgr/ui'
import { Bot, Wifi, WifiOff, X, Settings, History } from 'lucide-react'
import { AnimatePresence } from 'framer-motion'
import { useLocation } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { useChat } from '@/hooks/useChat'
import { useUIStore } from '@/stores/uiStore'
import { chatApi } from '@/api/chat'
import { AssistantChatInput, AttachedFile } from './AssistantChatInput'
import { Message } from './messages'
import { SessionList } from './SessionList'
import { buildHiddenContext, QUICK_PROMPTS } from './chatUtils'
import {
  FAB, ResizeHandle, AssistantWindow, AssistantHeader,
  HeaderLeft, HeaderTitle, HeaderRight, HeaderActionButton,
  MessagesContainer, SettingsPanel, SettingRow, SettingLabel,
  HistorySidebar, HistoryHeader, QuotaLine,
  EmptyStateContainer, EmptyStateIconWrapper,
  QuickPromptsGrid, QuickPromptButton,
} from './GlobalAssistant.styles'

export function GlobalAssistant() {
  const [panelWidth, setPanelWidth] = useState(400)
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768)
  const isResizing = useRef(false)

  const isOpen = useUIStore(s => s.assistantOpen)
  const setIsOpen = useUIStore(s => s.setAssistantOpen)

  const theme = useTheme()
  const { messages, sessionId, isStreaming, tokenInfo, sendMessage, retryLast, canRetry, connected, newSession, loadSession, loadingMessages, confirmTool, cancelTool } = useChat()
  const [input, setInput] = useState('')
  const scrollRef = useRef<HTMLDivElement>(null)
  const pinnedRef = useRef(true)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const location = useLocation()

  const [showHistory, setShowHistory] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const settingsRef = useRef<HTMLDivElement>(null)

  const [provider, setProvider] = useState('system')
  const [model, setModel] = useState('system')

  const { data: modelsInfo } = useQuery({
    queryKey: ['chat', 'models'],
    queryFn: chatApi.models,
    staleTime: Infinity,
    enabled: isOpen,
  })
  const { data: budget } = useQuery({
    queryKey: ['chat', 'token-budget'],
    queryFn: chatApi.tokenBudget,
    staleTime: 60_000,
    enabled: isOpen,
  })

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768)
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizing.current) return
      if (window.innerWidth < 768) return
      const newWidth = window.innerWidth - e.clientX
      const maxAllowedWidth = Math.min(800, window.innerWidth)
      if (newWidth >= 320 && newWidth <= maxAllowedWidth) {
        setPanelWidth(newWidth)
      }
    }

    const handleMouseUp = () => {
      if (isResizing.current) {
        isResizing.current = false
        document.body.style.cursor = 'default'
        document.body.style.userSelect = 'auto'
      }
    }

    document.addEventListener('mousemove', handleMouseMove)
    document.addEventListener('mouseup', handleMouseUp)

    return () => {
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
      document.body.style.cursor = ''
      document.body.style.userSelect = ''
    }
  }, [])

  const startResizing = (e: React.MouseEvent) => {
    if (window.innerWidth < 768) return
    e.preventDefault()
    isResizing.current = true
    document.body.style.cursor = 'ew-resize'
    document.body.style.userSelect = 'none'
  }

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        if (!showSettings && !showHistory) {
          setIsOpen(false)
        } else {
          setShowSettings(false)
          setShowHistory(false)
        }
      }
    }
    if (isOpen) document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, showSettings, showHistory, setIsOpen])

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (settingsRef.current && !settingsRef.current.contains(event.target as Node)) {
        setShowSettings(false)
      }
    }
    if (showSettings) {
      document.addEventListener('mousedown', handleClickOutside)
    }
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [showSettings])

  // Pinned auto-scroll: follow the stream unless the user scrolled up.
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

  useEffect(() => {
    if (isOpen && textareaRef.current) {
      textareaRef.current.focus()
    }
  }, [isOpen])

  function handleQuickPrompt(value: string) {
    setInput(value)
    if (textareaRef.current) textareaRef.current.focus()
  }

  // Scroll lock when Assistant drawer is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
      if (isResizing.current) {
        isResizing.current = false
        document.body.style.cursor = ''
        document.body.style.userSelect = ''
      }
    }
    return () => {
      document.body.style.overflow = ''
      document.body.style.cursor = ''
      document.body.style.userSelect = ''
    }
  }, [isOpen])

  const handleAssistantSend = (data: {
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
    const hiddenContext = buildHiddenContext(finalMessage, location.pathname)
    const filesToUpload = data.files.map(f => f.file)

    const overrides = {
      provider: provider === 'system' ? undefined : provider,
      openaiModel: provider === 'openai' ? (data.model === 'system' ? undefined : data.model) : undefined,
      claudeModel: provider === 'anthropic' ? (data.model === 'system' ? undefined : data.model) : undefined,
    }

    sendMessage(finalMessage, hiddenContext, filesToUpload, overrides)
  }

  // Model menus come from GET /api/chat/models — the backend allowlist is the
  // single source of truth; nothing is hardcoded here.
  const providerModels = provider === 'openai' || provider === 'anthropic'
    ? (modelsInfo?.providers[provider] ?? [])
    : []
  const chatModels = [
    { id: 'system', name: 'System Default', description: 'Default configured model' },
    ...providerModels.map(id => ({ id, name: id, description: '' })),
  ]

  const remaining = tokenInfo?.daily_remaining ?? (budget ? budget.daily_limit - budget.used_today : null)

  return (
    <>
      <AnimatePresence>
        {isOpen && (
          <AssistantWindow
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ x: { type: 'spring', damping: 25, stiffness: 300 } }}
            style={{ width: isMobile ? '100%' : panelWidth }}
          >
            {!isMobile && <ResizeHandle onMouseDown={startResizing} />}
            <AssistantHeader>
              <HeaderLeft>
                <HeaderActionButton
                  onClick={() => setShowHistory(h => !h)}
                  title="History"
                >
                  <History size={16} />
                </HeaderActionButton>
                <Bot size={16} color={theme.color.primary} />
                <HeaderTitle>AIOS Assistant</HeaderTitle>
              </HeaderLeft>
              <HeaderRight>
                {connected
                  ? <Wifi style={{ width: '14px', height: '14px', color: theme.color.success }} />
                  : <WifiOff style={{ width: '14px', height: '14px', color: theme.color.mutedForeground }} />
                }

                <HeaderActionButton
                  onClick={() => setShowSettings(s => !s)}
                  title="Settings"
                >
                  <Settings size={16} />
                </HeaderActionButton>

                <HeaderActionButton
                  onClick={() => setIsOpen(false)}
                  title="Close"
                >
                  <X size={16} />
                </HeaderActionButton>
              </HeaderRight>

              <AnimatePresence>
                {showSettings && (
                  <SettingsPanel
                    ref={settingsRef}
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                  >
                    <SettingRow>
                      <SettingLabel>Provider</SettingLabel>
                      <Select
                        size="sm"
                        value={provider}
                        onChange={(val) => { setProvider(val as string); setModel('system'); }}
                        options={[
                          { label: 'System Default', value: 'system' },
                          { label: 'OpenAI', value: 'openai' },
                          { label: 'Anthropic Claude', value: 'anthropic' }
                        ]}
                      />
                    </SettingRow>
                    <SettingRow>
                      <SettingLabel>Model</SettingLabel>
                      <Select
                        size="sm"
                        value={model}
                        onChange={(val) => setModel(val as string)}
                        options={chatModels.map(m => ({ label: m.name, value: m.id }))}
                      />
                    </SettingRow>
                  </SettingsPanel>
                )}
              </AnimatePresence>
            </AssistantHeader>

            <AnimatePresence>
              {showHistory && (
                <HistorySidebar
                  initial={{ x: '-100%' }}
                  animate={{ x: 0 }}
                  exit={{ x: '-100%' }}
                  transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                >
                  <HistoryHeader>
                    <span>Chat History</span>
                    <HeaderActionButton
                      onClick={() => setShowHistory(false)}
                      title="Close history"
                    >
                      <X size={16} />
                    </HeaderActionButton>
                  </HistoryHeader>
                  <SessionList
                    activeSessionId={sessionId}
                    onSelect={(id) => { loadSession(id); setShowHistory(false) }}
                    onNew={() => { newSession(); setShowHistory(false) }}
                  />
                </HistorySidebar>
              )}
            </AnimatePresence>

            <MessagesContainer ref={scrollRef} onScroll={handleScroll}>
              {loadingMessages ? (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', gap: '12px' }}>
                  <Spinner size="md" tone="primary" />
                </div>
              ) : messages.length === 0 ? (
                <EmptyStateContainer>
                  <EmptyStateIconWrapper>
                    <Bot style={{ width: '20px', height: '20px', color: theme.color.primary }} />
                  </EmptyStateIconWrapper>
                  <span style={{ fontSize: '13px', fontWeight: 500, color: theme.color.foreground }}>How can I help?</span>
                  <span style={{ fontSize: '12px', marginTop: '4px' }}>Log data or ask questions.</span>

                  <QuickPromptsGrid>
                    {QUICK_PROMPTS.map(({ label, value }) => (
                      <QuickPromptButton key={value} onClick={() => handleQuickPrompt(value)}>
                        {label}
                      </QuickPromptButton>
                    ))}
                  </QuickPromptsGrid>
                </EmptyStateContainer>
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
            </MessagesContainer>

            <div style={{ padding: '0 16px 16px', position: 'relative' }}>
              {remaining !== null && remaining !== undefined && (
                <QuotaLine title="Daily AI token budget remaining">
                  {remaining.toLocaleString()} tokens left today
                </QuotaLine>
              )}
              <AssistantChatInput
                onSendMessage={handleAssistantSend}
                disabled={isStreaming || !connected}
                models={chatModels}
                defaultModel={model}
                onModelChange={(newModel) => setModel(newModel)}
                message={input}
                onChangeMessage={setInput}
                inputRef={textareaRef}
              />
            </div>
          </AssistantWindow>
        )}
      </AnimatePresence>

      {!isOpen && location.pathname !== '/app/chat' && (
        <FAB
          onClick={() => setIsOpen(true)}
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          aria-label="Open AI Assistant (⌘J)"
        >
          <Bot size={24} />
        </FAB>
      )}
    </>
  )
}
