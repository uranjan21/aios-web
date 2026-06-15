import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Button, Form, Input, Popconfirm, Modal } from 'antd'
import { Trash2, CalendarDays } from 'lucide-react'
import { financeApi } from '@/api/areas'
import { Skeleton } from '@/components/ui/skeleton'
import type { FinancialGoal } from '@/types'
import { differenceInDays } from 'date-fns'

function daysLeft(deadline: string | null): number | null {
  if (!deadline) return null
  return differenceInDays(new Date(deadline), new Date())
}

function GoalCard({ goal, onUpdateAmount }: { goal: FinancialGoal; onUpdateAmount: (g: FinancialGoal) => void }) {
  const queryClient = useQueryClient()
  const pct = Math.min(100, goal.target_amount > 0 ? Math.round((goal.current_amount / goal.target_amount) * 100) : 0)
  const days = daysLeft(goal.deadline)

  const deleteMutation = useMutation({
    mutationFn: () => financeApi.deleteGoal(goal.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['finance', 'goals'] })
      toast.success(`${goal.name} deleted`)
    },
    onError: () => toast.error('Failed to delete goal'),
  })

  return (
    <div className="bg-card border border-border rounded-xl p-4 flex flex-col gap-3 group relative">
      <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity">
        <Popconfirm title="Delete this goal?" onConfirm={() => deleteMutation.mutate()} okText="Delete" cancelText="Cancel" okButtonProps={{ danger: true }}>
          <button className="p-1.5 rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition">
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </Popconfirm>
      </div>

      <div className="flex items-start gap-3">
        <span className="text-2xl leading-none mt-0.5">{goal.icon || '🎯'}</span>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-foreground truncate">{goal.name}</p>
          <p className="text-[11px] text-muted-foreground capitalize">{goal.category}</p>
        </div>
      </div>

      {/* Progress bar */}
      <div className="space-y-1.5">
        <div className="h-2 bg-muted rounded-full overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-500"
            style={{ width: `${pct}%`, background: goal.color || '#0D9488' }}
          />
        </div>
        <div className="flex items-center justify-between text-[11px]">
          <span className="text-foreground font-medium">
            ₹{goal.current_amount.toLocaleString('en-IN')} / ₹{goal.target_amount.toLocaleString('en-IN')}
          </span>
          <span className="font-semibold" style={{ color: goal.color || '#0D9488' }}>{pct}%</span>
        </div>
      </div>

      <div className="flex items-center justify-between">
        {days !== null ? (
          <div className="flex items-center gap-1 text-[11px] text-muted-foreground">
            <CalendarDays className="w-3 h-3" />
            {days > 0 ? `${days} days left` : days === 0 ? 'Due today' : 'Overdue'}
          </div>
        ) : (
          <span />
        )}
        <button
          onClick={() => onUpdateAmount(goal)}
          className="text-[11px] font-semibold text-primary hover:text-primary/80 transition"
        >
          Update
        </button>
      </div>
    </div>
  )
}

export function GoalsTab() {
  const [updateForm] = Form.useForm()
  const queryClient = useQueryClient()
  const [updatingGoal, setUpdatingGoal] = useState<FinancialGoal | null>(null)

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
      updateForm.resetFields()
    },
    onError: () => toast.error('Failed to update goal'),
  })

  const openUpdate = (goal: FinancialGoal) => {
    setUpdatingGoal(goal)
    updateForm.setFieldsValue({ current_amount: String(goal.current_amount) })
  }

  return (
    <div className="space-y-4">
      {/* Goal grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map(i => <Skeleton key={i} className="h-[160px] rounded-xl" />)}
        </div>
      ) : !goals?.length ? (
        <div className="bg-card border border-border rounded-xl p-8 text-center">
          <span className="text-3xl mb-2 block">🎯</span>
          <p className="text-sm font-medium text-foreground mb-1">No savings goals yet</p>
          <p className="text-[11px] text-muted-foreground mb-3">Use the Add panel to set a target and track progress.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {goals.map(g => (
            <GoalCard key={g.id} goal={g} onUpdateAmount={openUpdate} />
          ))}
        </div>
      )}

      {/* Update amount modal */}
      <Modal
        open={!!updatingGoal}
        title={<span className="text-foreground">Update saved amount — {updatingGoal?.name}</span>}
        onCancel={() => { setUpdatingGoal(null); updateForm.resetFields() }}
        footer={null}
        width={360}
      >
        <Form form={updateForm} layout="vertical" onFinish={updateMutation.mutate} requiredMark={false} className="mt-4">
          <Form.Item name="current_amount" label={<span className="text-[11px] text-muted-foreground">Current amount saved (₹)</span>} rules={[{ required: true }]}>
            <Input type="number" prefix="₹" placeholder="0" min="0" size="large" />
          </Form.Item>
          <div className="flex gap-2">
            <Button type="primary" htmlType="submit" loading={updateMutation.isPending}>Save</Button>
            <Button type="text" onClick={() => { setUpdatingGoal(null); updateForm.resetFields() }}>Cancel</Button>
          </div>
        </Form>
      </Modal>
    </div>
  )
}
