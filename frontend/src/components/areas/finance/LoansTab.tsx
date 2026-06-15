import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Button, Form, Input, Switch, Popconfirm, Modal, Tag } from 'antd'
import { Trash2, Landmark, Percent } from 'lucide-react'
import { financeApi } from '@/api/areas'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'
import type { FinanceLoan } from '@/types'
import { PayoffPlanner } from './PayoffPlanner'

const LOAN_TYPE_META: Record<string, { label: string; icon: string }> = {
  home: { label: 'Home Loan', icon: '🏠' },
  personal: { label: 'Personal Loan', icon: '💵' },
  car: { label: 'Car Loan', icon: '🚗' },
  education: { label: 'Education Loan', icon: '🎓' },
  credit_card: { label: 'Credit Card', icon: '💳' },
  other: { label: 'Other', icon: '📄' },
}

function getDaysUntilDue(dueDay: number): number {
  const today = new Date()
  const currentDay = today.getDate()
  const daysInMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate()
  if (dueDay >= currentDay) return dueDay - currentDay
  return daysInMonth - currentDay + dueDay
}

function urgencyColor(days: number): 'error' | 'warning' | 'success' {
  if (days <= 3) return 'error'
  if (days <= 7) return 'warning'
  return 'success'
}

function ordinal(n: number) {
  const s = ['th', 'st', 'nd', 'rd']
  const v = n % 100
  return n + (s[(v - 20) % 10] || s[v] || s[0])
}

function LoanCard({ loan, onUpdate }: { loan: FinanceLoan; onUpdate: (l: FinanceLoan) => void }) {
  const queryClient = useQueryClient()
  const meta = LOAN_TYPE_META[loan.loan_type] ?? LOAN_TYPE_META.other
  const days = getDaysUntilDue(loan.emi_day)
  const urgency = urgencyColor(days)
  const principal = Number(loan.principal_amount)
  const outstanding = Number(loan.outstanding_amount)
  const paidPct = principal > 0 ? Math.min(100, Math.round(((principal - outstanding) / principal) * 100)) : 0

  const toggleMutation = useMutation({
    mutationFn: (active: boolean) => financeApi.patchLoan(loan.id, { is_active: active }),
    onSuccess: (_data, active) => {
      queryClient.invalidateQueries({ queryKey: ['finance', 'loans'] })
      toast.success(active ? 'Loan marked active' : 'Loan marked paid off')
    },
    onError: () => toast.error('Failed to update loan'),
  })

  const deleteMutation = useMutation({
    mutationFn: () => financeApi.deleteLoan(loan.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['finance', 'loans'] })
      toast.success(`${loan.name} removed`)
    },
    onError: () => toast.error('Failed to delete loan'),
  })

  return (
    <div className={cn('bg-card border border-border rounded-xl p-4 flex flex-col gap-3 group relative', !loan.is_active && 'opacity-50')}>
      <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1">
        <Popconfirm title="Delete this loan?" onConfirm={() => deleteMutation.mutate()} okText="Delete" cancelText="Cancel" okButtonProps={{ danger: true }}>
          <button className="p-1.5 rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition">
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </Popconfirm>
      </div>

      <div className="flex items-start gap-3">
        <span className="text-2xl leading-none mt-0.5">{meta.icon}</span>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-foreground truncate">{loan.name}</p>
          <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
            <span className="text-[11px] text-muted-foreground">{meta.label}</span>
            {loan.lender && <span className="text-[11px] text-muted-foreground/70">· {loan.lender}</span>}
          </div>
        </div>
        <Switch
          size="small"
          checked={loan.is_active}
          onChange={v => toggleMutation.mutate(v)}
          loading={toggleMutation.isPending}
        />
      </div>

      {/* Progress bar */}
      <div className="space-y-1.5">
        <div className="h-2 bg-muted rounded-full overflow-hidden">
          <div className="h-full rounded-full bg-primary transition-all duration-500" style={{ width: `${paidPct}%` }} />
        </div>
        <div className="flex items-center justify-between text-[11px]">
          <span className="text-foreground font-medium">
            ₹{outstanding.toLocaleString('en-IN')} outstanding of ₹{principal.toLocaleString('en-IN')}
          </span>
          <span className="font-semibold text-primary">{paidPct}% paid</span>
        </div>
      </div>

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5 flex-wrap">
          <Tag color={loan.is_active ? urgency : 'default'} className="text-[10px] leading-tight py-0">
            EMI {ordinal(loan.emi_day)} {loan.is_active && `· ${days === 0 ? 'Today' : `${days}d`}`}
          </Tag>
          <span className="inline-flex items-center gap-0.5 text-[10px] text-muted-foreground">
            <Percent className="w-2.5 h-2.5" />{Number(loan.interest_rate).toFixed(2)}% p.a.
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm font-bold text-foreground">₹{Number(loan.emi_amount).toLocaleString('en-IN')}/mo</span>
          <button onClick={() => onUpdate(loan)} className="text-[11px] font-semibold text-primary hover:text-primary/80 transition">
            Update
          </button>
        </div>
      </div>
    </div>
  )
}

export function LoansTab() {
  const [updateForm] = Form.useForm()
  const queryClient = useQueryClient()
  const [updatingLoan, setUpdatingLoan] = useState<FinanceLoan | null>(null)

  const { data: loans, isLoading } = useQuery({
    queryKey: ['finance', 'loans'],
    queryFn: financeApi.loans,
  })

  const { data: summary, isLoading: loadingSummary } = useQuery({
    queryKey: ['finance', 'loans', 'summary'],
    queryFn: financeApi.loansSummary,
  })

  const updateMutation = useMutation({
    mutationFn: (values: { outstanding_amount: string }) =>
      financeApi.patchLoan(updatingLoan!.id, { outstanding_amount: parseFloat(values.outstanding_amount) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['finance', 'loans'] })
      toast.success('Loan updated')
      setUpdatingLoan(null)
      updateForm.resetFields()
    },
    onError: () => toast.error('Failed to update loan'),
  })

  const openUpdate = (loan: FinanceLoan) => {
    setUpdatingLoan(loan)
    updateForm.setFieldsValue({ outstanding_amount: String(loan.outstanding_amount) })
  }

  return (
    <div className="space-y-4">
      {/* Summary chips */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="bg-card border border-border rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <Landmark className="w-4 h-4 text-muted-foreground" />
            <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Total Outstanding</p>
          </div>
          {loadingSummary ? <Skeleton className="h-7 w-32" /> : (
            <p className="text-2xl font-bold text-foreground">₹{(summary?.total_outstanding ?? 0).toLocaleString('en-IN')}</p>
          )}
        </div>
        <div className="bg-card border border-border rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Monthly EMI Total</span>
          </div>
          {loadingSummary ? <Skeleton className="h-7 w-32" /> : (
            <p className="text-2xl font-bold text-foreground">₹{(summary?.total_emi ?? 0).toLocaleString('en-IN')}</p>
          )}
        </div>
        <div className="bg-card border border-border rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Active Loans</span>
          </div>
          {loadingSummary ? <Skeleton className="h-7 w-12" /> : (
            <p className="text-2xl font-bold text-foreground">{summary?.active_count ?? 0}</p>
          )}
        </div>
      </div>

      {/* Header */}
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Loans &amp; EMIs</span>
      </div>

      {/* Loan cards */}
      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {[1, 2].map(i => <Skeleton key={i} className="h-[160px] rounded-xl" />)}
        </div>
      ) : !loans?.length ? (
        <div className="bg-card border border-border rounded-xl p-8 text-center">
          <span className="text-3xl mb-2 block">🏦</span>
          <p className="text-sm font-medium text-foreground mb-1">No loans tracked</p>
          <p className="text-[11px] text-muted-foreground mb-3">Use the Add panel to track EMIs, interest rates, and payoff progress.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {loans.map(l => <LoanCard key={l.id} loan={l} onUpdate={openUpdate} />)}
        </div>
      )}

      {loans && loans.some(l => l.is_active) && <PayoffPlanner loans={loans} />}

      {/* Update outstanding modal */}
      <Modal
        open={!!updatingLoan}
        title={<span className="text-foreground">Update outstanding — {updatingLoan?.name}</span>}
        onCancel={() => { setUpdatingLoan(null); updateForm.resetFields() }}
        footer={null}
        width={360}
      >
        <Form form={updateForm} layout="vertical" onFinish={updateMutation.mutate} requiredMark={false} className="mt-4">
          <Form.Item name="outstanding_amount" label={<span className="text-[11px] text-muted-foreground">Outstanding amount (₹)</span>} rules={[{ required: true }]}>
            <Input type="number" prefix="₹" placeholder="0" min="0" size="large" />
          </Form.Item>
          <div className="flex gap-2">
            <Button type="primary" htmlType="submit" loading={updateMutation.isPending}>Save</Button>
            <Button type="text" onClick={() => { setUpdatingLoan(null); updateForm.resetFields() }}>Cancel</Button>
          </div>
        </Form>
      </Modal>
    </div>
  )
}
