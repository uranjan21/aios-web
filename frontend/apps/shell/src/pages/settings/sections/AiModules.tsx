/**
 * Settings → AI & knowledge.
 *
 * This is where AI cost lives now. Control Tower became free and
 * bring-your-own-key on 2026-08-20, so there is no plan, no credit balance and
 * no metered usage anywhere in the product: every LLM call runs on the key the
 * user installs here, billed by their provider, to them.
 *
 * Key handling rules, enforced by `@ct/shared/api/keys`:
 *  - the plaintext key goes out in a request BODY only, never a path or query
 *    param, and is never logged or echoed back;
 *  - the server returns a 4-character hint, so a configured key renders as
 *    `sk-…4f2a` and the full value is never in the DOM.
 *
 * The model pickers stay in their own dialog — they are per-provider and only
 * meaningful beside the key that authorises them.
 */
import { useCallback, useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import dayjs from 'dayjs'
import styled from 'styled-components'
import { BookOpen, Cpu, ExternalLink, KeyRound } from 'lucide-react'
import { Button, Dialog, Input, Select } from '@ledgr/ui'
import { api } from '@ct/shared/api/client'
import { knowledgeApi } from '@ct/shared/api/knowledge'
import { chatApi } from '@ct/shared/api/chat'
import {
  KEY_CONSOLE_URL, KEY_PROVIDER_LABEL, keysApi, maskedKey, type KeyProvider,
} from '@ct/shared/api/keys'
import { useAuthStore } from '@ct/shared/stores/authStore'
import { ModuleGrid, type ModuleSpec } from '@ct/shared/components/modules'
import { FieldError, useFieldErrors } from '@ct/shared/components/forms/fieldErrors'

const Form = styled.form`
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

const ConsoleLink = styled.a`
  font-size: ${({ theme }) => theme.typography.fontSize.xs};
  color: ${({ theme }) => theme.color.accent};
  text-decoration: none;
  display: inline-flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing[1]};
  &:hover { text-decoration: underline; }
`

const CurrentKey = styled.div`
  font-size: ${({ theme }) => theme.typography.fontSize.sm};
  color: ${({ theme }) => theme.color.foreground};
  background: ${({ theme }) => theme.color.muted};
  border-radius: ${({ theme }) => theme.radii.sm};
  padding: ${({ theme }) => `${theme.spacing[2]} ${theme.spacing[3]}`};
`

/* 'Auto' writes the same `system` value it always did — it means "use whichever
   key is installed", which is the only honest reading of it now that no server
   key exists to fall back on. */
const PROVIDERS = ['Auto', 'OpenAI', 'Anthropic']
const PROVIDER_VALUE: Record<string, string> = { Auto: 'system', OpenAI: 'openai', Anthropic: 'anthropic' }
const PROVIDER_LABEL: Record<string, string> = { system: 'Auto', openai: 'OpenAI', anthropic: 'Anthropic' }
const KEY_PROVIDERS: KeyProvider[] = ['openai', 'anthropic']

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
  const [modelsOpen, setModelsOpen] = useState(false)
  /** Which provider's key dialog is open. `null` = closed. */
  const [keyProvider, setKeyProvider] = useState<KeyProvider | null>(null)
  const [keyValue, setKeyValue] = useState('')

  /* The key form and the knowledge form each get their own error map — one
     shared map would let a stale message from one dialog mark a field in the
     other. */
  const keyErrors = useFieldErrors<'api_key'>('byok-key')
  const kbErrors = useFieldErrors<'path'>('knowledge-source')

  const [kbOpen, setKbOpen] = useState(false)
  const [kbType, setKbType] = useState<'obsidian' | 'notion'>('notion')
  const [kbPath, setKbPath] = useState('')
  const [kbInterval, setKbInterval] = useState('30')

  const { data: knowledge } = useQuery({ queryKey: ['knowledge', 'source'], queryFn: knowledgeApi.get })
  const { data: keys } = useQuery({ queryKey: ['api-keys'], queryFn: keysApi.list })
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
  const openKb = useCallback((type?: 'obsidian' | 'notion') => {
    setKbType(
      type
        ?? (knowledge?.source_type as 'obsidian' | 'notion' | undefined)
        ?? (knowledge?.folder_sync_available ? 'obsidian' : 'notion'),
    )
    setKbPath(knowledge?.config?.path ?? '')
    setKbInterval(String(knowledge?.sync_interval_minutes ?? 30))
    kbErrors.reset()
    setKbOpen(true)
  }, [knowledge, kbErrors])

  const openKeyDialog = useCallback((provider: KeyProvider) => {
    setKeyValue('')
    keyErrors.reset()
    setKeyProvider(provider)
  }, [keyErrors])

  const saveKey = useMutation({
    mutationFn: ({ provider, value }: { provider: KeyProvider; value: string }) =>
      keysApi.save(provider, value),
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: ['api-keys'] })
      setKeyProvider(null)
      setKeyValue('')
      keyErrors.reset()
      toast.success(`${KEY_PROVIDER_LABEL[vars.provider]} key saved`)
    },
    // The server answers 422 with a generic message on purpose — the offending
    // value must never come back to the client.
    onError: () => toast.error('That key was rejected — check you pasted all of it'),
  })

  const removeKey = useMutation({
    mutationFn: (provider: KeyProvider) => keysApi.remove(provider),
    onSuccess: (_data, provider) => {
      qc.invalidateQueries({ queryKey: ['api-keys'] })
      setKeyProvider(null)
      toast.success(`${KEY_PROVIDER_LABEL[provider]} key removed`)
    },
    onError: () => toast.error('Could not remove the key'),
  })

  const testKey = useMutation({
    mutationFn: (provider: KeyProvider) => keysApi.test(provider),
    onSuccess: (res) => {
      if (res.ok) toast.success('Key works — the provider accepted it')
      else toast.error('The provider rejected that key')
    },
    onError: () => toast.error('Could not reach the provider to test the key'),
  })

  const saveProfile = useMutation({
    mutationFn: (payload: Record<string, unknown>) => api.patch('/auth/profile', payload).then(r => r.data),
    onSuccess: (data) => {
      setUser(data)
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

  /*
   * `ApiKeyBody` is `Field(min_length=16, max_length=500)` server-side. Those
   * are the only two rules that exist, so they are the two checked here — and
   * neither message ever contains, or hints at, the value typed.
   */
  const submitKey = (e: React.FormEvent) => {
    e.preventDefault()
    if (!keyProvider) return
    const value = keyValue.trim()
    const ok = keyErrors.submit({
      api_key: value === ''
        ? 'Paste your API key.'
        : value.length < 16
          ? 'That looks too short to be a key — check you pasted all of it.'
          : value.length > 500
            ? 'That is longer than any provider key — check you pasted only the key.'
            : undefined,
    })
    if (ok) saveKey.mutate({ provider: keyProvider, value })
  }

  /* An Obsidian source without a path is a field problem; a Notion source
     takes no path at all, so the rule is conditional on the type. */
  const submitKnowledge = (e: React.FormEvent) => {
    e.preventDefault()
    const ok = kbErrors.submit({
      path: kbType === 'obsidian' && !kbPath.trim()
        ? 'Enter the folder to index.'
        : undefined,
    })
    if (ok) saveKnowledge.mutate()
  }

  const configuredKeys = keys ?? {}

  const modules = useMemo<ModuleSpec[]>(() => {
    const provider = user?.llm_provider || 'system'
    const openaiModels = models?.providers?.openai ?? []
    const claudeModels = models?.providers?.anthropic ?? []
    const activeModel = provider === 'anthropic'
      ? (user?.claude_model || claudeModels[0] || 'Provider default')
      : (user?.openai_chat_model || openaiModels[0] || 'Provider default')
    const configured = configuredKeys

    /*
     * NO `tiles` row (removed 2026-08-03). It restated provider, model, key
     * state and knowledge source — none of which a tile can change.
     */
    return [
      {
        kind: 'rows',
        span: 7,
        title: 'Your API keys',
        subtitle: 'Control Tower is free. AI runs on your own key, so your provider bills you directly — nothing is charged here.',
        icon: KeyRound,
        /* A row per provider, each one the button that installs, tests or
           removes that key. The stored key shows as its last 4 characters —
           the full value never leaves the provider and the server. */
        rows: KEY_PROVIDERS.map((k) => {
          const hint = configured[k]
          return {
            title: KEY_PROVIDER_LABEL[k],
            meta: hint
              ? 'Encrypted at rest. Click to replace, test or remove it.'
              : `Click to add a key — ${KEY_CONSOLE_URL[k].replace('https://', '')}`,
            value: hint ? maskedKey(k, hint) : 'Add key',
            valueKey: hint ? undefined : 'accent',
            tagLabel: hint ? 'Connected' : 'Not set',
            tagColorKey: hint ? 'success' : 'mutedFg',
            busy: saveKey.isPending || removeKey.isPending,
          }
        }),
        onRowClick: (i: number) => openKeyDialog(KEY_PROVIDERS[i]),
      },
      {
        kind: 'controls',
        span: 5,
        title: 'Model',
        subtitle: `Currently ${activeModel}`,
        icon: Cpu,
        action: 'Default models',
        onAction: () => setModelsOpen(true),
        rows: [
          {
            title: 'Provider',
            meta: 'Auto uses whichever key you have added — pick one to force it',
            control: 'segment',
            options: PROVIDERS,
            value: PROVIDER_LABEL[provider] ?? 'Auto',
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
            span: 12,
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
            span: 12,
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
  }, [user, keys, knowledge, models, saveProfile.isPending, saveKey.isPending, removeKey.isPending, toggleKnowledge.isPending, syncKnowledge.isPending])

  return (
    <>
      <ModuleGrid modules={modules} />

      {/* Per-provider key dialog. One provider at a time: a single form for
          both would make "remove" and "test" ambiguous, and the two keys are
          issued by two different companies with two different consoles. */}
      <Dialog
        open={keyProvider !== null}
        onOpenChange={(o) => !o && setKeyProvider(null)}
        icon={<KeyRound size={18} />}
        eyebrow="AI"
        title={keyProvider && configuredKeys[keyProvider] ? `Update your ${KEY_PROVIDER_LABEL[keyProvider]} key` : `Add your ${keyProvider ? KEY_PROVIDER_LABEL[keyProvider] : ''} key`}
        description="Your key, your bill. Control Tower charges nothing for AI — the provider bills you directly for what you use. The key is encrypted at rest, never shown again, and never leaves this account."
      >
        {keyProvider && (
          <Form noValidate onSubmit={submitKey}>
            {configuredKeys[keyProvider] && (
              <div>
                <Label>Current key</Label>
                <CurrentKey>{maskedKey(keyProvider, configuredKeys[keyProvider] as string)}</CurrentKey>
              </div>
            )}
            <div>
              <Label htmlFor="byok-key-input">{configuredKeys[keyProvider] ? 'Replace with a new key' : `${KEY_PROVIDER_LABEL[keyProvider]} API key`}</Label>
              <Input
                id="byok-key-input"
                type="password"
                autoComplete="off"
                value={keyValue}
                {...keyErrors.fieldProps('api_key')}
                onChange={(e: any) => { keyErrors.clearField('api_key'); setKeyValue(e.target.value) }}
                placeholder={keyProvider === 'anthropic' ? 'sk-ant-…' : 'sk-…'}
              />
              <FieldError id={keyErrors.errorId('api_key')}>{keyErrors.errors.api_key}</FieldError>
              <Hint>
                <ConsoleLink href={KEY_CONSOLE_URL[keyProvider]} target="_blank" rel="noreferrer noopener">
                  Get a key from {KEY_PROVIDER_LABEL[keyProvider]} <ExternalLink size={12} />
                </ConsoleLink>
              </Hint>
            </div>
            <Actions>
              {/* The button used to be `disabled` below 16 characters, which is
                  the server's own `min_length` — but a dead button explains
                  nothing. It submits now and the length rule reports itself on
                  the field. The key is never rendered back, logged, or put in
                  the message. */}
              <Button type="submit" variant="primary" loading={saveKey.isPending}>
                Save key
              </Button>
              {configuredKeys[keyProvider] && (
                <Button
                  type="button"
                  variant="outline"
                  loading={testKey.isPending}
                  onClick={() => testKey.mutate(keyProvider)}
                >
                  Test key
                </Button>
              )}
              <Button type="button" variant="ghost" onClick={() => setKeyProvider(null)}>Cancel</Button>
              <Spacer />
              {configuredKeys[keyProvider] && (
                <Button
                  type="button"
                  variant="destructive"
                  loading={removeKey.isPending}
                  onClick={() => removeKey.mutate(keyProvider)}
                >
                  Remove
                </Button>
              )}
            </Actions>
          </Form>
        )}
      </Dialog>

      <Dialog
        open={modelsOpen}
        onOpenChange={(o) => !o && setModelsOpen(false)}
        icon={<Cpu size={18} />}
        eyebrow="AI"
        title="Default models"
        description="Which model each provider uses when nothing else is specified. Both are billed by that provider on your own key."
      >
        {/* No submit — each Select writes on change, so this box is not a form. */}
        <Form as="div">
          <div>
            <Label>Default OpenAI model</Label>
            <Select
              fullWidth
              value={user?.openai_chat_model || ''}
              onChange={(v: any) => saveProfile.mutate({ openai_chat_model: String(v) })}
              options={[{ value: '', label: 'Provider default' }, ...(models?.providers?.openai ?? []).map(m => ({ value: m, label: m }))]}
            />
          </div>
          <div>
            <Label>Default Anthropic model</Label>
            <Select
              fullWidth
              value={user?.claude_model || ''}
              onChange={(v: any) => saveProfile.mutate({ claude_model: String(v) })}
              options={[{ value: '', label: 'Provider default' }, ...(models?.providers?.anthropic ?? []).map(m => ({ value: m, label: m }))]}
            />
          </div>
          <Actions>
            <Button variant="ghost" onClick={() => setModelsOpen(false)}>Close</Button>
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
        <Form noValidate onSubmit={submitKnowledge}>
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
              <Label htmlFor="knowledge-path-input">Vault folder path</Label>
              <Input
                id="knowledge-path-input"
                value={kbPath}
                {...kbErrors.fieldProps('path')}
                onChange={(e: any) => { kbErrors.clearField('path'); setKbPath(e.target.value) }}
                placeholder="/Users/you/Documents/Vault"
              />
              <FieldError id={kbErrors.errorId('path')}>{kbErrors.errors.path}</FieldError>
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
            <Button type="submit" variant="primary" loading={saveKnowledge.isPending}>
              {knowledge?.configured ? 'Save changes' : 'Connect'}
            </Button>
            <Button type="button" variant="ghost" onClick={() => setKbOpen(false)}>Cancel</Button>
            <Spacer />
            {knowledge?.configured && (
              <Button
                type="button"
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
