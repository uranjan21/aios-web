import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Button, Form, Input, Select, Switch, Popconfirm, Tag } from 'antd'
import { Plus, Trash2, Receipt, Zap } from 'lucide-react'
import { financeApi } from '@/api/areas'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'
import type { FinanceBill } from '@/types'

const BILL_CATEGORIES = ['utilities', 'rent', 'subscriptions', 'insurance', 'emi', 'other']

function getDaysUntilDue(dueDay: number): number {
  const today = new Date()
  const currentDay = today.getDate()
  const daysInMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate()
  if (dueDay >= currentDay) {
    return dueDay - currentDay
  }
  return daysInMonth - currentDay + dueDay
}

function urgencyColor(days: number): 'error' | 'warning' | 'success' {
  if (days <= 3) return 'error'
  if (days <= 7) return 'warning'
  return 'success'
}

function ordinal(n: number) {
  const s = ['th', 'st', 'nd', 'rd']
  const v = n % 100
  return n + (s[(v - 20) % 10] || s[v] || s[0])
}

function BillRow({ bill }: { bill: FinanceBill }) {
  const queryClient = useQueryClient()
  const days = getDaysUntilDue(bill.due_day)
  const color = urgencyColor(days)

  const toggleMutation = useMutation({
    mutationFn: (active: boolean) => financeApi.patchBill(bill.id, { is_active: active }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['finance', 'bills'] }),
    onError: () => toast.error('Failed to update bill'),
  })

  const deleteMutation = useMutation({
    mutationFn: () => financeApi.deleteBill(bill.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['finance', 'bills'] })
      toast.success(`${bill.name} removed`)
    },
    onError: () => toast.error('Failed to delete bill'),
  })

  return (
    <div className={cn(
      'flex items-center justify-between px-3 py-3 hover:bg-muted/20 rounded-lg transition-colors group',
      !bill.is_active && 'opacity-50'
    )}>
      <div className="flex items-center gap-3 min-w-0">
        <Switch
          size="small"
          checked={bill.is_active}
          onChange={v => toggleMutation.mutate(v)}
          loading={toggleMutation.isPending}
        />
        <div className="min-w-0">
          <p className="text-sm font-medium text-foreground truncate">{bill.name}</p>
          <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
            <span className="text-[10px] text-muted-foreground">Due on {ordinal(bill.due_day)}</span>
            <Tag color={color} className="text-[10px] leading-tight py-0">{days === 0 ? 'Today' : `${days}d`}</Tag>
            <Tag className="text-[10px] leading-tight py-0 capitalize">{bill.category}</Tag>
            {bill.is_auto_debit && (
              <span className="inline-flex items-center gap-0.5 text-[10px] text-blue-500 font-medium">
                <Zap className="w-2.5 h-2.5" /> Auto
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="flex items-center gap-3 shrink-0">
        <span className="text-sm font-bold text-foreground">₹{Number(bill.amount).toLocaleString('en-IN')}</span>
        <Popconfirm title="Delete this bill?" onConfirm={() => deleteMutation.mutate()} okText="Delete" cancelText="Cancel" okButtonProps={{ danger: true }}>
          <button className="p-1.5 opacity-0 group-hover:opacity-100 rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition">
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </Popconfirm>
      </div>
    </div>
  )
}

export function BillsTab() {
  const [form] = Form.useForm()
  const queryClient = useQueryClient()
  const [showForm, setShowForm] = useState(false)

  const { data: bills, isLoading } = useQuery({
    queryKey: ['finance', 'bills'],
    queryFn: financeApi.bills,
  })

  const createMutation = useMutation({
    mutationFn: (values: Record<string, unknown>) =>
      financeApi.createBill({
        name: String(values.name),
        amount: parseFloat(String(values.amount)),
        due_day: parseInt(String(values.due_day), 10),
        category: values.category ? String(values.category) : undefined,
        is_auto_debit: Boolean(values.is_auto_debit),
        notes: values.notes ? String(values.notes) : undefined,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['finance', 'bills'] })
      toast.success('Bill added')
      form.resetFields()
      setShowForm(false)
    },
    onError: () => toast.error('Failed to add bill'),
  })

  const activeBills = bills?.filter(b => b.is_active) ?? []
  const totalAmount = activeBills.reduce((s, b) => s + Number(b.amount), 0)

  // Sort by days until due
  const sorted = [...(bills ?? [])].sort((a, b) => getDaysUntilDue(a.due_day) - getDaysUntilDue(b.due_day))

  return (
    <div className="space-y-4 max-w-2xl">
      {/* Summary chips */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'Total Bills', value: `${activeBills.length}` },
          { label: 'Monthly Total', value: `₹${totalAmount.toLocaleString('en-IN')}` },
          { label: 'Auto-debit', value: `${activeBills.filter(b => b.is_auto_debit).length}` },
        ].map(c => (
          <div key={c.label} className="bg-card border border-border rounded-xl p-3 text-center">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">{c.label}</p>
            <p className="text-xl font-bold text-foreground mt-0.5">{c.value}</p>
          </div>
        ))}
      </div>

      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Receipt className="w-4 h-4 text-muted-foreground" />
          <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Recurring Bills</span>
        </div>
        <Button type="primary" size="small" icon={<Plus className="w-3.5 h-3.5" />} onClick={() => setShowForm(!showForm)}>
          Add Bill
        </Button>
      </div>

      {/* Add form */}
      {showForm && (
        <div className="bg-muted/40 border border-border/60 rounded-xl p-4">
          <Form form={form} layout="vertical" onFinish={createMutation.mutate} requiredMark={false}>
            <div className="grid grid-cols-2 gap-3">
              <Form.Item name="name" label={<span className="text-[11px] text-muted-foreground">Bill Name</span>} rules={[{ required: true }]}>
                <Input placeholder="Netflix, Electricity…" />
              </Form.Item>
              <Form.Item name="amount" label={<span className="text-[11px] text-muted-foreground">Amount (₹)</span>} rules={[{ required: true }]}>
                <Input type="number" prefix="₹" placeholder="0" min="0" />
              </Form.Item>
              <Form.Item name="due_day" label={<span className="text-[11px] text-muted-foreground">Due Day (1-31)</span>} rules={[{ required: true }]}>
                <Input type="number" placeholder="5" min="1" max="31" />
              </Form.Item>
              <Form.Item name="category" label={<span className="text-[11px] text-muted-foreground">Category</span>}>
                <Select placeholder="Select" defaultValue="other">
                  {BILL_CATEGORIES.map(c => (
                    <Select.Option key={c} value={c} className="capitalize">{c}</Select.Option>
                  ))}
                </Select>
              </Form.Item>
              <Form.Item name="is_auto_debit" label={<span className="text-[11px] text-muted-foreground">Auto-debit</span>} valuePropName="checked">
                <Switch size="small" />
              </Form.Item>
              <Form.Item name="notes" label={<span className="text-[11px] text-muted-foreground">Notes</span>}>
                <Input placeholder="Optional note" />
              </Form.Item>
            </div>
            <div className="flex gap-2">
              <Button type="primary" htmlType="submit" loading={createMutation.isPending} size="small">Add</Button>
              <Button type="text" size="small" onClick={() => { setShowForm(false); form.resetFields() }}>Cancel</Button>
            </div>
          </Form>
        </div>
      )}

      {/* Bills list */}
      <div className="bg-card border border-border rounded-xl overflow-hidden shadow-sm">
        {isLoading ? (
          <div className="p-3 space-y-2">{[1, 2, 3].map(i => <Skeleton key={i} className="h-14 w-full" />)}</div>
        ) : !sorted.length ? (
          <div className="p-8 text-center">
            <p className="text-sm text-muted-foreground">No bills tracked. Click Add Bill to start.</p>
          </div>
        ) : (
          <div className="p-1.5 space-y-0.5">
            {sorted.map(b => <BillRow key={b.id} bill={b} />)}
          </div>
        )}
      </div>
    </div>
  )
}
