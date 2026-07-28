import { useState } from 'react'
import { Save } from 'lucide-react'
import { toast } from 'sonner'
import { api } from '@ct/shared/api/client'
import { useAuthStore } from '@ct/shared/stores/authStore'
import { Select, Input, Button } from '@ledgr/ui'
import { RowRoot, RowLabel, Section } from '../shared'

// ── AI Configuration ────────────────────────────────────────────────────────────

export function AiConfigSection() {
  const { user, setUser } = useAuthStore()
  const [provider, setProvider] = useState(user?.llm_provider || 'system')
  const [openaiModel, setOpenaiModel] = useState(user?.openai_chat_model || '')
  const [claudeModel, setClaudeModel] = useState(user?.claude_model || '')
  const [openaiKey, setOpenaiKey] = useState('')
  const [anthropicKey, setAnthropicKey] = useState('')
  const [busy, setBusy] = useState(false)

  const save = async () => {
    setBusy(true)
    try {
      const payload: any = {
        llm_provider: provider
      }
      if (openaiModel) payload.openai_chat_model = openaiModel
      if (claudeModel) payload.claude_model = claudeModel
      if (openaiKey) payload.openai_api_key = openaiKey
      if (anthropicKey) payload.anthropic_api_key = anthropicKey

      const { data } = await api.patch('/auth/profile', payload)
      setUser(data)
      setOpenaiKey('')
      setAnthropicKey('')
      toast.success('AI configuration updated')
    } catch {
      toast.error('Failed to update AI configuration')
    } finally {
      setBusy(false)
    }
  }

  const isDirty = provider !== (user?.llm_provider || 'system') ||
    openaiModel !== (user?.openai_chat_model || '') ||
    claudeModel !== (user?.claude_model || '') ||
    openaiKey.length > 0 ||
    anthropicKey.length > 0

  return (
    <Section title="AI Configuration">
      <div style={{ padding: '0 20px 20px' }}>
        <p style={{ fontSize: 13, color: 'var(--muted-foreground)', marginBottom: 20 }}>
          Override the system default LLM provider and models. Bring your own API keys to bypass usage limits.
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <RowRoot style={{ padding: 0 }}>
            <div>
              <RowLabel>LLM Provider</RowLabel>
              <div style={{ fontSize: 12, color: 'var(--muted-foreground)' }}>Choose your preferred AI</div>
            </div>
            <Select
              size="sm"
              fullWidth={false}
              options={[
                { label: 'System Default', value: 'system' },
                { label: 'OpenAI', value: 'openai' },
                { label: 'Anthropic Claude', value: 'anthropic' },
              ]}
              value={provider}
              onChange={(val) => setProvider(val as string)}
            />
          </RowRoot>

          <RowRoot style={{ padding: 0 }}>
            <div>
              <RowLabel>OpenAI Chat Model</RowLabel>
              <div style={{ fontSize: 12, color: 'var(--muted-foreground)' }}>Default: gpt-4o</div>
            </div>
            <Select
              size="sm"
              fullWidth={false}
              options={[
                { label: 'System Default', value: '' },
                { label: 'GPT-4o', value: 'gpt-4o' },
                { label: 'GPT-4o Mini', value: 'gpt-4o-mini' },
                { label: 'GPT-4 Turbo', value: 'gpt-4-turbo' },
                { label: 'GPT-3.5 Turbo', value: 'gpt-3.5-turbo' },
              ]}
              value={openaiModel || ''}
              onChange={(val) => setOpenaiModel(val as string)}
            />
          </RowRoot>

          <RowRoot style={{ padding: 0 }}>
            <div>
              <RowLabel>OpenAI API Key</RowLabel>
              <div style={{ fontSize: 12, color: 'var(--muted-foreground)' }}>
                {user?.has_openai_key ? 'Custom key configured' : 'Using system key'}
              </div>
            </div>
            <Input
              size="sm"
              type="password"
              value={openaiKey}
              onChange={e => setOpenaiKey(e.target.value)}
              placeholder={user?.has_openai_key ? 'Enter new key to replace' : 'sk-...'}
            />
          </RowRoot>

          <RowRoot style={{ padding: 0 }}>
            <div>
              <RowLabel>Claude Model</RowLabel>
              <div style={{ fontSize: 12, color: 'var(--muted-foreground)' }}>Default: claude-3-5-sonnet-20240620</div>
            </div>
            <Select
              size="sm"
              fullWidth={false}
              options={[
                { label: 'System Default', value: '' },
                { label: 'Claude 3.5 Sonnet', value: 'claude-3-5-sonnet-20240620' },
                { label: 'Claude 3.5 Haiku', value: 'claude-3-5-haiku-20241022' },
                { label: 'Claude 3 Opus', value: 'claude-3-opus-20240229' },
                { label: 'Claude 3 Sonnet', value: 'claude-3-sonnet-20240229' },
                { label: 'Claude 3 Haiku', value: 'claude-3-haiku-20240307' },
              ]}
              value={claudeModel || ''}
              onChange={(val) => setClaudeModel(val as string)}
            />
          </RowRoot>

          <RowRoot style={{ padding: 0 }}>
            <div>
              <RowLabel>Anthropic API Key</RowLabel>
              <div style={{ fontSize: 12, color: 'var(--muted-foreground)' }}>
                {user?.has_anthropic_key ? 'Custom key configured' : 'Using system key'}
              </div>
            </div>
            <Input
              size="sm"
              type="password"
              value={anthropicKey}
              onChange={e => setAnthropicKey(e.target.value)}
              placeholder={user?.has_anthropic_key ? 'Enter new key to replace' : 'sk-ant-...'}
            />
          </RowRoot>

          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 8 }}>
            <Button size="sm" variant="primary" disabled={!isDirty || busy} onClick={save}>
              <Save size={12} style={{ marginRight: 4 }} /> Save
            </Button>
          </div>
        </div>
      </div>
    </Section>
  )
}
