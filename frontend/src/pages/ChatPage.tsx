import styled, { keyframes, useTheme } from 'styled-components'
import { useRef, useEffect, useState } from 'react'
import { Button, Dialog, ConfirmDialog, Input, Stack } from '@ledgr/ui'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useVirtualizer } from '@tanstack/react-virtual'
import {
  Send, Plus, ChevronDown, ChevronRight, Wifi, WifiOff, Loader2,
  Bot, FileText, Database, Calendar, Github, BookOpen, Search, Edit2, Archive, Trash2
} from 'lucide-react'
import ReactMarkdown from 'react-markdown'
import { motion, AnimatePresence } from 'framer-motion'
import { useParams, useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { useChat } from '@/hooks/useChat'
import { chatApi } from '@/api/chat'

const QUICK_PROMPTS = [
  { label: 'Log gym session', value: "Log today's gym session" },
  { label: 'Week spending?', value: 'What did I spend this week?' },
  { label: 'Career summary', value: 'Summarize my career progress this month' },
  { label: 'Upcoming events', value: "What's on my calendar this week?" },
]

type ToolMeta = { icon: React.FC<{ className?: string, style?: any }>; colorKey: 'primary' | 'accent' | 'foreground' | 'muted' | 'mutedForeground'; summary: (input: Record<string, unknown>) => string }

const TOOL_META: Record<string, ToolMeta> = {
  append_log:           { icon: FileText,  colorKey: 'primary', summary: i => `Logging to ${i.area}: ${String(i.entry ?? '').slice(0, 50)}${String(i.entry ?? '').length > 50 ? '…' : ''}` },
  read_context:         { icon: BookOpen,  colorKey: 'accent', summary: i => `Reading ${i.area} context` },
  update_context:       { icon: FileText,  colorKey: 'primary', summary: i => `Updating ${i.area}: ${Object.keys((i.updates as object) ?? {}).join(', ')}` },
  search_vault:         { icon: Search,    colorKey: 'primary', summary: i => `Searching vault: "${i.query}"` },
  get_calendar_events:  { icon: Calendar,  colorKey: 'accent', summary: i => `Calendar: ${i.date_from} → ${i.date_to}` },
  get_github_activity:  { icon: Github,    colorKey: 'foreground', summary: i => `GitHub activity (${i.days ?? 7} days)` },
  get_notion_page:      { icon: Database,  colorKey: 'mutedForeground', summary: i => `Reading Notion: "${i.title}"` },
}

function getToolMeta(tool: string): ToolMeta {
  return TOOL_META[tool] ?? { icon: Bot, colorKey: 'mutedForeground', summary: () => tool }
}


const blink = keyframes`
  0%, 100% { opacity: 1; }
  50% { opacity: 0; }
`

const StreamingCursor = styled.span`
  &::after {
    content: '';
    display: inline-block;
    width: 2px;
    height: 1em;
    background: ${({ theme }) => theme.color.primary};
    animation: ${blink} 1s step-end infinite;
    vertical-align: text-bottom;
    margin-left: 2px;
  }
`

const spin = keyframes`
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
`

const SpinningLoader = styled(Loader2)`
  animation: ${spin} 1s linear infinite;
`

const ToolCallContainer = styled.div`
  margin: 6px 0;
  border: 1px solid ${({ theme }) => theme.color.border};
  border-radius: ${({ theme }) => theme.radii.lg};
  overflow: hidden;
  font-size: 12px;
`

const ToolCallButton = styled.button<{ $open: boolean }>`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing[2]};
  width: 100%;
  padding: ${({ theme }) => theme.spacing[2]} ${({ theme }) => theme.spacing[3]};
  background-color: ${({ theme }) => theme.color.muted}80;
  color: ${({ theme }) => theme.color.mutedForeground};
  text-align: left;
  transition: background-color 0.2s;
  border: none;
  cursor: pointer;
  
  &:hover {
    background-color: ${({ theme }) => theme.color.muted};
  }

  &:focus-visible {
    outline: 2px solid ${({ theme }) => theme.color.ring};
    outline-offset: -2px;
  }
`

const ToolCallTitle = styled.span`
  flex: 1;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`

const ToolCallStatusText = styled.span<{ $success?: boolean }>`
  margin-left: auto;
  font-size: 10px;
  flex-shrink: 0;
  ${({ $success, theme }) => $success ? `
    color: ${theme.color.success};
    font-weight: 600;
  ` : `
    color: ${theme.color.mutedForeground};
  `}
`

const ToolCallDetailsContainer = styled(motion.div)`
  overflow: hidden;
`

const ToolCallDetails = styled.div`
  padding: ${({ theme }) => theme.spacing[2]} ${({ theme }) => theme.spacing[3]};
  background-color: ${({ theme }) => theme.color.background}4d;
  border-top: 1px solid ${({ theme }) => theme.color.border};
  font-size: 11px;
`

const ToolCallDetailsInput = styled.p`
  color: ${({ theme }) => theme.color.mutedForeground};
  white-space: pre-wrap;
  word-break: break-all;
`

const ToolCallDetailsResult = styled.p`
  color: ${({ theme }) => theme.color.foreground};
  margin-top: ${({ theme }) => theme.spacing[1]};
  white-space: pre-wrap;
`

const AffectedPathsContainer = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: ${({ theme }) => theme.spacing[1]};
  margin-top: ${({ theme }) => theme.spacing[1]};
`

const AffectedPathPill = styled.span`
  padding: 2px 6px;
  border-radius: ${({ theme }) => theme.radii.sm};
  background-color: ${({ theme }) => theme.color.success}1a;
  color: ${({ theme }) => theme.color.success};
  font-size: 10px;
`

function ToolCallBlock({ tool, input, result, affected }: {
  tool: string
  input: Record<string, unknown>
  result?: string
  affected?: string[]
}) {
  const [open, setOpen] = useState(false)
  const theme = useTheme()
  const { icon: Icon, colorKey, summary } = getToolMeta(tool)
  const color = theme.color[colorKey]

  return (
    <ToolCallContainer>
      <ToolCallButton
        onClick={() => setOpen(o => !o)}
        aria-expanded={open}
        aria-label={`${open ? 'Collapse' : 'Expand'} tool: ${tool}`}
        $open={open}
      >
        <Icon style={{ width: '12px', height: '12px', flexShrink: 0, color }} aria-hidden="true" />
        <ToolCallTitle>{summary(input)}</ToolCallTitle>
        {result === undefined
          ? <SpinningLoader style={{ width: '12px', height: '12px', marginLeft: 'auto', flexShrink: 0 }} />
          : affected && affected.length > 0
          ? <ToolCallStatusText $success>✓ saved</ToolCallStatusText>
          : <ToolCallStatusText>done</ToolCallStatusText>
        }
        {open ? <ChevronDown style={{ width: '12px', height: '12px', flexShrink: 0 }} /> : <ChevronRight style={{ width: '12px', height: '12px', flexShrink: 0 }} />}
      </ToolCallButton>

      <AnimatePresence>
        {open && (
          <ToolCallDetailsContainer
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.15 }}
          >
            <ToolCallDetails>
              <ToolCallDetailsInput>{JSON.stringify(input, null, 2)}</ToolCallDetailsInput>
              {result && <ToolCallDetailsResult>{result.slice(0, 500)}{result.length > 500 ? '…' : ''}</ToolCallDetailsResult>}
              {affected && affected.length > 0 && (
                <AffectedPathsContainer>
                  {affected.map(path => (
                    <AffectedPathPill key={path}>
                      {path.split('/').pop() ?? path}
                    </AffectedPathPill>
                  ))}
                </AffectedPathsContainer>
              )}
            </ToolCallDetails>
          </ToolCallDetailsContainer>
        )}
      </AnimatePresence>
    </ToolCallContainer>
  )
}

const PathsWrapper = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: ${({ theme }) => theme.spacing[1]};
  margin-top: ${({ theme }) => theme.spacing[2]};
  padding: 0 ${({ theme }) => theme.spacing[1]};
`

const PathChip = styled.span`
  display: inline-flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing[1]};
  font-size: 10px;
  padding: 2px 8px;
  border-radius: 9999px;
  background-color: ${({ theme }) => theme.color.primary}14;
  color: ${({ theme }) => theme.color.primary}b3;
  border: 1px solid ${({ theme }) => theme.color.primary}33;
`

function AffectedPaths({ paths }: { paths: string[] }) {
  const theme = useTheme()
  if (!paths.length) return null
  return (
    <PathsWrapper>
      {paths.slice(0, 5).map(path => {
        const parts = path.split('/')
        const filename = parts.pop() ?? path
        const area = parts.pop() ?? ''
        return (
          <PathChip key={path} title={path}>
            <FileText style={{ width: '10px', height: '10px', flexShrink: 0 }} aria-hidden="true" />
            {area ? `${area}/` : ''}{filename}
          </PathChip>
        )
      })}
      {paths.length > 5 && (
        <span style={{ fontSize: '10px', color: theme.color.mutedForeground, alignSelf: 'center' }}>+{paths.length - 5} more</span>
      )}
    </PathsWrapper>
  )
}

const MessageContainer = styled.div<{ $isUser: boolean }>`
  display: flex;
  gap: ${({ theme }) => theme.spacing[3]};
  justify-content: ${({ $isUser }) => $isUser ? 'flex-end' : 'flex-start'};
`

const BotAvatar = styled.div`
  width: 28px;
  height: 28px;
  border-radius: 50%;
  background-color: ${({ theme }) => theme.color.primary}26;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  margin-top: 2px;
  border: 1px solid ${({ theme }) => theme.color.primary}33;
`

const UserAvatar = styled.div`
  width: 28px;
  height: 28px;
  border-radius: 50%;
  background-color: ${({ theme }) => theme.color.primary};
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  margin-top: 2px;
  color: ${({ theme }) => theme.color.primaryForeground};
  font-size: 10px;
  font-weight: bold;
`

const MessageContentWrapper = styled.div<{ $isUser: boolean }>`
  max-width: 85%;
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.spacing[1]};
  align-items: ${({ $isUser }) => $isUser ? 'flex-end' : 'flex-start'};
`

const MessageBubble = styled.div<{ $isUser: boolean }>`
  border-radius: ${({ theme }) => theme.radii['2xl']};
  padding: ${({ theme }) => theme.spacing[3]} ${({ theme }) => theme.spacing[4]};
  font-size: 14px;
  background-color: ${({ theme, $isUser }) => $isUser ? `${theme.color.primary}1a` : theme.color.background};
  color: ${({ theme }) => theme.color.foreground};
  border: ${({ theme, $isUser }) => $isUser ? 'none' : `1px solid ${theme.color.border}`};
  box-shadow: ${({ theme, $isUser }) => $isUser ? 'none' : theme.shadow.sm};
  ${({ $isUser }) => $isUser ? `border-top-right-radius: 2px;` : `border-top-left-radius: 2px;`}
`

const BubbleText = styled.p`
  white-space: pre-wrap;
  margin: 0;
`

const MarkdownWrapper = styled.div`
  max-width: 100%;
  & p {
    margin: 0;
  }
  & pre {
    background-color: ${({ theme }) => theme.color.muted};
    padding: ${({ theme }) => theme.spacing[2]};
    border-radius: ${({ theme }) => theme.radii.md};
    overflow-x: auto;
  }
`

function Message({ message }: { message: ReturnType<typeof useChat>['messages'][number] }) {
  const isUser = message.role === 'user'
  const theme = useTheme()
  return (
    <MessageContainer $isUser={isUser}>
      {!isUser && (
        <BotAvatar>
          <Bot style={{ width: '14px', height: '14px', color: theme.color.primary }} aria-hidden="true" />
        </BotAvatar>
      )}
      <MessageContentWrapper $isUser={isUser}>
        {message.toolCalls?.map((tc, i) => (
          <ToolCallBlock
            key={i}
            tool={tc.tool}
            input={tc.input}
            result={message.toolResults?.[i]?.result}
            affected={message.toolResults?.[i]?.affected}
          />
        ))}

        {(message.content || message.streaming) && (
          <MessageBubble $isUser={isUser}>
            {isUser ? (
              <BubbleText>{message.content}</BubbleText>
            ) : (
              <MarkdownWrapper>
                {message.content ? (
                  <ReactMarkdown>{message.content}</ReactMarkdown>
                ) : (
                  message.streaming && <StreamingCursor />
                )}
              </MarkdownWrapper>
            )}
          </MessageBubble>
        )}

        {!isUser && message.affectedPaths && (
          <AffectedPaths paths={message.affectedPaths} />
        )}
      </MessageContentWrapper>
      {isUser && (
        <UserAvatar>
          U
        </UserAvatar>
      )}
    </MessageContainer>
  )
}

const PageContainer = styled.div`
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: row;
  background-color: ${({ theme }) => theme.color.background};
`

const SidebarContainer = styled.div`
  width: 260px;
  flex-shrink: 0;
  border-right: 1px solid ${({ theme }) => theme.color.border};
  background-color: ${({ theme }) => theme.color.muted}1a;
  display: flex;
  flex-direction: column;
`

const SidebarHeader = styled.div`
  padding: ${({ theme }) => theme.spacing[4]};
  border-bottom: 1px solid ${({ theme }) => theme.color.border};
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-shrink: 0;
`

const SidebarTitle = styled.span`
  font-size: 11px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: ${({ theme }) => theme.color.mutedForeground};
`

const IconButton = styled.button`
  padding: ${({ theme }) => theme.spacing[1]};
  border-radius: ${({ theme }) => theme.radii.md};
  color: ${({ theme }) => theme.color.mutedForeground};
  transition: all 0.2s;
  background: transparent;
  border: none;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;

  &:hover {
    background-color: ${({ theme }) => theme.color.muted}80;
    color: ${({ theme }) => theme.color.foreground};
  }
  &:focus-visible {
    outline: none;
    box-shadow: 0 0 0 2px ${({ theme }) => theme.color.ring};
  }
`

const SessionList = styled.div`
  flex: 1;
  overflow-y: auto;
  padding: ${({ theme }) => theme.spacing[2]};
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.spacing[1]};
`

const SessionItem = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: ${({ theme }) => theme.spacing[2]} ${({ theme }) => theme.spacing[3]};
  border-radius: ${({ theme }) => theme.radii.lg};
  color: ${({ theme }) => theme.color.mutedForeground};
  transition: all 0.2s;
  cursor: pointer;

  &:hover {
    background-color: ${({ theme }) => theme.color.muted}80;
    color: ${({ theme }) => theme.color.foreground};
  }

  &:focus-visible {
    outline: 2px solid ${({ theme }) => theme.color.ring};
    outline-offset: -2px;
    background-color: ${({ theme }) => theme.color.muted}80;
    color: ${({ theme }) => theme.color.foreground};
  }
`

const SessionItemTitle = styled.span`
  font-size: 13px;
  font-weight: 500;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  flex: 1;
`

const SessionActions = styled.div`
  display: none;
  align-items: center;
  gap: ${({ theme }) => theme.spacing[1]};
  flex-shrink: 0;
  margin-left: ${({ theme }) => theme.spacing[2]};

  ${SessionItem}:hover & {
    display: flex;
  }
`

const SessionActionButton = styled(IconButton)`
  padding: ${({ theme }) => theme.spacing[1]};
  &:hover {
    background-color: ${({ theme }) => theme.color.background};
  }
`

const MainChatArea = styled.div`
  flex: 1;
  display: flex;
  flex-direction: column;
  position: relative;
  width: 100%;
  height: 100%;
  align-items: center;
`

const ChatContainer = styled.div`
  width: 100%;
  max-width: 800px;
  flex: 1;
  display: flex;
  flex-direction: column;
  position: relative;
  height: 100%;
`

const ChatHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: ${({ theme }) => theme.spacing[3]} ${({ theme }) => theme.spacing[4]};
  flex-shrink: 0;
`

const NewSessionBtn = styled.button`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing[2]};
  font-size: 13px;
  color: ${({ theme }) => theme.color.mutedForeground};
  transition: all 0.2s;
  border-radius: ${({ theme }) => theme.radii.md};
  padding: ${({ theme }) => theme.spacing[1]} ${({ theme }) => theme.spacing[2]};
  background: transparent;
  border: none;
  cursor: pointer;

  &:hover {
    background-color: ${({ theme }) => theme.color.muted}80;
    color: ${({ theme }) => theme.color.foreground};
  }
  &:focus-visible {
    outline: 2px solid ${({ theme }) => theme.color.ring};
    outline-offset: 2px;
  }
`

const HeaderStatusContainer = styled.div`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing[3]};
  padding-right: ${({ theme }) => theme.spacing[2]};
`

const TokenProgressContainer = styled.div`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing[2]};
`

const TokenProgressBar = styled.div`
  height: 4px;
  width: 80px;
  border-radius: 9999px;
  background-color: ${({ theme }) => theme.color.muted};
  overflow: hidden;
`

const TokenProgressFill = styled.div<{ $pct: number }>`
  height: 100%;
  border-radius: 9999px;
  transition: width 0.2s;
  background-color: ${({ theme, $pct }) => $pct > 80 ? theme.color.warning : theme.color.primary};
  width: ${({ $pct }) => $pct}%;
`

const TokenProgressText = styled.span`
  font-size: 12px;
  color: ${({ theme }) => theme.color.mutedForeground};
`

const MessagesContainer = styled.div`
  flex: 1;
  overflow-y: auto;
  padding: 0 ${({ theme }) => theme.spacing[4]};
  padding-bottom: 112px;

  /* Custom scrollbar */
  &::-webkit-scrollbar {
    width: 6px;
  }
  &::-webkit-scrollbar-track {
    background: transparent;
  }
  &::-webkit-scrollbar-thumb {
    background: ${({ theme }) => theme.color.mutedForeground}4d;
    border-radius: 10px;
  }
`

const EmptyStateContainer = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  text-align: center;
  color: ${({ theme }) => theme.color.mutedForeground};
  padding: ${({ theme }) => theme.spacing[8]};
`

const EmptyStateIconWrapper = styled.div`
  width: 48px;
  height: 48px;
  border-radius: ${({ theme }) => theme.radii['2xl']};
  background-color: ${({ theme }) => theme.color.primary}1a;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: ${({ theme }) => theme.spacing[4]};
  border: 1px solid ${({ theme }) => theme.color.border};
  box-shadow: ${({ theme }) => theme.shadow.sm};
`

const EmptyStateTitle = styled.p`
  font-weight: 600;
  color: ${({ theme }) => theme.color.foreground};
  font-size: 16px;
  letter-spacing: -0.025em;
`

const EmptyStateDesc = styled.p`
  font-size: 13px;
  margin-top: ${({ theme }) => theme.spacing[1]};
  max-width: 20rem;
  color: ${({ theme }) => theme.color.mutedForeground};
`

const QuickPromptsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: ${({ theme }) => theme.spacing[2]};
  margin-top: ${({ theme }) => theme.spacing[6]};
  width: 100%;
  max-width: 32rem;
`

const QuickPromptButton = styled.button`
  padding: ${({ theme }) => theme.spacing[3]} ${({ theme }) => theme.spacing[4]};
  font-size: 11px;
  border-radius: ${({ theme }) => theme.radii.xl};
  transition: all 0.2s;
  text-align: left;
  font-weight: 500;
  letter-spacing: 0.025em;
  background-color: ${({ theme }) => theme.color.background};
  border: 1px solid ${({ theme }) => theme.color.border};
  color: ${({ theme }) => theme.color.foreground};
  box-shadow: ${({ theme }) => theme.shadow.sm};
  cursor: pointer;

  &:hover {
    background-color: ${({ theme }) => theme.color.muted}4d;
  }
  &:focus-visible {
    outline: none;
    box-shadow: 0 0 0 2px ${({ theme }) => theme.color.ring};
  }
`

const FloatingInputContainer = styled.div`
  position: absolute;
  bottom: 24px;
  left: 50%;
  transform: translateX(-50%);
  width: 90%;
  max-width: 800px;
  background-color: ${({ theme }) => theme.color.background}e6;
  border: 1px solid ${({ theme }) => theme.color.border};
  border-radius: ${({ theme }) => theme.radii.xl};
  box-shadow: ${({ theme }) => theme.shadow.lg};
  z-index: 10;
  display: flex;
  align-items: flex-end;
  padding: ${({ theme }) => theme.spacing[3]};
  gap: ${({ theme }) => theme.spacing[2]};
  transition: all 0.2s;
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);

  &:focus-within {
    box-shadow: 0 0 0 2px ${({ theme }) => theme.color.ring};
  }
`

const StyledTextarea = styled.textarea`
  flex: 1;
  resize: none;
  padding: ${({ theme }) => theme.spacing[2]} ${({ theme }) => theme.spacing[2]};
  font-size: 14px;
  min-height: 40px;
  max-height: 128px;
  overflow-y: auto;
  background: transparent;
  border: none;
  color: ${({ theme }) => theme.color.foreground};
  transition: all 0.2s;

  &:focus {
    outline: none;
    box-shadow: none;
  }

  &::-webkit-scrollbar {
    width: 6px;
  }
  &::-webkit-scrollbar-track {
    background: transparent;
  }
  &::-webkit-scrollbar-thumb {
    background: ${({ theme }) => theme.color.mutedForeground}4d;
    border-radius: 10px;
  }
`

export function ChatPage() {
  const { sessionId: routeSessionId } = useParams<{ sessionId: string }>()
  const navigate = useNavigate()
  const theme = useTheme()
  const { messages, isStreaming, sendMessage, newSession, connected, tokenInfo, loadingMessages } = useChat(routeSessionId)
  const [input, setInput] = useState('')
  const scrollRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const userScrolledUp = useRef(false)
  const [deleteSessionId, setDeleteSessionId] = useState<string | null>(null)
  const [renameSession, setRenameSession] = useState<{ id: string; title: string } | null>(null)
  const queryClient = useQueryClient()
  const { data: sessions } = useQuery({ queryKey: ['chat', 'sessions'], queryFn: chatApi.sessions })

  const updateSessionMut = useMutation({
    mutationFn: ({ id, data }: { id: string, data: any }) => chatApi.updateSession(id, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['chat', 'sessions'] }),
    onError: (e: any) => toast.error(e?.response?.data?.detail || 'Failed to update session'),
  })

  const deleteSessionMut = useMutation({
    mutationFn: (id: string) => chatApi.deleteSession(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['chat', 'sessions'] }),
    onError: (e: any) => toast.error(e?.response?.data?.detail || 'Failed to delete session'),
  })

  const handleRename = (id: string, current: string | null) => {
    setRenameSession({ id, title: current || '' })
  }

  const handleArchive = (id: string) => {
    updateSessionMut.mutate({ id, data: { is_archived: true } }, {
      onSuccess: () => toast.success('Session archived'),
    })
  }

  const handleNewSession = () => {
    newSession()
    navigate('/chat')
  }

  const handleDelete = (id: string) => {
    setDeleteSessionId(id)
  }

  const virtualizer = useVirtualizer({
    count: messages.length,
    getScrollElement: () => scrollRef.current,
    estimateSize: () => 120,
    overscan: 5,
  })

  useEffect(() => {
    if (messages.length > 0 && !userScrolledUp.current) {
      virtualizer.scrollToIndex(messages.length - 1, { behavior: 'auto' })
    }
  }, [messages])

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

  const budgetPct = tokenInfo ? Math.round((1 - tokenInfo.daily_remaining / 200_000) * 100) : null

  return (
    <PageContainer>
      <SidebarContainer>
        <SidebarHeader>
          <SidebarTitle>Chat History</SidebarTitle>
          <IconButton onClick={handleNewSession} aria-label="New session">
            <Plus style={{ width: '16px', height: '16px' }} />
          </IconButton>
        </SidebarHeader>
        <SessionList>
          {sessions === undefined ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 12px', color: theme.color.mutedForeground }}>
              <SpinningLoader style={{ width: '12px', height: '12px' }} />
              <span style={{ fontSize: '12px' }}>Loading sessions…</span>
            </div>
          ) : sessions.length === 0 ? (
            <p style={{ fontSize: '12px', color: theme.color.mutedForeground, padding: '8px 12px' }}>No past sessions</p>
          ) : null}
          {sessions?.map(s => (
            <SessionItem 
              key={s.id} 
              tabIndex={0}
              onClick={() => navigate(`/chat/${s.id}`)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault()
                  navigate(`/chat/${s.id}`)
                }
              }}
            >
              <SessionItemTitle>{s.title || 'New conversation'}</SessionItemTitle>
              <SessionActions>
                <SessionActionButton onClick={(e) => { e.stopPropagation(); handleRename(s.id, s.title) }} aria-label="Rename session">
                  <Edit2 style={{ width: '12px', height: '12px' }} />
                </SessionActionButton>
                <SessionActionButton onClick={(e) => { e.stopPropagation(); handleArchive(s.id) }} aria-label="Archive session">
                  <Archive style={{ width: '12px', height: '12px', color: theme.color.mutedForeground }} />
                </SessionActionButton>
                <SessionActionButton onClick={(e) => { e.stopPropagation(); handleDelete(s.id) }} aria-label="Delete session">
                  <Trash2 style={{ width: '12px', height: '12px', color: theme.color.destructive }} />
                </SessionActionButton>
              </SessionActions>
            </SessionItem>
          ))}
        </SessionList>
      </SidebarContainer>

      <MainChatArea>
        <ChatContainer>
          <ChatHeader>
            <NewSessionBtn onClick={handleNewSession}>
              <Plus style={{ width: '14px', height: '14px' }} /> New session
            </NewSessionBtn>
            <HeaderStatusContainer>
              {tokenInfo && (
                <TokenProgressContainer>
                  <TokenProgressBar aria-hidden="true">
                    <TokenProgressFill $pct={budgetPct ?? 0} />
                  </TokenProgressBar>
                  <TokenProgressText>
                    {tokenInfo.daily_remaining.toLocaleString()} left
                  </TokenProgressText>
                </TokenProgressContainer>
              )}
              {connected
                ? <Wifi style={{ width: '16px', height: '16px', color: theme.color.success }} aria-label="Connected" />
                : <WifiOff style={{ width: '16px', height: '16px', color: theme.color.mutedForeground }} aria-label="Disconnected" />
              }
            </HeaderStatusContainer>
          </ChatHeader>

          <MessagesContainer
            ref={scrollRef}
            onScroll={() => {
              const el = scrollRef.current
              if (!el) return
              userScrolledUp.current = el.scrollHeight - el.scrollTop - el.clientHeight > 100
            }}
            aria-live="polite"
            aria-relevant="additions"
            aria-label="Chat messages"
          >
            {loadingMessages ? (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', gap: '12px' }}>
                <SpinningLoader style={{ width: '32px', height: '32px', color: theme.color.primary }} />
                <span style={{ fontSize: '14px', color: theme.color.mutedForeground }}>Loading messages…</span>
              </div>
            ) : messages.length === 0 ? (
              <EmptyStateContainer>
                <EmptyStateIconWrapper>
                  <Bot style={{ width: '24px', height: '24px', color: theme.color.primary }} />
                </EmptyStateIconWrapper>
                <EmptyStateTitle>AIOS Agent</EmptyStateTitle>
                <EmptyStateDesc>
                  Log workouts, expenses, learnings — or ask anything about your life OS.
                </EmptyStateDesc>
                <QuickPromptsGrid>
                  {QUICK_PROMPTS.map(({ label, value }) => (
                    <QuickPromptButton key={value} onClick={() => handleQuickPrompt(value)}>
                      {label}
                    </QuickPromptButton>
                  ))}
                </QuickPromptsGrid>
              </EmptyStateContainer>
            ) : (
              <div style={{ height: virtualizer.getTotalSize(), position: 'relative' }}>
                {virtualizer.getVirtualItems().map(vItem => (
                  <div
                    key={vItem.key}
                    data-index={vItem.index}
                    ref={virtualizer.measureElement}
                    style={{ position: 'absolute', top: 0, left: 0, width: '100%', transform: `translateY(${vItem.start}px)` }}
                  >
                    <div style={{ padding: '8px 16px' }}>
                      <Message message={messages[vItem.index]} />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </MessagesContainer>

        </ChatContainer>

        <FloatingInputContainer>
          <StyledTextarea
            ref={textareaRef}
            value={input}
            onChange={e => setInput(e.target.value)}
            onInput={e => {
              const el = e.currentTarget
              el.style.height = 'auto'
              el.style.height = `${Math.min(el.scrollHeight, 150)}px`
            }}
            onKeyDown={e => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault()
                handleSend()
              }
            }}
            placeholder="Message AIOS... (Enter to send, Shift+Enter for newline)"
            rows={1}
            aria-label="Chat message input"
            aria-multiline="true"
          />
          <Button
            onClick={handleSend}
            disabled={!input.trim() || isStreaming || !connected}
            variant="primary"
            aria-label="Send message"
            style={{ flexShrink: 0, padding: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          >
            {!isStreaming ? <Send style={{ width: '16px', height: '16px' }} /> : <SpinningLoader style={{ width: '16px', height: '16px' }} />}
          </Button>
        </FloatingInputContainer>
      </MainChatArea>

      <Dialog
        open={!!renameSession}
        onOpenChange={(open: boolean) => !open && setRenameSession(null)}
        title="Rename session"
      >
        <Stack direction="column" gap={4}>
          <Input
            value={renameSession?.title || ''}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setRenameSession(prev => prev ? { ...prev, title: e.target.value } : null)}
            placeholder="New conversation"
            aria-label="New conversation title"
            autoFocus
          />
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '8px' }}>
            <Button variant="ghost" onClick={() => setRenameSession(null)}>Cancel</Button>
            <Button onClick={() => {
              if (renameSession?.title.trim() && renameSession.id) {
                updateSessionMut.mutate({ id: renameSession.id, data: { title: renameSession.title.trim() } })
              }
              setRenameSession(null)
            }}>Save</Button>
          </div>
        </Stack>
      </Dialog>

      <ConfirmDialog
        open={!!deleteSessionId}
        onOpenChange={(open: boolean) => !open && setDeleteSessionId(null)}
        title="Delete Session"
        description="Are you sure you want to permanently delete this chat session?"
        confirmLabel="Delete"
        destructive
        onConfirm={() => {
          if (deleteSessionId) deleteSessionMut.mutate(deleteSessionId)
          setDeleteSessionId(null)
        }}
      />
    </PageContainer>
  )
}
