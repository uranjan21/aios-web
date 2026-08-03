/**
 * Settings → AI configuration.
 *
 * Phase 4 conversion to the canvas's `settings:ai` composition —
 * tiles(12) · controls(7) · rows(5) · table(12) — from the live profile,
 * usage and knowledge-source state. It absorbs the old Knowledge section,
 * which the 2026-08-01 IA folded in here.
 *
 * TWO DEPARTURES:
 *  - The canvas's fourth module is "Custom instructions", a free-text block
 *    prepended to every conversation. There is no such field on the user, so
 *    that slot holds the knowledge source instead — the thing that actually
 *    shapes what the assistant knows about you.
 *  - Its data-access table is a per-area read/write matrix. Access is not
 *    per-area configurable; the assistant can read whatever module you are
 *    entitled to. The table shows that entitlement honestly rather than
 *    implying switches that do not exist.
 *
 * BACKEND FOLLOW-UP: a `custom_instructions` field on the user, and per-area
 * assistant scopes, would let this render the canvas exactly.
 */
import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import dayjs from 'dayjs'
import styled from 'styled-components'
import { Cpu, FileText, Shield } from 'lucide-react'
import { Button, Dialog, Input, Select } from '@ledgr/ui'
import { api } from '@ct/shared/api/client'
import { billingApi } from '@ct/shared/api/billing'
import { knowledgeApi } from '@ct/shared/api/knowledge'
import { chatApi } from '@ct/shared/api/chat'
import { useAuthStore } from '@ct/shared/stores/authStore'
import { ModuleGrid, type ModuleSpec } from '@ct/shared/components/modules'

const Form = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.spacing[3]};
`

const Label = styled.label`
  display: block;
  font-size: ${({ theme }) => theme.typography.fontSize.xs};
  color: ${({ theme }) => theme.color.mutedForeground};
  margin-bottom: ${({ theme }) => theme.spacing[1]};
`

const Actions = styled.div`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing[2]};
  padding-top: ${({ theme }) => theme.spacing[2]};
`

const PROVIDERS = ['System', 'OpenAI', 'Anthropic']
const PROVIDER_VALUE: Record<string, string> = { System: 'system', OpenAI: 'openai', Anthropic: 'anthropic' }
const PROVIDER_LABEL: Record<string, string> = { system: 'System', openai: 'OpenAI', anthropic: 'Anthropic' }

const title = (s: string) => s.charAt(0).toUpperCase() + s.slice(1)

export function AiModules() {
  const qc = useQueryClient()
  const { user, setUser } = useAuthStore()
  const [keysOpen, setKeysOpen] = useState(false)
  const [openaiKey, setOpenaiKey] = useState('')
  const [anthropicKey, setAnthropicKey] = useState('')

  const { data: usage } = useQuery({ queryKey: ['billing', 'usage'], queryFn: billingApi.usage })
  const { data: sub } = useQuery({ queryKey: ['billing', 'subscription'], queryFn: billingApi.subscription })
  const { data: knowledge } = useQuery({ queryKey: ['knowledge', 'source'], queryFn: knowledgeApi.get })
  const { data: models } = useQuery({ queryKey: ['chat', 'models'], queryFn: chatApi.models, staleTime: 10 * 60_000 })

  const saveProfile = useMutation({
    mutationFn: (payload: Record<string, unknown>) => api.patch('/auth/profile', payload).then(r => r.data),
    onSuccess: (data) => {
      setUser(data)
      setKeysOpen(false)
      setOpenaiKey('')
      setAnthropicKey('')
      toast.success('AI configuration updated')
    },
    onError: () => toast.error('Failed to update AI configuration'),
  })

  const syncKnowledge = useMutation({
    mutationFn: () => knowledgeApi.syncNow(),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['knowledge', 'source'] })
      toast.success('Knowledge sync started')
    },
    onError: () => toast.error('Could not start a sync'),
  })

  const modules = useMemo<ModuleSpec[]>(() => {
    const provider = user?.llm_provider || 'system'
    const openaiModels = models?.providers?.openai ?? []
    const claudeModels = models?.providers?.anthropic ?? []
    const activeModel = provider === 'anthropic'
      ? (user?.claude_model || claudeModels[0] || 'System default')
      : (user?.openai_chat_model || openaiModels[0] || 'System default')

    const used = usage?.used ?? 0
    const included = usage?.included ?? 0
    const ownKey = !!user?.has_openai_key || !!user?.has_anthropic_key

    return [
      {
        kind: 'tiles',
        span: 12,
        tiles: [
          { label: 'Provider', value: PROVIDER_LABEL[provider] ?? title(provider), sub: 'Used for chat and agents' },
          { label: 'Model', value: activeModel, sub: provider === 'system' ? 'Chosen by the server' : 'Your override' },
          {
            label: 'Credits used',
            value: String(used),
            sub: included > 0 ? `of ${included} this month` : 'Unmetered on this instance',
            ...(included > 0 && { bar: Math.min(100, Math.round((used / included) * 100)), barKey: 'accent' }),
          },
          {
            label: 'Own API key',
            value: ownKey ? 'In use' : 'Not set',
            sub: ownKey ? 'Bypasses the shared quota' : 'Add one to bypass the quota',
            dotKey: ownKey ? 'success' : undefined,
          },
        ],
      },
      {
        kind: 'controls',
        span: 7,
        title: 'Behaviour',
        subtitle: 'Which model answers you',
        icon: Cpu,
        action: 'API keys',
        onAction: () => setKeysOpen(true),
        rows: [
          {
            title: 'Provider',
            meta: 'System uses whichever key the server holds',
            control: 'segment',
            options: PROVIDERS,
            value: PROVIDER_LABEL[provider] ?? 'System',
            busy: saveProfile.isPending,
          },
          {
            title: 'OpenAI model',
            meta: user?.openai_chat_model || 'Server default',
            control: 'select',
            value: user?.openai_chat_model || 'Default',
          },
          {
            title: 'Anthropic model',
            meta: user?.claude_model || 'Server default',
            control: 'select',
            value: user?.claude_model || 'Default',
          },
        ],
        onSelect: (i: number, value: string) => {
          if (i === 0) saveProfile.mutate({ llm_provider: PROVIDER_VALUE[value] ?? 'system' })
        },
      },
      {
        kind: 'rows',
        span: 5,
        title: 'Knowledge source',
        subtitle: knowledge?.configured
          ? 'What the assistant reads about you'
          : 'Nothing connected — the assistant only sees your app data',
        icon: FileText,
        ...(knowledge?.configured && { action: 'Sync now', onAction: () => syncKnowledge.mutate() }),
        rows: knowledge?.configured
          ? [
              {
                title: title(knowledge.source_type ?? 'source'),
                meta: knowledge.config?.path ?? 'No path recorded',
                tagLabel: knowledge.enabled ? 'Enabled' : 'Paused',
                tagColorKey: knowledge.enabled ? 'success' : 'mutedFg',
              },
              {
                title: 'Last sync',
                meta: knowledge.last_error ?? 'No errors',
                value: knowledge.last_synced_at ? dayjs(knowledge.last_synced_at).format('D MMM, HH:mm') : 'Never',
                tagLabel: knowledge.last_status === 'error' ? 'Failed' : knowledge.last_status === 'ok' ? 'OK' : undefined,
                tagColorKey: knowledge.last_status === 'error' ? 'destructive' : 'success',
              },
            ]
          : [],
      },
      {
        kind: 'table',
        span: 12,
        title: 'Data access',
        subtitle: 'What the assistant may read, per area',
        icon: Shield,
        gridCols: '1.4fr 1fr 1.4fr',
        cols: [{ l: 'Area' }, { l: 'Access' }, { l: 'Why' }],
        rows: (sub?.entitled ?? []).map(m => [
          { t: title(m), bold: true },
          { t: 'Read', tag: true, colorKey: 'success' },
          sub?.bundle ? 'Everything bundle' : sub?.modules.includes(m) ? 'Module owned' : 'Free area',
        ]),
      },
    ]
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, usage, sub, knowledge, models, saveProfile.isPending])

  return (
    <>
      <ModuleGrid modules={modules} />

      <Dialog
        open={keysOpen}
        onOpenChange={(o) => !o && setKeysOpen(false)}
        icon={<Cpu size={18} />}
        eyebrow="AI"
        title="Your API keys"
        description="Bring your own keys to bypass the shared usage quota. Keys are encrypted at rest and never shown again."
      >
        <Form>
          <div>
            <Label>OpenAI key {user?.has_openai_key ? '(one is already set)' : ''}</Label>
            <Input type="password" value={openaiKey} onChange={(e: any) => setOpenaiKey(e.target.value)} placeholder="sk-…" />
          </div>
          <div>
            <Label>Anthropic key {user?.has_anthropic_key ? '(one is already set)' : ''}</Label>
            <Input type="password" value={anthropicKey} onChange={(e: any) => setAnthropicKey(e.target.value)} placeholder="sk-ant-…" />
          </div>
          <div>
            <Label>Default OpenAI model</Label>
            <Select
              fullWidth
              value={user?.openai_chat_model || ''}
              onChange={(v: any) => saveProfile.mutate({ openai_chat_model: String(v) })}
              options={[{ value: '', label: 'Server default' }, ...(models?.providers?.openai ?? []).map(m => ({ value: m, label: m }))]}
            />
          </div>
          <div>
            <Label>Default Anthropic model</Label>
            <Select
              fullWidth
              value={user?.claude_model || ''}
              onChange={(v: any) => saveProfile.mutate({ claude_model: String(v) })}
              options={[{ value: '', label: 'Server default' }, ...(models?.providers?.anthropic ?? []).map(m => ({ value: m, label: m }))]}
            />
          </div>
          <Actions>
            <Button
              variant="primary"
              loading={saveProfile.isPending}
              disabled={!openaiKey && !anthropicKey}
              onClick={() => saveProfile.mutate({
                ...(openaiKey ? { openai_api_key: openaiKey } : {}),
                ...(anthropicKey ? { anthropic_api_key: anthropicKey } : {}),
              })}
            >
              Save keys
            </Button>
            <Button variant="ghost" onClick={() => setKeysOpen(false)}>Close</Button>
          </Actions>
        </Form>
      </Dialog>
    </>
  )
}
