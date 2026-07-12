/**
 * Shared chat message rendering — used by the GlobalAssistant drawer and ChatPage.
 * Monospace is reserved for actual code content (markdown pre/code, tool JSON);
 * all UI chrome stays on the sans stack per the design system.
 */
import styled, { keyframes, useTheme } from 'styled-components'
import { useEffect, useState } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Bot, FileText, Database, Calendar, BookOpen, Search, Copy, Edit2, Check, Code,
  BrainCircuit, ChevronDown, ChevronRight, RotateCcw, AlertTriangle,
  ListTodo, Target, IndianRupee, HeartPulse, Mail,
} from 'lucide-react'
import { Button } from '@ledgr/ui'
import type { LocalMessage } from '@/hooks/useChat'

const codeFont = 'sfmono-regular, consolas, "liberation mono", menlo, courier, monospace'

type ToolMeta = { icon: React.FC<{ className?: string, style?: any }>; colorKey: 'primary' | 'accent' | 'foreground' | 'muted' | 'mutedForeground'; summary: (input: Record<string, unknown>) => string }

const TOOL_META: Record<string, ToolMeta> = {
  append_log:           { icon: FileText,   colorKey: 'primary', summary: i => `Logging to ${i.area}: ${String(i.entry ?? '').slice(0, 50)}${String(i.entry ?? '').length > 50 ? '…' : ''}` },
  read_context:         { icon: BookOpen,   colorKey: 'accent', summary: i => `Reading ${i.area} context` },
  update_context:       { icon: FileText,   colorKey: 'primary', summary: i => `Updating ${i.area}: ${Object.keys((i.updates as object) ?? {}).join(', ')}` },
  search_vault:         { icon: Search,     colorKey: 'primary', summary: i => `Searching knowledge: "${i.query}"` },
  get_calendar_events:  { icon: Calendar,   colorKey: 'accent', summary: i => `Calendar: ${i.date_from} → ${i.date_to}` },
  get_notion_page:      { icon: Database,   colorKey: 'mutedForeground', summary: i => `Reading Notion: "${i.title}"` },
  get_recent_emails:    { icon: Mail,       colorKey: 'accent', summary: i => `Checking recent emails${i.unread_only ? ' (unread)' : ''}` },
  create_action:        { icon: ListTodo,   colorKey: 'primary', summary: i => `Creating task: ${String(i.title ?? '').slice(0, 50)}` },
  update_goal:          { icon: Target,     colorKey: 'primary', summary: i => `Updating goal${i.progress_score != null ? ` → ${i.progress_score}%` : ''}` },
  log_transaction:      { icon: IndianRupee, colorKey: 'primary', summary: i => `Logging ${i.type}: ₹${i.amount} — ${String(i.description ?? '').slice(0, 40)}` },
  log_health_metric:    { icon: HeartPulse, colorKey: 'primary', summary: i => `Logging health: ${i.entry_type}${i.value != null ? ` = ${i.value}` : ''}` },
}

function getToolMeta(tool: string): ToolMeta {
  return TOOL_META[tool] ?? { icon: Bot, colorKey: 'mutedForeground', summary: () => tool }
}

const TimelineContainer = styled.div`
  display: flex;
  flex-direction: column;
  margin: 0;
`

const ToolCallContainer = styled.div<{ $isLast?: boolean }>`
  position: relative;
  padding-left: 28px;
  padding-bottom: ${({ $isLast }) => ($isLast ? '0' : '16px')};

  &::before {
    content: '';
    position: absolute;
    left: 4px;
    top: 24px;
    bottom: ${({ $isLast }) => ($isLast ? '16px' : '-8px')};
    width: 2px;
    background-color: ${({ theme }) => theme.color.border};
    display: ${({ $isLast }) => ($isLast ? 'none' : 'block')};
  }
`

const TimelineDot = styled.div<{ $success?: boolean; $pending?: boolean }>`
  position: absolute;
  left: 2px;
  top: 16px;
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background-color: ${({ theme, $success, $pending }) =>
    $success ? theme.color.success : $pending ? theme.color.primary : theme.color.mutedForeground};
  z-index: 2;
  box-shadow: 0 0 0 4px ${({ theme }) => theme.color.background}, 0 0 0 5px ${({ theme }) => theme.color.border};
`

const ToolCallCard = styled.div`
  border: 1px solid ${({ theme }) => theme.color.border};
  border-radius: ${({ theme }) => theme.radii.lg};
  overflow: hidden;
  background-color: ${({ theme }) => theme.color.background};
  font-size: 13px;
  box-shadow: ${({ theme }) => theme.shadow.sm};
  transition: box-shadow ${({ theme }) => theme.motion.duration.normal} ${({ theme }) => theme.motion.easing.standard}, border-color ${({ theme }) => theme.motion.duration.normal} ${({ theme }) => theme.motion.easing.standard};

  &:hover {
    box-shadow: ${({ theme }) => theme.shadow.md};
    border-color: ${({ theme }) => theme.color.primary}40;
  }
`

const ToolCallButton = styled.button.attrs({ type: 'button' })<{ $open: boolean }>`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing[3]};
  width: 100%;
  padding: ${({ theme }) => theme.spacing[2]} ${({ theme }) => theme.spacing[3]};
  background-color: transparent;
  color: ${({ theme }) => theme.color.foreground};
  text-align: left;
  transition: background-color ${({ theme }) => theme.motion.duration.normal} ${({ theme }) => theme.motion.easing.standard};
  border: none;
  cursor: pointer;

  &:hover {
    background-color: ${({ theme }) => theme.color.muted}33;
  }

  &:focus-visible {
    outline: none;
    box-shadow: ${({ theme }) => theme.shadow.ring};
  }
`

const ToolIconWrapper = styled.div<{ $color: string }>`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  border-radius: ${({ theme }) => theme.radii.md};
  background-color: ${({ $color }) => $color}1a;
  color: ${({ $color }) => $color};
  flex-shrink: 0;
`

const ToolCallTitle = styled.span`
  flex: 1;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  font-weight: 500;
`

const ToolCallStatusText = styled.span<{ $success?: boolean; $pending?: boolean }>`
  margin-left: auto;
  font-size: 10px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  padding: 4px 8px;
  border-radius: ${({ theme }) => theme.radii.md};
  flex-shrink: 0;
  ${({ $success, $pending, theme }) => {
    if ($success) return `
      color: ${theme.color.success};
      background-color: ${theme.color.success}1a;
    `;
    if ($pending) return `
      color: ${theme.color.primary};
      background-color: ${theme.color.primary}1a;
    `;
    return `
      color: ${theme.color.foreground};
      background-color: ${theme.color.muted}4d;
    `;
  }}
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
  font-family: ${codeFont};
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

export function ToolCallBlock({ tool, input, result, affected, isLast }: {
  tool: string
  input: Record<string, unknown>
  result?: string
  affected?: string[]
  isLast?: boolean
}) {
  const [open, setOpen] = useState(false)
  const theme = useTheme()
  const { icon: Icon, colorKey, summary } = getToolMeta(tool)
  const color = theme.color[colorKey]

  return (
    <ToolCallContainer $isLast={isLast}>
      <TimelineDot $success={affected && affected.length > 0} $pending={result === undefined} />
      <ToolCallCard>
        <ToolCallButton
          onClick={() => setOpen(o => !o)}
          $open={open}
        >
          <ToolIconWrapper $color={color}>
            <Icon style={{ width: '12px', height: '12px', flexShrink: 0, color: 'inherit' }} />
          </ToolIconWrapper>
          <ToolCallTitle>{summary(input)}</ToolCallTitle>
          {result === undefined
            ? <ToolCallStatusText $pending>Running</ToolCallStatusText>
            : affected && affected.length > 0
            ? <ToolCallStatusText $success>Saved</ToolCallStatusText>
            : <ToolCallStatusText>Done</ToolCallStatusText>
          }
          {open ? <ChevronDown style={{ width: '12px', height: '12px', flexShrink: 0, color: theme.color.mutedForeground }} /> : <ChevronRight style={{ width: '12px', height: '12px', flexShrink: 0, color: theme.color.mutedForeground }} />}
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
      </ToolCallCard>
    </ToolCallContainer>
  )
}

const PathsWrapper = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: ${({ theme }) => theme.spacing[1]};
  padding: 0 ${({ theme }) => theme.spacing[1]};
`

const PathChip = styled.span`
  display: inline-flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing[1]};
  font-size: 10px;
  padding: 2px 8px;
  border-radius: ${({ theme }) => theme.radii.sm};
  background-color: ${({ theme }) => theme.color.primary}14;
  color: ${({ theme }) => theme.color.primary};
  border: 1px solid ${({ theme }) => theme.color.primary}33;
`

export function AffectedPaths({ paths }: { paths: string[] }) {
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
  position: relative;
  outline: none;

  &:hover .message-actions,
  &:focus-within .message-actions {
    opacity: 1;
    pointer-events: auto;
  }
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

const MessageBubble = styled.div<{ $isUser: boolean; $error?: boolean }>`
  border-radius: ${({ theme }) => theme.radii.lg};
  padding: ${({ theme }) => theme.spacing[2]} ${({ theme }) => theme.spacing[3]};
  font-size: 13px;
  ${({ theme, $isUser, $error }) => $isUser ? `
    background-color: ${theme.color.primary};
    color: ${theme.color.primaryForeground};
    border-top-right-radius: ${theme.radii.sm};
  ` : $error ? `
    background-color: ${theme.color.destructive}0d;
    color: ${theme.color.foreground};
    border: 1px solid ${theme.color.destructive}40;
    border-top-left-radius: ${theme.radii.sm};
  ` : `
    background-color: ${theme.color.background};
    color: ${theme.color.foreground};
    border: 1px solid ${theme.color.border}80;
    border-top-left-radius: ${theme.radii.sm};
  `}
`

const BubbleText = styled.p`
  white-space: pre-wrap;
  margin: 0;
`

const blink = keyframes`
  0%, 100% { opacity: 1; }
  50% { opacity: 0; }
`

const StreamingCursor = styled.span`
  display: inline-block;
  width: 2px;
  height: 1em;
  background: ${({ theme }) => theme.color.primary};
  animation: ${blink} 1s step-end infinite;
  vertical-align: text-bottom;
  margin-left: 2px;
`

export const MarkdownWrapper = styled.div`
  max-width: 100%;
  word-break: break-word;
  & p {
    margin: 0;
  }
  & pre {
    background-color: ${({ theme }) => theme.color.muted};
    padding: ${({ theme }) => theme.spacing[2]};
    border-radius: ${({ theme }) => theme.radii.md};
    overflow-x: auto;
    font-family: ${codeFont};
  }
  & code {
    font-family: ${codeFont};
  }
  ul, ol {
    padding-left: 20px;
    margin: 8px 0;
  }
  table {
    border-collapse: collapse;
    margin: 8px 0;
    max-width: 100%;
    display: block;
    overflow-x: auto;
  }
  th, td {
    border: 1px solid ${({ theme }) => theme.color.border};
    padding: 4px 10px;
    text-align: left;
  }
  th {
    background-color: ${({ theme }) => theme.color.muted}80;
    font-weight: 600;
  }
`

export function Markdown({ children }: { children: string }) {
  return (
    <MarkdownWrapper>
      <ReactMarkdown remarkPlugins={[remarkGfm]}>{children}</ReactMarkdown>
    </MarkdownWrapper>
  )
}

const ThinkingContainer = styled.details`
  font-size: 11px;
  color: ${({ theme }) => theme.color.mutedForeground};
  border-left: 2px solid ${({ theme }) => theme.color.border};
  padding-left: ${({ theme }) => theme.spacing[2]};
  margin: 0;

  &[open] summary ~ * {
    animation: fadein ${({ theme }) => theme.motion.duration.normal} ${({ theme }) => theme.motion.easing.standard};
  }
  @keyframes fadein {
    from { opacity: 0; }
    to { opacity: 1; }
  }
`

const ThinkingSummary = styled.summary`
  cursor: pointer;
  font-weight: 500;
  user-select: none;
  display: flex;
  align-items: center;
  gap: 6px;
  transition: color ${({ theme }) => theme.motion.duration.normal} ${({ theme }) => theme.motion.easing.standard};
  &:hover {
    color: ${({ theme }) => theme.color.foreground};
  }
`

const ThinkingContent = styled.div`
  margin-top: ${({ theme }) => theme.spacing[1]};
  white-space: pre-wrap;
`

export function ThinkingBlock({ content, streaming }: { content: string, streaming: boolean }) {
  const [isOpen, setIsOpen] = useState(streaming)

  useEffect(() => {
    if (streaming) {
      setIsOpen(true)
    }
  }, [streaming])

  const handleToggle = (e: React.SyntheticEvent<HTMLDetailsElement>) => {
    setIsOpen(e.currentTarget.open)
  }

  return (
    <ThinkingContainer open={isOpen} onToggle={handleToggle}>
      <ThinkingSummary>
        <BrainCircuit size={12} />
        {streaming ? 'Thinking...' : 'Thoughts'}
      </ThinkingSummary>
      <ThinkingContent>
        {content}
      </ThinkingContent>
    </ThinkingContainer>
  )
}

const ArtifactContainer = styled.div`
  border: 1px solid ${({ theme }) => theme.color.border};
  border-radius: ${({ theme }) => theme.radii.lg};
  overflow: hidden;
  max-width: 100%;
  margin: 0;
`

const ArtifactHeader = styled.div`
  background-color: ${({ theme }) => theme.color.muted}80;
  padding: ${({ theme }) => theme.spacing[2]} ${({ theme }) => theme.spacing[3]};
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing[2]};
  border-bottom: 1px solid ${({ theme }) => theme.color.border};
  font-weight: 600;
  font-size: 12px;
  color: ${({ theme }) => theme.color.foreground};
`

const ArtifactContent = styled.div`
  padding: ${({ theme }) => theme.spacing[3]};
  background-color: ${({ theme }) => theme.color.background};
  font-size: 13px;
  color: ${({ theme }) => theme.color.foreground};

  pre, code {
    font-family: ${codeFont};
  }

  pre {
    margin: 0;
    overflow-x: auto;
  }
`

export function ArtifactBlock({ title, type, content }: { title: string, type: string, content: string }) {
  const Icon = type === 'code' ? Code : FileText;
  return (
    <ArtifactContainer>
      <ArtifactHeader>
        <Icon size={14} />
        {title}
      </ArtifactHeader>
      <ArtifactContent>
        {type === 'code' ? (
          <pre style={{ margin: 0 }}><code>{content}</code></pre>
        ) : (
          <Markdown>{content}</Markdown>
        )}
      </ArtifactContent>
    </ArtifactContainer>
  )
}

const MessageActionsWrapper = styled.div<{ $isUser: boolean }>`
  position: absolute;
  bottom: -16px;
  ${({ $isUser }) => $isUser ? 'right: 36px;' : 'left: 36px;'}
  background: ${({ theme }) => theme.color.background};
  border: 1px solid ${({ theme }) => theme.color.border};
  border-radius: ${({ theme }) => theme.radii.sm};
  padding: 2px;
  box-shadow: ${({ theme }) => theme.shadow.sm};
  z-index: 10;
  display: flex;
  gap: 4px;
  opacity: 0;
  pointer-events: none;
  transition: opacity ${({ theme }) => theme.motion.duration.fast} ${({ theme }) => theme.motion.easing.standard};

  &:hover,
  &:focus-within {
    opacity: 1;
    pointer-events: auto;
  }

  @media (hover: none) {
    opacity: 0.8;
    pointer-events: auto;
  }
`

const ActionBtn = styled.button.attrs({ type: 'button' })`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  border-radius: ${({ theme }) => theme.radii.sm};
  background: transparent;
  border: none;
  color: ${({ theme }) => theme.color.mutedForeground};
  cursor: pointer;
  transition: all ${({ theme }) => theme.motion.duration.normal} ${({ theme }) => theme.motion.easing.standard};
  &:hover {
    background: ${({ theme }) => theme.color.muted};
    color: ${({ theme }) => theme.color.foreground};
  }
  &:focus-visible {
    outline: none;
    box-shadow: ${({ theme }) => theme.shadow.ring};
  }
`

function MessageActions({ message, onEdit }: { message: LocalMessage; onEdit?: (content: string) => void }) {
  const isUser = message.role === 'user'
  const [copied, setCopied] = useState(false)

  const handleCopy = async () => {
    if (message.content) {
      await navigator.clipboard.writeText(message.content)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  return (
    <MessageActionsWrapper className="message-actions" $isUser={isUser}>
      {message.content && (
        <ActionBtn onClick={handleCopy} title="Copy text">
          {copied ? <Check size={12} /> : <Copy size={12} />}
        </ActionBtn>
      )}
      {isUser && onEdit && message.content && (
        <ActionBtn onClick={() => onEdit(message.content!)} title="Edit">
          <Edit2 size={12} />
        </ActionBtn>
      )}
    </MessageActionsWrapper>
  )
}

export function Message({ message, onEdit, onRetry }: {
  message: LocalMessage
  onEdit?: (content: string) => void
  onRetry?: () => void
}) {
  const isUser = message.role === 'user'
  const theme = useTheme()

  let rawContent = message.content || ""
  let thinkContent = ""
  const thinkMatch = rawContent.match(/<think>([\s\S]*?)(?:<\/think>|$)/)
  let isThinkingOpen = false
  if (thinkMatch) {
    thinkContent = thinkMatch[1].trim()
    isThinkingOpen = !rawContent.includes('</think>') && message.streaming === true
    rawContent = rawContent.replace(/<think>[\s\S]*?(?:<\/think>|$)/, "").trim()
  }

  let artifactContent = null
  const artifactMatch = rawContent.match(/<aios-artifact type="([^"]*)" title="([^"]*)">([\s\S]*?)(?:<\/aios-artifact>|$)/)
  if (artifactMatch) {
    artifactContent = {
      type: artifactMatch[1],
      title: artifactMatch[2],
      content: artifactMatch[3].trim()
    }
    rawContent = rawContent.replace(/<aios-artifact[\s\S]*?(?:<\/aios-artifact>|$)/, "").trim()
  }

  const hasContent = !!rawContent || !!thinkContent || !!artifactContent
  const hasToolCalls = message.toolCalls && message.toolCalls.length > 0
  if (!isUser && !hasContent && !hasToolCalls && !message.streaming && !message.affectedPaths?.length) {
    return null
  }

  return (
    <MessageContainer $isUser={isUser} tabIndex={0}>
      {!isUser && (
        <BotAvatar>
          {message.error
            ? <AlertTriangle style={{ width: '14px', height: '14px', color: theme.color.destructive }} aria-hidden="true" />
            : <Bot style={{ width: '14px', height: '14px', color: theme.color.primary }} aria-hidden="true" />}
        </BotAvatar>
      )}
      <MessageContentWrapper $isUser={isUser}>
        {message.toolCalls && message.toolCalls.length > 0 && (
          <TimelineContainer>
            {message.toolCalls.map((tc, i) => (
              <ToolCallBlock
                key={i}
                tool={tc.tool}
                input={tc.input}
                result={message.toolResults?.[i]?.result}
                affected={message.toolResults?.[i]?.affected}
                isLast={i === message.toolCalls!.length - 1}
              />
            ))}
          </TimelineContainer>
        )}

        {!isUser && thinkContent && (
          <ThinkingBlock content={thinkContent} streaming={isThinkingOpen} />
        )}

        {!isUser && artifactContent && (
          <ArtifactBlock title={artifactContent.title} type={artifactContent.type} content={artifactContent.content} />
        )}

        {(rawContent || (message.streaming && !thinkContent && !artifactContent)) && (
          <MessageBubble $isUser={isUser} $error={message.error}>
            {isUser ? (
              <BubbleText>{rawContent}</BubbleText>
            ) : (
              <>
                <Markdown>{rawContent}</Markdown>
                {message.streaming && <StreamingCursor aria-hidden="true" />}
              </>
            )}
          </MessageBubble>
        )}

        {!isUser && message.error && onRetry && (
          <Button size="sm" variant="outline" onClick={onRetry}>
            <RotateCcw size={12} style={{ marginRight: 6 }} /> Retry
          </Button>
        )}

        {!isUser && message.affectedPaths && (
          <AffectedPaths paths={message.affectedPaths} />
        )}
        <MessageActions message={message} onEdit={onEdit} />
      </MessageContentWrapper>
      {isUser && (
        <UserAvatar>U</UserAvatar>
      )}
    </MessageContainer>
  )
}
