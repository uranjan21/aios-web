import React, { useState, useRef, useEffect, useCallback } from "react"
import { useTheme } from "styled-components"
import { Plus, ArrowUp } from "lucide-react"
import { AttachedFile, FilePreviewCard, PastedContentCard } from "./FilePreviewCard"
import { Model, ModelSelector } from "./ModelSelector"
import {
  StyledSpinner, StyledBounceArchive,
  ChatContainer, InputBox, InnerPadding, ArtifactsRow,
  TextAreaWrapper, StyledTextarea, ActionBar, LeftTools,
  ToolButton, RightTools, SendButton, DragOverlay,
  Disclaimer, ModelSelectorWrapper, ContextDropdown, ContextOption,
} from "./AssistantChatInput.styles"

export type { AttachedFile, Model }

export interface AssistantChatInputProps {
  onSendMessage: (data: {
    message: string
    files: AttachedFile[]
    pastedContent: { id: string; content: string; timestamp: Date }[]
    model: string
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
  const createdUrlsRef = useRef<Set<string>>(new Set())
  const dragCounter = useRef(0)

  const mentionMatch = message.match(/(?:^|\s)@(\w*)$/)
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

  // Clean up object URLs when files are removed or component unmounts
  useEffect(() => {
    const currentPreviews = new Set(files.map(f => f.preview).filter(Boolean) as string[])
    createdUrlsRef.current.forEach(url => {
      if (!currentPreviews.has(url)) {
        URL.revokeObjectURL(url)
        createdUrlsRef.current.delete(url)
      }
    })
  }, [files])

  useEffect(() => {
    return () => {
      createdUrlsRef.current.forEach(url => {
        URL.revokeObjectURL(url)
      })
      createdUrlsRef.current.clear()
    }
  }, [])

  const handleMention = (tag: string) => {
    onChangeMessage(message.replace(/@\w*$/, '') + `@${tag} `)
    requestAnimationFrame(() => {
      textareaRef.current?.focus()
    })
  }

  const internalTextareaRef = useRef<HTMLTextAreaElement>(null)
  const textareaRef = inputRef || internalTextareaRef
  const fileInputRef = useRef<HTMLInputElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  // Prevent escape key from bubbling to global assistant drawer when mentions are open
  useEffect(() => {
    const el = containerRef.current
    if (!el) return

    const handleNativeKeyDown = (e: KeyboardEvent) => {
      const showMentions = mentionMatch && availableMentions.length > 0 && !mentionsDismissed
      if (showMentions && e.key === 'Escape') {
        e.preventDefault()
        e.stopPropagation()
        e.stopImmediatePropagation()
        setMentionsDismissed(true)
        textareaRef.current?.focus()
      }
    }

    el.addEventListener('keydown', handleNativeKeyDown, true) // capture phase
    return () => {
      el.removeEventListener('keydown', handleNativeKeyDown, true)
    }
  }, [message, mentionsDismissed, textareaRef])

  useEffect(() => {
    setSelectedModel(defaultModel)
  }, [defaultModel])

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
      let preview: string | null = null
      if (isImage) {
        preview = URL.createObjectURL(file)
        createdUrlsRef.current.add(preview)
      }
      return {
        id: Math.random().toString(36).slice(2, 11),
        file,
        type: isImage ? 'image/unknown' : (file.type || 'application/octet-stream'),
        preview,
      }
    })

    // No fake upload progress — files are only encoded when the message sends.
    setFiles(prev => [...prev, ...newFiles])
  }, [])

  const onDragEnter = (e: React.DragEvent) => {
    e.preventDefault()
    dragCounter.current++
    if (dragCounter.current === 1) {
      setIsDragging(true)
    }
  }

  const onDragOver = (e: React.DragEvent) => {
    e.preventDefault()
  }

  const onDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    dragCounter.current--
    if (dragCounter.current === 0) {
      setIsDragging(false)
    }
  }

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault()
    dragCounter.current = 0
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
        id: Math.random().toString(36).slice(2, 11),
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

    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const hasContent = !!message.trim() || files.length > 0 || pastedContent.length > 0
  const showMentions = mentionMatch && availableMentions.length > 0 && !mentionsDismissed

  return (
    <ChatContainer
      ref={containerRef}
      onDragEnter={onDragEnter}
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
                <Plus size={20} />
                <div className="tooltip">Attach files</div>
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
                {disabled ? <StyledSpinner size={16} /> : <ArrowUp size={16} />}
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
