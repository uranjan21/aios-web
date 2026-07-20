import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Popconfirm } from '@aios/shared/components/ui/Popconfirm'
import { Button, Dialog, Input, DataTable, SegmentedControl, Card, Select } from '@ledgr/ui'
import { Trash2, PencilLine, CalendarDays, Target, Plus } from 'lucide-react'
import { financeApi } from '@aios/shared/api/areas'
import { Skeleton } from '@aios/shared/components/ui/skeleton'
import type { FinancialGoal } from '@aios/shared/types'
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
  border-radius: ${({ theme }) => theme.radii.sm};
  overflow: hidden;
`

const ProgressBarFill = styled.div<{ $pct: number, $color: string }>`
  height: 100%;
  border-radius: ${({ theme }) => theme.radii.sm};
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

export function GoalsTab({ onAdd }: { onAdd?: () => void } = {}) {
  type EditForm = { name: string; icon: string; target_amount: string; current_amount: string; deadline: string; color: string }
  const EMPTY_FORM: EditForm = { name: '', icon: '', target_amount: '0', current_amount: '0', deadline: '', color: '' }

  const queryClient = useQueryClient()
  const [updatingGoal, setUpdatingGoal] = useState<FinancialGoal | null>(null)
  const [editForm, setEditForm] = useState<EditForm>(EMPTY_FORM)
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'completed' | 'overdue'>('all')

  const { data: goals, isLoading } = useQuery({
    queryKey: ['finance', 'goals'],
    queryFn: financeApi.goals,
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
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
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
          </div>
        }
      >
        <DataTable
          rows={visibleGoals}
          columns={columns}
          getRowKey={row => row.id}
          empty={{ icon: <Target size={20} />, title: 'No goals yet', description: 'Create a savings goal to track your progress.', action: <Button size="sm" variant="primary" onClick={() => onAdd?.()}>Add Goal</Button> }}
        />

        <Dialog
          open={!!updatingGoal}
          title={<ModalTitle>Edit Goal{updatingGoal?.name ? ` — ${updatingGoal.name}` : ''}</ModalTitle>}
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
            </ActionsContainer>
          </FormContainer>
        </Dialog>
      </Card>
    </div>
  )
}
