import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Popconfirm } from '@/components/ui/Popconfirm'
import { Button, Switch, Dialog, Badge, Input, DataTable } from '@ledgr/ui'
import { Trash2, PencilLine } from 'lucide-react'
import { financeApi } from '@/api/areas'
import { Skeleton } from '@/components/ui/skeleton'
import type { FinanceLoan } from '@/types'
import { Card } from '@/components/ui/Card'
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
  font-size: 10px;
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
  
  @media (min-width: 768px) {
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
  font-size: 11px;
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

export function LoansTab() {
  const queryClient = useQueryClient()
  const [updatingLoan, setUpdatingLoan] = useState<FinanceLoan | null>(null)
  const [outstandingAmount, setOutstandingAmount] = useState<string>('')

  const { data: loans, isLoading } = useQuery({
    queryKey: ['finance', 'loans'],
    queryFn: financeApi.loans,
  })

  const { data: summary } = useQuery({
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
      setOutstandingAmount('')
    },
    onError: () => toast.error('Failed to update loan'),
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
    setOutstandingAmount(String(loan.outstanding_amount))
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

  if (isLoading) return <LoadingContainer><LoadHead /><LoadBody /></LoadingContainer>;

  return (
    <RootContainer>
      <Card title="Loans & EMIs">
        <DataTable
          rows={loans ?? []}
          columns={columns}
          getRowKey={(row: any) => row.id}
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
          title={<span style={{ color: 'var(--foreground)' }}>Update outstanding — {updatingLoan?.name}</span>}
          onOpenChange={(open) => { if (!open) { setUpdatingLoan(null); setOutstandingAmount('') } }}
          size="sm"
        >
          <UpdateForm onSubmit={e => { e.preventDefault(); updateMutation.mutate({ outstanding_amount: outstandingAmount }) }}>
            <div>
              <FieldLabel>Outstanding amount (₹)</FieldLabel>
              <Input type="number" startAdornment="₹" placeholder="0" min="0" size="lg" value={outstandingAmount} onChange={(e) => setOutstandingAmount(e.target.value)} required />
            </div>
            <FormActions>
              <Button variant="primary" type="submit" loading={updateMutation.isPending}>Save</Button>
              <Button variant="ghost" onClick={() => { setUpdatingLoan(null); setOutstandingAmount('') }}>Cancel</Button>
            </FormActions>
          </UpdateForm>
        </Dialog>
      </Card>

      {loans && loans.some(l => l.is_active) && <PayoffPlanner loans={loans} />}
    </RootContainer>
  )
}
