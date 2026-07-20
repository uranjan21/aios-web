import { useQuery } from '@tanstack/react-query'
import { chatApi } from '@aios/shared/api/chat'
import type { ChatModelsInfo } from '@aios/shared/types'

export interface ChatModelOption {
  id: string
  name: string
  description: string
}

// Display metadata for allowlisted model ids; unknown ids fall back to the raw id.
const MODEL_LABELS: Record<string, { name: string; description: string }> = {
  'gpt-4o': { name: 'GPT-4o', description: 'Most capable OpenAI model' },
  'gpt-4o-mini': { name: 'GPT-4o Mini', description: 'Fast and efficient' },
  'claude-sonnet-4-5': { name: 'Claude Sonnet 4.5', description: 'Best for complex tasks' },
  'claude-haiku-4-5': { name: 'Claude Haiku 4.5', description: 'Fastest for everyday tasks' },
}

export function toModelOption(id: string): ChatModelOption {
  const meta = MODEL_LABELS[id]
  return { id, name: meta?.name ?? id, description: meta?.description ?? '' }
}

/** Server-driven model allowlist — the single source for every model menu. */
export function useChatModels() {
  const query = useQuery<ChatModelsInfo>({
    queryKey: ['chat', 'models'],
    queryFn: chatApi.models,
    staleTime: Infinity,
  })

  const modelsForProvider = (provider: string): ChatModelOption[] => {
    if (provider !== 'openai' && provider !== 'anthropic') return []
    return (query.data?.providers[provider] ?? []).map(toModelOption)
  }

  return { ...query, modelsForProvider }
}
