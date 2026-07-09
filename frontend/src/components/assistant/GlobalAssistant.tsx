import styled, { keyframes, useTheme } from 'styled-components'
import { useRef, useEffect, useState } from 'react'
import { Button, Spinner, Select } from '@ledgr/ui'
import { useVirtualizer } from '@tanstack/react-virtual'
import { Plus, ChevronDown, ChevronRight, Wifi, WifiOff,
  Bot, FileText, Database, Calendar, Github, BookOpen, Search, X, Copy, Edit2, Check, Code, BrainCircuit, Settings, History, MoreHorizontal
} from 'lucide-react'
import ReactMarkdown from 'react-markdown'
import { motion, AnimatePresence } from 'framer-motion'
import { useChat } from '@/hooks/useChat'
import { useLocation } from 'react-router-dom'
import { chatApi } from '@/api/chat'
import { AssistantChatInput, AttachedFile } from './AssistantChatInput'

const QUICK_PROMPTS = [
  { label: 'Log gym session', value: "Log today's gym session" },
  { label: 'Week spending?', value: 'What did I spend this week?' },
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

const TimelineContainer = styled.div`
  display: flex;
  flex-direction: column;
  margin: 6px 0;
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
  transition: box-shadow 0.2s, border-color 0.2s;

  &:hover {
    box-shadow: ${({ theme }) => theme.shadow.md};
    border-color: ${({ theme }) => theme.color.primary}40;
  }
`

const ToolCallButton = styled.button<{ $open: boolean }>`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing[3]};
  width: 100%;
  padding: ${({ theme }) => theme.spacing[2]} ${({ theme }) => theme.spacing[3]};
  background-color: transparent;
  color: ${({ theme }) => theme.color.foreground};
  text-align: left;
  transition: background-color 0.2s;
  border: none;
  cursor: pointer;
  
  &:hover {
    background-color: ${({ theme }) => theme.color.muted}33;
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
  border-radius: 12px;
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

function ToolCallBlock({ tool, input, result, affected, isLast }: {
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
  margin-top: ${({ theme }) => theme.spacing[2]};
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
  position: relative;
  
  &:hover .message-actions {
    opacity: 1;
    visibility: visible;
    height: 24px;
    margin-top: 2px;
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

const MessageBubble = styled.div<{ $isUser: boolean }>`
  border-radius: 18px;
  padding: ${({ theme }) => theme.spacing[2]} ${({ theme }) => theme.spacing[3]};
  font-size: 13px;
  ${({ theme, $isUser }) => $isUser ? `
    background-color: ${theme.color.primary};
    color: ${theme.color.primaryForeground};
    border-top-right-radius: 2px;
  ` : `
    background-color: ${theme.color.background};
    color: ${theme.color.foreground};
    border: 1px solid ${theme.color.border}80;
    border-top-left-radius: 2px;
  `}
`

const BubbleText = styled.p`
  white-space: pre-wrap;
  margin: 0;
`

const MarkdownWrapper = styled.div`
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
  }
  ul, ol {
    padding-left: 20px;
    margin: 8px 0;
  }
`

const ThinkingContainer = styled.details`
  font-size: 11px;
  color: ${({ theme }) => theme.color.mutedForeground};
  margin-bottom: ${({ theme }) => theme.spacing[2]};
  border-left: 2px solid ${({ theme }) => theme.color.border};
  padding-left: ${({ theme }) => theme.spacing[2]};
  
  &[open] summary ~ * {
    animation: fadein 0.2s ease-in-out;
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

function ThinkingBlock({ content, streaming }: { content: string, streaming: boolean }) {
  return (
    <ThinkingContainer open={streaming}>
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
  margin-top: ${({ theme }) => theme.spacing[2]};
  margin-bottom: ${({ theme }) => theme.spacing[2]};
  border: 1px solid ${({ theme }) => theme.color.border};
  border-radius: ${({ theme }) => theme.radii.lg};
  overflow: hidden;
  max-width: 100%;
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
  max-height: 400px;
  overflow-y: auto;
  color: ${({ theme }) => theme.color.foreground};
`

function ArtifactBlock({ title, type, content }: { title: string, type: string, content: string }) {
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
          <MarkdownWrapper><ReactMarkdown>{content}</ReactMarkdown></MarkdownWrapper>
        )}
      </ArtifactContent>
    </ArtifactContainer>
  )
}

const MessageActionsWrapper = styled.div<{ $isUser: boolean }>`
  display: flex;
  gap: 4px;
  opacity: 0;
  visibility: hidden;
  height: 0;
  margin-top: 0;
  overflow: hidden;
  transition: opacity 0.15s ease-in-out, visibility 0.15s, height 0.15s ease-in-out, margin-top 0.15s ease-in-out;
  align-self: ${({ $isUser }) => $isUser ? 'flex-end' : 'flex-start'};
`

const ActionBtn = styled.button`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  border-radius: 4px;
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

function MessageActions({ message, onEdit }: { message: ReturnType<typeof useChat>['messages'][number]; onEdit?: (content: string) => void }) {
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

function Message({ message, onEdit }: { message: ReturnType<typeof useChat>['messages'][number]; onEdit?: (content: string) => void }) {
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
    <MessageContainer $isUser={isUser}>
      {!isUser && (
        <BotAvatar>
          <Bot style={{ width: '14px', height: '14px', color: theme.color.primary }} aria-hidden="true" />
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
          <MessageBubble $isUser={isUser}>
            {isUser ? (
              <BubbleText>{rawContent}</BubbleText>
            ) : (
              <MarkdownWrapper>
                {rawContent ? (
                  <ReactMarkdown>{rawContent}</ReactMarkdown>
                ) : null}
              </MarkdownWrapper>
            )}
          </MessageBubble>
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

const FAB = styled(motion.button)`
  position: fixed;
  bottom: 24px;
  right: 24px;
  width: 56px;
  height: 56px;
  border-radius: 50%;
  background-color: ${({ theme }) => theme.color.primary};
  color: ${({ theme }) => theme.color.primaryForeground};
  border: none;
  box-shadow: ${({ theme }) => theme.shadow.lg};
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  z-index: 50;
`

const ResizeHandle = styled.div`
  position: absolute;
  top: 0;
  left: 0;
  width: 6px;
  height: 100%;
  cursor: ew-resize;
  z-index: 100;
  
  &:hover, &:active {
    background-color: ${({ theme }) => theme.color.primary}33;
  }
`

const AssistantWindow = styled(motion.div)`
  position: fixed;
  top: 0;
  right: 0;
  max-width: 100vw;
  height: 100vh;
  background-color: ${({ theme }) => theme.color.background}e6;
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  border-left: 1px solid ${({ theme }) => theme.color.border}80;
  box-shadow: -4px 0 24px ${({ theme }) => theme.color.border};
  display: flex;
  flex-direction: column;
  z-index: 50;
  overflow: hidden;
  font-family: ${({ theme }) => theme.typography?.fontFamily?.sans || '"DM Sans", sans-serif'};
`

const AssistantHeader = styled.div`
  padding: ${({ theme }) => theme.spacing[3]} ${({ theme }) => theme.spacing[4]};
  border-bottom: 1px solid ${({ theme }) => theme.color.border}80;
  display: flex;
  align-items: center;
  justify-content: space-between;
  background-color: ${({ theme }) => theme.color.background}b3;
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  position: relative;
`

const HeaderLeft = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
`

const HeaderTitle = styled.span`
  font-family: ${({ theme }) => theme.typography?.fontFamily?.serif || '"Playfair Display", serif'};
  font-weight: 600;
  font-size: 14px;
`

const HeaderRight = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
`

const HeaderActionButton = styled.button`
  background: transparent;
  border: none;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 6px;
  color: ${({ theme }) => theme.color.mutedForeground};
  transition: color ${({ theme }) => theme.motion.duration.fast} ${({ theme }) => theme.motion.easing.standard};

  &:hover {
    color: ${({ theme }) => theme.color.foreground};
  }

  &:focus-visible {
    outline: none;
    box-shadow: ${({ theme }) => theme.shadow.ring};
    border-radius: ${({ theme }) => theme.radii.sm};
  }
`

const MessagesContainer = styled.div`
  flex: 1;
  overflow-y: auto;
  overflow-x: hidden;
  padding: ${({ theme }) => theme.spacing[4]};
  position: relative;
  
  &::-webkit-scrollbar {
    width: 6px;
  }
  &::-webkit-scrollbar-thumb {
    background: ${({ theme }) => theme.color.mutedForeground}4d;
    border-radius: 10px;
  }
`

const InputContainer = styled.div`
  padding: ${({ theme }) => theme.spacing[3]};
  border-top: 1px solid ${({ theme }) => theme.color.border};
  display: flex;
  gap: ${({ theme }) => theme.spacing[2]};
  align-items: flex-end;
  background-color: ${({ theme }) => theme.color.background};
`

const SettingsPanel = styled(motion.div)`
  position: absolute;
  top: 100%;
  right: 16px;
  width: 220px;
  background-color: ${({ theme }) => theme.color.background}f2;
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  border: 1px solid ${({ theme }) => theme.color.border}80;
  border-radius: ${({ theme }) => theme.radii.md};
  box-shadow: 0 4px 30px rgba(0, 0, 0, 0.03), 0 1px 3px rgba(0, 0, 0, 0.02);
  padding: ${({ theme }) => theme.spacing[3]};
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.spacing[3]};
  z-index: 60;

  @media (max-width: 767px) {
    width: calc(100% - 32px);
    left: 16px;
    right: 16px;
  }
`

const SettingRow = styled.div`
  display: flex;
  flex-direction: column;
  gap: 6px;
`

const SettingLabel = styled.label`
  font-size: 11px;
  font-weight: 500;
  color: ${({ theme }) => theme.color.mutedForeground};
`

const HistorySidebar = styled(motion.div)`
  position: absolute;
  top: 0;
  left: 0;
  height: 100%;
  width: 260px;
  background-color: ${({ theme }) => theme.color.background}e6;
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  border-right: 1px solid ${({ theme }) => theme.color.border}80;
  z-index: 40;
  display: flex;
  flex-direction: column;
  box-shadow: ${({ theme }) => theme.shadow.sm};

  @media (max-width: 767px) {
    width: 100%;
    border-right: none;
  }
`

const HistoryHeader = styled.div`
  padding: ${({ theme }) => theme.spacing[3]};
  border-bottom: 1px solid ${({ theme }) => theme.color.border};
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-weight: 600;
  font-size: 13px;
`

const HistoryList = styled.div`
  flex: 1;
  overflow-y: auto;
  padding: ${({ theme }) => theme.spacing[2]};
  display: flex;
  flex-direction: column;
  gap: 2px;
`

const HistoryItem = styled.div<{ $active?: boolean }>`
  padding: 10px 12px;
  background: ${({ theme, $active }) => $active ? theme.color.muted : 'transparent'};
  border-radius: ${({ theme }) => theme.radii.md};
  font-size: 12px;
  cursor: pointer;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  color: ${({ theme, $active }) => $active ? theme.color.foreground : theme.color.mutedForeground};
  font-weight: ${({ $active }) => $active ? 500 : 400};
  display: flex;
  justify-content: space-between;
  align-items: center;
  transition: background-color ${({ theme }) => theme.motion.duration.normal} ${({ theme }) => theme.motion.easing.standard},
              color ${({ theme }) => theme.motion.duration.normal} ${({ theme }) => theme.motion.easing.standard};

  &:hover {
    background: ${({ theme }) => theme.color.muted};
    color: ${({ theme }) => theme.color.foreground};
  }

  &:focus-visible {
    outline: none;
    box-shadow: ${({ theme }) => theme.shadow.ring};
  }
`

const SessionActionBtn = styled.button`
  background: transparent;
  border: none;
  cursor: pointer;
  color: ${({ theme }) => theme.color.mutedForeground};
  display: flex;
  padding: 2px;
  border-radius: 4px;
  opacity: 0.5;
  transition: all ${({ theme }) => theme.motion.duration.normal} ${({ theme }) => theme.motion.easing.standard};
  &:hover {
    background: ${({ theme }) => theme.color.border};
    opacity: 1;
    color: ${({ theme }) => theme.color.foreground};
  }
  &:focus-visible {
    outline: none;
    box-shadow: ${({ theme }) => theme.shadow.ring};
  }
`

const SessionMenu = styled.div`
  position: absolute;
  right: 12px;
  margin-top: 24px;
  background: ${({ theme }) => theme.color.background};
  border: 1px solid ${({ theme }) => theme.color.border};
  border-radius: ${({ theme }) => theme.radii.md};
  box-shadow: ${({ theme }) => theme.shadow.md};
  display: flex;
  flex-direction: column;
  z-index: 101;
  min-width: 120px;
  padding: 4px;
`

const SessionMenuItem = styled.button`
  text-align: left;
  padding: 6px 10px;
  font-size: 12px;
  border: none;
  background: transparent;
  border-radius: ${({ theme }) => theme.radii.sm};
  cursor: pointer;
  color: ${({ theme }) => theme.color.foreground};
  transition: all ${({ theme }) => theme.motion.duration.normal} ${({ theme }) => theme.motion.easing.standard};
  
  &:hover {
    background: ${({ theme }) => theme.color.muted};
  }
  &:focus-visible {
    outline: none;
    background: ${({ theme }) => theme.color.muted};
    box-shadow: ${({ theme }) => theme.shadow.ring};
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
`

const EmptyStateIconWrapper = styled.div`
  width: 40px;
  height: 40px;
  border-radius: ${({ theme }) => theme.radii.xl};
  background-color: ${({ theme }) => theme.color.primary}1a;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: ${({ theme }) => theme.spacing[3]};
`

const QuickPromptsGrid = styled.div`
  display: grid;
  grid-template-columns: 1fr;
  gap: 8px;
  margin-top: 24px;
  width: 100%;
`

const QuickPromptButton = styled.button`
  padding: 8px 12px;
  font-size: 12px;
  border-radius: ${({ theme }) => theme.radii.md};
  text-align: left;
  background-color: transparent;
  border: 1px solid ${({ theme }) => theme.color.border};
  color: ${({ theme }) => theme.color.foreground};
  cursor: pointer;
  transition: all ${({ theme }) => theme.motion.duration.normal} ${({ theme }) => theme.motion.easing.standard};
  
  &:hover {
    background-color: ${({ theme }) => theme.color.muted}80;
  }
  &:focus-visible {
    outline: none;
    box-shadow: ${({ theme }) => theme.shadow.ring};
  }
`

const ContextDropdown = styled.div`
  position: absolute;
  bottom: calc(100% + 8px);
  left: 0;
  background: ${({ theme }) => theme.color.background};
  border: 1px solid ${({ theme }) => theme.color.border};
  border-radius: ${({ theme }) => theme.radii.md};
  box-shadow: ${({ theme }) => theme.shadow.md};
  padding: 4px;
  display: flex;
  flex-direction: column;
  gap: 2px;
  z-index: 100;
  min-width: 150px;
`

const ContextOption = styled.button`
  text-align: left;
  padding: 6px 10px;
  font-size: 12px;
  border: none;
  background: transparent;
  border-radius: 4px;
  cursor: pointer;
  color: ${({ theme }) => theme.color.foreground};
  transition: background-color ${({ theme }) => theme.motion.duration.normal} ${({ theme }) => theme.motion.easing.standard};
  
  &:hover {
    background: ${({ theme }) => theme.color.muted};
  }

  &:focus-visible {
    outline: none;
    background: ${({ theme }) => theme.color.muted};
    box-shadow: ${({ theme }) => theme.shadow.ring};
  }
`

export function GlobalAssistant() {
  const [panelWidth, setPanelWidth] = useState(400)
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768)
  const isResizing = useRef(false)

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768)
    }
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizing.current) return
      if (window.innerWidth < 768) return
      const newWidth = window.innerWidth - e.clientX
      if (newWidth >= 320 && newWidth <= 800) {
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
        setShowSettings(false)
        setShowHistory(false)
        setSessionMenuId(null)
      }
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [])

  const [isOpen, setIsOpen] = useState(false)
  const theme = useTheme()
  const { messages, sessionId, isStreaming, sendMessage, connected, newSession, loadSession, loadingMessages } = useChat()
  const [input, setInput] = useState('')
  const scrollRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const location = useLocation()
  
  const [showHistory, setShowHistory] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const [sessions, setSessions] = useState<any[]>([])
  const [sessionMenuId, setSessionMenuId] = useState<string | null>(null)
  
  const [attachments, setAttachments] = useState<File[]>([])
  const fileInputRef = useRef<HTMLInputElement>(null)
  const settingsRef = useRef<HTMLDivElement>(null)
  const sessionMenuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (settingsRef.current && !settingsRef.current.contains(event.target as Node)) {
        setShowSettings(false)
      }
    }
    if (showSettings) {
      document.addEventListener("mousedown", handleClickOutside)
    }
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [showSettings])

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (sessionMenuRef.current && !sessionMenuRef.current.contains(event.target as Node)) {
        setSessionMenuId(null)
      }
    }
    if (sessionMenuId) {
      document.addEventListener("mousedown", handleClickOutside)
    }
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [sessionMenuId])
  const [provider, setProvider] = useState('openai')
  const [model, setModel] = useState('gpt-4o')

  const fetchSessions = async () => {
    try {
      const data = await chatApi.sessions()
      // Sort by recent first
      setSessions(data.sort((a, b) => new Date(b.started_at).getTime() - new Date(a.started_at).getTime()))
    } catch (e) {
      console.error(e)
    }
  }

  useEffect(() => {
    if (showHistory) {
      fetchSessions()
    }
  }, [showHistory])

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setAttachments(prev => [...prev, ...Array.from(e.target.files!)])
    }
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const handleRemoveAttachment = (idx: number) => {
    setAttachments(prev => prev.filter((_, i) => i !== idx))
  }

  const virtualizer = useVirtualizer({
    count: messages.length,
    getScrollElement: () => scrollRef.current,
    estimateSize: () => 100,
    overscan: 5,
  })

  useEffect(() => {
    if (messages.length > 0) {
      virtualizer.scrollToIndex(messages.length - 1, { behavior: 'auto' })
    }
  }, [messages.length])
  
  useEffect(() => {
    if (isOpen && textareaRef.current) {
      textareaRef.current.focus()
    }
  }, [isOpen])

  const handleSend = () => {
    const trimmed = input.trim()
    if ((!trimmed && attachments.length === 0) || isStreaming) return
    setInput('')
    if (textareaRef.current) textareaRef.current.style.height = 'auto'
    
    // Add extra hidden context if @ mentions are used
    let extraContext = ""
    if (trimmed.includes("@vault")) extraContext += "\n[System: The user mentioned @vault. Prioritize searching the vault.]"
    if (trimmed.includes("@finance")) extraContext += "\n[System: The user mentioned @finance. Use financial context and tools.]"
    if (trimmed.includes("@health")) extraContext += "\n[System: The user mentioned @health. Use health context and tools.]"
    if (trimmed.includes("@goals")) extraContext += "\n[System: The user mentioned @goals. Use goal tracking context.]"

    const hiddenContext = `[System: The user is currently viewing the ${location.pathname} route in the app. Use this context if the user asks a contextual question like 'what is this' or 'summarize my page'.]${extraContext}`
    
    const overrides = {
      provider: provider === 'system' ? undefined : provider,
      openaiModel: provider === 'openai' ? (model === 'system' ? undefined : model) : undefined,
      claudeModel: provider === 'anthropic' ? (model === 'system' ? undefined : model) : undefined,
    }
    
    sendMessage(trimmed, hiddenContext, attachments, overrides)
    setAttachments([])
  }

  function handleQuickPrompt(value: string) {
    setInput(value)
    if (textareaRef.current) textareaRef.current.focus()
  }

  const mentionMatch = input.match(/@(\w*)$/)
  const mentionQuery = mentionMatch ? mentionMatch[1].toLowerCase() : ''
  const availableMentions = ['vault', 'finance', 'health', 'goals'].filter(m => m.includes(mentionQuery))

  const handleMention = (tag: string) => {
    setInput(prev => prev.replace(/@\w*$/, '') + `@${tag} `)
    textareaRef.current?.focus()
  }

  const handleAssistantSend = (data: {
    message: string;
    files: AttachedFile[];
    pastedContent: { id: string; content: string; timestamp: Date }[];
    model: string;
    isThinkingEnabled: boolean;
  }) => {
    const trimmed = data.message.trim()
    let finalMessage = trimmed
    
    if (data.pastedContent.length > 0) {
      finalMessage += '\n\n' + data.pastedContent.map(c => c.content).join('\n\n')
    }

    if (!finalMessage && data.files.length === 0) return

    let extraContext = ""
    if (finalMessage.includes("@vault")) extraContext += "\n[System: The user mentioned @vault. Prioritize searching the vault.]"
    if (finalMessage.includes("@finance")) extraContext += "\n[System: The user mentioned @finance. Use financial context and tools.]"
    if (finalMessage.includes("@health")) extraContext += "\n[System: The user mentioned @health. Use health context and tools.]"
    if (finalMessage.includes("@goals")) extraContext += "\n[System: The user mentioned @goals. Use goal tracking context.]"
    if (data.isThinkingEnabled) extraContext += "\n[System: The user enabled extended thinking. Please think step-by-step deeply before answering.]"

    const hiddenContext = `[System: The user is currently viewing the ${location.pathname} route in the app. Use this context if the user asks a contextual question like 'what is this' or 'summarize my page'.]${extraContext}`
    
    const filesToUpload = data.files.map(f => f.file)

    const overrides = {
      provider: provider === 'system' ? undefined : provider,
      openaiModel: provider === 'openai' ? (data.model === 'system' ? undefined : data.model) : undefined,
      claudeModel: provider === 'anthropic' ? (data.model === 'system' ? undefined : data.model) : undefined,
    }
    
    sendMessage(finalMessage, hiddenContext, filesToUpload, overrides)
  }

  const chatModels = [
    { id: 'system', name: 'System Default', description: 'Default configured model' },
    ...(provider === 'openai' ? [
      { id: 'gpt-4o', name: 'GPT-4o', description: 'Most capable OpenAI model' },
      { id: 'gpt-4o-mini', name: 'GPT-4o Mini', description: 'Fast and efficient' },
      { id: 'gpt-4-turbo', name: 'GPT-4 Turbo', description: 'Balanced performance' },
      { id: 'gpt-3.5-turbo', name: 'GPT-3.5 Turbo', description: 'Fastest legacy model' },
    ] : []),
    ...(provider === 'anthropic' ? [
      { id: 'claude-3-5-sonnet-20240620', name: 'Claude 3.5 Sonnet', description: 'Best for coding and complex tasks', badge: 'Upgrade' },
      { id: 'claude-3-5-haiku-20241022', name: 'Claude 3.5 Haiku', description: 'Fastest for everyday tasks' },
      { id: 'claude-3-opus-20240229', name: 'Claude 3 Opus', description: 'High capability model' },
      { id: 'claude-3-sonnet-20240229', name: 'Claude 3 Sonnet', description: 'Balanced model' },
      { id: 'claude-3-haiku-20240307', name: 'Claude 3 Haiku', description: 'Fast and capable' },
    ] : [])
  ]

  return (
    <>
      <AnimatePresence>
        {isOpen && (
          <AssistantWindow
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
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
                <Bot size={16} color={theme.color.primary} style={{ marginLeft: 8 }} />
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
                        options={[
                          { label: 'System Default', value: 'system' },
                          ...(provider === 'openai' ? [
                            { label: 'GPT-4o', value: 'gpt-4o' },
                            { label: 'GPT-4o Mini', value: 'gpt-4o-mini' },
                            { label: 'GPT-4 Turbo', value: 'gpt-4-turbo' },
                            { label: 'GPT-3.5 Turbo', value: 'gpt-3.5-turbo' }
                          ] : []),
                          ...(provider === 'anthropic' ? [
                            { label: 'Claude 3.5 Sonnet', value: 'claude-3-5-sonnet-20240620' },
                            { label: 'Claude 3.5 Haiku', value: 'claude-3-5-haiku-20241022' },
                            { label: 'Claude 3 Opus', value: 'claude-3-opus-20240229' },
                            { label: 'Claude 3 Sonnet', value: 'claude-3-sonnet-20240229' },
                            { label: 'Claude 3 Haiku', value: 'claude-3-haiku-20240307' }
                          ] : [])
                        ]}
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
                  <HistoryList>
                    <HistoryItem 
                      onClick={() => { newSession(); setShowHistory(false) }}
                      $active={!sessionId}
                    >
                      <Plus size={14} style={{ marginRight: 6 }} /> New Chat
                    </HistoryItem>
                    {sessions.filter(s => new Date(s.started_at) > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)).map(session => (
                      <HistoryItem 
                        key={session.id}
                        onClick={() => {
                          loadSession(session.id)
                          setShowHistory(false)
                        }}
                        $active={session.id === sessionId}
                      >
                        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {session.title || new Date(session.started_at).toLocaleString()}
                        </span>
                        
                        <div style={{ position: 'relative' }} onClick={e => e.stopPropagation()}>
                          <SessionActionBtn onClick={(e) => {
                            e.stopPropagation()
                            setSessionMenuId(sessionMenuId === session.id ? null : session.id)
                          }}>
                            <MoreHorizontal size={14} />
                          </SessionActionBtn>
                          
                          {sessionMenuId === session.id && (
                            <SessionMenu ref={sessionMenuRef}>
                              <SessionMenuItem onClick={async (e) => {
                                e.stopPropagation()
                                setSessionMenuId(null)
                                const newTitle = prompt('Enter new session name:', session.title || '')
                                if (newTitle && newTitle !== session.title) {
                                  await chatApi.updateSession(session.id, { title: newTitle })
                                  fetchSessions()
                                }
                              }}>Rename</SessionMenuItem>
                              <SessionMenuItem onClick={async (e) => {
                                e.stopPropagation()
                                setSessionMenuId(null)
                                await chatApi.updateSession(session.id, { is_archived: true })
                                if (sessionId === session.id) newSession()
                                fetchSessions()
                              }}>Archive</SessionMenuItem>
                              <SessionMenuItem onClick={async (e) => {
                                e.stopPropagation()
                                setSessionMenuId(null)
                                if (confirm('Are you sure you want to delete this session?')) {
                                  await chatApi.deleteSession(session.id)
                                  if (sessionId === session.id) newSession()
                                  fetchSessions()
                                }
                              }} style={{ color: '#e11d48' }}>Delete</SessionMenuItem>
                            </SessionMenu>
                          )}
                        </div>
                      </HistoryItem>
                    ))}
                  </HistoryList>
                </HistorySidebar>
              )}
            </AnimatePresence>

            <MessagesContainer ref={scrollRef}>
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
                <div style={{ height: virtualizer.getTotalSize(), position: 'relative' }}>
                  {virtualizer.getVirtualItems().map(vItem => {
                    const message = messages[vItem.index]
                    if (!message) return null
                    return (
                      <div
                        key={vItem.key}
                        data-index={vItem.index}
                        ref={virtualizer.measureElement}
                        style={{ position: 'absolute', top: 0, left: 0, width: '100%', transform: `translateY(${vItem.start}px)` }}
                      >
                        <div style={{ padding: '8px 0' }}>
                          <Message 
                            message={message} 
                            onEdit={(content) => {
                              setInput(content)
                              textareaRef.current?.focus()
                            }} 
                          />
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </MessagesContainer>

            <div style={{ padding: '0 16px 16px', position: 'relative' }}>
              {mentionMatch && availableMentions.length > 0 && (
                <ContextDropdown>
                  <div style={{ fontSize: '10px', color: '#888', padding: '4px 6px', fontWeight: 600, textTransform: 'uppercase' }}>Mentions</div>
                  {availableMentions.map(m => (
                    <ContextOption key={m} onClick={() => handleMention(m)}>
                      @{m}
                    </ContextOption>
                  ))}
                </ContextDropdown>
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
      
      {!isOpen && (
        <FAB
          onClick={() => setIsOpen(true)}
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          <Bot size={24} />
        </FAB>
      )}
    </>
  )
}
