import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Popconfirm } from '@aios/shared/components/ui/Popconfirm'
import { Button, Switch, Dialog, Badge, Input, DataTable, Card, Select } from '@ledgr/ui'
import { Trash2, PencilLine, Landmark, Plus } from 'lucide-react'
import { financeApi } from '@aios/shared/api/areas'
import { Skeleton } from '@aios/shared/components/ui/skeleton'
import type { FinanceLoan } from '@aios/shared/types'
import { PayoffPlanner } from './PayoffPlanner'
import styled from 'styled-components'

const RootContainer = styled.div`
  display: flex;
  flex-direction: column;
  gap: 1rem;
`

const LoadingContainer = styled.div`
  display: flex;
  flex-direction: column;
  gap: 1rem;
`

const LoadHead = styled(Skeleton)`
  height: 2.5rem;
`

const LoadBody = styled(Skeleton)`
  height: 12.5rem;
`

const LoanCell = styled.div`
  display: flex;
  align-items: center;
  gap: 0.75rem;
`

const IconWrap = styled.span`
  font-size: 1.25rem;
  line-height: 1;
`

const NameText = styled.div`
  font-weight: 500;
  color: ${({ theme }) => theme.color.foreground};
`

const SubText = styled.div`
  font-size: ${({ theme }) => theme.typography.fontSize.xs};
  color: ${({ theme }) => theme.color.mutedForeground};
`

const NumberWrap = styled.div`
  display: flex;
  flex-direction: column;
`

const MainNum = styled.div`
  font-weight: 500;
`

const ActionWrap = styled.div`
  display: flex;
  gap: 0.5rem;
  opacity: 1;
  transition: opacity 0.2s;
  
  @media ${({ theme }) => theme.media.md} {
    opacity: 0;
    tr:hover & {
      opacity: 1;
    }
  }
`


const SummaryRow = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.75rem;
  background-color: ${({ theme }) => theme.color.muted}33;
  border-top: 1px solid ${({ theme }) => theme.color.border};
  font-weight: 500;
  font-size: 0.875rem;
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

const FormActions = styled.div`
  display: flex;
  gap: 0.5rem;
  padding-top: 0.5rem;
`

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
}
const EMPTY_LOAN_FORM: LoanForm = {
  name: '', loan_type: 'home', lender: '', principal_amount: '0', outstanding_amount: '0',
  interest_rate: '0', emi_amount: '0', emi_day: '1', tenure_months: '', notes: '',
}

export function LoansTab({ onAdd }: { onAdd?: () => void } = {}) {
  const queryClient = useQueryClient()
  const [updatingLoan, setUpdatingLoan] = useState<FinanceLoan | null>(null)
  const [loanForm, setLoanForm] = useState<LoanForm>(EMPTY_LOAN_FORM)
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'paid'>('all')

  const { data: loans, isLoading } = useQuery({
    queryKey: ['finance', 'loans'],
    queryFn: financeApi.loans,
  })

  const { data: summary } = useQuery({
    queryKey: ['finance', 'loans', 'summary'],
    queryFn: financeApi.loansSummary,
  })

  const updateMutation = useMutation({
    mutationFn: (patch: Parameters<typeof financeApi.patchLoan>[1]) =>
      financeApi.patchLoan(updatingLoan!.id, patch),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['finance', 'loans'] })
      queryClient.invalidateQueries({ queryKey: ['finance', 'loans', 'summary'] })
      toast.success('Loan updated')
      setUpdatingLoan(null)
      setLoanForm(EMPTY_LOAN_FORM)
    },
    onError: (e: any) => toast.error(e?.response?.data?.detail || 'Failed to update loan'),
  })

  const toggleMutation = useMutation({
    mutationFn: ({ id, active }: { id: string; active: boolean }) => financeApi.patchLoan(id, { is_active: active }),
    onSuccess: (_data, vars) => {
      queryClient.invalidateQueries({ queryKey: ['finance', 'loans'] })
      toast.success(vars.active ? 'Loan marked active' : 'Loan marked paid off')
    },
    onError: () => toast.error('Failed to update loan'),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => financeApi.deleteLoan(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['finance', 'loans'] })
      toast.success(`Loan removed`)
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
      notes: (loan as any).notes ?? '',
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
    })
  }

  const columns = [
    {
      id: 'loan',
      header: 'Loan',
      cell: (row: any) => {
        const record = row as FinanceLoan;
        const meta = LOAN_TYPE_META[record.loan_type] ?? LOAN_TYPE_META.other
        return (
          <LoanCell>
            <IconWrap>{meta.icon}</IconWrap>
            <div>
              <NameText>{record.name}</NameText>
              <SubText>{meta.label} {record.lender ? `· ${record.lender}` : ''}</SubText>
            </div>
          </LoanCell>
        )
      }
    },
    {
      id: 'principal_amount',
      header: 'Principal',
      cell: (row: any) => `₹${Number(row.principal_amount).toLocaleString('en-IN')}`
    },
    {
      id: 'outstanding_amount',
      header: 'Outstanding',
      cell: (row: any) => {
        const record = row as FinanceLoan;
        const principal = Number(record.principal_amount)
        const outstanding = Number(record.outstanding_amount)
        const paidPct = principal > 0 ? Math.min(100, Math.round(((principal - outstanding) / principal) * 100)) : 0
        return (
          <NumberWrap>
            <MainNum>₹{outstanding.toLocaleString('en-IN')}</MainNum>
            <SubText>{paidPct}% paid</SubText>
          </NumberWrap>
        )
      }
    },
    {
      id: 'emi',
      header: 'EMI Details',
      cell: (row: any) => {
        const record = row as FinanceLoan;
        const days = getDaysUntilDue(record.emi_day)
        return (
          <NumberWrap>
            <MainNum>₹{Number(record.emi_amount).toLocaleString('en-IN')}/mo</MainNum>
            {record.is_active && (
              <div style={{ marginTop: '4px' }}>
                <Badge tone={urgencyColor(days)} size="sm">
                  Due {days === 0 ? 'Today' : `${days}d`} ({ordinal(record.emi_day)})
                </Badge>
              </div>
            )}
          </NumberWrap>
        )
      }
    },
    {
      id: 'interest_rate',
      header: 'Rate',
      cell: (row: any) => `${Number(row.interest_rate).toFixed(2)}%`
    },
    {
      id: 'status',
      header: 'Status',
      cell: (row: any) => {
        const record = row as FinanceLoan;
        return (
          <Switch
            size="sm"
            checked={record.is_active}
            onChange={e => toggleMutation.mutate({ id: record.id, active: e.target.checked })}
            disabled={toggleMutation.isPending}
          />
        )
      }
    },
    {
      id: 'action',
      header: 'Action',
      cell: (row: any) => {
        const record = row as FinanceLoan;
        return (
          <ActionWrap>
            <Button variant="ghost" size="icon" onClick={() => openUpdate(record)}>
              <PencilLine size={14} />
            </Button>
            <Popconfirm title="Delete this loan?" onConfirm={() => deleteMutation.mutate(record.id)} okText="Delete" cancelText="Cancel" okButtonProps={{ danger: true }}>
              <Button variant="destructive" size="icon">
                <Trash2 size={14} />
              </Button>
            </Popconfirm>
          </ActionWrap>
        )
      },
    }
  ]

  const visibleLoans = (loans ?? []).filter(l =>
    statusFilter === 'all' ? true : statusFilter === 'active' ? l.is_active : !l.is_active
  )

  if (isLoading) return <LoadingContainer><LoadHead /><LoadBody /></LoadingContainer>;

  return (
    <RootContainer>
      <Card
        title="Loans & EMIs"
        subtitle="Outstanding balances and monthly EMI obligations"
        icon={<Landmark size={16} />}
        action={
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
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
            {onAdd && (
              <Button size="sm" variant="primary" onClick={onAdd}>
                <Plus size={12} style={{ marginRight: 4 }} /> Add Loan
              </Button>
            )}
          </div>
        }
      >
        <DataTable
          rows={visibleLoans}
          columns={columns}
          getRowKey={(row: any) => row.id}
          empty={{ icon: <Landmark size={20} />, title: 'No loans tracked', description: 'Add a home loan, car loan, or personal loan to monitor your EMI and payoff progress.' }}
        />
        {summary && (
          <SummaryRow>
            <div>Active Total</div>
            <div>Outstanding: ₹{summary.total_outstanding.toLocaleString('en-IN')}</div>
            <div>EMI: ₹{summary.total_emi.toLocaleString('en-IN')}/mo</div>
          </SummaryRow>
        )}

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
            <FormActions>
              <Button variant="primary" type="submit" loading={updateMutation.isPending}>Save changes</Button>
              <Button variant="ghost" type="button" onClick={closeEdit} disabled={updateMutation.isPending}>Cancel</Button>
            </FormActions>
          </UpdateForm>
        </Dialog>
      </Card>

      {loans && loans.some(l => l.is_active) && <PayoffPlanner loans={loans} />}
    </RootContainer>
  )
}
