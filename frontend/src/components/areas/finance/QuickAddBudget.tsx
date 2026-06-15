import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Form, Input, Select, Switch, Button } from 'antd'
import { financeApi } from '@/api/areas'
import { GlassCard } from '@/components/lumina'
import { RailHeading } from '@/components/layout/WorkspaceLayout'
import { TextTabs } from '@/components/ui/TextTabs'
import { cn } from '@/lib/utils'

const CATEGORIES = [
  'Food', 'Transport', 'Rent', 'Health', 'Subscriptions',
  'Clothes', 'Entertainment', 'Utilities', 'Education',
  'Groceries', 'Personal Care', 'Investments', 'Others',
]

const GOAL_CATEGORIES = ['savings', 'travel', 'emergency', 'investment', 'purchase', 'other']
const BILL_CATEGORIES = ['utilities', 'rent', 'subscriptions', 'insurance', 'emi', 'other']

const ICONS = ['🎯', '🏖️', '🚗', '📚', '🏠', '💍', '🏋️', '💰']
const COLORS = [
  { label: 'Teal', value: '#0D9488' },
  { label: 'Orange', value: '#f97316' },
  { label: 'Emerald', value: '#10b981' },
  { label: 'Purple', value: '#8b5cf6' },
  { label: 'Blue', value: '#3b82f6' },
  { label: 'Rose', value: '#f43f5e' },
]

function AddBudgetForm() {
  const [form] = Form.useForm()
  const queryClient = useQueryClient()
  const { data: budgets } = useQuery({ queryKey: ['finance', 'budgets'], queryFn: financeApi.budgets })

  const { mutate, isPending } = useMutation({
    mutationFn: (v: { category: string; monthly_limit: string }) =>
      financeApi.upsertBudget({ category: v.category, monthly_limit: parseFloat(v.monthly_limit) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['finance', 'budgets'] })
      toast.success('Budget added')
      form.resetFields()
    },
    onError: () => toast.error('Failed to save budget'),
  })

  const available = CATEGORIES.filter(c => !budgets?.some(b => b.category === c))

  return (
    <Form form={form} layout="vertical" size="small" onFinish={mutate} requiredMark={false}>
      <Form.Item name="category" label="Category" rules={[{ required: true }]}>
        <Select placeholder="Category" showSearch>
          {available.map(c => <Select.Option key={c} value={c}>{c}</Select.Option>)}
        </Select>
      </Form.Item>
      <Form.Item name="monthly_limit" label="Monthly Limit (₹)" rules={[{ required: true }]}>
        <Input type="number" min="1" />
      </Form.Item>
      <Button type="primary" htmlType="submit" loading={isPending} size="small" block>Add Budget</Button>
    </Form>
  )
}

function AddGoalForm() {
  const [form] = Form.useForm()
  const queryClient = useQueryClient()
  const [icon, setIcon] = useState('🎯')
  const [color, setColor] = useState('#0D9488')

  const { mutate, isPending } = useMutation({
    mutationFn: (v: Record<string, string>) =>
      financeApi.createGoal({
        name: v.name,
        icon,
        target_amount: parseFloat(v.target_amount),
        current_amount: v.current_amount ? parseFloat(v.current_amount) : 0,
        deadline: v.deadline || null,
        category: v.category || 'savings',
        color,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['finance', 'goals'] })
      toast.success('Goal created')
      form.resetFields()
      setIcon('🎯')
      setColor('#0D9488')
    },
    onError: () => toast.error('Failed to create goal'),
  })

  return (
    <Form form={form} layout="vertical" size="small" onFinish={mutate} requiredMark={false}>
      <div className="text-[11px] text-muted-foreground mb-1">Icon</div>
      <div className="flex gap-1.5 flex-wrap mb-2">
        {ICONS.map(ic => (
          <button
            key={ic}
            type="button"
            onClick={() => setIcon(ic)}
            className={cn(
              'w-7 h-7 rounded-lg text-base flex items-center justify-center border transition',
              icon === ic ? 'border-primary bg-primary/10' : 'border-border hover:border-primary/50'
            )}
          >
            {ic}
          </button>
        ))}
      </div>
      <div className="text-[11px] text-muted-foreground mb-1">Color</div>
      <div className="flex gap-1.5 mb-2">
        {COLORS.map(c => (
          <button
            key={c.value}
            type="button"
            onClick={() => setColor(c.value)}
            className={cn('w-6 h-6 rounded-full border-2 transition', color === c.value ? 'border-foreground scale-110' : 'border-transparent')}
            style={{ background: c.value }}
            title={c.label}
          />
        ))}
      </div>
      <Form.Item name="name" label="Goal Name" rules={[{ required: true }]}>
        <Input placeholder="e.g. Europe Trip" />
      </Form.Item>
      <Form.Item name="category" label="Category" initialValue="savings">
        <Select>
          {GOAL_CATEGORIES.map(c => <Select.Option key={c} value={c}>{c}</Select.Option>)}
        </Select>
      </Form.Item>
      <div className="grid grid-cols-2 gap-2">
        <Form.Item name="target_amount" label="Target (₹)" rules={[{ required: true }]}>
          <Input type="number" min="1" />
        </Form.Item>
        <Form.Item name="current_amount" label="Saved (₹)">
          <Input type="number" min="0" />
        </Form.Item>
      </div>
      <Form.Item name="deadline" label="Deadline">
        <Input type="date" />
      </Form.Item>
      <Button type="primary" htmlType="submit" loading={isPending} size="small" block>Create Goal</Button>
    </Form>
  )
}

function AddBillForm() {
  const [form] = Form.useForm()
  const queryClient = useQueryClient()
  const { data: accounts } = useQuery({ queryKey: ['finance', 'accounts'], queryFn: financeApi.accounts })

  const { mutate, isPending } = useMutation({
    mutationFn: (v: Record<string, any>) =>
      financeApi.createBill({
        name: String(v.name),
        amount: parseFloat(String(v.amount)),
        due_day: parseInt(String(v.due_day), 10),
        category: v.category ? String(v.category) : undefined,
        is_auto_debit: Boolean(v.is_auto_debit),
        notes: v.notes ? String(v.notes) : undefined,
        account_id: v.account_id ? String(v.account_id) : undefined,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['finance', 'bills'] })
      toast.success('Bill added')
      form.resetFields()
    },
    onError: () => toast.error('Failed to add bill'),
  })

  return (
    <Form form={form} layout="vertical" size="small" onFinish={mutate} requiredMark={false}>
      <Form.Item name="name" label="Bill Name" rules={[{ required: true }]}>
        <Input placeholder="Netflix, Electricity…" />
      </Form.Item>
      <div className="grid grid-cols-2 gap-2">
        <Form.Item name="amount" label="Amount (₹)" rules={[{ required: true }]}>
          <Input type="number" min="0" />
        </Form.Item>
        <Form.Item name="due_day" label="Due Day (1-31)" rules={[{ required: true }]}>
          <Input type="number" min="1" max="31" />
        </Form.Item>
      </div>
      <Form.Item name="category" label="Category" initialValue="other">
        <Select>
          {BILL_CATEGORIES.map(c => <Select.Option key={c} value={c} className="capitalize">{c}</Select.Option>)}
        </Select>
      </Form.Item>
      <Form.Item name="account_id" label="Pay From Account">
        <Select placeholder="Select account (optional)" allowClear>
          {(accounts ?? []).map((a: any) => <Select.Option key={a.id} value={a.id}>{a.name}</Select.Option>)}
        </Select>
      </Form.Item>
      <Form.Item name="is_auto_debit" label="Auto-debit" valuePropName="checked">
        <Switch size="small" />
      </Form.Item>
      <Form.Item name="notes" label="Notes">
        <Input placeholder="Optional note" />
      </Form.Item>
      <Button type="primary" htmlType="submit" loading={isPending} size="small" block>Add Bill</Button>
    </Form>
  )
}

const OPTIONS = ['Budget', 'Goal', 'Bill']

export function QuickAddBudget() {
  const [tab, setTab] = useState('Budget')

  return (
    <>
      <RailHeading>Add New</RailHeading>
      <GlassCard hoverable fadeIn="up">
        <TextTabs block options={OPTIONS} value={tab} onChange={setTab} className="mb-3" />
        {tab === 'Budget' && <AddBudgetForm />}
        {tab === 'Goal' && <AddGoalForm />}
        {tab === 'Bill' && <AddBillForm />}
      </GlassCard>
    </>
  )
}
