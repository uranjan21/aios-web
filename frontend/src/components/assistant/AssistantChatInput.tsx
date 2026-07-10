import React, { useState, useRef, useEffect, useCallback } from "react"
import styled, { keyframes, useTheme } from "styled-components"
import { Plus, ChevronDown, ArrowUp, X, FileText, Loader2, Check, Archive, BrainCircuit, ChevronRight } from "lucide-react"

const monospaceFont = ({ theme }: { theme: any }) => {
  const font = theme.fontFamily?.mono || theme.typography?.fontFamily?.mono;
  if (font && !font.includes('DM Sans')) return font;
  return 'sfmono-regular, consolas, "liberation mono", menlo, courier, monospace';
};

/* --- ICONS --- */
const Icons = {
  Plus,
  Thinking: BrainCircuit,
  SelectArrow: ChevronDown,
  ArrowUp,
  X,
  FileText,
  Loader2,
  Check,
  Archive,
  ChevronRight,
}

const spin = keyframes`
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
`

const bounce = keyframes`
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-4px); }
`

const StyledSpinner = styled(Icons.Loader2)`
  animation: ${spin} 1s linear infinite;
`

const StyledBounceArchive = styled(Icons.Archive)`
  animation: ${bounce} 1s ease-in-out infinite;
`

/* --- UTILS --- */
const formatFileSize = (bytes: number) => {
  if (bytes === 0) return "0 Bytes"
  const k = 1024
  const sizes = ["Bytes", "KB", "MB", "GB"]
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i]
}

/* --- STYLES --- */

const FileCard = styled.div`
  position: relative;
  flex-shrink: 0;
  width: 96px;
  height: 96px;
  border-radius: ${({ theme }) => theme.radii.lg};
  overflow: hidden;
  border: 1px solid ${({ theme }) => theme.color.border};
  background-color: ${({ theme }) => theme.color.muted}4d;
  transition: all ${({ theme }) => theme.motion.duration.normal} ${({ theme }) => theme.motion.easing.standard};
  animation: fadein ${({ theme }) => theme.motion.duration.normal} ${({ theme }) => theme.motion.easing.standard};

  &:hover {
    border-color: ${({ theme }) => theme.color.mutedForeground};
  }

  @keyframes fadein {
    from { opacity: 0; transform: translateY(5px); }
    to { opacity: 1; transform: translateY(0); }
  }

  .remove-btn {
    position: absolute;
    top: 4px;
    right: 4px;
    padding: 4px;
    background: rgba(0, 0, 0, 0.5);
    border-radius: 50%;
    color: white;
    opacity: 0;
    transition: opacity ${({ theme }) => theme.motion.duration.normal} ${({ theme }) => theme.motion.easing.standard}, box-shadow ${({ theme }) => theme.motion.duration.fast} ${({ theme }) => theme.motion.easing.standard};
    border: none;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;

    &:focus-visible {
      outline: none;
      box-shadow: ${({ theme }) => theme.shadow.ring};
      opacity: 1;
    }
  }

  @media (hover: none) {
    .remove-btn {
      opacity: 0.8;
    }
  }

  &:hover .remove-btn {
    opacity: 1;
  }
  
  .remove-btn:hover {
    background: rgba(0, 0, 0, 0.7);
  }
`

const ImagePreview = styled.img`
  width: 100%;
  height: 100%;
  object-fit: cover;
`

const FileDetails = styled.div`
  width: 100%;
  height: 100%;
  padding: ${({ theme }) => theme.spacing[3]};
  display: flex;
  flex-direction: column;
  justify-content: space-between;
`

const FileIconWrapper = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;

  .icon-bg {
    padding: 6px;
    background-color: ${({ theme }) => theme.color.muted};
    border-radius: ${({ theme }) => theme.radii.sm};
    display: flex;
  }
  
  .ext {
    font-size: 10px;
    font-weight: 500;
    color: ${({ theme }) => theme.color.mutedForeground};
    text-transform: uppercase;
    letter-spacing: 0.05em;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
`

const FileTextInfo = styled.div`
  display: flex;
  flex-direction: column;
  gap: 2px;
  
  .name {
    font-size: 12px;
    font-weight: 500;
    color: ${({ theme }) => theme.color.foreground};
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  
  .size {
    font-size: 10px;
    color: ${({ theme }) => theme.color.mutedForeground};
  }
`

const UploadOverlay = styled.div`
  position: absolute;
  inset: 0;
  background: rgba(0, 0, 0, 0.4);
  display: flex;
  align-items: center;
  justify-content: center;
`

/* --- COMPONENTS --- */

export interface AttachedFile {
  id: string
  file: File
  type: string
  preview: string | null
  uploadStatus: string
  content?: string
}

function FilePreviewCard({ file, onRemove }: { file: AttachedFile; onRemove: (id: string) => void }) {
  const isImage = file.type.startsWith("image/") && file.preview
  const ext = file.file.name.split('.').pop()

  return (
    <FileCard>
      {isImage ? (
        <div style={{ width: '100%', height: '100%', position: 'relative' }}>
          <ImagePreview src={file.preview!} alt={file.file.name} />
          <div style={{ position: 'absolute', inset: 0, backgroundColor: 'rgba(0,0,0,0.1)' }} />
        </div>
      ) : (
        <FileDetails>
          <FileIconWrapper>
            <div className="icon-bg">
              <Icons.FileText size={16} />
            </div>
            <span className="ext">{ext}</span>
          </FileIconWrapper>
          <FileTextInfo>
            <p className="name" title={file.file.name}>{file.file.name}</p>
            <p className="size">{formatFileSize(file.file.size)}</p>
          </FileTextInfo>
        </FileDetails>
      )}

      <button type="button" className="remove-btn" onClick={() => onRemove(file.id)}>
        <Icons.X size={12} />
      </button>

      {file.uploadStatus === 'uploading' && (
        <UploadOverlay>
          <StyledSpinner size={20} color="white" />
        </UploadOverlay>
      )}
    </FileCard>
  )
}

const PastedCard = styled(FileCard)`
  width: 112px;
  height: 112px;
  background-color: ${({ theme }) => theme.color.background};
  padding: ${({ theme }) => theme.spacing[3]};
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  box-shadow: ${({ theme }) => theme.shadow.sm};

  .content-text {
    font-size: 10px;
    color: ${({ theme }) => theme.color.mutedForeground};
    line-height: 1.4;
    font-family: ${monospaceFont};
    word-break: break-word;
    white-space: pre-wrap;
    display: -webkit-box;
    -webkit-line-clamp: 4;
    -webkit-box-orient: vertical;
    overflow: hidden;
    user-select: none;
  }

  .badge-container {
    display: flex;
    align-items: center;
    justify-content: space-between;
    width: 100%;
    margin-top: 8px;
  }
  
  .badge {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    padding: 2px 6px;
    border-radius: ${({ theme }) => theme.radii.sm};
    border: 1px solid ${({ theme }) => theme.color.border};
    background-color: ${({ theme }) => theme.color.background};
    font-size: 11px;
    font-weight: bold;
    color: ${({ theme }) => theme.color.foreground};
    text-transform: uppercase;
    letter-spacing: 0.05em;
    font-family: ${monospaceFont};
  }

  .remove-btn {
    background: ${({ theme }) => theme.color.muted};
    color: ${({ theme }) => theme.color.mutedForeground};
    border: 1px solid ${({ theme }) => theme.color.border};
  }
  &:hover .remove-btn {
    color: ${({ theme }) => theme.color.foreground};
    background: ${({ theme }) => theme.color.background};
  }
`

function PastedContentCard({ content, onRemove }: { content: { id: string; content: string; timestamp: Date }; onRemove: (id: string) => void }) {
  return (
    <PastedCard>
      <div style={{ overflow: 'hidden', width: '100%' }}>
        <p className="content-text">{content.content}</p>
      </div>
      <div className="badge-container">
        <div className="badge">PASTED</div>
      </div>
      <button type="button" className="remove-btn" onClick={() => onRemove(content.id)}>
        <Icons.X size={10} />
      </button>
    </PastedCard>
  )
}

const SelectorWrapper = styled.div`
  position: relative;
`

const SelectorButton = styled.button.attrs({ type: 'button' })<{ $isOpen: boolean }>`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  position: relative;
  transition: transform ${({ theme }) => theme.motion.duration.fast} ${({ theme }) => theme.motion.easing.standard},
              background-color ${({ theme }) => theme.motion.duration.normal} ${({ theme }) => theme.motion.easing.standard},
              color ${({ theme }) => theme.motion.duration.normal} ${({ theme }) => theme.motion.easing.standard},
              box-shadow ${({ theme }) => theme.motion.duration.normal} ${({ theme }) => theme.motion.easing.standard};
  height: 32px;
  border-radius: ${({ theme }) => theme.radii.lg};
  padding: 0 8px 0 10px;
  min-width: 4rem;
  white-space: nowrap;
  font-size: 12px;
  gap: 4px;
  border: none;
  cursor: pointer;

  background-color: ${({ $isOpen, theme }) => $isOpen ? theme.color.muted : 'transparent'};
  color: ${({ $isOpen, theme }) => $isOpen ? theme.color.foreground : theme.color.mutedForeground};
  
  &:hover {
    color: ${({ $isOpen, theme }) => !$isOpen ? theme.color.foreground : 'inherit'};
    background-color: ${({ $isOpen, theme }) => !$isOpen ? theme.color.muted + '80' : 'inherit'};
  }
  
  &:active {
    transform: scale(0.98);
  }

  &:focus-visible {
    outline: none;
    box-shadow: ${({ theme }) => theme.shadow.ring};
  }

  .arrow {
    transition: transform ${({ theme }) => theme.motion.duration.normal} ${({ theme }) => theme.motion.easing.standard};
    ${({ $isOpen }) => $isOpen && 'transform: rotate(180deg);'}
  }
`

const DropdownMenu = styled.div`
  position: absolute;
  bottom: 100%;
  right: 0;
  margin-bottom: 8px;
  width: 260px;
  background-color: ${({ theme }) => theme.color.background}f2;
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  border: 1px solid ${({ theme }) => theme.color.border}80;
  border-radius: ${({ theme }) => theme.radii.xl};
  box-shadow: ${({ theme }) => theme.shadow.md};
  overflow: hidden;
  z-index: 50;
  display: flex;
  flex-direction: column;
  padding: 6px;
  animation: fadein ${({ theme }) => theme.motion.duration.fast} ${({ theme }) => theme.motion.easing.standard};
  transform-origin: bottom right;
`

const DropdownItem = styled.button.attrs({ type: 'button' })`
  width: 100%;
  text-align: left;
  padding: 10px 12px;
  border-radius: ${({ theme }) => theme.radii.lg};
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  border: none;
  background: transparent;
  cursor: pointer;
  transition: background-color ${({ theme }) => theme.motion.duration.normal} ${({ theme }) => theme.motion.easing.standard};

  &:hover {
    background-color: ${({ theme }) => theme.color.muted};
  }

  &:focus-visible {
    outline: none;
    background-color: ${({ theme }) => theme.color.muted};
    box-shadow: ${({ theme }) => theme.shadow.ring};
  }

  .info {
    display: flex;
    flex-direction: column;
    gap: 2px;
  }

  .title-row {
    display: flex;
    align-items: center;
    gap: 8px;
  }
  
  .title {
    font-size: 13px;
    font-weight: 600;
    color: ${({ theme }) => theme.color.foreground};
  }

  .desc {
    font-size: 11px;
    color: ${({ theme }) => theme.color.mutedForeground};
  }

  .badge {
    padding: 2px 6px;
    border-radius: ${({ theme }) => theme.radii.md};
    font-size: 10px;
    font-weight: 500;
    border: 1px solid;
    font-family: ${monospaceFont};
    &.upgrade {
      border-color: rgba(59, 130, 246, 0.3);
      color: rgb(96, 165, 250);
      background: rgba(59, 130, 246, 0.1);
    }
    &.normal {
      border-color: ${({ theme }) => theme.color.border};
      color: ${({ theme }) => theme.color.mutedForeground};
    }
  }
`

const Divider = styled.div`
  height: 1px;
  background-color: ${({ theme }) => theme.color.border};
  margin: 4px 8px;
`

interface Model {
  id: string
  name: string
  description: string
  badge?: string
}

function ModelSelector({ models, selectedModel, onSelect }: { models: Model[]; selectedModel: string; onSelect: (id: string) => void }) {
  const [isOpen, setIsOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const theme = useTheme()

  const currentModel = models.find(m => m.id === selectedModel) || models[0]

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }
    const handleEscKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.stopPropagation()
        setIsOpen(false)
      }
    }
    
    const wrapper = dropdownRef.current
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside)
      wrapper?.addEventListener("keydown", handleEscKeyDown)
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside)
      wrapper?.removeEventListener("keydown", handleEscKeyDown)
    }
  }, [isOpen])

  return (
    <SelectorWrapper ref={dropdownRef}>
      <SelectorButton $isOpen={isOpen} onClick={() => setIsOpen(!isOpen)}>
        <span style={{ fontWeight: 500 }}>{currentModel?.name || 'Default'}</span>
        <Icons.SelectArrow size={16} className="arrow" opacity={0.75} />
      </SelectorButton>

      {isOpen && (
        <DropdownMenu>
          {models.map(model => (
            <DropdownItem
              key={model.id}
              onClick={() => {
                onSelect(model.id)
                setIsOpen(false)
              }}
            >
              <div className="info">
                <div className="title-row">
                  <span className="title">{model.name}</span>
                  {model.badge && (
                    <span className={'badge ' + (model.badge === 'Upgrade' ? 'upgrade' : 'normal')}>
                      {model.badge}
                    </span>
                  )}
                </div>
                <span className="desc">{model.description}</span>
              </div>
              {selectedModel === model.id && (
                <Icons.Check size={16} color={theme.color.primary} style={{ marginTop: '4px' }} />
              )}
            </DropdownItem>
          ))}
          <Divider />
          <DropdownItem style={{ alignItems: 'center' }}>
            <span className="title">More models</span>
            <Icons.ChevronRight size={16} color={theme.color.mutedForeground} />
          </DropdownItem>
        </DropdownMenu>
      )}
    </SelectorWrapper>
  )
}

const ChatContainer = styled.div<{ $isDragging: boolean }>`
  position: relative;
  width: 100%;
  transition: all ${({ theme }) => theme.motion.duration.normal} ${({ theme }) => theme.motion.easing.standard};
`

const InputBox = styled.div`
  display: flex;
  flex-direction: column;
  position: relative;
  z-index: 10;
  border-radius: ${({ theme }) => theme.radii.lg};
  border: 1px solid ${({ theme }) => theme.color.border}80;
  background-color: ${({ theme }) => theme.color.background}b3;
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  box-shadow: ${({ theme }) => theme.shadow.md};
  transition: all ${({ theme }) => theme.motion.duration.normal} ${({ theme }) => theme.motion.easing.standard};

  &:hover {
    box-shadow: ${({ theme }) => theme.shadow.lg};
  }
  
  &:focus-within {
    box-shadow: ${({ theme }) => theme.shadow.ring};
    border-color: ${({ theme }) => theme.color.primary}80;
  }
`

const InnerPadding = styled.div`
  display: flex;
  flex-direction: column;
  padding: 12px 12px 8px 12px;
  gap: 8px;
`

const ArtifactsRow = styled.div`
  display: flex;
  gap: 12px;
  overflow-x: auto;
  padding-bottom: 8px;
  padding-left: 4px;
  padding-right: 4px;
  
  &::-webkit-scrollbar {
    height: 4px;
  }
  &::-webkit-scrollbar-thumb {
    background: ${({ theme }) => theme.color.mutedForeground}4d;
    border-radius: ${({ theme }) => theme.radii.sm};
  }
`

const TextAreaWrapper = styled.div`
  position: relative;
  max-height: 384px;
  width: 100%;
  overflow-y: auto;
  min-height: 40px;
  padding-left: 4px;
  margin: 0;

  &::-webkit-scrollbar {
    width: 4px;
  }
  &::-webkit-scrollbar-thumb {
    background: ${({ theme }) => theme.color.mutedForeground}4d;
    border-radius: ${({ theme }) => theme.radii.sm};
  }
`

const StyledTextarea = styled.textarea`
  width: 100%;
  background: transparent;
  border: 0;
  outline: none;
  color: ${({ theme }) => theme.color.foreground};
  font-size: 16px;
  resize: none;
  overflow: hidden;
  padding: 0;
  line-height: 1.5;
  font-family: inherit;

  &::placeholder {
    color: ${({ theme }) => theme.color.mutedForeground};
  }
`

const ActionBar = styled.div`
  display: flex;
  gap: 8px;
  width: 100%;
  align-items: center;
`

const LeftTools = styled.div`
  display: flex;
  flex: 1;
  align-items: center;
  gap: 4px;
  min-width: 0;
`

const ToolButton = styled.button.attrs({ type: 'button' })<{ $active?: boolean }>`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  position: relative;
  transition: transform ${({ theme }) => theme.motion.duration.fast} ${({ theme }) => theme.motion.easing.standard},
              background-color ${({ theme }) => theme.motion.duration.normal} ${({ theme }) => theme.motion.easing.standard},
              color ${({ theme }) => theme.motion.duration.normal} ${({ theme }) => theme.motion.easing.standard},
              box-shadow ${({ theme }) => theme.motion.duration.normal} ${({ theme }) => theme.motion.easing.standard};
  height: 32px;
  width: 32px;
  border-radius: ${({ theme }) => theme.radii.lg};
  border: none;
  cursor: pointer;

  color: ${({ $active, theme }) => $active ? theme.color.primary : theme.color.mutedForeground};
  background-color: ${({ $active, theme }) => $active ? theme.color.primary + '1a' : 'transparent'};
  
  &:hover {
    color: ${({ $active, theme }) => !$active ? theme.color.foreground : 'inherit'};
    background-color: ${({ $active, theme }) => !$active ? theme.color.muted + '80' : 'inherit'};
  }

  &:active {
    transform: scale(0.95);
  }

  &:focus-visible {
    outline: none;
    box-shadow: ${({ theme }) => theme.shadow.ring};
  }

  .tooltip {
    position: absolute;
    top: 100%;
    left: 50%;
    transform: translateX(-50%);
    margin-top: 8px;
    padding: 4px 8px;
    background: ${({ theme }) => theme.color.foreground};
    color: ${({ theme }) => theme.color.background};
    font-size: 11px;
    font-weight: 500;
    border-radius: ${({ theme }) => theme.radii.sm};
    opacity: 0;
    pointer-events: none;
    transition: opacity ${({ theme }) => theme.motion.duration.normal} ${({ theme }) => theme.motion.easing.standard};
    white-space: nowrap;
    z-index: 50;
    box-shadow: ${({ theme }) => theme.shadow.sm};
  }
  
  &:hover .tooltip {
    opacity: 1;
  }
`

const RightTools = styled.div`
  display: flex;
  align-items: center;
  gap: 4px;
  min-width: 0;
`

const SendButton = styled.button.attrs({ type: 'button' })<{ $hasContent: boolean }>`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  height: 32px;
  width: 32px;
  border-radius: ${({ theme }) => theme.radii.lg};
  border: none;
  transition: transform ${({ theme }) => theme.motion.duration.fast} ${({ theme }) => theme.motion.easing.standard},
              background-color ${({ theme }) => theme.motion.duration.normal} ${({ theme }) => theme.motion.easing.standard},
              color ${({ theme }) => theme.motion.duration.normal} ${({ theme }) => theme.motion.easing.standard},
              opacity ${({ theme }) => theme.motion.duration.normal} ${({ theme }) => theme.motion.easing.standard},
              box-shadow ${({ theme }) => theme.motion.duration.normal} ${({ theme }) => theme.motion.easing.standard};

  background-color: ${({ $hasContent, theme }) => $hasContent ? theme.color.primary : theme.color.primary + '4d'};
  color: ${({ $hasContent, theme }) => $hasContent ? theme.color.primaryForeground : theme.color.primaryForeground + '99'};
  cursor: ${({ $hasContent }) => $hasContent ? 'pointer' : 'not-allowed'};
  box-shadow: ${({ $hasContent, theme }) => $hasContent ? theme.shadow.sm : 'none'};
  
  &:disabled {
    cursor: not-allowed;
  }
  
  &:hover {
    opacity: ${({ $hasContent }) => $hasContent ? 0.9 : 1};
  }
  
  &:active {
    transform: ${({ $hasContent }) => $hasContent ? 'scale(0.95)' : 'none'};
  }

  &:focus-visible {
    outline: none;
    box-shadow: ${({ theme }) => theme.shadow.ring};
  }
`

const DragOverlay = styled.div`
  position: absolute;
  inset: 0;
  background: ${({ theme }) => theme.color.background}e6;
  border: 2px dashed ${({ theme }) => theme.color.primary};
  border-radius: ${({ theme }) => theme.radii['2xl'] || '16px'};
  z-index: 50;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  backdrop-filter: blur(4px);
  pointer-events: none;

  p {
    color: ${({ theme }) => theme.color.primary};
    font-weight: 500;
    margin-top: 8px;
  }
`

const Disclaimer = styled.div`
  text-align: center;
  margin-top: 16px;
  p {
    font-size: 12px;
    color: ${({ theme }) => theme.color.foreground};
  }
`

const ModelSelectorWrapper = styled.div`
  display: flex;
  align-items: center;
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

const ContextOption = styled.button.attrs({ type: 'button' })<{ $active?: boolean }>`
  text-align: left;
  padding: 6px 10px;
  font-size: 12px;
  border: none;
  background: ${({ theme, $active }) => $active ? theme.color.muted : 'transparent'};
  border-radius: ${({ theme }) => theme.radii.sm};
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

export interface AssistantChatInputProps {
  onSendMessage: (data: {
    message: string
    files: AttachedFile[]
    pastedContent: { id: string; content: string; timestamp: Date }[]
    model: string
    isThinkingEnabled: boolean
  }) => void
  disabled?: boolean
  initialFiles?: File[]
  models: Model[]
  defaultModel: string
  onModelChange?: (model: string) => void
  message: string
  onChangeMessage: (msg: string) => void
  inputRef?: React.RefObject<HTMLTextAreaElement>
}

export function AssistantChatInput({ 
  onSendMessage, 
  disabled, 
  initialFiles = [],
  models,
  defaultModel,
  onModelChange,
  message,
  onChangeMessage,
  inputRef
}: AssistantChatInputProps) {
  const theme = useTheme()
  const [files, setFiles] = useState<AttachedFile[]>([])
  const [pastedContent, setPastedContent] = useState<{ id: string; content: string; timestamp: Date }[]>([])
  const [isDragging, setIsDragging] = useState(false)
  const [selectedModel, setSelectedModel] = useState(defaultModel)
  const [isThinkingEnabled, setIsThinkingEnabled] = useState(false)

  const mentionMatch = message.match(/@(\w*)$/)
  const mentionQuery = mentionMatch ? mentionMatch[1].toLowerCase() : ''
  const availableMentions = ['vault', 'finance', 'health', 'goals'].filter(m => m.includes(mentionQuery))
  const [activeMentionIndex, setActiveMentionIndex] = useState(0)
  const [mentionsDismissed, setMentionsDismissed] = useState(false)

  useEffect(() => {
    setActiveMentionIndex(0)
  }, [message])

  useEffect(() => {
    if (!mentionMatch) {
      setMentionsDismissed(false)
    }
  }, [mentionMatch])

  const handleMention = (tag: string) => {
    onChangeMessage(message.replace(/@\w*$/, '') + `@${tag} `)
    setTimeout(() => {
      textareaRef.current?.focus()
    }, 10)
  }

  const internalTextareaRef = useRef<HTMLTextAreaElement>(null)
  const textareaRef = inputRef || internalTextareaRef
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    setSelectedModel(defaultModel)
  }, [defaultModel])

  // Handle Initial Files
  useEffect(() => {
    if (initialFiles.length > 0) {
      handleFiles(initialFiles)
    }
  }, [initialFiles])

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto"
      textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 384) + "px"
    }
  }, [message])

  const handleFiles = useCallback((newFilesList: FileList | File[]) => {
    const newFiles = Array.from(newFilesList).map(file => {
      const isImage = file.type.startsWith('image/') || /\.(jpg|jpeg|png|gif|webp|svg)$/i.test(file.name)
      return {
        id: Math.random().toString(36).substr(2, 9),
        file,
        type: isImage ? 'image/unknown' : (file.type || 'application/octet-stream'),
        preview: isImage ? URL.createObjectURL(file) : null,
        uploadStatus: 'pending'
      }
    })

    setFiles(prev => [...prev, ...newFiles])

    newFiles.forEach(f => {
      setTimeout(() => {
        setFiles(prev => prev.map(p => p.id === f.id ? { ...p, uploadStatus: 'complete' } : p))
      }, 500 + Math.random() * 500)
    })
  }, [message, onChangeMessage])

  const onDragOver = (e: React.DragEvent) => { e.preventDefault(); setIsDragging(true) }
  const onDragLeave = (e: React.DragEvent) => { e.preventDefault(); setIsDragging(false) }
  const onDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    if (e.dataTransfer.files) handleFiles(e.dataTransfer.files)
  }

  const handlePaste = (e: React.ClipboardEvent) => {
    const items = e.clipboardData.items
    const pastedFiles: File[] = []
    for (let i = 0; i < items.length; i++) {
      if (items[i].kind === 'file') {
        const file = items[i].getAsFile()
        if (file) pastedFiles.push(file)
      }
    }

    if (pastedFiles.length > 0) {
      e.preventDefault()
      handleFiles(pastedFiles)
      return
    }

    const text = e.clipboardData.getData('text')
    if (text.length > 300) {
      e.preventDefault()
      const snippet = {
        id: Math.random().toString(36).substr(2, 9),
        content: text,
        timestamp: new Date()
      }
      setPastedContent(prev => [...prev, snippet])
    }
  }

  const handleSend = () => {
    if (disabled || (!message.trim() && files.length === 0 && pastedContent.length === 0)) return
    
    onSendMessage({ 
      message, 
      files, 
      pastedContent, 
      model: selectedModel,
      isThinkingEnabled 
    })
    
    onChangeMessage("")
    setFiles([])
    setPastedContent([])
    if (textareaRef.current) textareaRef.current.style.height = 'auto'
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    const showMentions = mentionMatch && availableMentions.length > 0 && !mentionsDismissed
    if (showMentions) {
      if (e.key === 'Escape') {
        e.preventDefault()
        e.stopPropagation()
        e.nativeEvent.stopImmediatePropagation()
        setMentionsDismissed(true)
        return
      }
      if (e.key === 'ArrowDown') {
        e.preventDefault()
        setActiveMentionIndex(prev => (prev + 1) % availableMentions.length)
        return
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault()
        setActiveMentionIndex(prev => (prev - 1 + availableMentions.length) % availableMentions.length)
        return
      }
      if (e.key === 'Enter') {
        e.preventDefault()
        handleMention(availableMentions[activeMentionIndex])
        return
      }
    }

    if (e.ctrlKey && e.shiftKey && (e.key === 'e' || e.key === 'E')) {
      e.preventDefault()
      setIsThinkingEnabled(prev => !prev)
      return
    }
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const hasContent = !!message.trim() || files.length > 0 || pastedContent.length > 0

  const showMentions = mentionMatch && availableMentions.length > 0 && !mentionsDismissed

  return (
    <ChatContainer
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
      $isDragging={isDragging}
    >
      {showMentions && (
        <ContextDropdown>
          <div style={{ fontSize: '10px', color: theme.color.mutedForeground, padding: '4px 6px', fontWeight: 600, textTransform: 'uppercase' }}>Mentions</div>
          {availableMentions.map((m, idx) => (
            <ContextOption 
              key={m} 
              onClick={() => handleMention(m)}
              $active={idx === activeMentionIndex}
            >
              @{m}
            </ContextOption>
          ))}
        </ContextDropdown>
      )}
      <InputBox>
        <InnerPadding>
          {(files.length > 0 || pastedContent.length > 0) && (
            <ArtifactsRow>
              {pastedContent.map(content => (
                <PastedContentCard
                  key={content.id}
                  content={content}
                  onRemove={id => setPastedContent(prev => prev.filter(c => c.id !== id))}
                />
              ))}
              {files.map(file => (
                <FilePreviewCard
                  key={file.id}
                  file={file}
                  onRemove={id => setFiles(prev => prev.filter(f => f.id !== id))}
                />
              ))}
            </ArtifactsRow>
          )}

          <TextAreaWrapper>
            <StyledTextarea
              ref={textareaRef}
              value={message}
              onChange={e => onChangeMessage(e.target.value)}
              onPaste={handlePaste}
              onKeyDown={handleKeyDown}
              placeholder="Ask me anything..."
              rows={1}
              autoFocus
              disabled={disabled}
            />
          </TextAreaWrapper>

          <ActionBar>
            <LeftTools>
              <ToolButton onClick={() => fileInputRef.current?.click()} aria-label="Attach files">
                <Icons.Plus size={20} />
                <div className="tooltip">Attach files</div>
              </ToolButton>

              <ToolButton 
                onClick={() => setIsThinkingEnabled(!isThinkingEnabled)}
                $active={isThinkingEnabled}
                aria-label="Extended thinking"
              >
                <Icons.Thinking size={18} />
                <div className="tooltip">Extended thinking (⇧+Ctrl+E)</div>
              </ToolButton>
            </LeftTools>

            <RightTools>
              <ModelSelectorWrapper>
                <ModelSelector
                  models={models}
                  selectedModel={selectedModel}
                  onSelect={(id) => {
                    setSelectedModel(id)
                    if (onModelChange) onModelChange(id)
                  }}
                />
              </ModelSelectorWrapper>

              <SendButton
                onClick={handleSend}
                disabled={!hasContent || disabled}
                $hasContent={hasContent}
                aria-label="Send message"
              >
                {disabled ? <StyledSpinner size={16} /> : <Icons.ArrowUp size={16} />}
              </SendButton>
            </RightTools>
          </ActionBar>
        </InnerPadding>
      </InputBox>

      {isDragging && (
        <DragOverlay>
          <StyledBounceArchive size={40} style={{ marginBottom: '8px' }} />
          <p>Drop files to upload</p>
        </DragOverlay>
      )}

      <input
        ref={fileInputRef}
        type="file"
        multiple
        style={{ display: 'none' }}
        onChange={(e) => {
          if (e.target.files) handleFiles(e.target.files)
          e.target.value = ''
        }}
      />

      <Disclaimer>
        <p>AI can make mistakes. Please check important information.</p>
      </Disclaimer>
    </ChatContainer>
  )
}
