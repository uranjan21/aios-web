import { useQuery, useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { toast } from 'sonner'
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
  ReferenceLine, TooltipProps,
} from 'recharts'
import { Plus, Download } from 'lucide-react'
import { financeApi } from '@/api/areas'
import { formatCurrency, formatDate, exportToCsv } from '@/lib/utils'
import { Skeleton } from '@/components/ui/skeleton'
import { ErrorCard } from '@/components/ErrorCard'

function NetWorthTooltip({ active, payload, label, data }: TooltipProps<number, string> & { data: { month: string; value: number }[] }) {
  if (!active || !payload?.length) return null
  const current = payload[0].value ?? 0
  const idx = data.findIndex(d => d.month === label)
  const prev = idx > 0 ? data[idx - 1].value : null
  const delta = prev !== null ? current - prev : null
  return (
    <div className="bg-popover border border-border rounded-lg px-3 py-2 text-sm shadow-lg">
      <p className="text-muted-foreground text-xs mb-1">{label}</p>
      <p className="font-semibold font-mono">{formatCurrency(current)}</p>
      {delta !== null && (
        <p className={delta >= 0 ? 'text-emerald-400 text-xs' : 'text-red-400 text-xs'}>
          {delta >= 0 ? '↑' : '↓'} {formatCurrency(Math.abs(delta))} vs prev month
        </p>
      )}
    </div>
  )
}

function StatCard({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="bg-card border border-border rounded-xl p-4">
      <p className="text-xs text-muted-foreground mb-1">{label}</p>
      <p className="text-2xl font-bold text-foreground font-mono">{value}</p>
      {sub && <p className="text-xs text-muted-foreground mt-1">{sub}</p>}
    </div>
  )
}

function StatCardSkeleton() {
  return (
    <div className="bg-card border border-border rounded-xl p-4 space-y-2">
      <Skeleton className="h-3 w-20" />
      <Skeleton className="h-8 w-32" />
    </div>
  )
}

export function FinancePage() {
  const { data: snapshot, isLoading: loadingSnapshot, isError: errorSnapshot, refetch: refetchSnapshot } = useQuery({
    queryKey: ['finance', 'latest'],
    queryFn: financeApi.latestSnapshot,
  })
  const { data: snapshots, isLoading: loadingSnapshots } = useQuery({
    queryKey: ['finance', 'snapshots'],
    queryFn: financeApi.snapshots,
  })
  const {
    data: expensesPages,
    isLoading: loadingExpenses,
    isError: errorExpenses,
    refetch: refetchExpenses,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useInfiniteQuery({
    queryKey: ['finance', 'expenses'],
    queryFn: ({ pageParam = 0 }) => financeApi.expenses(undefined, undefined, 50, pageParam as number),
    getNextPageParam: (last, pages) => last.has_more ? pages.length * 50 : undefined,
    initialPageParam: 0,
  })
  const expenses = expensesPages?.pages.flatMap(p => p.items ?? [])
  const queryClient = useQueryClient()

  const [form, setForm] = useState({ amount: '', category: '', description: '' })
  const [errors, setErrors] = useState<{ amount?: string; category?: string }>({})

  const validate = () => {
    const e: typeof errors = {}
    if (!form.amount || isNaN(parseFloat(form.amount)) || parseFloat(form.amount) <= 0) {
      e.amount = 'Enter a valid amount'
    }
    if (!form.category.trim()) {
      e.category = 'Category is required'
    }
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const addExpense = useMutation({
    mutationFn: () => financeApi.createExpense({
      amount: parseFloat(form.amount),
      category: form.category,
      description: form.description || undefined,
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['finance', 'expenses'] })
      setForm({ amount: '', category: '', description: '' })
      setErrors({})
      toast.success('Expense logged')
    },
    onError: () => toast.error('Failed to log expense'),
  })

  const handleSubmit = () => {
    if (validate()) addExpense.mutate()
  }

  const netWorthData = snapshots?.slice(0, 12).reverse().map(s => ({
    month: s.snapshot_month.slice(0, 7),
    value: Number(s.net_worth ?? 0),
  })) ?? []

  const expenseByCategory = (expenses ?? []).reduce<Record<string, number>>((acc, e) => {
    acc[e.category] = (acc[e.category] ?? 0) + Number(e.amount)
    return acc
  }, {})

  const categoryData = Object.entries(expenseByCategory ?? {})
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([name, amount]) => ({ name, amount }))

  return (
    <div className="p-4 sm:p-6 space-y-6">
      <h1 className="text-2xl font-semibold text-foreground">Finance</h1>

      {/* KPI row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {loadingSnapshot
          ? Array.from({ length: 4 }).map((_, i) => <StatCardSkeleton key={i} />)
          : errorSnapshot
          ? <div className="col-span-4"><ErrorCard message="Could not load financial snapshot" onRetry={() => refetchSnapshot()} /></div>
          : <>
              <StatCard label="Net Worth" value={formatCurrency(snapshot?.net_worth)} />
              <StatCard label="CC Debt" value={formatCurrency(snapshot?.cc_debt)} sub="Target: ₹0" />
              <StatCard label="Take-home" value={formatCurrency(snapshot?.take_home)} sub="per month" />
              <StatCard label="Emergency Fund" value={formatCurrency(snapshot?.emergency_fund)} />
            </>
        }
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-card border border-border rounded-xl p-4">
          <h2 className="text-sm font-semibold mb-4">Net Worth Trend</h2>
          {loadingSnapshots
            ? <Skeleton className="h-[200px]" />
            : <ResponsiveContainer width="100%" height={200}>
                <AreaChart data={netWorthData}>
                  <defs>
                    <linearGradient id="netWorthGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.25} />
                      <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" strokeOpacity={0.4} />
                  <XAxis
                    dataKey="month"
                    tick={{ fontSize: 11 }}
                    tickFormatter={v => new Date(v + '-01').toLocaleDateString('en-IN', { month: 'short' })}
                  />
                  <YAxis tick={{ fontSize: 11 }} tickFormatter={v => `₹${(v / 1000).toFixed(0)}K`} />
                  <Tooltip content={<NetWorthTooltip data={netWorthData} />} />
                  <ReferenceLine y={0} stroke="hsl(var(--muted-foreground))" strokeDasharray="4 4" strokeOpacity={0.5} />
                  <Area
                    type="monotone"
                    dataKey="value"
                    stroke="hsl(var(--primary))"
                    strokeWidth={2}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    fill="url(#netWorthGradient)"
                    dot={false}
                  />
                </AreaChart>
              </ResponsiveContainer>
          }
        </div>

        <div className="bg-card border border-border rounded-xl p-4">
          <h2 className="text-sm font-semibold mb-4">Spend by Category</h2>
          {loadingExpenses
            ? <Skeleton className="h-[200px]" />
            : <ResponsiveContainer width="100%" height={200}>
                <BarChart data={categoryData} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" strokeOpacity={0.4} />
                  <XAxis type="number" tick={{ fontSize: 11 }} tickFormatter={v => `₹${v}`} />
                  <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={80} />
                  <Tooltip formatter={(v: number) => formatCurrency(v)} />
                  <Bar dataKey="amount" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
          }
        </div>
      </div>

      {/* Log expense */}
      <div className="bg-card border border-border rounded-xl p-4">
        <h2 className="text-sm font-semibold mb-3">Log Expense</h2>
        <div className="flex gap-2 flex-wrap items-start">
          <div className="flex flex-col gap-1">
            <input
              type="number"
              placeholder="₹ Amount"
              value={form.amount}
              onChange={e => setForm(f => ({ ...f, amount: e.target.value }))}
              aria-label="Expense amount"
              aria-invalid={!!errors.amount}
              className="w-28 px-3 py-2 text-sm rounded-lg bg-muted border border-border text-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 aria-invalid:border-destructive"
            />
            {errors.amount && <span className="text-xs text-destructive">{errors.amount}</span>}
          </div>
          <div className="flex flex-col gap-1">
            <input
              placeholder="Category"
              value={form.category}
              onChange={e => setForm(f => ({ ...f, category: e.target.value }))}
              aria-label="Expense category"
              aria-invalid={!!errors.category}
              className="w-32 px-3 py-2 text-sm rounded-lg bg-muted border border-border text-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 aria-invalid:border-destructive"
            />
            {errors.category && <span className="text-xs text-destructive">{errors.category}</span>}
          </div>
          <input
            placeholder="Note (optional)"
            value={form.description}
            onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
            aria-label="Expense note (optional)"
            className="flex-1 min-w-[120px] px-3 py-2 text-sm rounded-lg bg-muted border border-border text-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
          />
          <button
            onClick={handleSubmit}
            disabled={addExpense.isPending}
            className="flex items-center gap-1.5 px-3 py-2 text-sm rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          >
            <Plus className="w-4 h-4" aria-hidden="true" /> Add
          </button>
        </div>
      </div>

      {/* Recent expenses */}
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <div className="px-4 py-3 border-b border-border flex items-center justify-between">
          <h2 className="text-sm font-semibold">Recent Expenses</h2>
          {expenses && expenses.length > 0 && (
            <button
              onClick={() => exportToCsv(
                expenses.map(e => ({ date: e.logged_at, category: e.category, amount: e.amount, description: e.description ?? '' })),
                `finance-expenses-${new Date().toISOString().slice(0, 10)}`
              )}
              aria-label="Export expenses as CSV"
              className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded"
            >
              <Download className="w-3.5 h-3.5" aria-hidden="true" /> Export
            </button>
          )}
        </div>
        {loadingExpenses ? (
          <div className="divide-y divide-border">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex items-center justify-between px-4 py-3">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-4 w-20" />
              </div>
            ))}
          </div>
        ) : errorExpenses ? (
          <ErrorCard message="Could not load expenses" onRetry={() => refetchExpenses()} />
        ) : expenses?.length === 0 ? (
          <p className="px-4 py-6 text-center text-sm text-muted-foreground">No expenses logged yet</p>
        ) : (
          <>
            <div className="divide-y divide-border">
              {expenses?.map(e => (
                <div key={e.id} className="flex items-center justify-between px-4 py-3 hover:bg-muted/30 transition-colors">
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
            </div>
            {hasNextPage && (
              <div className="px-4 py-3 border-t border-border">
                <button
                  onClick={() => fetchNextPage()}
                  disabled={isFetchingNextPage}
                  className="w-full text-xs text-muted-foreground hover:text-foreground transition py-1 disabled:opacity-50"
                >
                  {isFetchingNextPage ? 'Loading…' : 'Load more'}
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
