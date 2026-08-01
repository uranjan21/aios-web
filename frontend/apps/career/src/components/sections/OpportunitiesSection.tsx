/**
 * Career → Opportunities.
 *
 * Phase 4 conversion to the canvas's `career:opportunities` composition —
 * kanban(12) · table(12) — rebuilt from the live opportunities API.
 *
 * The canvas board has no drag handles, so moving a lead between stages happens
 * in the detail dialog a card opens. That dialog is also where edit and delete
 * live, replacing the old per-row action column.
 *
 * ONE DEPARTURE: the canvas's second module is "Next actions", a list of dated
 * follow-ups. There is no task model attached to an opportunity, so the table
 * lists every lead with how long it has sat in its current stage — which is the
 * question that module was really asking ("nothing here should be older than a
 * week"), from the timestamps we do keep.
 */
import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import dayjs from 'dayjs'
import styled from 'styled-components'
import { Briefcase, CheckSquare, Trash2 } from 'lucide-react'
import { Button, Card, Dialog, EmptyState, Input, Select } from '@ledgr/ui'
import { careerApi } from '@ct/shared/api/areas'
import { ModuleGrid, type ModuleSpec } from '@ct/shared/components/modules'
import { Skeleton } from '@ct/shared/components/ui/skeleton'
import type { JobOpportunity, OpportunityStatus } from '@ct/shared/types'
import { OpportunityForm } from '../OpportunityForm'

const Root = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.spacing[5]};
`

const Toolbar = styled.div`
  display: flex;
  justify-content: flex-end;
`

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

const Spacer = styled.div`
  flex: 1;
`

/** Board columns, in the order a lead moves through them. */
const PIPELINE: OpportunityStatus[] = ['prospect', 'applied', 'screening', 'interview', 'offer']
const ALL_STATUSES: OpportunityStatus[] = [...PIPELINE, 'rejected', 'closed']

const STATUS_KEY: Record<OpportunityStatus, string> = {
  prospect: 'mutedFg',
  applied: 'info',
  screening: 'accent',
  interview: 'career',
  offer: 'success',
  rejected: 'destructive',
  closed: 'mutedFg',
}

const title = (s: string) => s.charAt(0).toUpperCase() + s.slice(1)

export function OpportunitiesSection() {
  const qc = useQueryClient()
  const [addOpen, setAddOpen] = useState(false)
  const [detail, setDetail] = useState<JobOpportunity | null>(null)
  const [edit, setEdit] = useState<{ status: OpportunityStatus; notes: string; url: string }>({
    status: 'prospect', notes: '', url: '',
  })

  const { data: opps, isLoading } = useQuery({
    queryKey: ['career', 'opportunities'],
    queryFn: careerApi.opportunities,
  })

  const patch = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Parameters<typeof careerApi.patchOpportunity>[1] }) =>
      careerApi.patchOpportunity(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['career', 'opportunities'] })
      setDetail(null)
      toast.success('Opportunity updated')
    },
    onError: () => toast.error('Could not update that opportunity'),
  })

  const remove = useMutation({
    mutationFn: (id: string) => careerApi.deleteOpportunity(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['career', 'opportunities'] })
      setDetail(null)
      toast.success('Opportunity removed')
    },
    onError: () => toast.error('Could not remove that opportunity'),
  })

  const rows = useMemo(() => opps ?? [], [opps])
  const active = useMemo(() => rows.filter(o => !['rejected', 'closed'].includes(o.status)), [rows])

  const openDetail = (o: JobOpportunity) => {
    setDetail(o)
    setEdit({ status: o.status, notes: o.notes ?? '', url: o.url ?? '' })
  }

  const modules = useMemo<ModuleSpec[]>(() => {
    if (!rows.length) return []

    /** Board cards, flattened in column order so one index maps back cleanly. */
    const ordered: JobOpportunity[] = []
    const columns = PIPELINE.map((status) => {
      const inCol = active.filter(o => o.status === status)
      ordered.push(...inCol)
      return {
        label: title(status),
        count: inCol.length,
        colorKey: STATUS_KEY[status],
        cards: inCol.map(o => ({
          title: o.role,
          meta: o.company,
          tagLabel: o.applied_date ? dayjs(o.applied_date).format('D MMM') : 'No date',
          tagKey: STATUS_KEY[status],
        })),
      }
    })

    // Sorted oldest-first: the canvas's point is that nothing should sit long.
    const byAge = [...rows].sort((a, b) => a.updated_at.localeCompare(b.updated_at))

    return [
      {
        kind: 'kanban',
        span: 12,
        columns,
        onCardClick: (i: number) => openDetail(ordered[i]),
      },
      {
        kind: 'table',
        span: 12,
        title: 'Every lead',
        subtitle: 'Oldest first — nothing should sit in a stage for long',
        icon: CheckSquare,
        action: 'Add lead',
        onAction: () => setAddOpen(true),
        gridCols: '1.7fr 1.7fr 1fr 1fr',
        cols: [{ l: 'Company' }, { l: 'Role' }, { l: 'Stage' }, { l: 'Last moved', a: 'right' }],
        rows: byAge.map((o) => {
          const days = dayjs().diff(dayjs(o.updated_at), 'day')
          const stale = days > 7 && !['rejected', 'closed', 'offer'].includes(o.status)
          return [
            { t: o.company, bold: true },
            o.role,
            { t: title(o.status), tag: true, colorKey: STATUS_KEY[o.status] },
            {
              t: days === 0 ? 'Today' : `${days}d ago`,
              colorKey: stale ? 'warning' : undefined,
            },
          ]
        }),
        onRowClick: (i: number) => openDetail(byAge[i]),
      },
    ]
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rows, active])

  if (isLoading) return <Skeleton style={{ height: 320 }} />

  return (
    <Root>
      <Toolbar>
        <Button size="sm" variant="primary" onClick={() => setAddOpen(true)}>Add lead</Button>
      </Toolbar>

      {rows.length === 0 ? (
        <Card title="Opportunities" subtitle="Roles you are talking to" icon={<Briefcase size={16} />}>
          <EmptyState
            icon={<Briefcase size={24} />}
            title="No opportunities yet"
            description="Track the roles you are applying to and watch them move through the pipeline."
            action={<Button size="sm" onClick={() => setAddOpen(true)}>Add your first lead</Button>}
          />
        </Card>
      ) : (
        <ModuleGrid modules={modules} />
      )}

      <Dialog
        open={addOpen}
        onOpenChange={(o) => !o && setAddOpen(false)}
        icon={<Briefcase size={18} />}
        eyebrow="Career"
        title="New opportunity"
        description="A role you are talking to someone about."
      >
        <OpportunityForm onClose={() => setAddOpen(false)} />
      </Dialog>

      <Dialog
        open={!!detail}
        onOpenChange={(o) => !o && setDetail(null)}
        icon={<Briefcase size={18} />}
        eyebrow={detail?.company}
        title={detail?.role ?? 'Opportunity'}
        description={detail ? `Added ${dayjs(detail.created_at).format('D MMM YYYY')}` : undefined}
      >
        <Form>
          <div>
            <Label>Stage</Label>
            <Select
              fullWidth
              value={edit.status}
              onChange={(v: any) => setEdit(s => ({ ...s, status: v as OpportunityStatus }))}
              options={ALL_STATUSES.map(s => ({ value: s, label: title(s) }))}
            />
          </div>
          <div>
            <Label>Link</Label>
            <Input
              value={edit.url}
              onChange={(e: any) => setEdit(s => ({ ...s, url: e.target.value }))}
              placeholder="https://"
            />
          </div>
          <div>
            <Label>Notes</Label>
            <Input
              value={edit.notes}
              onChange={(e: any) => setEdit(s => ({ ...s, notes: e.target.value }))}
              placeholder="Who you spoke to, what is next"
            />
          </div>
          <Actions>
            <Button
              variant="primary"
              loading={patch.isPending}
              onClick={() => detail && patch.mutate({
                id: detail.id,
                data: { status: edit.status, notes: edit.notes || undefined, url: edit.url || undefined },
              })}
            >
              Save
            </Button>
            <Button variant="ghost" onClick={() => setDetail(null)}>Cancel</Button>
            <Spacer />
            <Button
              variant="destructive"
              size="sm"
              loading={remove.isPending}
              onClick={() => detail && remove.mutate(detail.id)}
            >
              <Trash2 size={14} style={{ marginRight: 4 }} /> Delete
            </Button>
          </Actions>
        </Form>
      </Dialog>
    </Root>
  )
}
