import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Form, Input, Select, Button, DatePicker } from 'antd'
import { CheckCircle2, Receipt } from 'lucide-react'
import { financeApi } from '@/api/areas'
import dayjs from 'dayjs'

const CATEGORIES = [
  'Food', 'Transport', 'Rent', 'Health', 'Subscriptions',
  'Clothes', 'Entertainment', 'Utilities', 'Education',
  'Groceries', 'Personal Care', 'Investments', 'Others',
]

export function LogTransactionTab() {
  const [form] = Form.useForm()
  const queryClient = useQueryClient()
  const [lastSaved, setLastSaved] = useState<string | null>(null)

  const { mutate, isPending } = useMutation({
    mutationFn: (values: Record<string, unknown>) =>
      financeApi.createExpense({
        amount: parseFloat(String(values.amount)),
        category: String(values.category),
        description: values.description ? String(values.description).trim() : undefined,
      }),
    onSuccess: (_data, values) => {
      queryClient.invalidateQueries({ queryKey: ['finance'] })
      toast.success('Transaction saved')
      setLastSaved(`${values.category} — ₹${values.amount}`)
      form.resetFields()
      setTimeout(() => setLastSaved(null), 3500)
    },
    onError: () => toast.error('Failed to save transaction'),
  })

  return (
    <div className="max-w-lg">
      <div className="bg-card border border-border/60 shadow-sm rounded-xl p-4">
        <div className="flex items-center gap-2 mb-4">
          <Receipt className="w-4 h-4 text-muted-foreground" />
          <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">New Transaction</h3>
        </div>

        <Form form={form} layout="vertical" onFinish={mutate} requiredMark={false}>
          <div className="grid grid-cols-2 gap-3">
            <Form.Item
              name="amount"
              label={<span className="text-[11px] text-muted-foreground font-medium">Amount (₹)</span>}
              rules={[{ required: true, message: 'Enter amount' }, { validator: (_, v) => parseFloat(v) > 0 ? Promise.resolve() : Promise.reject('Must be > 0') }]}
            >
              <Input type="number" prefix="₹" placeholder="0.00" min="0" step="0.01" />
            </Form.Item>

            <Form.Item
              name="date"
              label={<span className="text-[11px] text-muted-foreground font-medium">Date</span>}
              initialValue={dayjs()}
            >
              <DatePicker className="w-full" format="MMM D, YYYY" />
            </Form.Item>
          </div>

          <Form.Item
            name="category"
            label={<span className="text-[11px] text-muted-foreground font-medium">Category</span>}
            rules={[{ required: true, message: 'Select a category' }]}
          >
            <Select placeholder="Select category" showSearch>
              {CATEGORIES.map(c => <Select.Option key={c} value={c}>{c}</Select.Option>)}
            </Select>
          </Form.Item>

          <Form.Item
            name="description"
            label={<span className="text-[11px] text-muted-foreground font-medium">Description</span>}
          >
            <Input placeholder="e.g. Lunch at Haldiram's" maxLength={200} />
          </Form.Item>

          <Button type="primary" htmlType="submit" loading={isPending} block>
            Save Transaction
          </Button>
        </Form>

        {lastSaved && (
          <div className="mt-3 flex items-center gap-2 text-emerald-500 text-[11px] font-medium">
            <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
            Saved: {lastSaved}
          </div>
        )}
      </div>
    </div>
  )
}
