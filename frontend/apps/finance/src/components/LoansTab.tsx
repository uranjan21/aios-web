/**
 * Finance → Loans.
 *
 * Phase 4 conversion: the page keeps the redesign canvas's module COMPOSITION
 * for `finance:loans` — tiles(12) · progress(12) · table(7) · donut(5) — and
 * rebuilds every module from the live `/areas/finance/loans` response instead
 * of the designer's sample rows. All CRUD the old table carried is preserved:
 * create (header action), read, update, delete and active/paid-off toggle now
 * live on the payoff-progress rows and in the edit dialog.
 *
 * ONE DELIBERATE DEPARTURE FROM THE CANVAS. The canvas's donut is "What you
 * have paid so far — principal vs interest", and its third tile is "Interest
 * paid in 2026". Neither is derivable: a loan row carries current terms, not a
 * payment history, so interest already paid cannot be known without inventing
 * it. Both are flipped to the forward-looking half of the same question —
 * principal outstanding vs interest still to pay — which IS exact from the
 * stated balance, rate and EMI. Same question, answered with data that exists.
 * (Principal *cleared* needs no history and is shown as-is on tile 1.)
 */
import { useMemo, useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Popconfirm } from '@ct/shared/components/ui/Popconfirm'
import {
  Button, Card, Dialog, EmptyState, ErrorState, Input, Select, SkeletonPage, Switch,
} from '@ledgr/ui'
import { Landmark, FileText, PieChart, Trash2 } from 'lucide-react'
import { financeApi } from '@ct/shared/api/areas'
import { ModuleGrid, type ModuleSpec } from '@ct/shared/components/modules'
import type { FinanceLoan } from '@ct/shared/types'
import { LoanPaymentsPanel } from './LoanPaymentsPanel'
import { PayoffPlanner } from './PayoffPlanner'
import styled from 'styled-components'

const RootContainer = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.spacing[5]};
`

const UpdateForm = styled.form`
  margin-top: 1rem;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
`

const FieldLabel = styled.label`
  font-size: ${({ theme }) => theme.typography.fontSize.xs};
  color: ${({ theme }) => theme.color.mutedForeground};
  margin-bottom: 0.25rem;
  display: block;
`

const ToggleRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  padding-top: 0.25rem;
`

const FormActions = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding-top: 0.5rem;
`

const Spacer = styled.div`
  flex: 1;
`

const LOAN_TYPE_META: Record<string, { label: string; icon: string }> = {
  home: { label: 'Home Loan', icon: '🏠' },
  personal: { label: 'Personal Loan', icon: '💵' },
  car: { label: 'Car Loan', icon: '🚗' },
  education: { label: 'Education Loan', icon: '🎓' },
  credit_card: { label: 'Credit Card', icon: '💳' },
  other: { label: 'Other', icon: '📄' },
}

const inr = (n: number) => `₹${Math.round(n).toLocaleString('en-IN')}`

function getDaysUntilDue(dueDay: number): number {
  const today = new Date()
  const currentDay = today.getDate()
  const daysInMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate()
  if (dueDay >= currentDay) return dueDay - currentDay
  return daysInMonth - currentDay + dueDay
}

function urgencyColor(days: number): 'destructive' | 'warning' | 'success' {
  if (days <= 3) return 'destructive'
  if (days <= 7) return 'warning'
  return 'success'
}

function ordinal(n: number) {
  const s = ['th', 'st', 'nd', 'rd']
  const v = n % 100
  return n + (s[(v - 20) % 10] || s[v] || s[0])
}

/** A day-of-month recurrence clamped to months that are too short for it. */
function onDayOf(year: number, month: number, day: number): Date {
  const lastDay = new Date(year, month + 1, 0).getDate()
  return new Date(year, month, Math.min(day, lastDay))
}

/** Date of the `index`-th upcoming EMI (0 = the next one due). */
function emiDateAfter(emiDay: number, index: number): Date {
  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  let first = onDayOf(today.getFullYear(), today.getMonth(), emiDay)
  if (first < today) first = onDayOf(today.getFullYear(), today.getMonth() + 1, emiDay)
  return onDayOf(first.getFullYear(), first.getMonth() + index, emiDay)
}

const fmtDay = (d: Date) => d.toLocaleDateString(undefined, { day: 'numeric', month: 'short' })

/**
 * Instalments left on a standard amortising loan. `null` when the EMI never
 * clears the balance because it does not even cover the monthly interest —
 * that is a real state worth naming rather than rendering as a big number.
 */
function emisRemaining(balance: number, annualRate: number, emi: number): number | null {
  if (!(balance > 0)) return 0
  if (!(emi > 0)) return null
  const r = annualRate / 1200
  if (r === 0) return Math.ceil(balance / emi)
  if (emi <= balance * r) return null
  return Math.ceil(-Math.log(1 - (balance * r) / emi) / Math.log(1 + r))
}

interface Instalment { date: Date; loan: string; principal: number; interest: number }

/** The next `count` instalments across all loans, principal/interest split. */
function buildSchedule(loans: FinanceLoan[], count: number): Instalment[] {
  const out: Instalment[] = []
  for (const l of loans) {
    let balance = Number(l.outstanding_amount)
    const r = Number(l.interest_rate) / 1200
    const emi = Number(l.emi_amount)
    if (!(balance > 0) || !(emi > 0)) continue
    for (let i = 0; i < count && balance > 0; i++) {
      const interest = balance * r
      const pay = Math.min(emi, balance + interest)
      const principal = pay - interest
      if (principal <= 0) break
      out.push({ date: emiDateAfter(l.emi_day, i), loan: l.name, principal, interest })
      balance = balance + interest - pay
    }
  }
  return out.sort((a, b) => a.date.getTime() - b.date.getTime()).slice(0, count)
}

/** Total interest still owed at the current EMIs, summed across loans. */
function interestAhead(loans: FinanceLoan[]): number {
  let total = 0
  for (const l of loans) {
    let balance = Number(l.outstanding_amount)
    const r = Number(l.interest_rate) / 1200
    const emi = Number(l.emi_amount)
    const n = emisRemaining(balance, Number(l.interest_rate), emi)
    if (n === null) continue
    for (let i = 0; i < n && balance > 0; i++) {
      const interest = balance * r
      total += interest
      balance = balance + interest - Math.min(emi, balance + interest)
    }
  }
  return total
}

type LoanForm = {
  name: string
  loan_type: string
  lender: string
  principal_amount: string
  outstanding_amount: string
  interest_rate: string
  emi_amount: string
  emi_day: string
  tenure_months: string
  notes: string
  is_active: boolean
}
const EMPTY_LOAN_FORM: LoanForm = {
  name: '', loan_type: 'home', lender: '', principal_amount: '0', outstanding_amount: '0',
  interest_rate: '0', emi_amount: '0', emi_day: '1', tenure_months: '', notes: '', is_active: true,
}

export function LoansTab({ onAdd }: { onAdd?: () => void } = {}) {
  const queryClient = useQueryClient()
  const [updatingLoan, setUpdatingLoan] = useState<FinanceLoan | null>(null)
  const [loanForm, setLoanForm] = useState<LoanForm>(EMPTY_LOAN_FORM)
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'paid'>('all')

  /* Handled in place below rather than thrown to the route (F1) — see App.tsx. */
  const loansQ = useQuery({
    queryKey: ['finance', 'loans'],
    queryFn: financeApi.loans,
    meta: { inlineError: true },
  })

  const summaryQ = useQuery({
    queryKey: ['finance', 'loans', 'summary'],
    queryFn: financeApi.loansSummary,
    staleTime: 60_000,
    meta: { inlineError: true },
  })

  const loans = loansQ.data
  const loanSummary = summaryQ.data
  /* `payments` is dialog-scoped (`enabled: !!updatingLoan`) and deliberately
     not part of the first paint. */
  const isLoading = loansQ.isLoading || summaryQ.isLoading
  const isError = loansQ.isError || summaryQ.isError

  /* Payment history for the loan whose dialog is open. Amortization splits are
     captured per payment and cannot be recomputed later, so this is the only
     place the real principal/interest breakdown exists. */
  const { data: payments } = useQuery({
    queryKey: ['finance', 'loans', updatingLoan?.id, 'payments'],
    queryFn: () => financeApi.loanPayments(updatingLoan!.id),
    enabled: !!updatingLoan,
    staleTime: 30_000,
  })

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['finance', 'loans'] })
    queryClient.invalidateQueries({ queryKey: ['finance', 'loans', 'summary'] })
  }

  const updateMutation = useMutation({
    mutationFn: (patch: Parameters<typeof financeApi.patchLoan>[1]) =>
      financeApi.patchLoan(updatingLoan!.id, patch),
    onSuccess: () => {
      invalidate()
      toast.success('Loan updated')
      setUpdatingLoan(null)
      setLoanForm(EMPTY_LOAN_FORM)
    },
    onError: (e: any) => toast.error(e?.response?.data?.detail || 'Failed to update loan'),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => financeApi.deleteLoan(id),
    onSuccess: () => {
      invalidate()
      toast.success('Loan removed')
      setUpdatingLoan(null)
      setLoanForm(EMPTY_LOAN_FORM)
    },
    onError: () => toast.error('Failed to delete loan'),
  })

  const openUpdate = (loan: FinanceLoan) => {
    setUpdatingLoan(loan)
    setLoanForm({
      name: loan.name ?? '',
      loan_type: loan.loan_type ?? 'home',
      lender: loan.lender ?? '',
      principal_amount: String(loan.principal_amount ?? 0),
      outstanding_amount: String(loan.outstanding_amount ?? 0),
      interest_rate: String(loan.interest_rate ?? 0),
      emi_amount: String(loan.emi_amount ?? 0),
      emi_day: String(loan.emi_day ?? 1),
      tenure_months: loan.tenure_months != null ? String(loan.tenure_months) : '',
      notes: loan.notes ?? '',
      is_active: loan.is_active,
    })
  }

  const closeEdit = () => {
    setUpdatingLoan(null)
    setLoanForm(EMPTY_LOAN_FORM)
  }

  const handleSave = () => {
    const name = loanForm.name.trim()
    if (!name) { toast.error('Name is required'); return }
    const principal = parseFloat(loanForm.principal_amount)
    const outstanding = parseFloat(loanForm.outstanding_amount)
    const rate = parseFloat(loanForm.interest_rate)
    const emi = parseFloat(loanForm.emi_amount)
    const emiDay = parseInt(loanForm.emi_day, 10)
    const tenure = loanForm.tenure_months ? parseInt(loanForm.tenure_months, 10) : undefined
    if ([principal, outstanding, rate, emi, emiDay].some(Number.isNaN)) {
      toast.error('All numeric fields must be valid numbers'); return
    }
    if (emiDay < 1 || emiDay > 31) { toast.error('EMI day must be between 1 and 31'); return }
    updateMutation.mutate({
      name,
      loan_type: loanForm.loan_type,
      lender: loanForm.lender.trim() || undefined,
      principal_amount: principal,
      outstanding_amount: outstanding,
      interest_rate: rate,
      emi_amount: emi,
      emi_day: emiDay,
      ...(tenure !== undefined && { tenure_months: tenure }),
      notes: loanForm.notes.trim() || undefined,
      is_active: loanForm.is_active,
    })
  }

  const all = useMemo(() => loans ?? [], [loans])

  /*
   * The filter picks which loans the payoff-progress module LISTS. The tiles,
   * schedule and donut always describe live debt — a paid-off loan has no next
   * EMI and no interest ahead, so filtering them into those modules would just
   * blank them out.
   */
  const listed = useMemo(
    () => all.filter(l => (statusFilter === 'all' ? true : statusFilter === 'active' ? l.is_active : !l.is_active)),
    [all, statusFilter],
  )
  const active = useMemo(() => all.filter(l => l.is_active), [all])

  const modules = useMemo<ModuleSpec[]>(() => {
    if (!all.length) return []

    const totalOutstanding = active.reduce((s, l) => s + Number(l.outstanding_amount), 0)
    const totalPrincipal = active.reduce((s, l) => s + Number(l.principal_amount), 0)
    const clearedPct = totalPrincipal > 0
      ? Math.max(0, Math.min(100, Math.round(((totalPrincipal - totalOutstanding) / totalPrincipal) * 100)))
      : 0
    const blended = totalOutstanding > 0
      ? active.reduce((s, l) => s + Number(l.outstanding_amount) * Number(l.interest_rate), 0) / totalOutstanding
      : 0

    const withEmi = active.filter(l => Number(l.outstanding_amount) > 0)
    const nextLoan = withEmi.length
      ? withEmi.reduce((a, b) => (getDaysUntilDue(a.emi_day) <= getDaysUntilDue(b.emi_day) ? a : b))
      : null
    const nextDays = nextLoan ? getDaysUntilDue(nextLoan.emi_day) : null

    const ahead = interestAhead(withEmi)
    const schedule = buildSchedule(withEmi, 4)

    const specs: ModuleSpec[] = [
      {
        kind: 'tiles',
        span: 12,
        tiles: [
          {
            label: 'Total outstanding',
            value: inr(totalOutstanding),
            sub: totalPrincipal > 0
              ? `${clearedPct}% of ${inr(totalPrincipal)} borrowed is cleared`
              : 'No principal recorded',
            subKey: 'success',
            bar: clearedPct,
            barKey: 'accent',
          },
          {
            label: 'Next EMI',
            value: nextLoan ? inr(Number(nextLoan.emi_amount)) : '—',
            sub: nextLoan ? `Due ${ordinal(nextLoan.emi_day)} · ${nextLoan.name}` : 'Nothing due',
            ...(nextDays !== null && {
              badge: nextDays === 0 ? 'Today' : `${nextDays} day${nextDays === 1 ? '' : 's'}`,
              badgeKey: urgencyColor(nextDays),
            }),
          },
          {
            label: 'Interest still to pay',
            value: inr(ahead),
            sub: `Blended rate ${blended.toFixed(1)}% · projected at current EMIs`,
            subKey: 'warning',
          },
          /* Actual interest paid, from the per-payment amortization splits. The
           * tile beside it is a projection; this one is history. Shown as "—"
           * rather than ₹0 when no split has ever been recorded, so an
           * un-tracked loan does not read as an interest-free one. */
          {
            label: 'Interest paid so far',
            value: loanSummary?.payments_recorded
              ? inr(loanSummary.interest_paid_to_date)
              : '—',
            /* NOT "over N payments": the server sums interest only across
             * payments that HAVE a recorded split, while `payments_recorded`
             * counts them all. Pairing the two would overstate the denominator
             * and imply the figure is complete when older payments predate the
             * split capture. */
            sub: loanSummary?.payments_recorded
              ? 'From payments with a recorded split'
              : 'Mark an EMI paid to start tracking this',
            ...(loanSummary?.payments_recorded ? { subKey: 'destructive' as const } : {}),
          },
        ],
      },
    ]

    /* Gated on `all`, not `listed`: this card owns the status filter, so it has
     * to survive a filter that matches nothing — otherwise the control that
     * caused the empty result unmounts with the rows and the filter can never
     * be cleared. */
    if (all.length) {
      specs.push({
        kind: 'progress',
        span: 12,
        title: 'Payoff progress',
        subtitle: listed.length === 0
          ? 'No loans match this filter'
          : statusFilter === 'paid'
            ? 'Principal cleared on closed loans'
            : 'Principal cleared against original amount',
        icon: Landmark,
        actionNode: (
          <Select
            size="sm"
            fullWidth={false}
            aria-label="Filter loans by status"
            value={statusFilter}
            onChange={(v: any) => setStatusFilter(v as typeof statusFilter)}
            options={[
              { value: 'all', label: 'All Loans' },
              { value: 'active', label: 'Active' },
              { value: 'paid', label: 'Paid off' },
            ]}
          />
        ),
        ...(onAdd && { action: '+ Add loan', onAction: onAdd }),
        onRowClick: (i: number) => openUpdate(listed[i]),
        rows: listed.map(l => {
          const principal = Number(l.principal_amount)
          const outstanding = Number(l.outstanding_amount)
          const paidPct = principal > 0
            ? Math.max(0, Math.min(100, Math.round(((principal - outstanding) / principal) * 100)))
            : 0
          const left = emisRemaining(outstanding, Number(l.interest_rate), Number(l.emi_amount))
          const meta = l.is_active
            ? `${inr(outstanding)} left of ${inr(principal)} · ${Number(l.interest_rate).toFixed(2)}%`
              + (left === null ? ' · EMI does not cover interest' : left === 0 ? '' : ` · ${left} EMIs to go`)
            : `Closed · ${LOAN_TYPE_META[l.loan_type]?.label ?? 'Loan'}${l.lender ? ` · ${l.lender}` : ''}`
          return {
            title: `${LOAN_TYPE_META[l.loan_type]?.icon ?? '📄'} ${l.name}`,
            meta,
            pct: paidPct,
            value: `${paidPct}%`,
            colorKey: !l.is_active ? 'success' : paidPct >= 50 ? 'success' : 'accent',
          }
        }),
      })
    }

    if (schedule.length) {
      specs.push({
        kind: 'table',
        span: 7,
        title: 'EMI schedule',
        subtitle: `Next ${schedule.length === 1 ? 'instalment' : `${schedule.length} instalments`}`,
        icon: FileText,
        gridCols: '1fr 1.5fr 1fr 1fr',
        cols: [{ l: 'Date' }, { l: 'Loan' }, { l: 'Principal', a: 'right' }, { l: 'Interest', a: 'right' }],
        rows: schedule.map(s => [
          { t: fmtDay(s.date), bold: true },
          s.loan,
          inr(s.principal),
          { t: inr(s.interest), colorKey: 'warning' },
        ]),
      })
    }

    if (totalOutstanding > 0) {
      const total = totalOutstanding + ahead
      specs.push({
        kind: 'donut',
        span: 5,
        title: 'Cost from here',
        subtitle: 'Principal outstanding vs interest still to pay',
        icon: PieChart,
        centerValue: inr(total),
        centerLabel: 'Still to pay',
        slices: [
          {
            label: 'Principal outstanding',
            pct: Math.round((totalOutstanding / total) * 100),
            value: inr(totalOutstanding),
            colorKey: 'accent',
          },
          {
            label: 'Interest ahead',
            pct: Math.round((ahead / total) * 100),
            value: inr(ahead),
            colorKey: 'destructive',
          },
        ],
      })
    }

    return specs
     
  }, [all, active, listed, statusFilter, onAdd, loanSummary])

  if (isError) {
    return (
      <ErrorState
        title="We couldn't load your loans"
        description="Nothing has been lost — the request for your loan balances failed."
        onRetry={() => { void loansQ.refetch(); void summaryQ.refetch() }}
      />
    )
  }

  if (isLoading) return <SkeletonPage kpis={4} modules={[12, 7, 5]} />

  return (
    <RootContainer>
      {/* The status filter lives in the "Payoff progress" card header — it is
          the only module it drives (the tiles read `all`/`active`). It used to
          portal into the page header, which is what kept a header block on this
          page. */}
      {all.length === 0 ? (
        <Card title="Loans & EMIs" subtitle="Outstanding balances and monthly EMI obligations" icon={<Landmark size={16} />}>
          <EmptyState
            icon={<Landmark size={20} />}
            title="No loans tracked"
            description="Add a home loan, car loan, or personal loan to monitor your EMI and payoff progress."
            action={onAdd ? <Button size="sm" onClick={onAdd}>Add your first loan</Button> : undefined}
          />
        </Card>
      ) : (
        <ModuleGrid modules={modules} />
      )}

      {active.length > 0 && <PayoffPlanner loans={all} />}

      <Dialog
        open={!!updatingLoan}
        title={<span style={{ color: 'var(--foreground)' }}>Edit Loan{updatingLoan?.name ? ` — ${updatingLoan.name}` : ''}</span>}
        onOpenChange={(open) => { if (!open) closeEdit() }}
        size="md"
      >
        <UpdateForm onSubmit={e => { e.preventDefault(); handleSave() }}>
          <div>
            <FieldLabel>Loan name</FieldLabel>
            <Input value={loanForm.name} onChange={(e: any) => setLoanForm(f => ({ ...f, name: e.target.value }))} placeholder="Home Loan — SBI" autoFocus required />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <FieldLabel>Type</FieldLabel>
              <Select fullWidth value={loanForm.loan_type} onChange={(v: any) => setLoanForm(f => ({ ...f, loan_type: String(v) }))} options={[
                { value: 'home', label: 'Home loan' },
                { value: 'personal', label: 'Personal loan' },
                { value: 'car', label: 'Car loan' },
                { value: 'education', label: 'Education loan' },
                { value: 'credit_card', label: 'Credit card' },
                { value: 'other', label: 'Other' },
              ]} />
            </div>
            <div>
              <FieldLabel>Lender</FieldLabel>
              <Input value={loanForm.lender} onChange={(e: any) => setLoanForm(f => ({ ...f, lender: e.target.value }))} placeholder="SBI" />
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <FieldLabel>Principal amount</FieldLabel>
              <Input type="number" startAdornment="₹" min="0" value={loanForm.principal_amount} onChange={(e: any) => setLoanForm(f => ({ ...f, principal_amount: e.target.value }))} required />
            </div>
            <div>
              <FieldLabel>Outstanding amount</FieldLabel>
              <Input type="number" startAdornment="₹" min="0" value={loanForm.outstanding_amount} onChange={(e: any) => setLoanForm(f => ({ ...f, outstanding_amount: e.target.value }))} required />
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
            <div>
              <FieldLabel>Interest rate (%)</FieldLabel>
              <Input type="number" min="0" step="0.01" value={loanForm.interest_rate} onChange={(e: any) => setLoanForm(f => ({ ...f, interest_rate: e.target.value }))} required />
            </div>
            <div>
              <FieldLabel>EMI amount</FieldLabel>
              <Input type="number" startAdornment="₹" min="0" value={loanForm.emi_amount} onChange={(e: any) => setLoanForm(f => ({ ...f, emi_amount: e.target.value }))} required />
            </div>
            <div>
              <FieldLabel>EMI day</FieldLabel>
              <Input type="number" min="1" max="31" value={loanForm.emi_day} onChange={(e: any) => setLoanForm(f => ({ ...f, emi_day: e.target.value }))} required />
            </div>
          </div>
          <div>
            <FieldLabel>Tenure (months, optional)</FieldLabel>
            <Input type="number" min="1" value={loanForm.tenure_months} onChange={(e: any) => setLoanForm(f => ({ ...f, tenure_months: e.target.value }))} placeholder="e.g. 240" />
          </div>
          <div>
            <FieldLabel>Notes</FieldLabel>
            <Input value={loanForm.notes} onChange={(e: any) => setLoanForm(f => ({ ...f, notes: e.target.value }))} placeholder="Optional" />
          </div>
          <ToggleRow>
            <FieldLabel style={{ margin: 0 }}>Still active (off = paid off)</FieldLabel>
            <Switch
              size="sm"
              checked={loanForm.is_active}
              onChange={e => setLoanForm(f => ({ ...f, is_active: e.target.checked }))}
            />
          </ToggleRow>
          <FormActions>
            <Button variant="primary" type="submit" loading={updateMutation.isPending}>Save changes</Button>
            <Button variant="ghost" type="button" onClick={closeEdit} disabled={updateMutation.isPending}>Cancel</Button>
            <Spacer />
            <Popconfirm
              title="Delete this loan?"
              onConfirm={() => { if (updatingLoan) deleteMutation.mutate(updatingLoan.id) }}
              okText="Delete"
              cancelText="Cancel"
              okButtonProps={{ danger: true }}
            >
              <Button variant="destructive" type="button" size="sm" loading={deleteMutation.isPending}>
                <Trash2 size={14} style={{ marginRight: 4 }} /> Delete
              </Button>
            </Popconfirm>
          </FormActions>
        </UpdateForm>

        {updatingLoan && <LoanPaymentsPanel data={payments} />}
      </Dialog>
    </RootContainer>
  )
}
