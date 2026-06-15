import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Form, Input, Select, Button, Space, Popconfirm } from 'antd'
import { Trash2, PencilLine } from 'lucide-react'
import { financeApi } from '@/api/areas'
import { formatCurrency } from '@/lib/utils'
import { Skeleton } from '@/components/ui/skeleton'
import { GlassCard } from '@/components/lumina'
import type { BudgetLimit } from '@/types'

const CATEGORIES = [
  'Food', 'Transport', 'Rent', 'Health', 'Subscriptions',
  'Clothes', 'Entertainment', 'Utilities', 'Education',
  'Groceries', 'Personal Care', 'Investments', 'Others',
]

function BudgetRow({ budget, spent, onEdit }: { budget: BudgetLimit; spent: number; onEdit: (b: BudgetLimit) => void }) {
  const queryClient = useQueryClient()
  const limit = Number(budget.monthly_limit)
  const pct = limit > 0 ? Math.min(100, Math.round((spent / limit) * 100)) : 0
  const over = spent > limit
  const barColor = over ? 'bg-red-500' : pct >= 80 ? 'bg-amber-500' : 'bg-emerald-500'

  const deleteMutation = useMutation({
    mutationFn: () => financeApi.deleteBudget(budget.category),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['finance', 'budgets'] })
      toast.success(`${budget.category} budget removed`)
    },
    onError: () => toast.error('Failed to delete budget'),
  })

  return (
    <div className="px-3 py-2.5 hover:bg-muted/30 rounded-lg transition-colors group">
      <div className="flex items-center justify-between mb-1.5">
        <div className="flex items-center gap-2.5">
          <div className="w-2 h-2 rounded-full bg-primary/60 shrink-0" />
          <span className="text-[12px] font-medium text-foreground">{budget.category}</span>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-[12px] text-foreground">
            <span className={over ? 'text-red-500 font-semibold' : 'font-semibold'}>{formatCurrency(spent)}</span>
            <span className="text-muted-foreground font-normal text-[10px]"> / {formatCurrency(budget.monthly_limit)}</span>
          </span>
          <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <button
              onClick={() => onEdit(budget)}
              className="p-1 rounded hover:bg-accent text-muted-foreground hover:text-foreground transition"
              aria-label={`Edit ${budget.category} budget`}
            >
              <PencilLine className="w-3 h-3" />
            </button>
            <Popconfirm
              title="Delete this budget?"
              onConfirm={() => deleteMutation.mutate()}
              okText="Delete"
              cancelText="Cancel"
              okButtonProps={{ danger: true }}
            >
              <button
                className="p-1 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition"
                aria-label={`Delete ${budget.category} budget`}
              >
                <Trash2 className="w-3 h-3" />
              </button>
            </Popconfirm>
          </div>
        </div>
      </div>
      <div className="h-1.5 rounded-full bg-muted overflow-hidden">
        <div className={`h-full rounded-full transition-all ${barColor}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  )
}

export function BudgetsTab() {
  const [form] = Form.useForm()
  const queryClient = useQueryClient()
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState<BudgetLimit | null>(null)

  const { data: budgets, isLoading } = useQuery({
    queryKey: ['finance', 'budgets'],
    queryFn: financeApi.budgets,
  })

  const { data: status } = useQuery({
    queryKey: ['finance', 'budgets', 'status'],
    queryFn: () => financeApi.budgetStatus(),
  })
  const spentByCategory = new Map((status?.items ?? []).map(i => [i.category, i.spent]))

  const upsertMutation = useMutation({
    mutationFn: (values: { category: string; monthly_limit: string }) =>
      financeApi.upsertBudget({ category: values.category, monthly_limit: parseFloat(values.monthly_limit) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['finance', 'budgets'] })
      toast.success(editing ? 'Budget updated' : 'Budget added')
      form.resetFields()
      setShowForm(false)
      setEditing(null)
    },
    onError: () => toast.error('Failed to save budget'),
  })

  const handleEdit = (budget: BudgetLimit) => {
    setEditing(budget)
    form.setFieldsValue({ category: budget.category, monthly_limit: String(budget.monthly_limit) })
    setShowForm(true)
  }

  const totalBudget = budgets?.reduce((s, b) => s + Number(b.monthly_limit), 0) ?? 0

  return (
    <GlassCard
      title="Limits by Category"
      action={
        <span className="text-xs font-semibold text-foreground">
          {formatCurrency(totalBudget)}<span className="text-muted-foreground font-normal text-[10px]"> / mo</span>
        </span>
      }
      hoverable
      fadeIn="up"
      contentClassName="space-y-2"
    >
      {/* Add/Edit form */}
      {showForm && (
        <div className="bg-muted/40 border border-border/60 rounded-xl p-3">
          <Form form={form} layout="inline" onFinish={upsertMutation.mutate} requiredMark={false} className="gap-2 flex flex-wrap">
            <Form.Item name="category" rules={[{ required: true }]} className="flex-1 min-w-[130px] mb-2">
              <Select placeholder="Category" showSearch disabled={!!editing}>
                {CATEGORIES.filter(c => !budgets?.some(b => b.category === c) || (editing && c === editing.category))
                  .map(c => <Select.Option key={c} value={c}>{c}</Select.Option>)}
              </Select>
            </Form.Item>
            <Form.Item name="monthly_limit" rules={[{ required: true }]} className="w-28 mb-2">
              <Input type="number" prefix="₹" placeholder="Limit" min="1" />
            </Form.Item>
            <Space className="mb-2">
              <Button type="primary" htmlType="submit" loading={upsertMutation.isPending} size="small">
                {editing ? 'Update' : 'Add'}
              </Button>
              <Button type="text" size="small" onClick={() => { setShowForm(false); setEditing(null); form.resetFields() }}>
                Cancel
              </Button>
            </Space>
          </Form>
        </div>
      )}

      {/* Budget list */}
      {isLoading ? (
        <div className="space-y-2">
          {[1, 2, 3].map(i => <Skeleton key={i} className="h-8 w-full" />)}
        </div>
      ) : !budgets?.length ? (
        <div className="px-3 py-8 text-center text-[11px] text-muted-foreground">
          No budgets set. Use the Add panel to define limits.
        </div>
      ) : (
        <div>
          {budgets.map(b => (
            <BudgetRow key={b.category} budget={b} spent={spentByCategory.get(b.category) ?? 0} onEdit={handleEdit} />
          ))}
        </div>
      )}
    </GlassCard>
  )
}
