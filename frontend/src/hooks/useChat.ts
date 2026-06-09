import { useEffect, useRef, useState, useCallback } from 'react'
import type { ChatEvent } from '@/types'

export interface LocalMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  toolCalls?: Array<{ tool: string; input: Record<string, unknown> }>
  toolResults?: Array<{ tool: string; status: string; result: string; affected: string[] }>
  affectedPaths?: string[]
  streaming?: boolean
}

interface UseChatResult {
  messages: LocalMessage[]
  sessionId: string | null
  isStreaming: boolean
  tokenInfo: { input: number; output: number; daily_remaining: number } | null
  affectedPaths: string[]
  sendMessage: (content: string) => void
  newSession: () => void
  connected: boolean
}

let msgId = 0
const nextId = () => String(++msgId)

export function useChat(initialSessionId?: string): UseChatResult {
  const [messages, setMessages] = useState<LocalMessage[]>([])
  const [sessionId, setSessionId] = useState<string | null>(initialSessionId ?? null)
  const [isStreaming, setIsStreaming] = useState(false)
  const [tokenInfo, setTokenInfo] = useState<UseChatResult['tokenInfo']>(null)
  const [affectedPaths, setAffectedPaths] = useState<string[]>([])
  const [connected, setConnected] = useState(false)
  const wsRef = useRef<WebSocket | null>(null)
  const currentAssistantId = useRef<string | null>(null)

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
    } else if (event.type === 'done') {
      setIsStreaming(false)
      setTokenInfo(event.tokens)
      setAffectedPaths(event.affected_paths)
      setMessages(prev => {
        const last = prev[prev.length - 1]
        if (last && last.id === currentAssistantId.current) {
          return [...prev.slice(0, -1), { ...last, streaming: false, affectedPaths: event.affected_paths }]
        }
        return prev
      })
      currentAssistantId.current = null
    } else if (event.type === 'error') {
      setIsStreaming(false)
      const id = nextId()
      setMessages(prev => [...prev, {
        id,
        role: 'assistant',
        content: `⚠️ ${event.message}`,
        streaming: false,
      }])
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

  const sendMessage = useCallback((content: string) => {
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) return

    const userMsgId = nextId()
    setMessages(prev => [...prev, { id: userMsgId, role: 'user', content }])

    const assistantMsgId = nextId()
    currentAssistantId.current = assistantMsgId
    setMessages(prev => [...prev, { id: assistantMsgId, role: 'assistant', content: '', streaming: true }])
    setIsStreaming(true)
    setAffectedPaths([])

    wsRef.current.send(JSON.stringify({
      type: 'message',
      content,
      session_id: sessionId,
    }))
  }, [sessionId])

  const newSession = useCallback(() => {
    setSessionId(null)
    setMessages([])
    setAffectedPaths([])
    setTokenInfo(null)
  }, [])

  return { messages, sessionId, isStreaming, tokenInfo, affectedPaths, sendMessage, newSession, connected }
}
