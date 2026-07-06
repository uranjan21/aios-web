import { useEffect, useState } from 'react'
import styled from 'styled-components'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Card, PageHeader, Button, Dialog, DialogFooter, Input, Select, EmptyState, Label, ConfirmDialog } from '@ledgr/ui'
import { goalsApi, type MacroGoal } from '@/api/goals'
import { Target, Plus, Flag, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { ForecastWidget } from '@/components/widgets/ForecastWidget'
import { ActionCenterStrip } from '@/components/dashboard/ActionCenterStrip'
import { AreaTabs } from '@/components/ui/AreaTabs'
import { LayoutDashboard, IndianRupee, Heart, Briefcase, Rocket, PenLine } from 'lucide-react'
import { GoalsTab as FinanceGoalsTab } from '@/components/areas/finance/GoalsTab'
import { BodyGoalsSection, FitnessGoalsSection, NutritionGoalsSection } from '@/pages/areas/HealthSettingsPage'
import { BudgetTabModal } from '@/components/areas/finance/QuickAddBudget'

const Container = styled.div`
  display: flex;
  flex-direction: column;
  gap: 24px;
  padding: 20px;
  @media (min-width: 768px) {
    padding: 24px 32px;
  }
`

const TwoCol = styled.div`
  display: grid;
  grid-template-columns: 1fr;
  gap: 16px;
  @media (min-width: 768px) {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
`

const GoalsGrid = styled.div`
  display: grid;
  grid-template-columns: 1fr;
  gap: 16px;
  @media (min-width: 768px) {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
  @media (min-width: 1280px) {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }
`

const IconBtn = styled.button`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 4px;
  border: none;
  background: transparent;
  color: ${({ theme }) => theme.color.mutedForeground};
  border-radius: ${({ theme }) => theme.radii.sm};
  cursor: pointer;
  transition: background 120ms, color 120ms;
  &:hover { background: ${({ theme }) => theme.color.muted}; color: ${({ theme }) => theme.color.destructive}; }
  &:focus-visible { outline: 2px solid ${({ theme }) => theme.color.ring}; outline-offset: 2px; }
`

const CategoryChip = styled.span`
  display: inline-flex;
  font-size: 10px;
  font-weight: 600;
  letter-spacing: 0.05em;
  text-transform: uppercase;
  color: ${({ theme }) => theme.color.accent};
  background: ${({ theme }) => theme.color.accent}1A;
  padding: 2px 7px;
  border-radius: ${({ theme }) => theme.radii.sm};
`

const GoalDesc = styled.p`
  margin: 0;
  font-size: 13px;
  line-height: 1.5;
  color: ${({ theme }) => theme.color.mutedForeground};
`

const GoalMeta = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: 16px;
  font-size: 12px;
  color: ${({ theme }) => theme.color.mutedForeground};
`

const FormGrid = styled.div`
  display: flex;
  flex-direction: column;
  gap: 12px;
`

const CATEGORY_OPTIONS = ['general', 'finance', 'health', 'career', 'business', 'content'].map(c => ({
  label: c.charAt(0).toUpperCase() + c.slice(1),
  value: c,
}))

const StyledTabLabel = styled.span`
  display: flex;
  align-items: center;
  gap: 0.375rem;
`

export function GoalsPage() {
  const queryClient = useQueryClient()
  const [addOpen, setAddOpen] = useState(false)
  const [title, setTitle] = useState('')
  const [category, setCategory] = useState('general')
  const [description, setDescription] = useState('')
  const [targetDate, setTargetDate] = useState('')
  const [activeTab, setActiveTab] = useState('overview')
  const [budgetModal, setBudgetModal] = useState<{ open: boolean; tab: 'Goal' | 'Bill' }>({ open: false, tab: 'Goal' })

  // Listen for open-new-goal event from FinanceGoalsTab
  useEffect(() => {
    const handler = () => setBudgetModal({ open: true, tab: 'Goal' })
    window.addEventListener('open-new-goal', handler)
    return () => window.removeEventListener('open-new-goal', handler)
  }, [])

  const { data: goals = [], isLoading } = useQuery({
    queryKey: ['goals'],
    queryFn: goalsApi.list,
    staleTime: 60_000,
  })

  // Dialog fires onOpenChange on close only — reset via effect (project gotcha).
  useEffect(() => {
    if (addOpen) {
      setTitle('')
      setCategory('general')
      setDescription('')
      setTargetDate('')
    }
  }, [addOpen])

  const [deleteTarget, setDeleteTarget] = useState<MacroGoal | null>(null)

  const createMutation = useMutation({
    mutationFn: goalsApi.create,
    onSuccess: () => {
      toast.success('Goal added')
      setAddOpen(false)
      queryClient.invalidateQueries({ queryKey: ['goals'] })
    },
    onError: () => toast.error('Could not add goal'),
  })

  const deleteMutation = useMutation({
    mutationFn: (goalId: string) => goalsApi.remove(goalId),
    onSuccess: () => {
      toast.success('Goal deleted')
      setDeleteTarget(null)
      queryClient.invalidateQueries({ queryKey: ['goals'] })
    },
    onError: () => toast.error('Could not delete goal'),
  })

  const handleCreate = () => {
    if (!title.trim()) return
    createMutation.mutate({
      title: title.trim(),
      category,
      description: description.trim() || undefined,
      target_date: targetDate || undefined,
    })
  }

  return (
    <Container>
      <PageHeader
        title="Goals"
        subtitle="Macro goals, AI actions, and forecasts in one place"
        actions={
          <Button size="sm" variant="primary" onClick={() => setAddOpen(true)}>
            <Plus size={12} style={{ marginRight: 4 }} /> Add Goal
          </Button>
        }
      />

      <AreaTabs
        activeKey={activeTab}
        onChange={setActiveTab}
        items={[
          {
            key: 'overview',
            label: <StyledTabLabel><LayoutDashboard size={14} /> Overview</StyledTabLabel>,
            children: (
              <>
                <ActionCenterStrip />

                <TwoCol style={{ marginBottom: 24 }}>
                  <ForecastWidget domain="finance" />
                  <ForecastWidget domain="health" />
                </TwoCol>

                {!isLoading && goals.length === 0 ? (
                  <EmptyState
                    icon={<Target size={24} />}
                    title="No goals yet"
                    description="Set a macro goal — the weekly review will track it with you."
                    action={
                      <Button size="sm" variant="primary" onClick={() => setAddOpen(true)}>
                        <Plus size={12} style={{ marginRight: 4 }} /> Add your first goal
                      </Button>
                    }
                  />
                ) : (
                  <GoalsGrid>
                    {goals.map(goal => (
                      <Card
                        key={goal.id}
                        title={goal.title}
                        icon={<Flag size={16} />}
                        action={
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <CategoryChip>{goal.category}</CategoryChip>
                            <IconBtn onClick={() => setDeleteTarget(goal)} aria-label={`Delete goal ${goal.title}`}>
                              <Trash2 size={14} />
                            </IconBtn>
                          </div>
                        }
                      >
                        <GoalDesc>{goal.description || 'No description provided.'}</GoalDesc>
                        <GoalMeta>
                          <span>Status: {goal.status}</span>
                          {goal.target_date && <span>Target: {goal.target_date}</span>}
                        </GoalMeta>
                      </Card>
                    ))}
                  </GoalsGrid>
                )}
              </>
            )
          },
          {
            key: 'finance',
            label: <StyledTabLabel><IndianRupee size={14} /> Finance</StyledTabLabel>,
            children: <FinanceGoalsTab onAdd={() => setBudgetModal({ open: true, tab: 'Goal' })} />
          },
          {
            key: 'health',
            label: <StyledTabLabel><Heart size={14} /> Health</StyledTabLabel>,
            children: (
              <TwoCol>
                <BodyGoalsSection />
                <FitnessGoalsSection />
                <NutritionGoalsSection />
              </TwoCol>
            )
          },
          {
            key: 'career',
            label: <StyledTabLabel><Briefcase size={14} /> Career</StyledTabLabel>,
            children: <EmptyState title="Career Goals" description="Career targets and milestones will appear here." />
          },
          {
            key: 'business',
            label: <StyledTabLabel><Rocket size={14} /> Business</StyledTabLabel>,
            children: <EmptyState title="Business Goals" description="Business targets and milestones will appear here." />
          },
          {
            key: 'content',
            label: <StyledTabLabel><PenLine size={14} /> Content</StyledTabLabel>,
            children: <EmptyState title="Content Goals" description="Content generation and growth goals will appear here." />
          },
        ]}
      />

      <Dialog open={addOpen} onOpenChange={setAddOpen} title="Add Macro Goal">
        <FormGrid>
          <div>
            <Label htmlFor="goal-title">Title</Label>
            <Input id="goal-title" value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g. Reach ₹10L net worth" />
          </div>
          <div>
            <Label>Category</Label>
            <Select options={CATEGORY_OPTIONS} value={category} onChange={v => setCategory(v as string)} placeholder="Category" />
          </div>
          <div>
            <Label htmlFor="goal-desc">Description (optional)</Label>
            <Input id="goal-desc" value={description} onChange={e => setDescription(e.target.value)} placeholder="What does done look like?" />
          </div>
          <div>
            <Label htmlFor="goal-date">Target date (optional)</Label>
            <Input id="goal-date" type="date" value={targetDate} onChange={e => setTargetDate(e.target.value)} />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddOpen(false)}>Cancel</Button>
            <Button
              variant="primary"
              onClick={handleCreate}
              disabled={!title.trim()}
              loading={createMutation.isPending}
            >
              Add Goal
            </Button>
          </DialogFooter>
        </FormGrid>
      </Dialog>

      <ConfirmDialog
        open={deleteTarget !== null}
        onOpenChange={(o) => { if (!o) setDeleteTarget(null) }}
        title="Delete this goal?"
        description={deleteTarget ? `"${deleteTarget.title}" and its progress history will be permanently removed.` : ''}
        confirmLabel="Delete"
        destructive
        loading={deleteMutation.isPending}
        onConfirm={() => { if (deleteTarget) deleteMutation.mutate(deleteTarget.id) }}
      />

      <BudgetTabModal
        open={budgetModal.open}
        onClose={() => setBudgetModal(m => ({ ...m, open: false }))}
        defaultTab={budgetModal.tab}
      />
    </Container>
  )
}
