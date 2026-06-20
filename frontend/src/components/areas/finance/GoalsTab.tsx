import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Popconfirm } from '@/components/ui/Popconfirm'
import { Button, Dialog, Input, DataTable, SegmentedControl, Card } from '@ledgr/ui'
import { Trash2, PencilLine, CalendarDays, Target } from 'lucide-react'
import { financeApi } from '@/api/areas'
import { Skeleton } from '@/components/ui/skeleton'
import type { FinancialGoal } from '@/types'
import { differenceInDays } from 'date-fns'
import styled from 'styled-components'

const GoalCell = styled.div`
  display: flex;
  align-items: center;
  gap: 0.75rem;
`

const GoalIcon = styled.span`
  font-size: 1.25rem;
  line-height: 1;
`

const GoalNameText = styled.div`
  font-weight: 500;
  color: ${({ theme }) => theme.color.foreground};
`

const GoalCategoryText = styled.div`
  font-size: 10px;
  color: ${({ theme }) => theme.color.mutedForeground};
  text-transform: capitalize;
`

const ProgressContainer = styled.div`
  width: 180px;
`

const ProgressTextRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size: 11px;
  margin-bottom: 0.375rem;
`

const CurrentAmountText = styled.span`
  font-weight: 500;
  color: ${({ theme }) => theme.color.foreground};
`

const TargetAmountText = styled.span`
  color: ${({ theme }) => theme.color.mutedForeground};
`

const ProgressBarBg = styled.div`
  height: 0.375rem;
  background-color: ${({ theme }) => theme.color.muted};
  border-radius: 9999px;
  overflow: hidden;
`

const ProgressBarFill = styled.div<{ $pct: number, $color: string }>`
  height: 100%;
  border-radius: 9999px;
  transition: all 0.5s;
  width: ${({ $pct }) => $pct}%;
  background-color: ${({ $color }) => $color};
`

const StatusContainer = styled.div``

const StatusText = styled.div<{ $color: string }>`
  font-weight: 500;
  color: ${({ $color }) => $color};
`

const DueText = styled.div`
  display: flex;
  align-items: center;
  gap: 0.25rem;
  font-size: 10px;
  color: ${({ theme }) => theme.color.mutedForeground};
  margin-top: 0.125rem;
`

const ActionContainer = styled.div`
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

const LoadingContainer = styled.div`
  display: flex;
  flex-direction: column;
  gap: 1rem;
`

const LoadingHeader = styled(Skeleton)`
  height: 40px;
`

const LoadingBody = styled(Skeleton)`
  height: 200px;
`

const ModalTitle = styled.span`
  color: ${({ theme }) => theme.color.foreground};
`

const FormContainer = styled.form`
  margin-top: 1rem;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
`

const FormGroup = styled.div``

const Label = styled.label`
  font-size: 11px;
  color: ${({ theme }) => theme.color.mutedForeground};
  margin-bottom: 0.25rem;
  display: block;
`

const ActionsContainer = styled.div`
  display: flex;
  gap: 0.5rem;
  padding-top: 0.5rem;
`

function daysLeft(deadline: string | null): number | null {
  if (!deadline) return null
  return differenceInDays(new Date(deadline), new Date())
}

export function GoalsTab() {
  const queryClient = useQueryClient()
  const [updatingGoal, setUpdatingGoal] = useState<FinancialGoal | null>(null)
  const [currentAmount, setCurrentAmount] = useState<string>('')
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'completed' | 'overdue'>('all')

  const { data: goals, isLoading } = useQuery({
    queryKey: ['finance', 'goals'],
    queryFn: financeApi.goals,
  })

  const updateMutation = useMutation({
    mutationFn: (values: { current_amount: string }) =>
      financeApi.patchGoal(updatingGoal!.id, { current_amount: parseFloat(values.current_amount) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['finance', 'goals'] })
      toast.success('Goal updated')
      setUpdatingGoal(null)
      setCurrentAmount('')
    },
    onError: () => toast.error('Failed to update goal'),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => financeApi.deleteGoal(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['finance', 'goals'] })
      toast.success('Goal deleted')
    },
    onError: () => toast.error('Failed to delete goal'),
  })

  const openUpdate = (goal: FinancialGoal) => {
    setUpdatingGoal(goal)
    setCurrentAmount(String(goal.current_amount))
  }

  const columns = [
    {
      id: 'name',
      header: 'Goal',
      cell: (row: any) => {
        const record = row as FinancialGoal;
        return (
          <GoalCell>
            <GoalIcon>{record.icon || '🎯'}</GoalIcon>
            <div>
              <GoalNameText>{record.name}</GoalNameText>
              <GoalCategoryText>{record.category}</GoalCategoryText>
            </div>
          </GoalCell>
        )
      }
    },
    {
      id: 'progress',
      header: 'Progress',
      cell: (row: any) => {
        const record = row as FinancialGoal;
        const pct = Math.min(100, record.target_amount > 0 ? Math.round((record.current_amount / record.target_amount) * 100) : 0)
        return (
          <ProgressContainer>
            <ProgressTextRow>
              <CurrentAmountText>₹{record.current_amount.toLocaleString('en-IN')}</CurrentAmountText>
              <TargetAmountText>/ ₹{record.target_amount.toLocaleString('en-IN')}</TargetAmountText>
            </ProgressTextRow>
            <ProgressBarBg>
              <ProgressBarFill
                $pct={pct}
                $color={record.color || '#0D9488'}
              />
            </ProgressBarBg>
          </ProgressContainer>
        )
      }
    },
    {
      id: 'status',
      header: 'Status',
      cell: (row: any) => {
        const record = row as FinancialGoal;
        const pct = Math.min(100, record.target_amount > 0 ? Math.round((record.current_amount / record.target_amount) * 100) : 0)
        const days = daysLeft(record.deadline)
        return (
          <StatusContainer>
            <StatusText $color={record.color || '#0D9488'}>{pct}% complete</StatusText>
            {days !== null && (
              <DueText>
                <CalendarDays size={12} />
                {days > 0 ? `${days} days left` : days === 0 ? 'Due today' : 'Overdue'}
              </DueText>
            )}
          </StatusContainer>
        )
      }
    },
    {
      id: 'action',
      header: 'Action',
      cell: (row: any) => {
        const record = row as FinancialGoal;
        return (
          <ActionContainer>
            <Button variant="ghost" size="icon" onClick={() => openUpdate(record)}>
              <PencilLine size={14} />
            </Button>
            <Popconfirm title="Delete this goal?" onConfirm={() => deleteMutation.mutate(record.id)} okText="Delete" cancelText="Cancel" okButtonProps={{ danger: true }}>
              <Button variant="destructive" size="icon">
                <Trash2 size={14} />
              </Button>
            </Popconfirm>
          </ActionContainer>
        )
      }
    }
  ]

  const visibleGoals = (goals ?? []).filter((g) => {
    if (statusFilter === 'all') return true
    const done = g.target_amount > 0 && g.current_amount >= g.target_amount
    if (statusFilter === 'completed') return done
    const days = daysLeft(g.deadline)
    if (statusFilter === 'overdue') return !done && days !== null && days < 0
    return !done
  })

  if (isLoading) return <LoadingContainer><LoadingHeader /><LoadingBody /></LoadingContainer>;

  return (
    <div>
      <Card
        title="Savings Goals"
        subtitle="Track progress toward each savings target"
        icon={<Target size={16} />}
        action={
          <SegmentedControl
            size="sm"
            aria-label="Filter goals by status"
            value={statusFilter}
            onChange={(v) => setStatusFilter(v as typeof statusFilter)}
            options={[
              { value: 'all', label: 'All' },
              { value: 'active', label: 'Active' },
              { value: 'completed', label: 'Done' },
              { value: 'overdue', label: 'Overdue' },
            ]}
          />
        }
      >
        <DataTable
          rows={visibleGoals}
          columns={columns}
          getRowKey={row => row.id}
        />

        <Dialog
          open={!!updatingGoal}
          title={<ModalTitle>Update saved amount — {updatingGoal?.name}</ModalTitle>}
          onOpenChange={(open) => { if (!open) { setUpdatingGoal(null); setCurrentAmount('') } }}
          size="sm"
        >
          <FormContainer onSubmit={e => { e.preventDefault(); updateMutation.mutate({ current_amount: currentAmount }) }}>
            <FormGroup>
              <Label>Current amount saved (₹)</Label>
              <Input type="number" startAdornment="₹" placeholder="0" min="0" size="lg" value={currentAmount} onChange={(e) => setCurrentAmount(e.target.value)} required />
            </FormGroup>
            <ActionsContainer>
              <Button variant="primary" type="submit" loading={updateMutation.isPending}>Save</Button>
              <Button variant="ghost" onClick={() => { setUpdatingGoal(null); setCurrentAmount('') }} type="button">Cancel</Button>
            </ActionsContainer>
          </FormContainer>
        </Dialog>
      </Card>
    </div>
  )
}
