import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Form, Input, Select, Button, Space, Popconfirm, Table } from 'antd'
import { Trash2, PencilLine } from 'lucide-react'
import { financeApi } from '@/api/areas'
import { formatCurrency } from '@/lib/utils'
import { Skeleton } from '@/components/ui/skeleton'
import type { BudgetLimit } from '@/types'
import { TableContainer, TableHeader } from './TableStyles'

const CATEGORIES = [
  'Food', 'Transport', 'Rent', 'Health', 'Subscriptions',
  'Clothes', 'Entertainment', 'Utilities', 'Education',
  'Groceries', 'Personal Care', 'Investments', 'Others',
]

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

  const deleteMutation = useMutation({
    mutationFn: (category: string) => financeApi.deleteBudget(category),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['finance', 'budgets'] })
      toast.success('Budget removed')
    },
    onError: () => toast.error('Failed to delete budget'),
  })

  const handleEdit = (budget: BudgetLimit) => {
    setEditing(budget)
    form.setFieldsValue({ category: budget.category, monthly_limit: String(budget.monthly_limit) })
    setShowForm(true)
  }

  const totalBudget = budgets?.reduce((s, b) => s + Number(b.monthly_limit), 0) ?? 0

  const columns = [
    {
      title: 'Category',
      dataIndex: 'category',
      key: 'category',
      render: (category: string) => (
        <div className="flex items-center gap-2.5">
          <div className="w-2 h-2 rounded-full bg-primary/60 shrink-0" />
          <span className="font-medium text-foreground">{category}</span>
        </div>
      )
    },
    {
      title: 'Limit',
      dataIndex: 'monthly_limit',
      key: 'limit',
      render: (limit: string | number) => <span className="font-medium">{formatCurrency(Number(limit))}</span>
    },
    {
      title: 'Spent',
      key: 'spent',
      render: (_: any, record: BudgetLimit) => {
        const limit = Number(record.monthly_limit)
        const spent = spentByCategory.get(record.category) ?? 0
        const over = spent > limit
        return <span className={over ? 'text-red-500 font-medium' : 'text-foreground'}>{formatCurrency(spent)}</span>
      }
    },
    {
      title: 'Utilization',
      key: 'utilization',
      render: (_: any, record: BudgetLimit) => {
        const limit = Number(record.monthly_limit)
        const spent = spentByCategory.get(record.category) ?? 0
        const pct = limit > 0 ? Math.min(100, Math.round((spent / limit) * 100)) : 0
        const over = spent > limit
        const barColor = over ? 'bg-red-500' : pct >= 80 ? 'bg-amber-500' : 'bg-emerald-500'
        return (
          <div className="w-[120px] lg:w-[150px]">
            <div className="h-1.5 rounded-full bg-muted overflow-hidden mt-1">
              <div className={`h-full rounded-full transition-all ${barColor}`} style={{ width: `${pct}%` }} />
            </div>
          </div>
        )
      }
    },
    {
      title: 'Action',
      key: 'action',
      render: (_: any, record: BudgetLimit) => (
        <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
          <Button type="text" size="small" icon={<PencilLine size={14} />} onClick={() => handleEdit(record)} />
          <Popconfirm title="Delete this budget?" onConfirm={() => deleteMutation.mutate(record.category)} okText="Delete" cancelText="Cancel" okButtonProps={{ danger: true }}>
            <Button type="text" danger size="small" icon={<Trash2 size={14} />} />
          </Popconfirm>
        </div>
      )
    }
  ]

  if (isLoading) return <div className="space-y-4"><Skeleton className="h-10" /><Skeleton className="h-[200px]" /></div>;

  return (
    <TableContainer>
      <TableHeader>
        <h3>Limits by Category</h3>
      </TableHeader>

      {/* Add/Edit form */}
      {showForm && (
        <div className="bg-muted/40 border-0 rounded-2xl p-3 mb-4">
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

      <Table
        dataSource={budgets}
        columns={columns}
        rowKey="category"
        pagination={false}
        size="middle"
        rowClassName={() => 'group'}
        summary={() => {
          return (
            <Table.Summary.Row>
              <Table.Summary.Cell index={0}>Total Monthly Limit</Table.Summary.Cell>
              <Table.Summary.Cell index={1} colSpan={4}>{formatCurrency(totalBudget)}</Table.Summary.Cell>
            </Table.Summary.Row>
          );
        }}
      />
    </TableContainer>
  )
}
