import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Popconfirm } from '@/components/ui/Popconfirm'
import { Button, Dialog, Input, DataTable, Card, Select } from '@ledgr/ui'
import { Trash2, PencilLine, CalendarDays, Target, Plus } from 'lucide-react'
import { goalsApi, type MacroGoal } from '@/api/goals'
import { Skeleton } from '@/components/ui/skeleton'
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

const StatusContainer = styled.div``

const StatusText = styled.div<{ $color: string }>`
  font-weight: 500;
  color: ${({ $color }) => $color};
  text-transform: capitalize;
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

function daysLeft(deadline?: string): number | null {
  if (!deadline) return null
  return differenceInDays(new Date(deadline), new Date())
}

interface DomainGoalsCardProps {
  domain: string
  onAdd?: () => void
}

export function DomainGoalsCard({ domain, onAdd }: DomainGoalsCardProps) {
  const queryClient = useQueryClient()
  const [isAddOpen, setIsAddOpen] = useState(false)
  const [updatingGoal, setUpdatingGoal] = useState<MacroGoal | null>(null)
  const [form, setForm] = useState({ title: '', description: '', target_date: '', status: 'active' })
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'completed' | 'overdue'>('all')

  const { data: allGoals, isLoading } = useQuery({
    queryKey: ['goals'],
    queryFn: goalsApi.list,
  })
  
  const goals = (allGoals || []).filter(g => g.category === domain)

  const createMutation = useMutation({
    mutationFn: goalsApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['goals'] })
      toast.success('Goal added')
      setIsAddOpen(false)
      setForm({ title: '', description: '', target_date: '', status: 'active' })
    },
    onError: () => toast.error('Failed to add goal'),
  })

  const updateMutation = useMutation({
    mutationFn: (patch: Parameters<typeof goalsApi.update>[1]) => goalsApi.update(updatingGoal!.id, patch),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['goals'] })
      toast.success('Goal updated')
      setUpdatingGoal(null)
      setForm({ title: '', description: '', target_date: '', status: 'active' })
    },
    onError: () => toast.error('Failed to update goal'),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => goalsApi.remove(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['goals'] })
      toast.success('Goal deleted')
    },
    onError: () => toast.error('Failed to delete goal'),
  })

  const openUpdate = (goal: MacroGoal) => {
    setUpdatingGoal(goal)
    setForm({
      title: goal.title,
      description: goal.description || '',
      target_date: goal.target_date || '',
      status: goal.status || 'active',
    })
  }

  const closeEdit = () => {
    setUpdatingGoal(null)
    setIsAddOpen(false)
    setForm({ title: '', description: '', target_date: '', status: 'active' })
  }

  const handleSave = () => {
    const title = form.title.trim()
    if (!title) { toast.error('Title is required'); return }
    
    if (updatingGoal) {
      // Edit sends explicit nulls so cleared fields actually clear on PATCH.
      updateMutation.mutate({
        title,
        description: form.description || null,
        target_date: form.target_date || null,
        status: form.status,
      })
    } else {
      createMutation.mutate({
        title,
        category: domain,
        description: form.description || undefined,
        target_date: form.target_date || undefined,
      })
    }
  }

  const columns = [
    {
      id: 'name',
      header: 'Goal',
      cell: (row: any) => {
        const record = row as MacroGoal;
        return (
          <GoalCell>
            <GoalIcon>🎯</GoalIcon>
            <div>
              <GoalNameText>{record.title}</GoalNameText>
              <GoalCategoryText>{record.description}</GoalCategoryText>
            </div>
          </GoalCell>
        )
      }
    },
    {
      id: 'status',
      header: 'Status',
      cell: (row: any) => {
        const record = row as MacroGoal;
        const days = daysLeft(record.target_date)
        const isDone = record.status === 'completed'
        
        let color = '#0D9488'
        if (isDone) color = '#10B981'
        else if (days !== null && days < 0) color = '#EF4444'
        else if (record.status !== 'active') color = '#F59E0B'
        
        return (
          <StatusContainer>
            <StatusText $color={color}>{record.status}</StatusText>
            {days !== null && !isDone && (
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
        const record = row as MacroGoal;
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

  const visibleGoals = goals.filter((g) => {
    if (statusFilter === 'all') return true
    const done = g.status === 'completed'
    if (statusFilter === 'completed') return done
    const days = daysLeft(g.target_date)
    if (statusFilter === 'overdue') return !done && days !== null && days < 0
    return g.status === 'active'
  })

  if (isLoading) return <LoadingContainer><LoadingHeader /><LoadingBody /></LoadingContainer>;

  return (
    <div>
      <Card
        title={`${domain.charAt(0).toUpperCase() + domain.slice(1)} Goals`}
        subtitle={`Track your macro goals for ${domain}`}
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
            <Button size="sm" variant="primary" onClick={() => onAdd ? onAdd() : setIsAddOpen(true)}>
              <Plus size={12} style={{ marginRight: 4 }} /> Add Goal
            </Button>
          </div>
        }
      >
        <DataTable
          rows={visibleGoals}
          columns={columns}
          getRowKey={row => row.id}
          empty={{ icon: <Target size={20} />, title: 'No goals yet', description: `Create a ${domain} goal to track your progress.`, action: <Button size="sm" variant="primary" onClick={() => onAdd ? onAdd() : setIsAddOpen(true)}>Add Goal</Button> }}
        />

        <Dialog
          open={isAddOpen || !!updatingGoal}
          title={<ModalTitle>{updatingGoal ? `Edit Goal — ${updatingGoal.title}` : 'Add Goal'}</ModalTitle>}
          onOpenChange={(open) => { if (!open) closeEdit() }}
          size="sm"
        >
          <FormContainer onSubmit={e => { e.preventDefault(); handleSave() }}>
            <FormGroup>
              <Label>Title</Label>
              <Input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="e.g. Publish 10 articles" autoFocus required />
            </FormGroup>
            <FormGroup>
              <Label>Description</Label>
              <Input value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="Detailed objective" />
            </FormGroup>
            {updatingGoal && (
              <FormGroup>
                <Label>Status</Label>
                <Select
                  value={form.status}
                  onChange={v => setForm(f => ({ ...f, status: v as string }))}
                  options={[
                    { value: 'active', label: 'Active' },
                    { value: 'completed', label: 'Completed' },
                    { value: 'archived', label: 'Archived' },
                  ]}
                />
              </FormGroup>
            )}
            <FormGroup>
              <Label>Target Date (optional)</Label>
              <Input type="date" value={form.target_date} onChange={e => setForm(f => ({ ...f, target_date: e.target.value }))} />
            </FormGroup>
            <ActionsContainer>
              <Button variant="primary" type="submit" loading={updateMutation.isPending || createMutation.isPending}>Save</Button>
              <Button variant="ghost" onClick={closeEdit} type="button" disabled={updateMutation.isPending || createMutation.isPending}>Cancel</Button>
            </ActionsContainer>
          </FormContainer>
        </Dialog>
      </Card>
    </div>
  )
}
