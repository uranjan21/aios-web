/**
 * Finance → Goals (savings pots).
 *
 * Phase 4 conversion to the canvas's `finance:goals` composition —
 * tiles(12) · bars(7) · timeline(5) — rebuilt from the live goals API.
 * Tiles are the goals; clicking one opens its editor, which is where the old
 * table's pencil/trash column went.
 *
 * TWO DEPARTURES FROM THE CANVAS, both because a goal row stores a balance and
 * not a contribution history:
 *  - The canvas's bars are "monthly contributions across all goals". There is
 *    no per-goal contribution ledger, so the bars show **monthly savings**
 *    (take-home minus expenses, from the finance snapshots) against the
 *    contribution rate every goal deadline collectively demands. Same question
 *    — are you putting enough aside — answered with data that exists.
 *  - The canvas's timeline projects completion "at your current contribution
 *    rate". Without that rate, each entry instead states the rate the goal's
 *    own deadline requires, and flags it at risk when that exceeds what you
 *    have actually been saving.
 */
import { useMemo, useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import styled from 'styled-components'
import { Button, Dialog, EmptyState, Input, Select, Card } from '@ledgr/ui'
import { Target, TrendingUp, Flag, Plus, Trash2 } from 'lucide-react'
import { financeApi } from '@ct/shared/api/areas'
import { ModuleGrid, type ModuleSpec } from '@ct/shared/components/modules'
import { Popconfirm } from '@ct/shared/components/ui/Popconfirm'
import { Skeleton } from '@ct/shared/components/ui/skeleton'
import { formatCurrency } from '@ct/shared/lib/utils'
import { fromCalendarDate } from '@ct/shared/lib/calendarDate'
import type { FinancialGoal } from '@ct/shared/types'

const Root = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.spacing[5]};
`

const FilterRow = styled.div`
  display: flex;
  justify-content: flex-end;
  gap: ${({ theme }) => theme.spacing[2]};
`

const FormContainer = styled.form`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.spacing[3]};
  margin-top: ${({ theme }) => theme.spacing[3]};
`

const FormGroup = styled.div``

const Label = styled.label`
  display: block;
  font-size: ${({ theme }) => theme.typography.fontSize.xs};
  color: ${({ theme }) => theme.color.mutedForeground};
  margin-bottom: ${({ theme }) => theme.spacing[1]};
`

const ActionsContainer = styled.div`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing[2]};
  padding-top: ${({ theme }) => theme.spacing[2]};
`

const Spacer = styled.div`
  flex: 1;
`

/** Whole months from now until a date-only deadline, floored at 0. */
function monthsUntil(deadline: string | null): number | null {
  if (!deadline) return null
  const d = fromCalendarDate(String(deadline).slice(0, 10))
  const now = new Date()
  const months = (d.getFullYear() - now.getFullYear()) * 12 + (d.getMonth() - now.getMonth())
  return Math.max(0, months)
}

function daysLeft(deadline: string | null): number | null {
  if (!deadline) return null
  const d = fromCalendarDate(String(deadline).slice(0, 10))
  const now = new Date()
  return Math.round((d.getTime() - new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime()) / 86_400_000)
}

const fmtMonth = (deadline: string | null) =>
  deadline
    ? fromCalendarDate(String(deadline).slice(0, 10)).toLocaleDateString(undefined, { month: 'short', year: 'numeric' })
    : 'No deadline'

type EditForm = { name: string; icon: string; target_amount: string; current_amount: string; deadline: string; color: string }
const EMPTY_FORM: EditForm = { name: '', icon: '', target_amount: '0', current_amount: '0', deadline: '', color: '' }

export function GoalsTab({ onAdd }: { onAdd?: () => void } = {}) {
  const queryClient = useQueryClient()
  const [updatingGoal, setUpdatingGoal] = useState<FinancialGoal | null>(null)
  const [editForm, setEditForm] = useState<EditForm>(EMPTY_FORM)
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'completed' | 'overdue'>('all')

  const { data: goals, isLoading } = useQuery({
    queryKey: ['finance', 'goals'],
    queryFn: financeApi.goals,
  })

  // Monthly savings history — the only real series that speaks to whether the
  // goals are fundable. Sparse for new users, which the bars module handles by
  // simply not rendering.
  const { data: snapshots } = useQuery({
    queryKey: ['finance', 'snapshots'],
    queryFn: financeApi.snapshots,
    staleTime: 5 * 60_000,
  })

  const updateMutation = useMutation({
    mutationFn: (patch: Partial<{ name: string; icon: string; target_amount: number; current_amount: number; deadline: string | null; color: string }>) =>
      financeApi.patchGoal(updatingGoal!.id, patch),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['finance', 'goals'] })
      toast.success('Goal updated')
      setUpdatingGoal(null)
      setEditForm(EMPTY_FORM)
    },
    onError: (e: any) => toast.error(e?.response?.data?.detail || 'Failed to update goal'),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => financeApi.deleteGoal(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['finance', 'goals'] })
      toast.success('Goal deleted')
      setUpdatingGoal(null)
      setEditForm(EMPTY_FORM)
    },
    onError: () => toast.error('Failed to delete goal'),
  })

  const openUpdate = (goal: FinancialGoal) => {
    setUpdatingGoal(goal)
    setEditForm({
      name: goal.name ?? '',
      icon: goal.icon ?? '',
      target_amount: String(goal.target_amount ?? 0),
      current_amount: String(goal.current_amount ?? 0),
      deadline: goal.deadline ? String(goal.deadline).slice(0, 10) : '',
      color: goal.color ?? '',
    })
  }

  const closeEdit = () => {
    setUpdatingGoal(null)
    setEditForm(EMPTY_FORM)
  }

  const handleSave = () => {
    const name = editForm.name.trim()
    if (!name) { toast.error('Name is required'); return }
    const target = parseFloat(editForm.target_amount)
    const current = parseFloat(editForm.current_amount)
    if (Number.isNaN(target) || target < 0) { toast.error('Target must be a non-negative number'); return }
    if (Number.isNaN(current) || current < 0) { toast.error('Current must be a non-negative number'); return }
    updateMutation.mutate({
      name,
      icon: editForm.icon || undefined,
      target_amount: target,
      current_amount: current,
      deadline: editForm.deadline ? editForm.deadline : null,
      color: editForm.color || undefined,
    })
  }

  const visible = useMemo(() => (goals ?? []).filter((g) => {
    if (statusFilter === 'all') return true
    const done = g.target_amount > 0 && g.current_amount >= g.target_amount
    if (statusFilter === 'completed') return done
    const days = daysLeft(g.deadline)
    if (statusFilter === 'overdue') return !done && days !== null && days < 0
    return !done
  }), [goals, statusFilter])

  /** Take-home minus expenses per snapshot month, most recent six. */
  const savingsSeries = useMemo(() => (snapshots ?? [])
    .filter(s => s.take_home != null && s.total_expenses != null)
    .sort((a, b) => a.snapshot_month.localeCompare(b.snapshot_month))
    .slice(-6)
    .map(s => ({ month: s.snapshot_month, saved: Number(s.take_home) - Number(s.total_expenses) })),
    [snapshots])

  const avgSaved = savingsSeries.length
    ? savingsSeries.reduce((sum, s) => sum + s.saved, 0) / savingsSeries.length
    : null

  const modules = useMemo<ModuleSpec[]>(() => {
    if (!visible.length) return []

    /** What each goal's own deadline demands per month from here. */
    const requiredFor = (g: FinancialGoal): number | null => {
      const remaining = Number(g.target_amount) - Number(g.current_amount)
      if (remaining <= 0) return 0
      const months = monthsUntil(g.deadline)
      if (months === null) return null
      return remaining / Math.max(1, months)
    }

    const totalRequired = visible.reduce((sum, g) => sum + (requiredFor(g) ?? 0), 0)

    const statusOf = (g: FinancialGoal) => {
      const done = g.target_amount > 0 && g.current_amount >= g.target_amount
      if (done) return { label: 'Done', key: 'success' }
      const days = daysLeft(g.deadline)
      if (days !== null && days < 0) return { label: 'Overdue', key: 'destructive' }
      const req = requiredFor(g)
      if (req !== null && avgSaved !== null && req > avgSaved) return { label: 'Behind', key: 'warning' }
      return { label: 'On track', key: 'success' }
    }

    const specs: ModuleSpec[] = [
      {
        kind: 'tiles',
        span: 12,
        onTileClick: (i: number) => openUpdate(visible[i]),
        tiles: visible.map((g) => {
          const pct = g.target_amount > 0
            ? Math.max(0, Math.min(100, Math.round((g.current_amount / g.target_amount) * 100)))
            : 0
          const st = statusOf(g)
          return {
            label: `${g.icon || '🎯'} ${g.name}`,
            value: formatCurrency(g.current_amount),
            sub: `Target ${formatCurrency(g.target_amount)} · ${fmtMonth(g.deadline)}`,
            subKey: st.key,
            badge: st.label,
            badgeKey: st.key,
            bar: pct,
            barKey: st.key === 'success' ? 'success' : st.key === 'warning' ? 'warning' : 'accent',
          }
        }),
      },
    ]

    if (savingsSeries.length) {
      // Bars are drawn in thousands so the axis labels stay readable, which is
      // the same unit the canvas used ("28k").
      const inK = savingsSeries.map(s => Math.round(s.saved / 1000))
      specs.push({
        kind: 'bars',
        span: 7,
        title: 'Monthly savings',
        subtitle: totalRequired > 0
          ? `Against the ${formatCurrency(Math.round(totalRequired))}/mo every deadline needs`
          : 'Take-home minus expenses',
        icon: TrendingUp,
        ...(totalRequired > 0 && {
          target: Math.round(totalRequired / 1000),
          targetLabel: 'Needed',
        }),
        bars: savingsSeries.map((s, i) => ({
          label: fromCalendarDate(s.month.length === 7 ? `${s.month}-01` : s.month)
            .toLocaleDateString(undefined, { month: 'short' }),
          v: Math.max(0, inK[i]),
          t: `${inK[i]}k`,
          colorKey: totalRequired > 0 && s.saved >= totalRequired ? 'success' : s.saved > 0 ? 'accent' : 'destructive',
        })),
      })
    }

    specs.push({
      kind: 'timeline',
      span: savingsSeries.length ? 5 : 12,
      title: 'What each goal needs',
      subtitle: avgSaved !== null
        ? `You have been saving ${formatCurrency(Math.round(avgSaved))}/mo`
        : 'Log a monthly snapshot to compare against your savings',
      icon: Flag,
      entries: [...visible]
        .sort((a, b) => (daysLeft(a.deadline) ?? 1e9) - (daysLeft(b.deadline) ?? 1e9))
        .map((g) => {
          const st = statusOf(g)
          const req = requiredFor(g)
          const remaining = Number(g.target_amount) - Number(g.current_amount)
          const months = monthsUntil(g.deadline)
          return {
            title: g.name,
            body: remaining <= 0
              ? 'Fully funded.'
              : req === null
                ? `${formatCurrency(remaining)} to go. Set a deadline to get a monthly figure.`
                : `Needs ${formatCurrency(Math.round(req))}/month for the remaining ${months === 0 ? 'part-month' : `${months} month${months === 1 ? '' : 's'}`}.`,
            date: fmtMonth(g.deadline),
            tagLabel: st.label,
            colorKey: st.key,
          }
        }),
    })

    return specs
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible, savingsSeries, avgSaved])

  if (isLoading) return <Skeleton style={{ height: 320 }} />

  return (
    <Root>
      {(goals ?? []).length > 0 && (
        <FilterRow>
          <Select
            size="sm"
            fullWidth={false}
            aria-label="Filter goals by status"
            value={statusFilter}
            onChange={(v: any) => setStatusFilter(v as typeof statusFilter)}
            options={[
              { value: 'all', label: 'All Goals' },
              { value: 'active', label: 'Active' },
              { value: 'completed', label: 'Done' },
              { value: 'overdue', label: 'Overdue' },
            ]}
          />
          {onAdd && (
            <Button size="sm" variant="primary" onClick={onAdd}>
              <Plus size={12} style={{ marginRight: 4 }} /> Add Goal
            </Button>
          )}
        </FilterRow>
      )}

      {modules.length === 0 ? (
        <Card title="Savings Goals" subtitle="Track progress toward each savings target" icon={<Target size={16} />}>
          <EmptyState
            icon={<Target size={20} />}
            title={(goals ?? []).length ? 'Nothing matches that filter' : 'No goals yet'}
            description="Create a savings goal to track your progress."
            action={onAdd ? <Button size="sm" variant="primary" onClick={onAdd}>Add Goal</Button> : undefined}
          />
        </Card>
      ) : (
        <ModuleGrid modules={modules} />
      )}

      <Dialog
        open={!!updatingGoal}
        icon={<Target size={18} />}
        eyebrow="Finance"
        title={`Edit goal${updatingGoal?.name ? ` — ${updatingGoal.name}` : ''}`}
        onOpenChange={(open) => { if (!open) closeEdit() }}
        size="sm"
      >
        <FormContainer onSubmit={e => { e.preventDefault(); handleSave() }}>
          <FormGroup>
            <Label>Name</Label>
            <Input value={editForm.name} onChange={e => setEditForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. Emergency Fund" autoFocus required />
          </FormGroup>
          <FormGroup>
            <Label>Icon (emoji)</Label>
            <Input value={editForm.icon} maxLength={2} onChange={e => setEditForm(f => ({ ...f, icon: e.target.value }))} placeholder="🎯" />
          </FormGroup>
          <FormGroup>
            <Label>Target amount (₹)</Label>
            <Input type="number" startAdornment="₹" min="0" step="100" value={editForm.target_amount} onChange={e => setEditForm(f => ({ ...f, target_amount: e.target.value }))} required />
          </FormGroup>
          <FormGroup>
            <Label>Current amount (₹)</Label>
            <Input type="number" startAdornment="₹" min="0" step="100" value={editForm.current_amount} onChange={e => setEditForm(f => ({ ...f, current_amount: e.target.value }))} required />
          </FormGroup>
          <FormGroup>
            <Label>Deadline</Label>
            <Input type="date" value={editForm.deadline} onChange={e => setEditForm(f => ({ ...f, deadline: e.target.value }))} />
          </FormGroup>
          <FormGroup>
            <Label>Color (hex)</Label>
            <Input value={editForm.color} onChange={e => setEditForm(f => ({ ...f, color: e.target.value }))} placeholder="#0D9488" />
          </FormGroup>
          <ActionsContainer>
            <Button variant="primary" type="submit" loading={updateMutation.isPending}>Save changes</Button>
            <Button variant="ghost" onClick={closeEdit} type="button" disabled={updateMutation.isPending}>Cancel</Button>
            <Spacer />
            <Popconfirm
              title="Delete this goal?"
              onConfirm={() => { if (updatingGoal) deleteMutation.mutate(updatingGoal.id) }}
              okText="Delete"
              cancelText="Cancel"
              okButtonProps={{ danger: true }}
            >
              <Button variant="destructive" type="button" size="sm" loading={deleteMutation.isPending}>
                <Trash2 size={14} style={{ marginRight: 4 }} /> Delete
              </Button>
            </Popconfirm>
          </ActionsContainer>
        </FormContainer>
      </Dialog>
    </Root>
  )
}
