import { useEffect, useRef, useState, useCallback } from 'react'
import type { ChatEvent } from '@/types'
import { chatApi } from '@/api/chat'

export interface LocalMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  toolCalls?: Array<{ tool: string; input: Record<string, unknown> }>
  toolResults?: Array<{ tool: string; status: string; result: string; affected: string[] }>
  pendingConfirmation?: { tool: string; tool_call_id: string; params: Record<string, unknown> }
  affectedPaths?: string[]
  streaming?: boolean
  error?: boolean
}

export interface SendOverrides {
  provider?: string
  openaiModel?: string
  claudeModel?: string
}

interface UseChatResult {
  messages: LocalMessage[]
  sessionId: string | null
  isStreaming: boolean
  tokenInfo: { input: number; output: number; daily_remaining: number } | null
  affectedPaths: string[]
  sendMessage: (content: string, hiddenContext?: string, attachments?: File[], overrides?: SendOverrides) => void
  retryLast: () => void
  canRetry: boolean
  newSession: () => void
  loadSession: (id: string) => void
  connected: boolean
  loadingMessages: boolean
  confirmTool: (tool_call_id: string) => void
  cancelTool: (tool_call_id: string) => void
}

let msgId = 0
const nextId = () => String(++msgId)

export function useChat(initialSessionId?: string): UseChatResult {
  const [messages, setMessages] = useState<LocalMessage[]>([])
  const [sessionId, setSessionId] = useState<string | null>(initialSessionId ?? null)
  const [loadingMessages, setLoadingMessages] = useState(false)
  const [isStreaming, setIsStreaming] = useState(false)
  const [tokenInfo, setTokenInfo] = useState<UseChatResult['tokenInfo']>(null)
  const [affectedPaths, setAffectedPaths] = useState<string[]>([])
  const [connected, setConnected] = useState(false)
  const [canRetry, setCanRetry] = useState(false)
  const wsRef = useRef<WebSocket | null>(null)
  const currentAssistantId = useRef<string | null>(null)
  const lastSentRef = useRef<{ content: string; hiddenContext?: string; overrides?: SendOverrides } | null>(null)

  const isMounted = useRef(true)

  const connect = useCallback(() => {
    const protocol = location.protocol === 'https:' ? 'wss' : 'ws'
    const ws = new WebSocket(`${protocol}://${location.host}/ws/chat`)
    wsRef.current = ws

    ws.onopen = () => setConnected(true)
    ws.onclose = () => {
      if (!isMounted.current) return
      setConnected(false)
      setTimeout(connect, 3000)
    }

    ws.onmessage = (evt) => {
      try {
        const event: ChatEvent = JSON.parse(evt.data)
        handleEvent(event)
      } catch (e) {
        console.error("Failed to parse chat WS message:", e)
      }
    }
  }, [])

  const handleEvent = useCallback((event: ChatEvent) => {
    if (event.type === 'chunk') {
      setMessages(prev => {
        const last = prev[prev.length - 1]
        if (last && last.id === currentAssistantId.current) {
          return [...prev.slice(0, -1), { ...last, content: last.content + event.content }]
        }
        return prev
      })
    } else if (event.type === 'tool_call') {
      setMessages(prev => {
        const last = prev[prev.length - 1]
        if (last && last.id === currentAssistantId.current) {
          return [...prev.slice(0, -1), {
            ...last,
            toolCalls: [...(last.toolCalls ?? []), { tool: event.tool, input: event.input }],
          }]
        }
        return prev
      })
    } else if (event.type === 'tool_result') {
      setMessages(prev => {
        const last = prev[prev.length - 1]
        if (last && last.id === currentAssistantId.current) {
          return [...prev.slice(0, -1), {
            ...last,
            toolResults: [...(last.toolResults ?? []), {
              tool: event.tool,
              status: event.status,
              result: event.result,
              affected: event.affected,
            }],
          }]
        }
        return prev
      })
    } else if (event.type === 'session_created') {
      // Adopt the server-created session so follow-ups continue it.
      setSessionId(event.session_id)
    } else if (event.type === 'done') {
      setIsStreaming(false)
      setTokenInfo(event.tokens)
      setAffectedPaths(event.affected_paths)
      setCanRetry(false)
      setMessages(prev => {
        const last = prev[prev.length - 1]
        if (last && last.id === currentAssistantId.current) {
          return [...prev.slice(0, -1), { ...last, streaming: false, affectedPaths: event.affected_paths }]
        }
        return prev
      })
      currentAssistantId.current = null
    } else if (event.type === 'tool_confirmation_required') {
      setMessages(prev => {
        const last = prev[prev.length - 1]
        if (last && last.id === currentAssistantId.current) {
          return [...prev.slice(0, -1), {
            ...last,
            pendingConfirmation: {
              tool: event.tool,
              tool_call_id: event.tool_call_id,
              params: event.params,
            },
          }]
        }
        return prev
      })
    } else if (event.type === 'tool_confirmed_result' || event.type === 'tool_cancelled') {
      // Clear the pending confirmation badge once resolved.
      setMessages(prev => prev.map(m =>
        m.pendingConfirmation?.tool_call_id === event.tool_call_id
          ? { ...m, pendingConfirmation: undefined }
          : m
      ))
    } else if (event.type === 'error') {
      setIsStreaming(false)
      setCanRetry(lastSentRef.current !== null)
      setMessages(prev => {
        // Replace the empty streaming stub instead of leaving it dangling.
        const last = prev[prev.length - 1]
        const base = last && last.id === currentAssistantId.current && !last.content && !last.toolCalls?.length
          ? prev.slice(0, -1)
          : prev
        return [...base, {
          id: nextId(),
          role: 'assistant' as const,
          content: event.message,
          streaming: false,
          error: true,
        }]
      })
      currentAssistantId.current = null
    }
  }, [])

  useEffect(() => {
    isMounted.current = true
    connect()
    return () => {
      isMounted.current = false
      wsRef.current?.close()
    }
  }, [connect])

  useEffect(() => {
    if (initialSessionId) {
      setSessionId(initialSessionId)
      setLoadingMessages(true)
      chatApi.session(initialSessionId)
        .then(data => {
          if (data && Array.isArray(data.messages)) {
            const mapped: LocalMessage[] = data.messages.map((m: any) => ({
              id: m.id,
              role: m.role,
              content: m.content,
              toolCalls: m.tool_calls || undefined,
              toolResults: m.tool_results || undefined,
            }))
            setMessages(mapped)
          }
        })
        .catch(err => {
          console.error("Failed to load session messages:", err)
        })
        .finally(() => {
          setLoadingMessages(false)
        })
    } else {
      setSessionId(null)
      setMessages([])
    }
  }, [initialSessionId])

  const sendMessage = useCallback(async (content: string, hiddenContext?: string, attachments?: File[], overrides?: SendOverrides) => {
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) return

    let encodedAttachments: { filename: string; contentType: string; data: string }[] = []

    if (attachments && attachments.length > 0) {
      encodedAttachments = await Promise.all(attachments.map(async (file) => {
        return new Promise<any>((resolve) => {
          const reader = new FileReader()
          reader.onload = () => {
            const result = reader.result as string
            const base64Data = result.split(',')[1] // remove data url prefix
            resolve({ filename: file.name, contentType: file.type, data: base64Data })
          }
          reader.readAsDataURL(file)
        })
      }))
    }

    const userMsgId = nextId()
    setMessages(prev => [...prev, { id: userMsgId, role: 'user', content }])

    const assistantMsgId = nextId()
    currentAssistantId.current = assistantMsgId
    setMessages(prev => [...prev, { id: assistantMsgId, role: 'assistant', content: '', streaming: true }])
    setIsStreaming(true)
    setAffectedPaths([])
    setCanRetry(false)
    // Attachments aren't kept for retry — re-encoding Files after failure is unreliable.
    lastSentRef.current = { content, hiddenContext, overrides }

    const payloadContent = hiddenContext ? `${hiddenContext}\n${content}` : content

    const activeModel = overrides?.provider === 'openai'
      ? overrides.openaiModel
      : overrides?.provider === 'anthropic'
        ? overrides.claudeModel
        : undefined

    wsRef.current.send(JSON.stringify({
      type: 'message',
      content: payloadContent,
      session_id: sessionId,
      attachments: encodedAttachments.length > 0 ? encodedAttachments : undefined,
      provider: overrides?.provider,
      model: activeModel,
    }))
  }, [sessionId])

  const retryLast = useCallback(() => {
    const last = lastSentRef.current
    if (!last) return
    // Drop the failed turn (error bubble + its user message) before re-sending.
    setMessages(prev => {
      const trimmed = [...prev]
      if (trimmed[trimmed.length - 1]?.error) trimmed.pop()
      if (trimmed[trimmed.length - 1]?.role === 'user') trimmed.pop()
      return trimmed
    })
    setCanRetry(false)
    sendMessage(last.content, last.hiddenContext, undefined, last.overrides)
  }, [sendMessage])

  const newSession = useCallback(() => {
    setSessionId(null)
    setMessages([])
    setAffectedPaths([])
    setTokenInfo(null)
    setCanRetry(false)
  }, [])

  const confirmTool = useCallback((tool_call_id: string) => {
    wsRef.current?.send(JSON.stringify({ type: 'tool_confirm', tool_call_id }))
  }, [])

  const cancelTool = useCallback((tool_call_id: string) => {
    wsRef.current?.send(JSON.stringify({ type: 'tool_cancel', tool_call_id }))
  }, [])

  const loadSession = useCallback((id: string) => {
    setSessionId(id)
    setLoadingMessages(true)
    setCanRetry(false)
    chatApi.session(id)
      .then(data => {
        if (data && Array.isArray(data.messages)) {
          const mapped: LocalMessage[] = data.messages.map((m: any) => ({
            id: m.id,
            role: m.role,
            content: m.content,
            toolCalls: m.tool_calls || undefined,
            toolResults: m.tool_results || undefined,
          }))
          setMessages(mapped)
        }
      })
      .catch(err => console.error("Failed to load session:", err))
      .finally(() => setLoadingMessages(false))
  }, [])

  return { messages, sessionId, isStreaming, tokenInfo, affectedPaths, sendMessage, retryLast, canRetry, newSession, loadSession, connected, loadingMessages, confirmTool, cancelTool }
}
