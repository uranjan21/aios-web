/**
 * Finance → Goals (savings pots).
 *
 * Phase 4 conversion to the canvas's `finance:goals` composition —
 * tiles(12) · bars(7) · timeline(5) — rebuilt from the live goals API.
 * Tiles are the goals; clicking one opens its editor, which is where the old
 * table's pencil/trash column went.
 *
 * 2026-08-03: the two documented departures are RESOLVED. Both existed because
 * a goal row stored only a running balance; `finance_goal_contributions` is a
 * real per-deposit ledger, so both questions are now answered from actual data.
 *  - The bars are monthly CONTRIBUTIONS (from /goals/contributions/monthly),
 *    not take-home-minus-expenses as a stand-in for them. A month with no
 *    deposit is a real zero, and a withdrawal plots negative.
 *  - The timeline projects completion at the rate you have ACTUALLY been
 *    contributing over the window, and compares it to what the deadline needs.
 *
 * ONE REMAINING DEPARTURE: the canvas stacks the bars per goal. The `bars` kind
 * draws a single series and cannot stack, so these are the monthly TOTAL across
 * goals against the rate every deadline collectively demands — the same
 * question. Per-goal detail lives in the timeline and in each goal's ledger.
 */
import { useMemo, useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import styled from 'styled-components'
import {
  Button, Card, Dialog, EmptyState, ErrorState, Input, Select, SkeletonPage,
} from '@ledgr/ui'
import { Target, TrendingUp, Flag, Trash2 } from 'lucide-react'
import { financeApi } from '@ct/shared/api/areas'
import { ModuleGrid, type ModuleSpec } from '@ct/shared/components/modules'
import { Popconfirm } from '@ct/shared/components/ui/Popconfirm'
import { formatCurrency } from '@ct/shared/lib/utils'
import { fromCalendarDate } from '@ct/shared/lib/calendarDate'
import type { FinancialGoal } from '@ct/shared/types'
import { GoalContributionsPanel } from './GoalContributionsPanel'

/**
 * Is the pot fully funded?
 *
 * MUST coerce with Number(). `target_amount`/`current_amount` are Numeric
 * columns, and Pydantic serializes Decimal as a JSON *string* — so the obvious
 * `g.current_amount >= g.target_amount` is a STRING comparison. That reported
 * a ₹55,000-of-₹2,50,000 pot as "Done", because lexically "5" > "2". Caught in
 * the browser on 2026-08-03, not by tsc: the API types declare these `number`,
 * which is what the rest of this file's `Number(...)` wrapping is working
 * around everywhere else.
 */
const isFunded = (g: FinancialGoal) =>
  Number(g.target_amount) > 0 && Number(g.current_amount) >= Number(g.target_amount)

const Root = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.spacing[5]};
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

export function GoalsTab({
  onAdd,
  filterNode,
}: {
  onAdd?: () => void
  /**
   * An optional page-level filter to render beside this tab's own. Workspace →
   * Goals mounts this tab under its domain filter and passes it here, so the
   * control stays reachable while "finance" is the selected domain.
   */
  filterNode?: React.ReactNode
} = {}) {
  const queryClient = useQueryClient()
  const [updatingGoal, setUpdatingGoal] = useState<FinancialGoal | null>(null)
  const [editForm, setEditForm] = useState<EditForm>(EMPTY_FORM)
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'completed' | 'overdue'>('all')

  /* Handled in place below rather than thrown to the route (F1) — see App.tsx. */
  const goalsQ = useQuery({
    queryKey: ['finance', 'goals'],
    queryFn: financeApi.goals,
    meta: { inlineError: true },
  })

  // Monthly savings history — the only real series that speaks to whether the
  // goals are fundable. Sparse for new users, which the bars module handles by
  // simply not rendering.
  const contribMonthlyQ = useQuery({
    queryKey: ['finance', 'goals', 'contributions', 'monthly'],
    queryFn: () => financeApi.goalContributionsMonthly(6),
    staleTime: 60_000,
    meta: { inlineError: true },
  })

  const goals = goalsQ.data
  const contribMonthly = contribMonthlyQ.data
  const isLoading = goalsQ.isLoading || contribMonthlyQ.isLoading
  const isError = goalsQ.isError || contribMonthlyQ.isError

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
    const done = isFunded(g)
    if (statusFilter === 'completed') return done
    const days = daysLeft(g.deadline)
    if (statusFilter === 'overdue') return !done && days !== null && days < 0
    return !done
  }), [goals, statusFilter])

  /** Take-home minus expenses per snapshot month, most recent six. */
  /* Real contributions per month, summed across goals. Zeros are meaningful —
     the endpoint emits them rather than skipping a month — and a month can be
     NEGATIVE when the user withdrew from a pot. */
  const savingsSeries = useMemo(() => {
    if (!contribMonthly) return []
    return contribMonthly.months.map((month, i) => ({
      month,
      saved: contribMonthly.goals.reduce((sum, g) => sum + (g.series[i] ?? 0), 0),
    }))
  }, [contribMonthly])

  /* The rate actually achieved over the window — what the timeline projects
     from. Averaged over every month in the window including the empty ones,
     because a month you put nothing aside is part of your real rate. */
  const avgSaved = savingsSeries.length
    ? savingsSeries.reduce((sum, s) => sum + s.saved, 0) / savingsSeries.length
    : null

  /* Per-goal achieved rate — goal_id -> average per month over the window.
     This is what makes "Behind" a per-pot judgement instead of comparing one
     goal's requirement against the whole portfolio's savings. */
  const ratePerGoal = useMemo(() => {
    const m = new Map<string, number>()
    if (!contribMonthly?.months.length) return m
    for (const g of contribMonthly.goals) {
      const total = g.series.reduce((sum, v) => sum + v, 0)
      m.set(g.goal_id, total / contribMonthly.months.length)
    }
    return m
  }, [contribMonthly])

  /* One instance, used by the goals card and by the empty state it collapses
   * into, so the control survives a filter that matches nothing. */
  const statusFilterNode = (
    <>
      {filterNode}
      {(goals ?? []).length > 0 && (
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
      )}
    </>
  )

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
      const done = isFunded(g)
      if (done) return { label: 'Done', key: 'success' }
      const days = daysLeft(g.deadline)
      if (days !== null && days < 0) return { label: 'Overdue', key: 'destructive' }
      const req = requiredFor(g)
      /* Compare against THIS pot's own achieved rate where there is one; fall
         back to the portfolio average only when the pot has no history yet. */
      const achieved = ratePerGoal.get(g.id) ?? avgSaved
      if (req !== null && achieved !== null && req > achieved) return { label: 'Behind', key: 'warning' }
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
        title: 'Monthly contributions',
        subtitle: totalRequired > 0
          ? `Against the ${formatCurrency(Math.round(totalRequired))}/mo every deadline needs`
          : 'What you actually put into your pots',
        icon: TrendingUp,
        ...(totalRequired > 0 && {
          target: Math.round(totalRequired / 1000),
          targetLabel: 'Needed',
        }),
        /* Stacked per pot, each in its own colour (2026-08-05 — the `bars` kind
         * gained `segments`). Only goals that actually contributed appear in
         * the key, so a dormant pot does not clutter it. */
        legend: (contribMonthly?.goals ?? [])
          .filter(g => g.series.some(v => v > 0))
          .map(g => ({ label: g.name, colorKey: g.color })),
        /* Bars share one magnitude axis, so a withdrawal plots as a positive
         * height in destructive red with a signed label — the height is "how
         * much moved", the colour and the sign say which way.
         *
         * A NET-NEGATIVE month stays a flat red bar rather than a stack: the
         * parts would point in opposite directions, and there is no honest way
         * to stack that. */
        bars: savingsSeries.map((s, i) => ({
          label: fromCalendarDate(s.month.length === 7 ? `${s.month}-01` : s.month)
            .toLocaleDateString(undefined, { month: 'short' }),
          v: Math.abs(inK[i]),
          t: s.saved < 0 ? `−${Math.abs(inK[i])}k` : `${inK[i]}k`,
          colorKey: s.saved < 0
            ? 'destructive'
            : totalRequired > 0 && s.saved >= totalRequired ? 'success' : s.saved > 0 ? 'accent' : 'mutedFg',
          dim: s.saved === 0,
          ...(s.saved > 0 && {
            segments: (contribMonthly?.goals ?? [])
              .map(g => ({ v: Math.max(0, (g.series[i] ?? 0) / 1000), colorKey: g.color, label: g.name }))
              .filter(seg => seg.v > 0),
          }),
        })),
      })
    }

    specs.push({
      kind: 'timeline',
      span: savingsSeries.length ? 5 : 12,
      title: 'What each goal needs',
      subtitle: avgSaved !== null
        ? `You have been contributing ${formatCurrency(Math.round(avgSaved))}/mo across all pots`
        : 'Log a contribution to project finish dates',
      icon: Flag,
      /* This is the card that lists the goals, so it owns the status filter.
       * The tiles strip above reads the same filtered set; `bars` is unfiltered
       * (it is monthly savings, not per-goal). When the filter matches nothing
       * the whole grid collapses to the empty-state Card below, which carries
       * the same control so the filter can always be cleared. */
      actionNode: statusFilterNode,
      ...(onAdd && { action: '+ Add Goal', onAction: onAdd, actionVariant: 'primary' as const }),
      entries: [...visible]
        .sort((a, b) => (daysLeft(a.deadline) ?? 1e9) - (daysLeft(b.deadline) ?? 1e9))
        .map((g) => {
          const st = statusOf(g)
          const req = requiredFor(g)
          const remaining = Number(g.target_amount) - Number(g.current_amount)
          const months = monthsUntil(g.deadline)
          return {
            title: g.name,
            /* With a real contribution history the projection is answerable:
             * how long this pot takes at the rate it has actually been fed. */
            body: remaining <= 0
              ? 'Fully funded.'
              : (() => {
                  const need = req === null
                    ? `${formatCurrency(remaining)} to go. Set a deadline to get a monthly figure.`
                    : `Needs ${formatCurrency(Math.round(req))}/month for the remaining ${months === 0 ? 'part-month' : `${months} month${months === 1 ? '' : 's'}`}.`
                  const rate = ratePerGoal.get(g.id)
                  if (!rate || rate <= 0) {
                    return `${need} No contributions logged yet, so there is nothing to project from.`
                  }
                  const atRate = Math.ceil(remaining / rate)
                  return `${need} At your ${formatCurrency(Math.round(rate))}/mo into this pot that is about ${atRate} more month${atRate === 1 ? '' : 's'}.`
                })(),
            date: fmtMonth(g.deadline),
            tagLabel: st.label,
            colorKey: st.key,
          }
        }),
    })

    return specs
     
  }, [visible, savingsSeries, avgSaved, ratePerGoal, statusFilterNode, onAdd, contribMonthly])

  if (isError) {
    return (
      <ErrorState
        title="We couldn't load your goals"
        description="Nothing has been lost — the request for your savings pots failed."
        onRetry={() => { void goalsQ.refetch(); void contribMonthlyQ.refetch() }}
      />
    )
  }

  if (isLoading) return <SkeletonPage kpis={4} modules={[7, 5]} />

  return (
    <Root>
      {modules.length === 0 ? (
        <Card
          title="Savings Goals"
          subtitle="Track progress toward each savings target"
          icon={<Target size={16} />}
          action={statusFilterNode}
        >
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
        size="md"
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
            {/* Correction path only. Adding money should go through the
                Contributions panel below, which writes a ledger row AND moves
                this total server-side; setting it here moves the total alone. */}
            <Label>Current amount (₹) — correction only</Label>
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

        {updatingGoal && <GoalContributionsPanel goalId={updatingGoal.id} />}
      </Dialog>
    </Root>
  )
}
