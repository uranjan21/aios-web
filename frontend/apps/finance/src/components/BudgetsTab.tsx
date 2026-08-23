/**
 * Finance → Budgets.
 *
 * The canvas's `finance:budgets` page is ONE card — "Limits by Category" — with
 * the status filter and Add button in its header, a month summary line, then a
 * three-up grid of meter cards. That is the `meters` module.
 *
 * 2026-08-02: this replaced a floating filter toolbar + a four-tile KPI row +
 * a stacked `progress` list. The KPI row restated what the grid already shows
 * (total, spent, left, needing attention are all readable off six meters), and
 * the canvas does not draw it. Clicking a meter opens its editor, which is
 * where the old table's pencil/trash column went.
 */
import { useMemo, useState, useCallback} from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import dayjs from 'dayjs'
import { toast } from 'sonner'
import styled from 'styled-components'
import {
  Button, Card, Dialog, EmptyState, ErrorState, Input, Select, SkeletonPage,
} from '@ledgr/ui'
import { Gauge, Trash2 } from 'lucide-react'
import { FieldError, useFieldErrors } from '@ct/shared/components/forms/fieldErrors'
import { financeApi } from '@ct/shared/api/areas'
import { ModuleGrid, type ModuleSpec } from '@ct/shared/components/modules'
import { formatAmount } from '@ct/shared/lib/utils'
import type { BudgetLimit } from '@ct/shared/types'

const Root = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.spacing[5]};
`

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

const Actions = styled.div`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing[2]};
  padding-top: ${({ theme }) => theme.spacing[2]};
`

const Spacer = styled.div`
  flex: 1;
`

/** 100%+ is over; 80%+ is close enough to warn about. */
function toneFor(pct: number) {
  if (pct >= 100) return 'destructive'
  if (pct >= 80) return 'warning'
  return 'success'
}

export function BudgetsTab({ onAddClick }: { onAddClick?: () => void }) {
  const queryClient = useQueryClient()
  const [editing, setEditing] = useState<BudgetLimit | null>(null)
  const [formCategory, setFormCategory] = useState('')
  const [formLimit, setFormLimit] = useState('')
  const f = useFieldErrors<'category' | 'monthly_limit'>('edit-budget')
  const [statusFilter, setStatusFilter] = useState<'all' | 'over' | 'near' | 'ok'>('all')

  /* Handled in place below rather than thrown to the route (F1) — see App.tsx.
     A failed status request would otherwise draw every meter at 0% spent. */
  const q = { meta: { inlineError: true } } as const

  const budgetsQ = useQuery({
    queryKey: ['finance', 'budgets'],
    queryFn: financeApi.budgets,
    ...q,
  })
  const categoriesQ = useQuery({
    queryKey: ['finance', 'categories'],
    queryFn: () => financeApi.categories('expense'),
    staleTime: 60_000,
    ...q,
  })
  const statusQ = useQuery({
    queryKey: ['finance', 'budgets', 'status'],
    queryFn: () => financeApi.budgetStatus(),
    ...q,
  })

  const panels = [budgetsQ, categoriesQ, statusQ]
  const budgets = budgetsQ.data
  const allCategories = categoriesQ.data
  const status = statusQ.data
  const isLoading = panels.some((p) => p.isLoading)
  const isError = panels.some((p) => p.isError)

  // Only top-level expense categories can carry a budget.
  const categoryOptions = useMemo(
    () => (allCategories ?? []).filter(c => c.parent_id === null).map(c => c.name),
    [allCategories],
  )

  const closeEdit = () => {
    setEditing(null)
    setFormCategory('')
    setFormLimit('')
    f.reset()
  }

  const upsert = useMutation({
    mutationFn: (values: { category: string; monthly_limit: string }) =>
      financeApi.upsertBudget({ category: values.category, monthly_limit: parseFloat(values.monthly_limit) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['finance', 'budgets'] })
      queryClient.invalidateQueries({ queryKey: ['finance', 'budgets', 'status'] })
      toast.success('Budget updated')
      closeEdit()
    },
    onError: () => toast.error('Failed to save budget'),
  })

  const remove = useMutation({
    mutationFn: (category: string) => financeApi.deleteBudget(category),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['finance', 'budgets'] })
      queryClient.invalidateQueries({ queryKey: ['finance', 'budgets', 'status'] })
      toast.success('Budget removed')
      closeEdit()
    },
    onError: () => toast.error('Failed to delete budget'),
  })

  /* The Save button used to be `disabled` on empty strings, which let "0"
     through to a `Field(gt=0)` endpoint and came back as a generic toast. The
     limit is a field problem, so it is answered on the field. */
  const handleSave = (e: React.FormEvent) => {
    e.preventDefault()
    const limit = Number(formLimit)
    const ok = f.submit({
      category: formCategory ? undefined : 'Pick the category to cap.',
      monthly_limit: formLimit.trim() === '' || !Number.isFinite(limit)
        ? 'Enter a monthly limit.'
        : limit <= 0
          ? 'The limit must be more than zero.'
          : undefined,
    })
    if (ok) upsert.mutate({ category: formCategory, monthly_limit: formLimit })
  }

  const openEdit = useCallback((b: BudgetLimit) => {
    f.reset()
    setEditing(b)
    setFormCategory(b.category)
    setFormLimit(String(b.monthly_limit))
  }, [f])

  /** Each budget joined to what has actually been spent against it. */
  const rows = useMemo(() => {
    const spent = new Map((status?.items ?? []).map(i => [i.category, i.spent]))
    return (budgets ?? []).map(b => {
      const used = Number(spent.get(b.category) ?? 0)
      const limit = Number(b.monthly_limit)
      return { budget: b, used, limit, pct: limit > 0 ? (used / limit) * 100 : 0 }
    })
  }, [budgets, status])

  const visible = useMemo(() => rows.filter(r => {
    if (statusFilter === 'all') return true
    if (statusFilter === 'over') return r.pct >= 100
    if (statusFilter === 'near') return r.pct >= 80 && r.pct < 100
    return r.pct < 80
  }), [rows, statusFilter])

  const modules = useMemo<ModuleSpec[]>(() => {
    if (!rows.length) return []

    // The summary line covers EVERY budget, not the filtered subset — it is the
    // month's headline, so a filter narrowing the grid must not restate it.
    const totalLimit = rows.reduce((s, r) => s + r.limit, 0)
    const totalSpent = rows.reduce((s, r) => s + r.used, 0)

    return [
      {
        kind: 'meters',
        span: 12,
        title: 'Limits by Category',
        subtitle: "Monthly spending caps and how much you've used",
        icon: Gauge,
        actionNode: (
          <Select
            size="sm"
            fullWidth={false}
            aria-label="Filter budgets by status"
            value={statusFilter}
            onChange={(v: any) => setStatusFilter(v as typeof statusFilter)}
            options={[
              { value: 'all', label: 'All budgets' },
              { value: 'over', label: 'Over' },
              { value: 'near', label: 'Near' },
              { value: 'ok', label: 'On track' },
            ]}
          />
        ),
        ...(onAddClick && { action: '+ Add Budget', actionVariant: 'primary' as const, onAction: onAddClick }),
        summary: `${dayjs().format('MMMM YYYY')} · ${formatAmount(totalSpent)} of ${formatAmount(totalLimit)} budgeted spent`,
        emptyLabel: 'No budget matches this filter.',
        onMeterClick: (i: number) => openEdit(visible[i].budget),
        meters: visible.map(r => {
          const pct = Math.round(r.pct)
          return {
            title: r.budget.category,
            badge: `${pct}%`,
            // The track clamps at full; the badge keeps telling the truth.
            pct: Math.min(100, pct),
            colorKey: toneFor(pct),
            left: `${formatAmount(r.used)} spent`,
            right: `${formatAmount(r.limit)} limit`,
          }
        }),
      },
    ]
     
  }, [rows, visible, statusFilter, onAddClick, openEdit])

  if (isError) {
    return (
      <ErrorState
        title="We couldn't load your budgets"
        description="Nothing has been lost — the request for your limits or this month's spend failed."
        onRetry={() => { panels.forEach((p) => { void p.refetch() }) }}
      />
    )
  }

  /* One full-width `meters` module — no KPI strip on this page. */
  if (isLoading) return <SkeletonPage kpis={0} modules={[12]} />

  return (
    <Root>
      {rows.length === 0 ? (
        <Card title="Budgets" subtitle="Monthly limits per spending category" icon={<Gauge size={16} />}>
          <EmptyState
            icon={<Gauge size={20} />}
            title="No budgets set"
            description="Give a category a monthly limit and this page tracks it against your spending."
            action={onAddClick ? <Button size="sm" variant="primary" onClick={onAddClick}>Add a budget</Button> : undefined}
          />
        </Card>
      ) : (
        <ModuleGrid modules={modules} />
      )}

      <Dialog
        open={!!editing}
        onOpenChange={(o) => { if (!o) closeEdit() }}
        icon={<Gauge size={18} />}
        eyebrow="Finance"
        title={`Budget — ${editing?.category ?? ''}`}
        description="The monthly ceiling for this category."
      >
        <Form noValidate onSubmit={handleSave}>
          <div>
            <Label>Category</Label>
            <Select
              fullWidth
              value={formCategory}
              onChange={(v: any) => { f.clearField('category'); setFormCategory(String(v)) }}
              options={categoryOptions.map(c => ({ value: c, label: c }))}
            />
            <FieldError id={f.errorId('category')}>{f.errors.category}</FieldError>
          </div>
          <div>
            <Label>Monthly limit</Label>
            <Input
              type="number"
              startAdornment="₹"
              min="0"
              step="100"
              value={formLimit}
              {...f.fieldProps('monthly_limit')}
              onChange={(e: any) => { f.clearField('monthly_limit'); setFormLimit(e.target.value) }}
              autoFocus
            />
            <FieldError id={f.errorId('monthly_limit')}>{f.errors.monthly_limit}</FieldError>
          </div>
          <Actions>
            <Button variant="primary" type="submit" loading={upsert.isPending}>
              Save
            </Button>
            <Button variant="ghost" type="button" onClick={closeEdit}>Cancel</Button>
            <Spacer />
            <Button
              variant="destructive"
              type="button"
              size="sm"
              loading={remove.isPending}
              onClick={() => editing && remove.mutate(editing.category)}
            >
              <Trash2 size={14} style={{ marginRight: 4 }} /> Remove
            </Button>
          </Actions>
        </Form>
      </Dialog>
    </Root>
  )
}
