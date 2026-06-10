import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Button, Form, Input, Select } from 'antd'
import { Plus, TrendingUp, TrendingDown, Wallet } from 'lucide-react'
import { financeApi } from '@/api/areas'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'
import { format } from 'date-fns'
import {
  ComposedChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer,
} from 'recharts'

const SOURCES = ['salary', 'freelance', 'dividend', 'rental', 'other']

export function CashFlowTab() {
  const [form] = Form.useForm()
  const queryClient = useQueryClient()
  const [showForm, setShowForm] = useState(false)

  const { data: cashflow, isLoading: loadingCashflow } = useQuery({
    queryKey: ['finance', 'cashflow'],
    queryFn: financeApi.cashflow,
  })

  const { data: income, isLoading: loadingIncome } = useQuery({
    queryKey: ['finance', 'income'],
    queryFn: financeApi.income,
  })

  const createIncomeMutation = useMutation({
    mutationFn: (values: Record<string, string>) =>
      financeApi.createIncome({
        amount: parseFloat(values.amount),
        source: values.source,
        description: values.description || undefined,
        logged_at: values.logged_at || undefined,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['finance', 'cashflow'] })
      queryClient.invalidateQueries({ queryKey: ['finance', 'income'] })
      toast.success('Income logged')
      form.resetFields()
      setShowForm(false)
    },
    onError: () => toast.error('Failed to log income'),
  })

  const savingsRate = cashflow?.savings_rate ?? 0
  const savingsColor = savingsRate >= 20 ? 'text-emerald-500' : savingsRate >= 10 ? 'text-amber-500' : 'text-rose-500'

  return (
    <div className="space-y-4">
      {/* KPI row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="bg-card border border-border rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp className="w-4 h-4 text-emerald-500" />
            <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Total Income</p>
          </div>
          {loadingCashflow ? <Skeleton className="h-7 w-32" /> : (
            <p className="text-2xl font-bold text-foreground">₹{(cashflow?.income_total ?? 0).toLocaleString('en-IN')}</p>
          )}
        </div>
        <div className="bg-card border border-border rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <TrendingDown className="w-4 h-4 text-rose-500" />
            <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Total Expenses</p>
          </div>
          {loadingCashflow ? <Skeleton className="h-7 w-32" /> : (
            <p className="text-2xl font-bold text-foreground">₹{(cashflow?.expense_total ?? 0).toLocaleString('en-IN')}</p>
          )}
        </div>
        <div className="bg-card border border-border rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <Wallet className="w-4 h-4 text-primary" />
            <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Savings Rate</p>
          </div>
          {loadingCashflow ? <Skeleton className="h-7 w-24" /> : (
            <p className={cn('text-2xl font-bold', savingsColor)}>{savingsRate.toFixed(1)}%</p>
          )}
        </div>
      </div>

      {/* Chart */}
      <div className="bg-card border border-border rounded-xl p-4 shadow-sm">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-4">Income vs Expenses — This Month</p>
        {loadingCashflow ? <Skeleton className="h-[220px]" /> : (
          <ResponsiveContainer width="100%" height={220}>
            <ComposedChart data={cashflow?.by_day ?? []} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis
                dataKey="date"
                tickFormatter={d => {
                  try { return format(new Date(d), 'd') } catch { return d }
                }}
                tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
              />
              <YAxis
                tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
                tickFormatter={v => `₹${(v / 1000).toFixed(0)}k`}
              />
              <Tooltip
                contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: 8, fontSize: 12 }}
                formatter={(val: number) => [`₹${val.toLocaleString('en-IN')}`, undefined]}
              />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Bar dataKey="income" name="Income" fill="#0D9488" radius={[3, 3, 0, 0]} maxBarSize={24} isAnimationActive={false} />
              <Bar dataKey="expense" name="Expense" fill="#f43f5e" radius={[3, 3, 0, 0]} maxBarSize={24} isAnimationActive={false} />
            </ComposedChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Log income */}
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Recent Income</p>
        <Button type="primary" size="small" icon={<Plus className="w-3.5 h-3.5" />} onClick={() => setShowForm(!showForm)}>
          Log Income
        </Button>
      </div>

      {showForm && (
        <div className="bg-muted/40 border border-border/60 rounded-xl p-4">
          <Form form={form} layout="vertical" onFinish={createIncomeMutation.mutate} requiredMark={false}>
            <div className="grid grid-cols-2 gap-3">
              <Form.Item name="amount" label={<span className="text-[11px] text-muted-foreground">Amount (₹)</span>} rules={[{ required: true }]}>
                <Input type="number" prefix="₹" placeholder="0" min="0" />
              </Form.Item>
              <Form.Item name="source" label={<span className="text-[11px] text-muted-foreground">Source</span>} rules={[{ required: true }]}>
                <Select placeholder="Select">
                  {SOURCES.map(s => (
                    <Select.Option key={s} value={s} className="capitalize">{s}</Select.Option>
                  ))}
                </Select>
              </Form.Item>
              <Form.Item name="description" label={<span className="text-[11px] text-muted-foreground">Description</span>}>
                <Input placeholder="e.g. July salary" />
              </Form.Item>
              <Form.Item name="logged_at" label={<span className="text-[11px] text-muted-foreground">Date</span>}>
                <Input type="date" />
              </Form.Item>
            </div>
            <div className="flex gap-2">
              <Button type="primary" htmlType="submit" loading={createIncomeMutation.isPending} size="small">Save</Button>
              <Button type="text" size="small" onClick={() => { setShowForm(false); form.resetFields() }}>Cancel</Button>
            </div>
          </Form>
        </div>
      )}

      {/* Income list */}
      <div className="bg-card border border-border rounded-xl overflow-hidden shadow-sm">
        {loadingIncome ? (
          <div className="p-3 space-y-2">{[1, 2, 3].map(i => <Skeleton key={i} className="h-12 w-full" />)}</div>
        ) : !income?.length ? (
          <div className="p-8 text-center text-sm text-muted-foreground">No income logged yet.</div>
        ) : (
          <div className="divide-y divide-border/40">
            {income.slice(0, 5).map(inc => (
              <div key={inc.id} className="flex items-center justify-between px-4 py-3 hover:bg-muted/20 transition-colors">
                <div>
                  <p className="text-sm font-medium text-foreground capitalize">{inc.source}</p>
                  <p className="text-[11px] text-muted-foreground">
                    {inc.description && `${inc.description} · `}
                    {format(new Date(inc.logged_at), 'MMM d, yyyy')}
                  </p>
                </div>
                <span className="text-sm font-bold text-emerald-500">+₹{Number(inc.amount).toLocaleString('en-IN')}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
