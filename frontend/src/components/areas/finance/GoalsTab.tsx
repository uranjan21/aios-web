import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Button, Form, Input, Select, Popconfirm, Modal } from 'antd'
import { Plus, Trash2, Target, CalendarDays } from 'lucide-react'
import { financeApi } from '@/api/areas'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'
import type { FinancialGoal } from '@/types'
import { differenceInDays } from 'date-fns'

const ICONS = ['🎯', '🏖️', '🚗', '📚', '🏠', '💍', '🏋️', '💰']
const COLORS = [
  { label: 'Teal', value: '#0D9488' },
  { label: 'Orange', value: '#f97316' },
  { label: 'Emerald', value: '#10b981' },
  { label: 'Purple', value: '#8b5cf6' },
  { label: 'Blue', value: '#3b82f6' },
  { label: 'Rose', value: '#f43f5e' },
]

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
  const [form] = Form.useForm()
  const [updateForm] = Form.useForm()
  const queryClient = useQueryClient()
  const [showCreate, setShowCreate] = useState(false)
  const [selectedIcon, setSelectedIcon] = useState('🎯')
  const [selectedColor, setSelectedColor] = useState('#0D9488')
  const [updatingGoal, setUpdatingGoal] = useState<FinancialGoal | null>(null)

  const { data: goals, isLoading } = useQuery({
    queryKey: ['finance', 'goals'],
    queryFn: financeApi.goals,
  })

  const createMutation = useMutation({
    mutationFn: (values: Record<string, string>) =>
      financeApi.createGoal({
        name: values.name,
        icon: selectedIcon,
        target_amount: parseFloat(values.target_amount),
        current_amount: values.current_amount ? parseFloat(values.current_amount) : 0,
        deadline: values.deadline || null,
        category: values.category || 'savings',
        color: selectedColor,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['finance', 'goals'] })
      toast.success('Goal created')
      form.resetFields()
      setShowCreate(false)
      setSelectedIcon('🎯')
      setSelectedColor('#0D9488')
    },
    onError: () => toast.error('Failed to create goal'),
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
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Target className="w-4 h-4 text-muted-foreground" />
          <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Savings Goals</span>
        </div>
        <Button type="primary" size="small" icon={<Plus className="w-3.5 h-3.5" />} onClick={() => setShowCreate(!showCreate)}>
          New Goal
        </Button>
      </div>

      {/* Create form */}
      {showCreate && (
        <div className="bg-muted/40 border border-border/60 rounded-xl p-4 space-y-3">
          <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">New Savings Goal</p>

          {/* Icon picker */}
          <div>
            <p className="text-[11px] text-muted-foreground mb-1.5">Icon</p>
            <div className="flex gap-2 flex-wrap">
              {ICONS.map(ic => (
                <button
                  key={ic}
                  onClick={() => setSelectedIcon(ic)}
                  className={cn(
                    'w-9 h-9 rounded-lg text-xl flex items-center justify-center border-2 transition',
                    selectedIcon === ic ? 'border-primary bg-primary/10' : 'border-border hover:border-primary/50'
                  )}
                >
                  {ic}
                </button>
              ))}
            </div>
          </div>

          {/* Color picker */}
          <div>
            <p className="text-[11px] text-muted-foreground mb-1.5">Color</p>
            <div className="flex gap-2">
              {COLORS.map(c => (
                <button
                  key={c.value}
                  onClick={() => setSelectedColor(c.value)}
                  className={cn(
                    'w-7 h-7 rounded-full border-2 transition',
                    selectedColor === c.value ? 'border-foreground scale-110' : 'border-transparent'
                  )}
                  style={{ background: c.value }}
                  title={c.label}
                />
              ))}
            </div>
          </div>

          <Form form={form} layout="vertical" onFinish={createMutation.mutate} requiredMark={false}>
            <div className="grid grid-cols-2 gap-3">
              <Form.Item name="name" label={<span className="text-[11px] text-muted-foreground">Goal Name</span>} rules={[{ required: true }]}>
                <Input placeholder="e.g. Europe Trip" />
              </Form.Item>
              <Form.Item name="category" label={<span className="text-[11px] text-muted-foreground">Category</span>}>
                <Select placeholder="savings" defaultValue="savings">
                  {['savings', 'travel', 'emergency', 'investment', 'purchase', 'other'].map(c => (
                    <Select.Option key={c} value={c}>{c}</Select.Option>
                  ))}
                </Select>
              </Form.Item>
              <Form.Item name="target_amount" label={<span className="text-[11px] text-muted-foreground">Target (₹)</span>} rules={[{ required: true }]}>
                <Input type="number" prefix="₹" placeholder="100000" min="1" />
              </Form.Item>
              <Form.Item name="current_amount" label={<span className="text-[11px] text-muted-foreground">Saved so far (₹)</span>}>
                <Input type="number" prefix="₹" placeholder="0" min="0" />
              </Form.Item>
              <Form.Item name="deadline" label={<span className="text-[11px] text-muted-foreground">Deadline (optional)</span>} className="col-span-2">
                <Input type="date" />
              </Form.Item>
            </div>
            <div className="flex gap-2">
              <Button type="primary" htmlType="submit" loading={createMutation.isPending} size="small">Create Goal</Button>
              <Button type="text" size="small" onClick={() => { setShowCreate(false); form.resetFields() }}>Cancel</Button>
            </div>
          </Form>
        </div>
      )}

      {/* Goal grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map(i => <Skeleton key={i} className="h-[160px] rounded-xl" />)}
        </div>
      ) : !goals?.length ? (
        <div className="bg-card border border-border rounded-xl p-8 text-center">
          <span className="text-3xl mb-2 block">🎯</span>
          <p className="text-sm font-medium text-foreground mb-1">No savings goals yet</p>
          <p className="text-[11px] text-muted-foreground mb-3">Set a target and track your progress toward it.</p>
          <Button type="primary" size="small" icon={<Plus className="w-3.5 h-3.5" />} onClick={() => setShowCreate(true)}>
            Create your first goal
          </Button>
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
