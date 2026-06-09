import { useQuery, useInfiniteQuery } from '@tanstack/react-query'
import { financeApi } from '@/api/areas'
import {
  BalanceWidget,
  VisaCardWidget,
  MonthlyBudgetWidget,
  ExpensesDonutWidget,
  QuickTransactionsWidget,
  LastTransactionsWidget
} from '@/components/areas/finance/WalletWidgets'
import { ErrorCard } from '@/components/ErrorCard'
import { Skeleton } from '@/components/ui/skeleton'
import { ShoppingBag, Clapperboard, Home, Heart, CreditCard, Shirt, Tv, DollarSign } from 'lucide-react'
import { useMemo, useState } from 'react'
import { format } from 'date-fns'

export function FinancePage() {
  const [balanceTab, setBalanceTab] = useState('General')
  const [donutTab, setDonutTab] = useState('Month')

  const { data: snapshot, isLoading: loadingSnapshot, isError: errorSnapshot } = useQuery({
    queryKey: ['finance', 'latest'],
    queryFn: financeApi.latestSnapshot,
  })

  const { data: snapshots, isLoading: loadingSnapshots } = useQuery({
    queryKey: ['finance', 'snapshots'],
    queryFn: financeApi.snapshots,
  })

  const { data: budgets, isLoading: loadingBudgets } = useQuery({
    queryKey: ['finance', 'budgets'],
    queryFn: financeApi.budgets,
  })

  const { data: expensesPages, isLoading: loadingExpenses } = useInfiniteQuery({
    queryKey: ['finance', 'expenses', donutTab.toLowerCase()],
    queryFn: ({ pageParam = 0 }) => financeApi.expenses(undefined, undefined, 50, pageParam as number, donutTab.toLowerCase()),
    getNextPageParam: (last, pages) => last.has_more ? pages.length * 50 : undefined,
    initialPageParam: 0,
  })

  const expenses = expensesPages?.pages.flatMap(p => p.items ?? []) ?? []

  // Transform snapshots to chart data
  const chartData = useMemo(() => {
    if (!snapshots) return []
    return snapshots.slice(0, 7).reverse().map(s => ({
      name: s.snapshot_month.slice(5, 7), // Just the month number or short name
      value: Number(s.net_worth ?? 0)
    }))
  }, [snapshots])

  // Calculate Donut Data & Total Expenses
  const { donutData, totalExpenses } = useMemo(() => {
    const expenseByCategory = expenses.reduce<Record<string, number>>((acc, e) => {
      acc[e.category] = (acc[e.category] ?? 0) + Number(e.amount)
      return acc
    }, {})

    let total = 0
    const data = Object.entries(expenseByCategory).map(([name, value]) => {
      total += value
      return { name, value }
    }).sort((a, b) => b.value - a.value).slice(0, 5) // top 5

    return { donutData: data, totalExpenses: total }
  }, [expenses])

  // Calculate Monthly Budget Total
  const totalBudget = useMemo(() => {
    return budgets?.reduce((acc, b) => acc + Number(b.monthly_limit), 0) ?? 4000
  }, [budgets])

  // Transform transactions
  const getIconForCategory = (cat: string) => {
    const lower = cat.toLowerCase()
    if (lower.includes('sub') || lower.includes('tv') || lower.includes('netflix')) return <Clapperboard className="w-5 h-5 text-red-500" />
    if (lower.includes('home') || lower.includes('rent')) return <Home className="w-5 h-5 text-emerald-500" />
    if (lower.includes('care') || lower.includes('health')) return <Heart className="w-5 h-5 text-pink-500" />
    if (lower.includes('groceries') || lower.includes('food')) return <ShoppingBag className="w-5 h-5 text-orange-500" />
    if (lower.includes('clothes')) return <Shirt className="w-5 h-5 text-purple-500" />
    return <DollarSign className="w-5 h-5 text-blue-500" />
  }

  const recentTransactions = useMemo(() => {
    return expenses.slice(0, 5).map(e => ({
      merchant: e.description || e.category,
      category: e.category,
      date: format(new Date(e.logged_at), 'MMM d, yyyy'),
      amount: Number(e.amount).toFixed(2),
      icon: getIconForCategory(e.category)
    }))
  }, [expenses])


  if (loadingSnapshot || loadingExpenses || loadingBudgets) {
    return <div className="p-6 space-y-6">
      <Skeleton className="w-full h-32 rounded-3xl" />
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <Skeleton className="lg:col-span-4 h-[400px] rounded-3xl" />
        <Skeleton className="lg:col-span-4 h-[400px] rounded-3xl" />
        <Skeleton className="lg:col-span-4 h-[400px] rounded-3xl" />
      </div>
    </div>
  }

  if (errorSnapshot) {
    return <div className="p-6"><ErrorCard message="Could not load financial data" /></div>
  }

  return (
    <div className="p-3 sm:p-4 lg:p-6 min-h-screen max-w-6xl mx-auto">
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 bg-primary/10 rounded-xl flex items-center justify-center border border-primary/20 premium-shadow-sm">
            <CreditCard className="w-5 h-5 text-primary" />
          </div>
          <div>
            <p className="text-[13px] text-muted-foreground">Overview</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 auto-rows-min">
        {/* Left Column (Span 4) */}
        <div className="lg:col-span-4 flex flex-col gap-4">
          <div className="h-[300px]">
            <BalanceWidget 
              balance={balanceTab === 'General' ? Number(snapshot?.net_worth ?? 0) : balanceTab === 'Expenses' ? totalExpenses : Number(snapshot?.take_home ?? 0)} 
              chartData={chartData} 
              activeTab={balanceTab}
              onTabChange={setBalanceTab}
            />
          </div>
        </div>

        {/* Middle Column (Span 4) */}
        <div className="lg:col-span-4 flex flex-col gap-4">
          <MonthlyBudgetWidget spent={totalExpenses} total={totalBudget} />
          <div className="flex-1 min-h-[220px]">
            <ExpensesDonutWidget 
              total={totalExpenses} 
              data={donutData} 
              activeTab={donutTab}
              onTabChange={setDonutTab}
            />
          </div>
        </div>

        {/* Right Column (Span 4) */}
        <div className="lg:col-span-4 flex flex-col gap-4">
          <VisaCardWidget balance={Number(snapshot?.cc_debt ?? 0)} />
          <QuickTransactionsWidget />
          <div className="flex-1 min-h-[200px]">
            <LastTransactionsWidget transactions={recentTransactions} />
          </div>
        </div>
      </div>
    </div>
  )
}
