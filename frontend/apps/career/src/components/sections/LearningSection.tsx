/**
 * Career → Learning.
 *
 * Career could record that learning HAPPENED — a `CareerEvent` with
 * `event_type="learning"`, a dated line of text — but not what was being
 * learned, how far through it you were, or whether it ever finished.
 *
 * The link to a skill is the point. `SkillInventory.level` has a `day_0` rung
 * meaning "want to learn"; attaching a resource to that row is what turns a
 * named gap into a plan for it, and it is why this page leads with how many
 * of your Day-0 skills currently have something being done about them.
 */
import { useCallback, useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import styled from 'styled-components'
import { Button, Card, Dialog, EmptyState, Input, SegmentedControl, Select, SkeletonPage } from '@ledgr/ui'
import { BookOpen, GraduationCap, Layers, Trash2 } from 'lucide-react'
import { careerApi, type LearningResource } from '@ct/shared/api/areas'
import { ModuleGrid, type ModuleSpec } from '@ct/shared/components/modules'
import { FieldError, useFieldErrors } from '@ct/shared/components/forms/fieldErrors'
import { Popconfirm } from '@ct/shared/components/ui/Popconfirm'

const Root = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.spacing[5]};
`

const Form = styled.form`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.spacing[3]};
  margin-top: ${({ theme }) => theme.spacing[3]};
`

const Label = styled.label`
  font-size: ${({ theme }) => theme.typography.fontSize.xs};
  color: ${({ theme }) => theme.color.mutedForeground};
  margin-bottom: ${({ theme }) => theme.spacing[1]};
  display: block;
`

const Pair = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: ${({ theme }) => theme.spacing[3]};

  @media ${({ theme }) => theme.media.belowSm} {
    grid-template-columns: 1fr;
  }
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

const STATUS_META: Record<string, { label: string; colorKey: string }> = {
  planned: { label: 'Planned', colorKey: 'mutedFg' },
  in_progress: { label: 'In progress', colorKey: 'health' },
  completed: { label: 'Completed', colorKey: 'success' },
  abandoned: { label: 'Dropped', colorKey: 'warning' },
}

const KIND_OPTIONS = [
  { value: 'course', label: 'Course' },
  { value: 'book', label: 'Book' },
  { value: 'article', label: 'Article' },
  { value: 'video', label: 'Video' },
  { value: 'other', label: 'Other' },
]

const STATUS_OPTIONS = Object.entries(STATUS_META).map(([value, m]) => ({ value, label: m.label }))

const NO_SKILL = '__none__'
type Filter = 'active' | 'all' | 'done'

const EMPTY = {
  title: '', kind: 'course', provider: '', url: '',
  status: 'planned', progress_pct: '0', skill_id: NO_SKILL, notes: '',
}

export function LearningSection() {
  const qc = useQueryClient()
  const [filter, setFilter] = useState<Filter>('active')
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<LearningResource | null>(null)
  const [form, setForm] = useState({ ...EMPTY })
  const f = useFieldErrors<'title' | 'progress_pct' | 'url'>('learning')

  const { data: resources, isLoading } = useQuery({
    queryKey: ['career', 'learning'],
    queryFn: careerApi.learning,
    staleTime: 60_000,
  })
  const { data: skills } = useQuery({
    queryKey: ['career', 'skills'],
    queryFn: careerApi.skills,
    staleTime: 60_000,
  })

  const all = useMemo(() => resources ?? [], [resources])
  const visible = useMemo(() => {
    if (filter === 'done') return all.filter(r => r.status === 'completed')
    // "Active" hides finished AND dropped: both are closed, and a dropped
    // course sitting in the working list is noise.
    if (filter === 'active') return all.filter(r => r.status === 'planned' || r.status === 'in_progress')
    return all
  }, [all, filter])

  const openNew = useCallback(() => { f.reset(); setEditing(null); setForm({ ...EMPTY }); setOpen(true) }, [f])
  const openEdit = useCallback((r: LearningResource) => {
    f.reset()
    setEditing(r)
    setForm({
      title: r.title, kind: r.kind, provider: r.provider ?? '', url: r.url ?? '',
      status: r.status, progress_pct: String(r.progress_pct),
      skill_id: r.skill_id ?? NO_SKILL, notes: r.notes ?? '',
    })
    setOpen(true)
  }, [f])

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ['career', 'learning'] })
    qc.invalidateQueries({ queryKey: ['career', 'skills'] })
  }

  /*
   * `progress_pct` is `int = 0` server-side and the handler CLAMPS it with
   * `max(0, min(100, …))` — so 500 is accepted and silently stored as 100,
   * and `Number(x) || 0` here turns any non-number into 0. Neither is a
   * message; both are now refused on the field instead.
   */
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const pct = form.progress_pct.trim() === '' ? 0 : Number(form.progress_pct)
    const link = form.url.trim()
    const ok = f.submit({
      title: form.title.trim() ? undefined : 'Give it a title.',
      progress_pct: !Number.isFinite(pct)
        ? 'Enter a number between 0 and 100.'
        : pct < 0 || pct > 100
          ? 'Progress runs from 0 to 100.'
          : undefined,
      url: link === '' || /^https?:\/\/\S+$/.test(link)
        ? undefined
        : 'Enter a full http:// or https:// link, or leave this blank.',
    })
    if (ok) save.mutate()
  }

  const save = useMutation({
    mutationFn: () => {
      const payload = {
        title: form.title.trim(),
        kind: form.kind,
        provider: form.provider.trim() || null,
        url: form.url.trim() || null,
        status: form.status,
        progress_pct: Number(form.progress_pct) || 0,
        skill_id: form.skill_id === NO_SKILL ? null : form.skill_id,
        notes: form.notes.trim() || null,
      }
      return editing ? careerApi.patchLearning(editing.id, payload) : careerApi.createLearning(payload)
    },
    onSuccess: () => { invalidate(); toast.success(editing ? 'Updated' : 'Added'); setOpen(false) },
    onError: (e: any) => toast.error(e?.response?.data?.detail || 'Failed to save'),
  })

  const remove = useMutation({
    mutationFn: (id: string) => careerApi.deleteLearning(id),
    onSuccess: () => { invalidate(); toast.success('Removed'); setOpen(false) },
    onError: () => toast.error('Failed to remove'),
  })

  const modules = useMemo<ModuleSpec[]>(() => {
    if (!all.length) return []

    const active = all.filter(r => r.status === 'in_progress')
    const done = all.filter(r => r.status === 'completed')
    const gaps = (skills ?? []).filter(s => s.level === 'day_0')
    const coveredGaps = gaps.filter(s => all.some(r => r.skill_id === s.id && r.status !== 'abandoned'))

    const byKind = all.reduce<Record<string, number>>((acc, r) => {
      acc[r.kind] = (acc[r.kind] ?? 0) + 1
      return acc
    }, {})

    return [
      {
        kind: 'tiles',
        span: 12,
        tiles: [
          { label: 'In progress', value: String(active.length), sub: active.length ? 'Being worked through' : 'Nothing started' },
          { label: 'Completed', value: String(done.length), sub: 'Finished resources', subKey: done.length ? 'success' : 'mutedFg' },
          {
            /* The whole reason `skill_id` exists: how much of the stated gap
               is actually being acted on. NULL-safe — with no Day-0 skills
               there is no ratio to report, and 0/0 would read as failure. */
            label: 'Gaps covered',
            value: gaps.length ? `${coveredGaps.length}/${gaps.length}` : '—',
            sub: gaps.length ? 'Day-0 skills with a resource' : 'No Day-0 skills to cover',
            subKey: gaps.length && coveredGaps.length === gaps.length ? 'success' : gaps.length ? 'warning' : 'mutedFg',
          },
          { label: 'Tracked', value: String(all.length), sub: `${Object.keys(byKind).length} kind${Object.keys(byKind).length === 1 ? '' : 's'}` },
        ],
      },
      {
        kind: 'progress',
        span: 12,
        title: filter === 'done' ? 'Completed' : filter === 'active' ? 'Working through' : 'All learning',
        subtitle: visible.length === 0
          ? 'Nothing matches this filter'
          : `${visible.length} resource${visible.length === 1 ? '' : 's'} · click one to update it`,
        icon: BookOpen,
        actionNode: (
          <SegmentedControl
            size="sm"
            aria-label="Filter learning"
            value={filter}
            onChange={(v: any) => setFilter(v as Filter)}
            options={[
              { label: 'Active', value: 'active' },
              { label: 'Done', value: 'done' },
              { label: 'All', value: 'all' },
            ]}
          />
        ),
        action: '+ Add',
        actionVariant: 'primary',
        onAction: openNew,
        onRowClick: (i: number) => openEdit(visible[i]),
        rows: visible.map(r => {
          const meta = STATUS_META[r.status] ?? STATUS_META.planned
          return {
            title: r.title,
            meta: [
              KIND_OPTIONS.find(k => k.value === r.kind)?.label ?? r.kind,
              r.provider,
              r.skill_name ? `for ${r.skill_name}` : null,
            ].filter(Boolean).join(' · '),
            value: meta.label,
            valueKey: meta.colorKey,
            pct: r.progress_pct,
            colorKey: meta.colorKey,
          }
        }),
      },
    ]
     
  }, [all, visible, skills, filter, openNew, openEdit])

  if (isLoading) return <SkeletonPage kpis={4} modules={[7, 5]} />

  return (
    <Root>
      {all.length === 0 ? (
        <Card title="Learning" subtitle="Courses, books and everything else you are working through" icon={<GraduationCap size={16} />}>
          <EmptyState
            icon={<Layers size={20} />}
            title="Nothing tracked yet"
            description="Add a course or book — link it to a Day-0 skill and the gap turns into a plan."
            action={<Button size="sm" variant="primary" onClick={openNew}>Add a resource</Button>}
          />
        </Card>
      ) : (
        <ModuleGrid modules={modules} />
      )}

      <Dialog
        open={open}
        icon={<GraduationCap size={18} />}
        eyebrow="Career"
        title={editing ? `Edit — ${editing.title}` : 'Add a resource'}
        onOpenChange={(o) => { if (!o) setOpen(false) }}
        size="md"
      >
        <Form noValidate onSubmit={handleSubmit}>
          <div>
            <Label>Title</Label>
            <Input value={form.title} {...f.fieldProps('title')} onChange={(e: any) => { f.clearField('title'); setForm(prev => ({ ...prev, title: e.target.value })) }} placeholder="Certified Kubernetes Administrator" autoFocus />
            <FieldError id={f.errorId('title')}>{f.errors.title}</FieldError>
          </div>

          <Pair>
            <div>
              <Label>Kind</Label>
              <Select fullWidth value={form.kind} onChange={(v: any) => setForm(f => ({ ...f, kind: String(v) }))} options={KIND_OPTIONS} />
            </div>
            <div>
              <Label>Provider</Label>
              <Input value={form.provider} onChange={(e: any) => setForm(f => ({ ...f, provider: e.target.value }))} placeholder="Linux Foundation" />
            </div>
          </Pair>

          <div>
            <Label>Skill it builds — links this to your gap list</Label>
            <Select
              fullWidth
              value={form.skill_id}
              onChange={(v: any) => setForm(f => ({ ...f, skill_id: String(v) }))}
              options={[
                { value: NO_SKILL, label: 'Not tied to a skill' },
                ...(skills ?? []).map(s => ({
                  value: s.id,
                  label: s.level === 'day_0' ? `${s.skill_name} — Day 0` : s.skill_name,
                })),
              ]}
            />
          </div>

          <Pair>
            <div>
              <Label>Status</Label>
              <Select fullWidth value={form.status} onChange={(v: any) => setForm(f => ({ ...f, status: String(v) }))} options={STATUS_OPTIONS} />
            </div>
            <div>
              <Label>Progress %{form.status === 'completed' ? ' — forced to 100 when completed' : ''}</Label>
              <Input
                type="number" min="0" max="100" step="5"
                value={form.progress_pct}
                {...f.fieldProps('progress_pct')}
                onChange={(e: any) => { f.clearField('progress_pct'); setForm(prev => ({ ...prev, progress_pct: e.target.value })) }}
                disabled={form.status === 'completed'}
              />
              <FieldError id={f.errorId('progress_pct')}>{f.errors.progress_pct}</FieldError>
            </div>
          </Pair>

          <div>
            <Label>Link</Label>
            <Input value={form.url} {...f.fieldProps('url')} onChange={(e: any) => { f.clearField('url'); setForm(prev => ({ ...prev, url: e.target.value })) }} placeholder="https://…" />
            <FieldError id={f.errorId('url')}>{f.errors.url}</FieldError>
          </div>

          <div>
            <Label>Notes</Label>
            <Input value={form.notes} onChange={(e: any) => setForm(f => ({ ...f, notes: e.target.value }))} placeholder="Optional" />
          </div>

          <Actions>
            <Button variant="primary" type="submit" loading={save.isPending}>{editing ? 'Save' : 'Add'}</Button>
            <Button variant="ghost" type="button" onClick={() => setOpen(false)}>Cancel</Button>
            {editing && (
              <>
                <Spacer />
                <Popconfirm
                  title="Remove this resource?"
                  onConfirm={() => remove.mutate(editing.id)}
                  okText="Remove" cancelText="Cancel" okButtonProps={{ danger: true }}
                >
                  <Button variant="destructive" type="button" size="sm" loading={remove.isPending}>
                    <Trash2 size={14} style={{ marginRight: 4 }} /> Remove
                  </Button>
                </Popconfirm>
              </>
            )}
          </Actions>
        </Form>
      </Dialog>
    </Root>
  )
}
