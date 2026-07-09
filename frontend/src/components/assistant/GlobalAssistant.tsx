import styled, { keyframes, useTheme } from 'styled-components'
import { useRef, useEffect, useState } from 'react'
import { Button, Spinner, Select } from '@ledgr/ui'
import { useVirtualizer } from '@tanstack/react-virtual'
import { Send, Plus, ChevronDown, ChevronRight, Wifi, WifiOff,
  Bot, FileText, Database, Calendar, Github, BookOpen, Search, MessageSquare, X, Copy, Edit2, Check, Code, BrainCircuit, Maximize2, Paperclip, Settings, History, Image as ImageIcon, File as FileIcon
} from 'lucide-react'
import ReactMarkdown from 'react-markdown'
import { motion, AnimatePresence } from 'framer-motion'
import { useChat } from '@/hooks/useChat'
import { useLocation } from 'react-router-dom'
import { chatApi } from '@/api/chat'

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
        $open={open}
      >
        <Icon style={{ width: '12px', height: '12px', flexShrink: 0, color }} />
        <ToolCallTitle>{summary(input)}</ToolCallTitle>
        {result === undefined
          ? <div style={{ marginLeft: 'auto', flexShrink: 0, display: 'flex' }}><Spinner size="xs" tone="muted" /></div>
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
  border-radius: ${({ theme }) => theme.radii.sm};
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
  position: relative;
  
  &:hover .message-actions {
    opacity: 1;
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
  border-radius: ${({ theme }) => theme.radii.xl};
  padding: ${({ theme }) => theme.spacing[2]} ${({ theme }) => theme.spacing[3]};
  font-size: 13px;
  background-color: ${({ theme, $isUser }) => $isUser ? theme.color.primary : theme.color.muted}4d;
  color: ${({ theme, $isUser }) => $isUser ? theme.color.primaryForeground : theme.color.foreground};
  ${({ $isUser }) => $isUser ? `border-top-right-radius: 2px;` : `border-top-left-radius: 2px;`}
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
        {streaming && <StreamingCursor />}
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
  transition: opacity 0.15s ease-in-out;
  align-self: ${({ $isUser }) => $isUser ? 'flex-end' : 'flex-start'};
  margin-top: 2px;
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
  &:hover {
    background: ${({ theme }) => theme.color.muted};
    color: ${({ theme }) => theme.color.foreground};
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
        {message.toolCalls?.map((tc, i) => (
          <ToolCallBlock
            key={i}
            tool={tc.tool}
            input={tc.input}
            result={message.toolResults?.[i]?.result}
            affected={message.toolResults?.[i]?.affected}
          />
        ))}

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
                {message.streaming && !isThinkingOpen && <StreamingCursor />}
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
  
  &:hover {
    transform: scale(1.05);
  }
`

const AssistantWindow = styled(motion.div)`
  position: fixed;
  bottom: 90px;
  right: 24px;
  width: 380px;
  height: 600px;
  min-width: 320px;
  min-height: 400px;
  max-width: 800px;
  max-height: calc(100vh - 120px);
  background-color: ${({ theme }) => theme.color.background};
  border: 1px solid ${({ theme }) => theme.color.border};
  border-radius: ${({ theme }) => theme.radii.xl};
  box-shadow: ${({ theme }) => theme.shadow.xl};
  display: flex;
  flex-direction: column;
  z-index: 50;
  overflow: hidden;
  resize: both;
`

const AssistantHeader = styled.div`
  padding: ${({ theme }) => theme.spacing[3]} ${({ theme }) => theme.spacing[4]};
  border-bottom: 1px solid ${({ theme }) => theme.color.border};
  display: flex;
  align-items: center;
  justify-content: space-between;
  background-color: ${({ theme }) => theme.color.muted}4d;
  position: relative;
`

const HeaderLeft = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
`

const HeaderTitle = styled.span`
  font-weight: 600;
  font-size: 14px;
`

const HeaderRight = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
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

const ModelSelect = styled.select`
  background: transparent;
  border: 1px solid ${({ theme }) => theme.color.border};
  color: ${({ theme }) => theme.color.foreground};
  border-radius: ${({ theme }) => theme.radii.sm};
  padding: 4px 8px;
  font-size: 11px;
  outline: none;
`

const SettingsPanel = styled(motion.div)`
  position: absolute;
  top: 100%;
  right: 16px;
  width: 220px;
  background-color: ${({ theme }) => theme.color.background};
  border: 1px solid ${({ theme }) => theme.color.border};
  border-radius: ${({ theme }) => theme.radii.md};
  box-shadow: ${({ theme }) => theme.shadow.md};
  padding: ${({ theme }) => theme.spacing[3]};
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.spacing[3]};
  z-index: 60;
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
  background-color: ${({ theme }) => theme.color.background};
  border-right: 1px solid ${({ theme }) => theme.color.border};
  z-index: 40;
  display: flex;
  flex-direction: column;
  box-shadow: 2px 0 8px rgba(0,0,0,0.05);
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

const HistoryItem = styled.button<{ $active?: boolean }>`
  background: ${({ theme, $active }) => $active ? theme.color.primary + '1a' : 'transparent'};
  color: ${({ theme, $active }) => $active ? theme.color.primary : theme.color.foreground};
  border: none;
  padding: 8px;
  text-align: left;
  border-radius: ${({ theme }) => theme.radii.md};
  font-size: 12px;
  cursor: pointer;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  
  &:hover {
    background: ${({ theme, $active }) => $active ? theme.color.primary + '26' : theme.color.muted};
  }
`

const AttachmentsContainer = styled.div`
  display: flex;
  gap: 8px;
  padding: 8px 12px;
  overflow-x: auto;
  background-color: ${({ theme }) => theme.color.background};
`

const AttachmentItem = styled.div`
  position: relative;
  width: 48px;
  height: 48px;
  border-radius: ${({ theme }) => theme.radii.md};
  border: 1px solid ${({ theme }) => theme.color.border};
  background-color: ${({ theme }) => theme.color.muted}4d;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  overflow: hidden;
`

const AttachmentImage = styled.img`
  width: 100%;
  height: 100%;
  object-fit: cover;
`

const RemoveAttachmentBtn = styled.button`
  position: absolute;
  top: -4px;
  right: -4px;
  width: 16px;
  height: 16px;
  border-radius: 50%;
  background: ${({ theme }) => theme.color.foreground};
  color: ${({ theme }) => theme.color.background};
  border: none;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  z-index: 10;
  font-size: 10px;
`

const StyledTextarea = styled.textarea`
  flex: 1;
  resize: none;
  padding: 10px 14px;
  font-size: 14px;
  line-height: 1.4;
  min-height: 40px;
  max-height: 120px;
  overflow-y: auto;
  border-radius: 20px;
  border: 1px solid ${({ theme }) => theme.color.border};
  background-color: ${({ theme }) => theme.color.background};
  color: ${({ theme }) => theme.color.foreground};
  box-shadow: 0 1px 2px rgba(0,0,0,0.05);
  
  &:focus {
    outline: none;
    border-color: ${({ theme }) => theme.color.primary}80;
    box-shadow: 0 0 0 2px ${({ theme }) => theme.color.primary}1a;
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
  
  &:hover {
    background-color: ${({ theme }) => theme.color.muted}80;
  }
`

const ContextDropdown = styled.div`
  position: absolute;
  bottom: calc(100% + 8px);
  left: 0;
  background: ${({ theme }) => theme.color.background};
  border: 1px solid ${({ theme }) => theme.color.border};
  border-radius: ${({ theme }) => theme.radii.md};
  box-shadow: 0 4px 12px rgba(0,0,0,0.1);
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
  
  &:hover {
    background: ${({ theme }) => theme.color.muted};
  }
`

export function GlobalAssistant() {
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
  const [attachments, setAttachments] = useState<File[]>([])
  const fileInputRef = useRef<HTMLInputElement>(null)
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

  return (
    <>
      <AnimatePresence>
        {isOpen && (
          <AssistantWindow
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ duration: 0.2 }}
          >
            <AssistantHeader>
              <HeaderLeft>
                <button 
                  onClick={() => setShowHistory(h => !h)}
                  style={{ background: 'transparent', border: 'none', cursor: 'pointer', display: 'flex', color: theme.color.mutedForeground }}
                  title="History"
                >
                  <History size={16} />
                </button>
                <Bot size={16} color={theme.color.primary} style={{ marginLeft: 8 }} />
                <HeaderTitle>AIOS Assistant</HeaderTitle>
              </HeaderLeft>
              <HeaderRight>
                {connected
                  ? <Wifi style={{ width: '14px', height: '14px', color: theme.color.success }} />
                  : <WifiOff style={{ width: '14px', height: '14px', color: theme.color.mutedForeground }} />
                }
                
                <button
                  onClick={() => setShowSettings(s => !s)}
                  style={{ background: 'transparent', border: 'none', cursor: 'pointer', display: 'flex', color: theme.color.mutedForeground }}
                  title="Settings"
                >
                  <Settings size={16} />
                </button>

                <button
                  onClick={() => window.open('/chat', '_blank')}
                  style={{ background: 'transparent', border: 'none', cursor: 'pointer', display: 'flex', color: theme.color.mutedForeground }}
                  title="Maximize"
                >
                  <Maximize2 size={16} />
                </button>

                <button
                  onClick={() => setIsOpen(false)}
                  style={{ background: 'transparent', border: 'none', cursor: 'pointer', display: 'flex', color: theme.color.mutedForeground }}
                >
                  <X size={16} />
                </button>
              </HeaderRight>

              <AnimatePresence>
                {showSettings && (
                  <SettingsPanel
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                  >
                    <SettingRow>
                      <SettingLabel>Provider</SettingLabel>
                      <Select size="sm" value={provider} onChange={(val) => { setProvider(val as string); setModel('system'); }}>
                        <option value="system">System Default</option>
                        <option value="openai">OpenAI</option>
                        <option value="anthropic">Anthropic Claude</option>
                      </Select>
                    </SettingRow>
                    <SettingRow>
                      <SettingLabel>Model</SettingLabel>
                      <Select size="sm" value={model} onChange={(val) => setModel(val as string)}>
                        <option value="system">System Default</option>
                        {provider === 'openai' && (
                          <>
                            <option value="gpt-4o">GPT-4o</option>
                            <option value="gpt-4o-mini">GPT-4o Mini</option>
                            <option value="gpt-4-turbo">GPT-4 Turbo</option>
                            <option value="gpt-3.5-turbo">GPT-3.5 Turbo</option>
                          </>
                        )}
                        {provider === 'anthropic' && (
                          <>
                            <option value="claude-3-5-sonnet-20240620">Claude 3.5 Sonnet</option>
                            <option value="claude-3-5-haiku-20241022">Claude 3.5 Haiku</option>
                            <option value="claude-3-opus-20240229">Claude 3 Opus</option>
                            <option value="claude-3-sonnet-20240229">Claude 3 Sonnet</option>
                            <option value="claude-3-haiku-20240307">Claude 3 Haiku</option>
                          </>
                        )}
                      </Select>
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
                    <button 
                      onClick={() => setShowHistory(false)}
                      style={{ background: 'transparent', border: 'none', cursor: 'pointer', display: 'flex', color: theme.color.mutedForeground }}
                    >
                      <X size={16} />
                    </button>
                  </HistoryHeader>
                  <HistoryList>
                    <HistoryItem 
                      onClick={() => { newSession(); setShowHistory(false) }}
                      $active={!sessionId}
                    >
                      + New Chat
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
                        {session.title || new Date(session.started_at).toLocaleString()}
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
              <InputContainer>
                <input 
                  type="file" 
                  multiple 
                  ref={fileInputRef} 
                  style={{ display: 'none' }} 
                  onChange={handleFileChange}
                />
                <button
                  onClick={() => fileInputRef.current?.click()}
                  style={{ background: 'transparent', border: 'none', cursor: 'pointer', display: 'flex', color: theme.color.mutedForeground, padding: '8px' }}
                  title="Attach files"
                >
                  <Paperclip size={18} />
                </button>
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                  {attachments.length > 0 && (
                    <AttachmentsContainer>
                      {attachments.map((file, idx) => (
                        <AttachmentItem key={idx}>
                          <RemoveAttachmentBtn onClick={() => handleRemoveAttachment(idx)}>
                            <X size={10} />
                          </RemoveAttachmentBtn>
                          {file.type.startsWith('image/') ? (
                            <AttachmentImage src={URL.createObjectURL(file)} alt="attachment" />
                          ) : (
                            <FileIcon size={16} color={theme.color.mutedForeground} />
                          )}
                        </AttachmentItem>
                      ))}
                    </AttachmentsContainer>
                  )}
                  <StyledTextarea
                    ref={textareaRef}
                    value={input}
                    onChange={e => {
                      setInput(e.target.value)
                      e.target.style.height = 'auto'
                      e.target.style.height = `${Math.min(e.target.scrollHeight, 120)}px`
                    }}
                    onKeyDown={e => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault()
                        handleSend()
                      }
                    }}
                    placeholder="Ask me anything..."
                    rows={1}
                  />
                </div>
                <Button
                  onClick={handleSend}
                  disabled={(!input.trim() && attachments.length === 0) || isStreaming || !connected}
                  variant="primary"
                  size="sm"
                  style={{ height: '36px', width: '36px', padding: 0, marginBottom: '2px' }}
                >
                  {!isStreaming ? <Send style={{ width: '14px', height: '14px' }} /> : <Spinner size="xs" tone="inherit" />}
                </Button>
              </InputContainer>
            </div>
          </AssistantWindow>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {!isOpen && (
          <FAB
            onClick={() => setIsOpen(true)}
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            exit={{ scale: 0 }}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <MessageSquare size={24} fill="currentColor" />
          </FAB>
        )}
      </AnimatePresence>
    </>
  )
}
