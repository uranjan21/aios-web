/**
 * Settings → AI & knowledge.
 *
 * REBUILT 2026-08-03. What was here duplicated two other tabs and faked a
 * control:
 *  - a "Credits used" tile repeating a number Plan & usage already shows twice;
 *  - a "Data access" table re-rendering `sub.entitled`, which Plan & usage
 *    lists as the modules you own;
 *  - two `control: 'select'` rows for the models. That control renders a chip
 *    with a chevron and NO handler (`ShellKinds.ControlsKind`), so it looked
 *    like a dropdown and did nothing — the real model pickers were hidden in
 *    the API-keys dialog.
 *
 * It also could not do the one thing this tab is for: `knowledgeApi.save` and
 * `.remove` existed with no caller, so a knowledge source could be SYNCED but
 * never set up or removed. That is now the "Knowledge source" module.
 *
 * The model pickers are in the dialog on purpose — they are per-provider and
 * only meaningful beside the key that authorises them.
 */
import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import dayjs from 'dayjs'
import styled from 'styled-components'
import { BookOpen, Cpu } from 'lucide-react'
import { Button, Dialog, Input, Select } from '@ledgr/ui'
import { api } from '@ct/shared/api/client'
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

const Hint = styled.p`
  margin: 0;
  font-size: ${({ theme }) => theme.typography.fontSize.xs};
  color: ${({ theme }) => theme.color.mutedForeground};
`

const Actions = styled.div`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing[2]};
  padding-top: ${({ theme }) => theme.spacing[2]};
`

const Spacer = styled.div`
  flex: 1;
`

const PROVIDERS = ['System', 'OpenAI', 'Anthropic']
const PROVIDER_VALUE: Record<string, string> = { System: 'system', OpenAI: 'openai', Anthropic: 'anthropic' }
const PROVIDER_LABEL: Record<string, string> = { system: 'System', openai: 'OpenAI', anthropic: 'Anthropic' }

const SYNC_INTERVALS = [
  { value: '15', label: 'Every 15 minutes' },
  { value: '30', label: 'Every 30 minutes' },
  { value: '60', label: 'Hourly' },
  { value: '360', label: 'Every 6 hours' },
  { value: '1440', label: 'Daily' },
]

const title = (s: string) => s.charAt(0).toUpperCase() + s.slice(1)

export function AiModules() {
  const qc = useQueryClient()
  const { user, setUser } = useAuthStore()
  const [keysOpen, setKeysOpen] = useState(false)
  const [openaiKey, setOpenaiKey] = useState('')
  const [anthropicKey, setAnthropicKey] = useState('')

  const [kbOpen, setKbOpen] = useState(false)
  const [kbType, setKbType] = useState<'obsidian' | 'notion'>('notion')
  const [kbPath, setKbPath] = useState('')
  const [kbInterval, setKbInterval] = useState('30')

  const { data: knowledge } = useQuery({ queryKey: ['knowledge', 'source'], queryFn: knowledgeApi.get })
  const { data: models } = useQuery({ queryKey: ['chat', 'models'], queryFn: chatApi.models, staleTime: 10 * 60_000 })

  /**
   * Prefill then open, in that order.
   *
   * This was a `useEffect` keyed on `kbOpen` (the ledgr-ui Dialog only fires
   * onOpenChange on CLOSE, so the prefill cannot hang off onOpenChange(true)).
   * That works for one entry point but not two: the unconfigured card's rows
   * now open the dialog on a SPECIFIC source, and an effect would immediately
   * overwrite that choice with the default. Setting state at the call site is
   * both simpler and the only version that can honour `type`.
   */
  const openKb = (type?: 'obsidian' | 'notion') => {
    setKbType(
      type
        ?? (knowledge?.source_type as 'obsidian' | 'notion' | undefined)
        ?? (knowledge?.folder_sync_available ? 'obsidian' : 'notion'),
    )
    setKbPath(knowledge?.config?.path ?? '')
    setKbInterval(String(knowledge?.sync_interval_minutes ?? 30))
    setKbOpen(true)
  }

  const saveProfile = useMutation({
    mutationFn: (payload: Record<string, unknown>) => api.patch('/auth/profile', payload).then(r => r.data),
    onSuccess: (data) => {
      setUser(data)
      setOpenaiKey('')
      setAnthropicKey('')
      toast.success('AI configuration updated')
    },
    onError: () => toast.error('Failed to update AI configuration'),
  })

  const saveKnowledge = useMutation({
    mutationFn: () => knowledgeApi.save({
      source_type: kbType,
      config: kbType === 'obsidian' ? { path: kbPath.trim() } : {},
      sync_interval_minutes: Number(kbInterval),
      enabled: true,
    }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['knowledge', 'source'] })
      setKbOpen(false)
      toast.success('Knowledge source saved')
    },
    onError: (e: any) => toast.error(e?.response?.data?.detail ?? 'Could not save the knowledge source'),
  })

  const toggleKnowledge = useMutation({
    mutationFn: (enabled: boolean) => knowledgeApi.save({
      source_type: (knowledge?.source_type ?? 'notion') as 'obsidian' | 'notion',
      config: knowledge?.config ?? {},
      sync_interval_minutes: knowledge?.sync_interval_minutes ?? 30,
      enabled,
    }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['knowledge', 'source'] })
      toast.success('Knowledge source updated')
    },
    onError: () => toast.error('Could not update the knowledge source'),
  })

  const removeKnowledge = useMutation({
    mutationFn: () => knowledgeApi.remove(),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['knowledge', 'source'] })
      setKbOpen(false)
      toast.success('Knowledge source removed')
    },
    onError: () => toast.error('Could not remove the knowledge source'),
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
      ? (user?.claude_model || claudeModels[0] || 'Server default')
      : (user?.openai_chat_model || openaiModels[0] || 'Server default')
    const ownKey = !!user?.has_openai_key || !!user?.has_anthropic_key

    /*
     * NO `tiles` row (removed 2026-08-03). It restated provider, model, key
     * state and knowledge source — all four of which the two modules below
     * state, and none of which a tile can change. The active model and key
     * state moved onto the Model card's own rows, where the button that edits
     * them already sits.
     */
    return [
      {
        kind: 'controls',
        span: 7,
        title: 'Model',
        /*
         * The active model and key state ride in the subtitle rather than as
         * their own rows. A `controls` row must declare a control, and the only
         * one that fits read-only text is `select` — which has no handler, so
         * it would render two more chevron chips that cannot be opened. The
         * button above edits both.
         */
        subtitle: `Currently ${activeModel}${ownKey ? ' · using your own API key' : ''}`,
        icon: Cpu,
        action: 'API keys and models',
        onAction: () => setKeysOpen(true),
        rows: [
          {
            title: 'Provider',
            meta: 'System uses whichever key the server holds — pick one to override it',
            control: 'segment',
            options: PROVIDERS,
            value: PROVIDER_LABEL[provider] ?? 'System',
            busy: saveProfile.isPending,
          },
        ],
        onSelect: (i: number, value: string) => {
          if (i === 0) saveProfile.mutate({ llm_provider: PROVIDER_VALUE[value] ?? 'system' })
        },
      },
      knowledge?.configured
        ? {
            kind: 'controls',
            span: 5,
            title: 'Knowledge source',
            subtitle: 'External notes pulled in so the assistant knows your context',
            icon: BookOpen,
            action: 'Configure',
            onAction: () => openKb(),
            rows: [
              {
                title: title(knowledge.source_type ?? 'Source'),
                meta: knowledge.source_type === 'obsidian'
                  ? (knowledge.config?.path ?? 'No folder recorded')
                  : 'Your Notion workspace',
                control: 'toggle' as const,
                on: !!knowledge.enabled,
                busy: toggleKnowledge.isPending,
              },
            ],
            onToggle: (_i: number, next: boolean) => toggleKnowledge.mutate(next),
          }
        : {
            kind: 'rows',
            span: 5,
            title: 'Knowledge source',
            subtitle: 'Nothing connected — click a source to set it up',
            icon: BookOpen,
            /*
             * These rows used to carry an inert "Available" chip, which named
             * the options without offering them. Each one now OPENS the setup
             * dialog with its own type preselected, so the list is the picker.
             */
            rows: [
              {
                title: 'Notion',
                meta: 'Pulls your workspace in. Connect Notion under Connections first.',
                value: 'Set up',
              },
              ...(knowledge?.folder_sync_available
                ? [{
                    title: 'Obsidian folder',
                    meta: 'Indexes a local vault folder. Self-hosted instances only.',
                    value: 'Set up',
                  }]
                : []),
            ],
            onRowClick: (i: number) => openKb(i === 0 ? 'notion' : 'obsidian'),
          },
      ...(knowledge?.configured
        ? [{
            kind: 'rows' as const,
            span: 12,
            title: 'Sync',
            subtitle: `Pulls automatically every ${knowledge.sync_interval_minutes ?? 30} minutes`,
            icon: BookOpen,
            action: 'Sync now',
            onAction: () => syncKnowledge.mutate(),
            rows: [
              {
                title: 'Last sync',
                meta: knowledge.last_error ?? 'No errors reported',
                value: knowledge.last_synced_at
                  ? dayjs(knowledge.last_synced_at).format('D MMM YYYY, HH:mm')
                  : 'Never',
                tagLabel: knowledge.last_status === 'error'
                  ? 'Failed'
                  : knowledge.last_status === 'ok' ? 'OK' : 'Pending',
                tagColorKey: knowledge.last_status === 'error'
                  ? 'destructive'
                  : knowledge.last_status === 'ok' ? 'success' : 'mutedFg',
                busy: syncKnowledge.isPending,
              },
            ],
          }]
        : []),
    ]
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, knowledge, models, saveProfile.isPending, toggleKnowledge.isPending, syncKnowledge.isPending])

  return (
    <>
      <ModuleGrid modules={modules} />

      <Dialog
        open={keysOpen}
        onOpenChange={(o) => !o && setKeysOpen(false)}
        icon={<Cpu size={18} />}
        eyebrow="AI"
        title="API keys and models"
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
              onClick={() => {
                saveProfile.mutate({
                  ...(openaiKey ? { openai_api_key: openaiKey } : {}),
                  ...(anthropicKey ? { anthropic_api_key: anthropicKey } : {}),
                })
                setKeysOpen(false)
              }}
            >
              Save keys
            </Button>
            <Button variant="ghost" onClick={() => setKeysOpen(false)}>Close</Button>
          </Actions>
        </Form>
      </Dialog>

      <Dialog
        open={kbOpen}
        onOpenChange={(o) => !o && setKbOpen(false)}
        icon={<BookOpen size={18} />}
        eyebrow="Knowledge"
        title={knowledge?.configured ? 'Configure knowledge source' : 'Connect a knowledge source'}
        description="Your own notes, indexed so chat and agents can cite them. Only you can read them."
      >
        <Form>
          <div>
            <Label>Source</Label>
            <Select
              fullWidth
              value={kbType}
              onChange={(v: any) => setKbType(String(v) as 'obsidian' | 'notion')}
              options={[
                { value: 'notion', label: 'Notion workspace' },
                // The backend rejects an Obsidian source unless the instance
                // runs the folder watcher, so it is only offered when it can work.
                ...(knowledge?.folder_sync_available ? [{ value: 'obsidian', label: 'Obsidian folder' }] : []),
              ]}
            />
          </div>

          {kbType === 'obsidian' ? (
            <div>
              <Label>Vault folder path</Label>
              <Input
                value={kbPath}
                onChange={(e: any) => setKbPath(e.target.value)}
                placeholder="/Users/you/Documents/Vault"
              />
              <Hint>Must be a folder that exists on the server running Control Tower.</Hint>
            </div>
          ) : (
            <Hint>Connect Notion under Settings → Connections first — this reads whatever that grant allows.</Hint>
          )}

          <div>
            <Label>Sync frequency</Label>
            <Select
              fullWidth
              value={kbInterval}
              onChange={(v: any) => setKbInterval(String(v))}
              options={SYNC_INTERVALS}
            />
          </div>

          <Actions>
            <Button
              variant="primary"
              loading={saveKnowledge.isPending}
              disabled={kbType === 'obsidian' && !kbPath.trim()}
              onClick={() => saveKnowledge.mutate()}
            >
              {knowledge?.configured ? 'Save changes' : 'Connect'}
            </Button>
            <Button variant="ghost" onClick={() => setKbOpen(false)}>Cancel</Button>
            <Spacer />
            {knowledge?.configured && (
              <Button
                variant="destructive"
                loading={removeKnowledge.isPending}
                onClick={() => removeKnowledge.mutate()}
              >
                Remove source
              </Button>
            )}
          </Actions>
        </Form>
      </Dialog>
    </>
  )
}
