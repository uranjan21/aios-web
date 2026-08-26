/**
 * Career → Experience.
 *
 * Career had no employment model at all, so job history, titles and tenure —
 * the CV facts the area exists to hold — lived nowhere. A promotion could be
 * logged as a `CareerEvent`, but "where have I worked and for how long" had
 * no answer.
 *
 * A current role is `end_date === null`. There is no `is_current` column; the
 * server derives the flag so the two cannot disagree, and this page never
 * writes one.
 */
import { useCallback, useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import dayjs from 'dayjs'
import styled from 'styled-components'
import { Button, Card, Dialog, EmptyState, Input, Select, SkeletonPage } from '@ledgr/ui'
import { Briefcase, Building2, Trash2 } from 'lucide-react'
import { careerApi, type EmploymentRole } from '@ct/shared/api/areas'
import { ModuleGrid, type ModuleSpec } from '@ct/shared/components/modules'
import { Popconfirm } from '@ct/shared/components/ui/Popconfirm'
import { FieldError, useFieldErrors } from '@ct/shared/components/forms/fieldErrors'

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

const Hint = styled.p`
  font-size: ${({ theme }) => theme.typography.fontSize.xs};
  color: ${({ theme }) => theme.color.mutedForeground};
  margin: 0;
`

const TYPE_OPTIONS = [
  { value: 'full_time', label: 'Full time' },
  { value: 'part_time', label: 'Part time' },
  { value: 'contract', label: 'Contract' },
  { value: 'freelance', label: 'Freelance' },
  { value: 'internship', label: 'Internship' },
]

const EMPTY = {
  company: '', title: '', employment_type: 'full_time', location: '',
  start_date: '', end_date: '', description: '',
}

/** "2 yrs 4 mos" reads better than "28 months" past a year. */
const tenure = (months: number) => {
  const y = Math.floor(months / 12)
  const m = months % 12
  if (!y) return `${m} mo${m === 1 ? '' : 's'}`
  if (!m) return `${y} yr${y === 1 ? '' : 's'}`
  return `${y} yr${y === 1 ? '' : 's'} ${m} mo${m === 1 ? '' : 's'}`
}

export function ExperienceSection() {
  const qc = useQueryClient()
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<EmploymentRole | null>(null)
  const [form, setForm] = useState({ ...EMPTY })
  const f = useFieldErrors<'company' | 'title' | 'start_date' | 'end_date'>('experience')

  const { data: roles, isLoading } = useQuery({
    queryKey: ['career', 'roles'],
    queryFn: careerApi.roles,
    staleTime: 60_000,
  })

  const all = useMemo(() => roles ?? [], [roles])

  const openNew = useCallback(() => { f.reset(); setEditing(null); setForm({ ...EMPTY }); setOpen(true) }, [f])
  const openEdit = useCallback((r: EmploymentRole) => {
    f.reset()
    setEditing(r)
    setForm({
      company: r.company, title: r.title, employment_type: r.employment_type,
      location: r.location ?? '', start_date: r.start_date,
      end_date: r.end_date ?? '', description: r.description ?? '',
    })
    setOpen(true)
  }, [f])

  const invalidate = () => qc.invalidateQueries({ queryKey: ['career', 'roles'] })

  const save = useMutation({
    mutationFn: () => {
      const payload = {
        company: form.company.trim(),
        title: form.title.trim(),
        employment_type: form.employment_type,
        location: form.location.trim() || null,
        start_date: form.start_date,
        // Empty means still there — the one representation of "current".
        end_date: form.end_date || null,
        description: form.description.trim() || null,
      }
      return editing ? careerApi.patchRole(editing.id, payload) : careerApi.createRole(payload)
    },
    onSuccess: () => { invalidate(); toast.success(editing ? 'Role updated' : 'Role added'); setOpen(false) },
    onError: (e: any) => toast.error(e?.response?.data?.detail || 'Failed to save role'),
  })

  /*
   * These three were a chain of toasts — "Company and title are required",
   * "Pick a start date" — which name the problem but not the field. The end/start
   * ordering mirrors the server, which 422s when `end_date < start_date`.
   */
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const ok = f.submit({
      company: form.company.trim() ? undefined : 'Name the company.',
      title: form.title.trim() ? undefined : 'Name the role.',
      start_date: form.start_date ? undefined : 'Pick the date you started.',
      end_date: form.start_date && form.end_date && form.end_date < form.start_date
        ? 'The end date cannot be before the start date.'
        : undefined,
    })
    if (ok) save.mutate()
  }

  const remove = useMutation({
    mutationFn: (id: string) => careerApi.deleteRole(id),
    onSuccess: () => { invalidate(); toast.success('Role removed'); setOpen(false) },
    onError: () => toast.error('Failed to remove role'),
  })

  const modules = useMemo<ModuleSpec[]>(() => {
    if (!all.length) return []

    const current = all.filter(r => r.is_current)
    /* Total experience sums each role's own span. Overlapping roles (a
       contract alongside a job) would double-count, which is why this is
       labelled "across N roles" rather than presented as elapsed career time. */
    const totalMonths = all.reduce((n, r) => n + r.months, 0)
    const companies = new Set(all.map(r => r.company)).size

    return [
      {
        kind: 'tiles',
        span: 12,
        tiles: [
          {
            label: 'Current role',
            value: current[0]?.title ?? '—',
            sub: current[0] ? `${current[0].company} · ${tenure(current[0].months)}` : 'Nothing marked current',
            subKey: current.length ? 'success' : 'mutedFg',
          },
          { label: 'Roles', value: String(all.length), sub: `${companies} compan${companies === 1 ? 'y' : 'ies'}` },
          { label: 'Total experience', value: tenure(totalMonths), sub: `Summed across ${all.length} role${all.length === 1 ? '' : 's'}` },
          {
            label: 'Longest stint',
            value: tenure(Math.max(...all.map(r => r.months))),
            sub: all.reduce((a, b) => (a.months >= b.months ? a : b)).company,
          },
        ],
      },
      {
        kind: 'timeline',
        span: 12,
        title: 'Work history',
        subtitle: 'Newest first · click a role to edit it',
        icon: Briefcase,
        action: '+ Add role',
        actionVariant: 'primary',
        onAction: openNew,
        onEntryClick: (i: number) => openEdit(all[i]),
        entries: all.map(r => ({
          title: `${r.title} · ${r.company}`,
          body: [
            TYPE_OPTIONS.find(t => t.value === r.employment_type)?.label ?? r.employment_type,
            r.location,
            tenure(r.months),
            r.description,
          ].filter(Boolean).join(' · '),
          date: `${dayjs(r.start_date).format("MMM 'YY")} — ${r.end_date ? dayjs(r.end_date).format("MMM 'YY") : 'present'}`,
          ...(r.is_current && { tagLabel: 'Current', colorKey: 'success' }),
        })),
      },
    ]
  }, [all, openNew, openEdit])

  if (isLoading) return <SkeletonPage kpis={4} modules={[12]} />

  return (
    <Root>
      {all.length === 0 ? (
        <Card title="Experience" subtitle="Where you have worked, and for how long" icon={<Briefcase size={16} />}>
          <EmptyState
            icon={<Building2 size={20} />}
            title="No roles recorded"
            description="Add a job to build your work history. Leave the end date blank for your current one."
            action={<Button size="sm" variant="primary" onClick={openNew}>Add a role</Button>}
          />
        </Card>
      ) : (
        <ModuleGrid modules={modules} />
      )}

      <Dialog
        open={open}
        icon={<Briefcase size={18} />}
        eyebrow="Career"
        title={editing ? `Edit — ${editing.title}` : 'Add a role'}
        onOpenChange={(o) => { if (!o) setOpen(false) }}
        size="md"
      >
        <Form noValidate onSubmit={handleSubmit}>
          <Pair>
            <div>
              <Label>Company</Label>
              <Input value={form.company} {...f.fieldProps('company')} onChange={(e: any) => { f.clearField('company'); setForm(prev => ({ ...prev, company: e.target.value })) }} placeholder="Takeda" autoFocus />
              <FieldError id={f.errorId('company')}>{f.errors.company}</FieldError>
            </div>
            <div>
              <Label>Title</Label>
              <Input value={form.title} {...f.fieldProps('title')} onChange={(e: any) => { f.clearField('title'); setForm(prev => ({ ...prev, title: e.target.value })) }} placeholder="Full Stack Developer" />
              <FieldError id={f.errorId('title')}>{f.errors.title}</FieldError>
            </div>
          </Pair>

          <Pair>
            <div>
              <Label>Type</Label>
              <Select fullWidth value={form.employment_type} onChange={(v: any) => setForm(f => ({ ...f, employment_type: String(v) }))} options={TYPE_OPTIONS} />
            </div>
            <div>
              <Label>Location</Label>
              <Input value={form.location} onChange={(e: any) => setForm(f => ({ ...f, location: e.target.value }))} placeholder="Bangalore" />
            </div>
          </Pair>

          <Pair>
            <div>
              <Label>Started</Label>
              <Input type="date" value={form.start_date} {...f.fieldProps('start_date')} onChange={(e: any) => { f.clearField('start_date'); setForm(prev => ({ ...prev, start_date: e.target.value })) }} />
              <FieldError id={f.errorId('start_date')}>{f.errors.start_date}</FieldError>
            </div>
            <div>
              <Label>Ended</Label>
              <Input type="date" value={form.end_date} {...f.fieldProps('end_date')} onChange={(e: any) => { f.clearField('end_date'); setForm(prev => ({ ...prev, end_date: e.target.value })) }} />
              <FieldError id={f.errorId('end_date')}>{f.errors.end_date}</FieldError>
              <Hint>Leave blank if this is your current role.</Hint>
            </div>
          </Pair>

          <div>
            <Label>What you did</Label>
            <Input value={form.description} onChange={(e: any) => setForm(f => ({ ...f, description: e.target.value }))} placeholder="Optional" />
          </div>

          <Actions>
            <Button variant="primary" type="submit" loading={save.isPending}>{editing ? 'Save' : 'Add role'}</Button>
            <Button variant="ghost" type="button" onClick={() => setOpen(false)}>Cancel</Button>
            {editing && (
              <>
                <Spacer />
                <Popconfirm
                  title="Remove this role?"
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
