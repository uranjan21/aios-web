import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
} from 'recharts'
import { Plus } from 'lucide-react'
import { financeApi } from '@/api/areas'
import { formatCurrency, formatDate } from '@/lib/utils'

function StatCard({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="bg-card border border-border rounded-xl p-4">
      <p className="text-xs text-muted-foreground mb-1">{label}</p>
      <p className="text-2xl font-bold text-foreground font-mono">{value}</p>
      {sub && <p className="text-xs text-muted-foreground mt-1">{sub}</p>}
    </div>
  )
}

export function FinancePage() {
  const { data: snapshot } = useQuery({ queryKey: ['finance', 'latest'], queryFn: financeApi.latestSnapshot })
  const { data: snapshots } = useQuery({ queryKey: ['finance', 'snapshots'], queryFn: financeApi.snapshots })
  const { data: expenses } = useQuery({ queryKey: ['finance', 'expenses'], queryFn: () => financeApi.expenses() })
  const queryClient = useQueryClient()

  const [expenseForm, setExpenseForm] = useState({ amount: '', category: '', description: '' })

  const addExpense = useMutation({
    mutationFn: () => financeApi.createExpense({
      amount: parseFloat(expenseForm.amount),
      category: expenseForm.category,
      description: expenseForm.description || undefined,
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['finance', 'expenses'] })
      setExpenseForm({ amount: '', category: '', description: '' })
    },
  })

  const netWorthData = snapshots
    ?.slice(0, 12)
    .reverse()
    .map(s => ({
      month: s.snapshot_month.slice(0, 7),
      value: Number(s.net_worth ?? 0),
    })) ?? []

  const expenseByCategory = expenses?.reduce<Record<string, number>>((acc, e) => {
    acc[e.category] = (acc[e.category] ?? 0) + Number(e.amount)
    return acc
  }, {})

  const categoryData = Object.entries(expenseByCategory ?? {})
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([name, amount]) => ({ name, amount }))

  return (
    <div className="p-4 sm:p-6 space-y-6">
      <h1 className="text-2xl font-bold text-foreground">Finance</h1>

      {/* KPI row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCard label="Net Worth" value={formatCurrency(snapshot?.net_worth)} />
        <StatCard label="CC Debt" value={formatCurrency(snapshot?.cc_debt)} sub="Target: ₹0" />
        <StatCard label="Take-home" value={formatCurrency(snapshot?.take_home)} sub="per month" />
        <StatCard label="Emergency Fund" value={formatCurrency(snapshot?.emergency_fund)} />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-card border border-border rounded-xl p-4">
          <h2 className="text-sm font-semibold mb-4">Net Worth Trend</h2>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={netWorthData}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="month" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} tickFormatter={v => `₹${(v / 1000).toFixed(0)}K`} />
              <Tooltip formatter={(v: number) => formatCurrency(v)} />
              <Line type="monotone" dataKey="value" stroke="hsl(var(--primary))" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-card border border-border rounded-xl p-4">
          <h2 className="text-sm font-semibold mb-4">Spend by Category</h2>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={categoryData} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis type="number" tick={{ fontSize: 11 }} tickFormatter={v => `₹${v}`} />
              <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={80} />
              <Tooltip formatter={(v: number) => formatCurrency(v)} />
              <Bar dataKey="amount" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Log expense */}
      <div className="bg-card border border-border rounded-xl p-4">
        <h2 className="text-sm font-semibold mb-3">Log Expense</h2>
        <div className="flex gap-2 flex-wrap">
          <input
            type="number"
            placeholder="₹ Amount"
            value={expenseForm.amount}
            onChange={e => setExpenseForm(f => ({ ...f, amount: e.target.value }))}
            className="w-28 px-3 py-2 text-sm rounded-lg bg-muted border border-border text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
          />
          <input
            placeholder="Category"
            value={expenseForm.category}
            onChange={e => setExpenseForm(f => ({ ...f, category: e.target.value }))}
            className="w-32 px-3 py-2 text-sm rounded-lg bg-muted border border-border text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
          />
          <input
            placeholder="Note (optional)"
            value={expenseForm.description}
            onChange={e => setExpenseForm(f => ({ ...f, description: e.target.value }))}
            className="flex-1 min-w-[120px] px-3 py-2 text-sm rounded-lg bg-muted border border-border text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
          />
          <button
            onClick={() => addExpense.mutate()}
            disabled={!expenseForm.amount || !expenseForm.category || addExpense.isPending}
            className="flex items-center gap-1.5 px-3 py-2 text-sm rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition"
          >
            <Plus className="w-4 h-4" /> Add
          </button>
        </div>
      </div>

      {/* Recent expenses */}
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <div className="px-4 py-3 border-b border-border">
          <h2 className="text-sm font-semibold">Recent Expenses</h2>
        </div>
        <div className="divide-y divide-border">
          {expenses?.slice(0, 20).map(e => (
            <div key={e.id} className="flex items-center justify-between px-4 py-3">
              <div>
                <span className="text-sm font-medium text-foreground">{e.category}</span>
                {e.description && <span className="text-xs text-muted-foreground ml-2">{e.description}</span>}
              </div>
              <div className="text-right">
                <span className="text-sm font-semibold font-mono text-foreground">{formatCurrency(Number(e.amount))}</span>
                <p className="text-xs text-muted-foreground">{formatDate(e.logged_at)}</p>
              </div>
            </div>
          ))}
          {!expenses?.length && (
            <p className="px-4 py-6 text-center text-sm text-muted-foreground">No expenses logged yet</p>
          )}
        </div>
      </div>
    </div>
  )
}
