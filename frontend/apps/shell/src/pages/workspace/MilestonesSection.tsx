/**
 * Workspace → Milestones.
 *
 * The first page built the Phase 4 way: it takes the redesign canvas's module
 * COMPOSITION for `workspace:milestones` and rebuilds the module specs from
 * live API data instead of the designer's sample rows. The canvas grouped
 * milestones by period with a domain chip, due date and status — that is what
 * `timeline` and `table` render, so the page is a data transform plus
 * `ModuleGrid`, with no layout code of its own.
 */
import { useCallback, useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Milestone as MilestoneIcon, Flag, Trash2 } from 'lucide-react'
import { Button, Card, Dialog, EmptyState, ErrorState, Input, Select, SkeletonPage } from '@ledgr/ui'
import { ModuleGrid, type ModuleSpec } from '@ct/shared/components/modules'
import { workspaceApi, type Milestone } from '@ct/shared/api/workspace'
import { DOMAIN_OPTIONS } from '@ct/shared/config/domains'
import { daysUntil, fromCalendarDate } from '@ct/shared/lib/calendarDate'
import { toast } from 'sonner'
import { FieldError, useFieldErrors } from '@ct/shared/components/forms/fieldErrors'

/** ledgr-ui Input/Select take no `label` prop — the caller owns the label. */
function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <span style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', opacity: 0.7 }}>
        {label}
      </span>
      {children}
    </label>
  )
}

const STATUS_LABEL: Record<Milestone['status'], string> = {
  upcoming: 'Upcoming',
  at_risk: 'At risk',
  hit: 'Hit',
  missed: 'Missed',
}

/** Status → the palette slot the module renderer resolves. */
const STATUS_KEY: Record<Milestone['status'], string> = {
  upcoming: 'info',
  at_risk: 'warning',
  hit: 'success',
  missed: 'destructive',
}

const STATUS_OPTIONS = (Object.keys(STATUS_LABEL) as Milestone['status'][]).map((v) => ({
  value: v,
  label: STATUS_LABEL[v],
}))

// Date-only values are parsed as LOCAL days — `new Date('2026-08-09')` is UTC
// midnight, which renders as the 8th anywhere west of UTC.
const fmtDate = (iso?: string | null) =>
  iso
    ? fromCalendarDate(iso).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })
    : 'No date'

const daysAway = daysUntil

/**
 * Buckets the canvas grouped by: the next 30 days, the quarter, then
 * everything further out. Undated milestones land in "No date" so they stay
 * visible rather than sorting into a misleading bucket.
 */
function bucketOf(m: Milestone): string {
  const d = daysAway(m.due_date)
  if (d === null) return 'No date'
  if (d < 0) return 'Overdue'
  if (d <= 30) return 'Next 30 days'
  if (d <= 90) return 'This quarter'
  return 'Later'
}

const BUCKET_ORDER = ['Overdue', 'Next 30 days', 'This quarter', 'Later', 'No date']

export function MilestonesSection({
  domainFilter,
  filterNode,
}: {
  domainFilter?: string
  /** PlanPage's shared domain filter, rendered in the leading card's header. */
  filterNode?: React.ReactNode
}) {
  const qc = useQueryClient()
  const [addOpen, setAddOpen] = useState(false)
  /** Non-null puts the shared dialog into edit mode. */
  const [editing, setEditing] = useState<Milestone | null>(null)
  const [draft, setDraft] = useState({ title: '', domain: '', due_date: '', status: 'upcoming' })
  const f = useFieldErrors<'title'>('milestone')

  const openAdd = useCallback(() => {
    setEditing(null)
    setDraft({ title: '', domain: '', due_date: '', status: 'upcoming' })
    f.reset()
    setAddOpen(true)
  }, [f])

  /* A timeline entry has no action column, so clicking it opens the editor and
     Delete lives in the dialog footer — same contract as the workspace tables. */
  const openEdit = useCallback((m: Milestone) => {
    setEditing(m)
    f.reset()
    setDraft({
      title: m.title,
      domain: m.domain ?? '',
      due_date: m.due_date ?? '',
      status: m.status,
    })
    setAddOpen(true)
  }, [f])

  const closeDialog = () => {
    setAddOpen(false)
    setEditing(null)
  }

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['workspace', 'milestones', domainFilter ?? 'all'],
    queryFn: () => workspaceApi.getMilestones(domainFilter ? { domain: domainFilter } : undefined),
    staleTime: 30_000,
  })

  const create = useMutation({
    mutationFn: () =>
      workspaceApi.createMilestone({
        title: draft.title.trim(),
        domain: draft.domain || null,
        due_date: draft.due_date || null,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['workspace', 'milestones'] })
      closeDialog()
      toast.success('Milestone added')
    },
    onError: () => toast.error('Could not add that milestone'),
  })

  const update = useMutation({
    mutationFn: () =>
      // Explicit `null` clears a field — see the Payload types in api/workspace.
      workspaceApi.updateMilestone(editing!.id, {
        title: draft.title.trim(),
        domain: draft.domain || null,
        due_date: draft.due_date || null,
        status: draft.status as Milestone['status'],
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['workspace', 'milestones'] })
      closeDialog()
      toast.success('Milestone updated')
    },
    onError: () => toast.error('Could not update that milestone'),
  })

  const remove = useMutation({
    mutationFn: (id: string) => workspaceApi.deleteMilestone(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['workspace', 'milestones'] })
      closeDialog()
      toast.success('Milestone deleted')
    },
    onError: () => toast.error('Could not delete that milestone'),
  })

  /* `MilestoneCreate.title` is a bare required `str` with no `min_length`, so
     an empty title reaches the DB unless it is stopped here. */
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!f.submit({ title: draft.title.trim() ? undefined : 'Name the checkpoint.' })) return
    if (editing) update.mutate()
    else create.mutate()
  }

  const modules = useMemo<ModuleSpec[]>(() => {
    const rows = data ?? []
    if (!rows.length) return []

    const byBucket = new Map<string, Milestone[]>()
    for (const m of rows) {
      const b = bucketOf(m)
      if (!byBucket.has(b)) byBucket.set(b, [])
      byBucket.get(b)!.push(m)
    }

    const next = rows.find((m) => (daysAway(m.due_date) ?? Infinity) >= 0)
    const nextIn = next ? daysAway(next.due_date) : null

    return [
      {
        kind: 'tiles',
        span: 12,
        tiles: [
          { label: 'Total milestones', value: String(rows.length), sub: `${byBucket.size} periods` },
          {
            label: 'Next up',
            value: nextIn === null ? '—' : nextIn === 0 ? 'Today' : `${nextIn}d`,
            sub: next?.title ?? 'Nothing dated ahead',
            dotKey: 'info',
          },
          {
            label: 'At risk',
            value: String(rows.filter((m) => m.status === 'at_risk').length),
            sub: 'Flagged as slipping',
            dotKey: 'warning',
          },
          {
            label: 'Hit',
            value: String(rows.filter((m) => m.status === 'hit').length),
            sub: `${rows.filter((m) => m.status === 'missed').length} missed`,
            dotKey: 'success',
          },
        ],
      },
      // One timeline per period bucket, in chronological order — the canvas's
      // grouped list, rendered by the timeline kind.
      ...BUCKET_ORDER.filter((b) => byBucket.has(b)).map<ModuleSpec>((bucket, i) => ({
        kind: 'timeline',
        span: 12,
        title: bucket,
        subtitle: `${byBucket.get(bucket)!.length} milestone${byBucket.get(bucket)!.length === 1 ? '' : 's'} · click one to edit`,
        icon: Flag,
        onEntryClick: (j: number) => openEdit(byBucket.get(bucket)![j]),
        /* The controls ride the FIRST bucket card. This page is a KPI strip
         * (headerless) plus one card per period, so there is no single card
         * that owns everything — the leading one is the closest thing, and it
         * beats the alternative these buttons used to have, which was floating
         * unanchored above the grid / portalling into a page header. */
        ...(i === 0 && {
          actionNode: filterNode,
          action: '+ New milestone',
          actionVariant: 'primary' as const,
          onAction: openAdd,
        }),
        entries: byBucket.get(bucket)!.map((m) => ({
          title: m.title,
          body: m.description ?? (m.domain ? `${m.domain} · ${STATUS_LABEL[m.status]}` : STATUS_LABEL[m.status]),
          date: fmtDate(m.due_date),
          tagLabel: STATUS_LABEL[m.status],
          colorKey: STATUS_KEY[m.status],
        })),
      })),
    ]
  }, [data, filterNode, openAdd, openEdit])

  if (isLoading) return <SkeletonPage kpis={4} modules={[12]} />
  if (isError) return <ErrorState title="Could not load milestones" onRetry={() => refetch()} />

  return (
    <>
      {modules.length === 0 ? (
        /* Wrapped in a Card so the domain filter has a header to sit in — a
           bare EmptyState has none, and with the page header gone there would
           be nowhere to un-filter from. */
        <Card
          icon={<MilestoneIcon size={16} />}
          title="Milestones"
          subtitle="Nothing here yet"
          action={
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              {filterNode}
              <Button size="sm" variant="primary" onClick={openAdd}>+ New milestone</Button>
            </div>
          }
        >
          <EmptyState
            icon={<MilestoneIcon size={22} />}
            title="No milestones yet"
            description="A milestone is a date you are steering toward — a launch, a review, a target you set for a goal."
            action={<Button size="sm" onClick={openAdd}>Add your first milestone</Button>}
          />
        </Card>
      ) : (
        <ModuleGrid modules={modules} />
      )}

      <Dialog
        open={addOpen}
        onOpenChange={(o) => !o && closeDialog()}
        icon={<MilestoneIcon size={18} />}
        eyebrow="Workspace"
        title={editing ? 'Edit milestone' : 'New milestone'}
        description="A dated checkpoint on the way to a goal."
      >
        <form noValidate onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <Field label="Title">
            <Input
              value={draft.title}
              {...f.fieldProps('title')}
              onChange={(e) => { f.clearField('title'); setDraft({ ...draft, title: e.target.value }) }}
              placeholder="Ship the billing rewrite"
            />
            <FieldError id={f.errorId('title')}>{f.errors.title}</FieldError>
          </Field>
          <Field label="Life area">
            <Select
              value={draft.domain}
              onChange={(v) => setDraft({ ...draft, domain: String(v) })}
              options={[{ value: '', label: 'None' }, ...DOMAIN_OPTIONS]}
              placeholder="None"
            />
          </Field>
          <Field label="Due date">
            <Input
              type="date"
              value={draft.due_date}
              onChange={(e) => setDraft({ ...draft, due_date: e.target.value })}
            />
          </Field>
          {/* A milestone starts upcoming — status is only meaningful once it exists. */}
          {editing && (
            <Field label="Status">
              <Select
                value={draft.status}
                onChange={(v) => setDraft({ ...draft, status: String(v) })}
                options={STATUS_OPTIONS}
              />
            </Field>
          )}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
            {editing && (
              <Button
                type="button"
                variant="destructive"
                size="sm"
                style={{ marginRight: 'auto' }}
                loading={remove.isPending}
                onClick={() => remove.mutate(editing.id)}
              >
                <Trash2 size={14} style={{ marginRight: 4 }} /> Delete
              </Button>
            )}
            <Button type="button" variant="outline" size="sm" onClick={closeDialog}>Cancel</Button>
            <Button
              type="submit"
              size="sm"
              disabled={create.isPending || update.isPending}
            >
              {editing
                ? (update.isPending ? 'Saving…' : 'Save changes')
                : (create.isPending ? 'Adding…' : 'Add milestone')}
            </Button>
          </div>
        </form>
      </Dialog>
    </>
  )
}

export { STATUS_OPTIONS as MILESTONE_STATUS_OPTIONS }
