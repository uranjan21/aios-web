import { useEffect, useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Save, RefreshCw, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { knowledgeApi } from '@ct/shared/api/knowledge'
import { Select, Switch, Input, SegmentedControl, Button } from '@ledgr/ui'
import { RowRoot, RowLabel, Section } from '../shared'

// ── Knowledge Base ────────────────────────────────────────────────────────────

const INTERVAL_OPTIONS = [
  { value: '15', label: 'Every 15 min' },
  { value: '30', label: 'Every 30 min' },
  { value: '60', label: 'Every hour' },
  { value: '360', label: 'Every 6 hours' },
  { value: '1440', label: 'Once a day' },
]

export function KnowledgeSection() {
  const queryClient = useQueryClient()
  const { data: src } = useQuery({
    queryKey: ['knowledge', 'source'],
    queryFn: knowledgeApi.get,
  })

  const [sourceType, setSourceType] = useState<'obsidian' | 'notion'>('obsidian')
  const [path, setPath] = useState('')
  const [intervalMin, setIntervalMin] = useState('30')

  useEffect(() => {
    if (!src) return
    if (src.source_type) setSourceType(src.source_type)
    else if (!src.folder_sync_available) setSourceType('notion')
    setPath(src.config?.path ?? '')
    setIntervalMin(String(src.sync_interval_minutes ?? 30))
  }, [src])

  const saveMutation = useMutation({
    mutationFn: knowledgeApi.save,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['knowledge', 'source'] })
      toast.success('Knowledge base saved')
    },
    onError: (err: any) => toast.error(err?.response?.data?.detail || 'Could not save knowledge base'),
  })

  const syncMutation = useMutation({
    mutationFn: knowledgeApi.syncNow,
    onSuccess: () => {
      toast.success('Sync started — this can take a minute')
      setTimeout(() => queryClient.invalidateQueries({ queryKey: ['knowledge', 'source'] }), 5000)
    },
    onError: (err: any) => toast.error(err?.response?.data?.detail || 'Could not start sync'),
  })

  const unlinkMutation = useMutation({
    mutationFn: knowledgeApi.remove,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['knowledge', 'source'] })
      setPath('')
      setIntervalMin('30')
      toast.success('Knowledge source unlinked')
    },
    onError: (err: any) => toast.error(err?.response?.data?.detail || 'Could not unlink knowledge source'),
  })

  if (!src) return null

  const sourceOptions = [
    ...(src.folder_sync_available ? [{ value: 'obsidian', label: 'Obsidian folder' }] : []),
    { value: 'notion', label: 'Notion' },
  ]

  const save = () =>
    saveMutation.mutate({
      source_type: sourceType,
      config: sourceType === 'obsidian' ? { path } : {},
      sync_interval_minutes: Number(intervalMin),
      enabled: src.enabled ?? true,
    })

  return (
    <Section title="Knowledge Base">
      <div style={{ padding: '0 20px 20px' }}>
        <p style={{ fontSize: 13, color: 'var(--muted-foreground)', marginBottom: 20 }}>
          Point Control Tower at your source of truth — an Obsidian vault folder (self-hosted) or your
          Notion workspace. Notes are pulled on a schedule and become searchable by chat and your agents.
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <RowRoot style={{ padding: 0 }}>
            <div>
              <RowLabel>Source</RowLabel>
              <div style={{ fontSize: 12, color: 'var(--muted-foreground)' }}>
                {sourceType === 'notion'
                  ? 'Requires the Notion integration (Integrations page)'
                  : 'A folder on this machine containing your .md notes'}
              </div>
            </div>
            <SegmentedControl
              size="sm"
              aria-label="Knowledge base source"
              value={sourceType}
              onChange={(v) => setSourceType(v as 'obsidian' | 'notion')}
              options={sourceOptions}
            />
          </RowRoot>
          {sourceType === 'obsidian' && (
            <div>
              <RowLabel>Vault folder path</RowLabel>
              <div style={{ marginTop: 6 }}>
                <Input
                  size="sm"
                  value={path}
                  onChange={e => setPath(e.target.value)}
                  placeholder="~/Documents/MyVault"
                  aria-label="Obsidian vault folder path"
                />
              </div>
            </div>
          )}
          <RowRoot style={{ padding: 0 }}>
            <div>
              <RowLabel>Pull frequency</RowLabel>
              <div style={{ fontSize: 12, color: 'var(--muted-foreground)' }}>How often changes are pulled in</div>
            </div>
            <Select
              size="sm"
              fullWidth={false}
              aria-label="Knowledge base pull frequency"
              value={intervalMin}
              onChange={v => setIntervalMin(String(v))}
              options={INTERVAL_OPTIONS}
            />
          </RowRoot>
          {src.configured && (
            <RowRoot style={{ padding: 0 }}>
              <div>
                <RowLabel>Enabled</RowLabel>
                <div style={{ fontSize: 12, color: 'var(--muted-foreground)' }}>Pause without losing the configuration</div>
              </div>
              <Switch
                checked={src.enabled ?? true}
                onChange={() =>
                  saveMutation.mutate({
                    source_type: src.source_type!,
                    config: src.config,
                    sync_interval_minutes: src.sync_interval_minutes,
                    enabled: !(src.enabled ?? true),
                  })
                }
                aria-label="Toggle knowledge base sync"
              />
            </RowRoot>
          )}
          {src.configured && (
            <RowRoot style={{ padding: 0 }}>
              <div>
                <RowLabel>Connection</RowLabel>
                <div style={{ fontSize: 12, color: 'var(--muted-foreground)' }}>
                  {src.source_type === 'obsidian' ? src.config?.path : 'Notion workspace'}
                </div>
              </div>
              <span style={{ fontSize: 12, color: src.last_status === 'error' ? 'var(--destructive)' : 'var(--muted-foreground)' }}>
                {src.last_status === 'error'
                  ? src.last_error || 'Sync failed'
                  : src.last_synced_at
                    ? `Last synced ${new Date(src.last_synced_at + 'Z').toLocaleString()}`
                    : 'Not synced yet'}
              </span>
            </RowRoot>
          )}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <Button size="sm" onClick={save} disabled={saveMutation.isPending || (sourceType === 'obsidian' && !path.trim())}>
              <Save size={14} style={{ marginRight: 4 }} />
              {saveMutation.isPending ? 'Saving…' : 'Save'}
            </Button>
            {src.configured && (
              <Button size="sm" variant="secondary" onClick={() => syncMutation.mutate()} disabled={syncMutation.isPending}>
                <RefreshCw size={14} style={{ marginRight: 4 }} />
                {syncMutation.isPending ? 'Starting…' : 'Sync now'}
              </Button>
            )}
            {src.configured && (
              <Button size="sm" variant="ghost" onClick={() => unlinkMutation.mutate()} disabled={unlinkMutation.isPending}>
                <Trash2 size={14} style={{ marginRight: 4 }} />
                {unlinkMutation.isPending ? 'Unlinking…' : 'Unlink'}
              </Button>
            )}
          </div>
        </div>
      </div>
    </Section>
  )
}
