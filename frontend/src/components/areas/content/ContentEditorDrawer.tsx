import { useState, useEffect } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Sheet, Input, Textarea, Select, SelectItem, Button } from '@ledgr/ui'
import { toast } from 'sonner'
import { WandSparkles, Save, Trash2, BarChart3 } from 'lucide-react'
import styled from 'styled-components'
import { contentApi, aiApi } from '@/api/areas'
import { is402 } from '@/components/UpgradeWall'
import { UpgradeWall } from '@/components/UpgradeWall'
import type { ContentItem, ContentCampaign, ContentStatus } from '@/types'
import { PLATFORMS, PLATFORM_META, CONTENT_TYPES, STATUS_LABELS } from './contentMeta'

const Form = styled.div`
  display: flex;
  flex-direction: column;
  gap: 16px;
  padding-bottom: 24px;
`

const Field = styled.div`
  display: flex;
  flex-direction: column;
  gap: 6px;
`

const Label = styled.label`
  font-size: 12px;
  font-weight: 600;
  color: ${({ theme }) => theme.color.mutedForeground};
  text-transform: uppercase;
  letter-spacing: 0.04em;
`

const Row = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
`

const BodyHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
`

const MetricsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 12px;
`

const SectionTitle = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  font-weight: 600;
  color: ${({ theme }) => theme.color.foreground};
  margin-top: 4px;
  padding-top: 12px;
  border-top: 1px solid ${({ theme }) => theme.color.border};
`

const Footer = styled.div`
  display: flex;
  justify-content: space-between;
  gap: 8px;
  position: sticky;
  bottom: 0;
  background: ${({ theme }) => theme.color.card};
  padding: 12px 0 0;
  border-top: 1px solid ${({ theme }) => theme.color.border};
`

interface FormState {
  title: string
  platform: ContentItem['platform']
  content_type: string
  status: ContentStatus
  priority: ContentItem['priority']
  pillar: string
  campaign_id: string
  tags: string
  body: string
  notes: string
  publish_date: string
  url: string
  views: number
  likes: number
  comments: number
  shares: number
}

const EMPTY: FormState = {
  title: '', platform: 'linkedin', content_type: 'post', status: 'idea', priority: 'medium',
  pillar: '', campaign_id: '', tags: '', body: '', notes: '', publish_date: '', url: '',
  views: 0, likes: 0, comments: 0, shares: 0,
}

function fromItem(item: ContentItem): FormState {
  return {
    title: item.title,
    platform: item.platform,
    content_type: item.content_type ?? 'post',
    status: item.status,
    priority: item.priority ?? 'medium',
    pillar: item.pillar ?? '',
    campaign_id: item.campaign_id ?? '',
    tags: item.tags ?? '',
    body: item.body ?? '',
    notes: item.notes ?? '',
    publish_date: item.publish_date ?? '',
    url: item.url ?? '',
    views: item.views ?? 0,
    likes: item.likes ?? 0,
    comments: item.comments ?? 0,
    shares: item.shares ?? 0,
  }
}

export function ContentEditorDrawer({ open, item, campaigns, onClose }: {
  open: boolean
  item: ContentItem | null
  campaigns: ContentCampaign[]
  onClose: () => void
}) {
  const queryClient = useQueryClient()
  const [form, setForm] = useState<FormState>(EMPTY)
  const [planBlocked, setPlanBlocked] = useState(false)

  useEffect(() => {
    if (open) {
      setForm(item ? fromItem(item) : EMPTY)
      setPlanBlocked(false)
    }
  }, [open, item])

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm(f => ({ ...f, [key]: value }))

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['content', 'items'] })
    queryClient.invalidateQueries({ queryKey: ['content', 'stats'] })
    queryClient.invalidateQueries({ queryKey: ['content', 'campaigns'] })
  }

  const payload = () => ({
    title: form.title.trim(),
    platform: form.platform,
    content_type: form.content_type,
    status: form.status,
    priority: form.priority,
    pillar: form.pillar.trim() || null,
    campaign_id: form.campaign_id || null,
    tags: form.tags.trim() || null,
    body: form.body || null,
    notes: form.notes || null,
    publish_date: form.publish_date || null,
    url: form.url.trim() || null,
    views: Number(form.views) || 0,
    likes: Number(form.likes) || 0,
    comments: Number(form.comments) || 0,
    shares: Number(form.shares) || 0,
  })

  const save = useMutation({
    mutationFn: () => item
      ? contentApi.patchItem(item.id, payload())
      : contentApi.createItem(payload()),
    onSuccess: () => { invalidate(); toast.success(item ? 'Content updated' : 'Content created'); onClose() },
    onError: () => toast.error('Failed to save content'),
  })

  const remove = useMutation({
    mutationFn: () => contentApi.deleteItem(item!.id),
    onSuccess: () => { invalidate(); toast.success('Content deleted'); onClose() },
    onError: () => toast.error('Failed to delete'),
  })

  const draft = useMutation({
    mutationFn: () => aiApi.draft(form.title, form.platform, form.notes || undefined),
    onSuccess: (data) => { set('body', data.text); toast.success('Draft generated') },
    onError: (err) => {
      if (is402(err)) { setPlanBlocked(true); return }
      toast.error('AI temporarily unavailable')
    },
  })

  const handleSave = () => {
    if (!form.title.trim()) { toast.error('Title is required'); return }
    save.mutate()
  }

  return (
    <Sheet
      open={open}
      onOpenChange={(v) => { if (!v) onClose() }}
      side="right"
      size="560px"
      title={item ? 'Edit Content' : 'New Content'}
      description={item ? 'Update body, schedule, metrics and organisation' : 'Capture a new piece of content'}
    >
      <Form>
        <Field>
          <Label>Title</Label>
          <Input
            aria-label="Title"
            placeholder="What's the hook / working title?"
            value={form.title}
            onChange={e => set('title', e.target.value)}
            size="lg"
          />
        </Field>

        <Row>
          <Field>
            <Label>Platform</Label>
            <Select aria-label="Platform" value={form.platform} onChange={v => set('platform', v as ContentItem['platform'])}>
              {PLATFORMS.map(p => <SelectItem key={p} value={p}>{PLATFORM_META[p].label}</SelectItem>)}
            </Select>
          </Field>
          <Field>
            <Label>Type</Label>
            <Select aria-label="Content type" value={form.content_type} onChange={v => set('content_type', v as string)}>
              {CONTENT_TYPES.map(t => <SelectItem key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</SelectItem>)}
            </Select>
          </Field>
        </Row>

        <Row>
          <Field>
            <Label>Status</Label>
            <Select aria-label="Status" value={form.status} onChange={v => set('status', v as ContentStatus)}>
              {(Object.keys(STATUS_LABELS) as ContentStatus[]).map(s => (
                <SelectItem key={s} value={s}>{STATUS_LABELS[s]}</SelectItem>
              ))}
            </Select>
          </Field>
          <Field>
            <Label>Priority</Label>
            <Select aria-label="Priority" value={form.priority} onChange={v => set('priority', v as ContentItem['priority'])}>
              <SelectItem value="low">Low</SelectItem>
              <SelectItem value="medium">Medium</SelectItem>
              <SelectItem value="high">High</SelectItem>
            </Select>
          </Field>
        </Row>

        <Row>
          <Field>
            <Label>Pillar</Label>
            <Input aria-label="Pillar" placeholder="e.g. AI, Geopolitics" value={form.pillar} onChange={e => set('pillar', e.target.value)} />
          </Field>
          <Field>
            <Label>Campaign</Label>
            <Select aria-label="Campaign" value={form.campaign_id} onChange={v => set('campaign_id', v as string)}>
              <SelectItem value="">— None —</SelectItem>
              {campaigns.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
            </Select>
          </Field>
        </Row>

        <Field>
          <Label>Tags</Label>
          <Input aria-label="Tags" placeholder="comma, separated, tags" value={form.tags} onChange={e => set('tags', e.target.value)} />
        </Field>

        <Field>
          <BodyHeader>
            <Label>Body</Label>
            <Button
              variant="outline"
              size="sm"
              startIcon={<WandSparkles size={13} />}
              loading={draft.isPending}
              onClick={() => form.title.trim() ? draft.mutate() : toast.error('Add a title first')}
            >
              Draft with AI
            </Button>
          </BodyHeader>
          {planBlocked ? (
            <UpgradeWall feature="AI content drafts" />
          ) : (
            <Textarea
              aria-label="Body"
              placeholder="Write your content here, or generate a draft with AI…"
              value={form.body}
              onChange={e => set('body', e.target.value)}
              rows={8}
            />
          )}
        </Field>

        <Row>
          <Field>
            <Label>Publish date</Label>
            <Input aria-label="Publish date" type="date" value={form.publish_date} onChange={e => set('publish_date', e.target.value)} />
          </Field>
          <Field>
            <Label>Live URL</Label>
            <Input aria-label="URL" placeholder="https://…" value={form.url} onChange={e => set('url', e.target.value)} />
          </Field>
        </Row>

        <Field>
          <Label>Notes</Label>
          <Textarea aria-label="Notes" placeholder="Internal notes, references, angles…" value={form.notes} onChange={e => set('notes', e.target.value)} rows={3} />
        </Field>

        <SectionTitle><BarChart3 size={15} /> Engagement metrics</SectionTitle>
        <MetricsGrid>
          {(['views', 'likes', 'comments', 'shares'] as const).map(m => (
            <Field key={m}>
              <Label>{m}</Label>
              <Input
                aria-label={m}
                type="number"
                value={String(form[m])}
                onChange={e => set(m, Number(e.target.value) as FormState[typeof m])}
              />
            </Field>
          ))}
        </MetricsGrid>

        <Footer>
          {item ? (
            <Button variant="ghost" startIcon={<Trash2 size={14} />} loading={remove.isPending} onClick={() => remove.mutate()}>
              Delete
            </Button>
          ) : <span />}
          <div style={{ display: 'flex', gap: 8 }}>
            <Button variant="ghost" onClick={onClose}>Cancel</Button>
            <Button variant="primary" startIcon={<Save size={14} />} loading={save.isPending} onClick={handleSave}>
              {item ? 'Save' : 'Create'}
            </Button>
          </div>
        </Footer>
      </Form>
    </Sheet>
  )
}
