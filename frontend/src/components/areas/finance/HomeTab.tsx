import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { format } from 'date-fns'
import { Empty, Tag } from 'antd'
import { ArrowDownCircle, ArrowUpCircle, ArrowLeftRight, Wallet, Landmark, CreditCard, PiggyBank, ChevronRight, type LucideIcon } from 'lucide-react'
import { financeApi } from '@/api/areas'
import { formatCurrency, cn } from '@/lib/utils'
import { Skeleton } from '@/components/ui/skeleton'
import { ErrorCard } from '@/components/ErrorCard'
import { GlassCard, IconBadge, ProgressBar } from '@/components/lumina'
import { BalanceWidget } from './WalletWidgets'
import { TransactionModal, type Kind } from './TransactionsTab'

function getDaysUntilDue(dueDay: number): number {
  const today = new Date()
  const currentDay = today.getDate()
  const daysInMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate()
  if (dueDay >= currentDay) {
    return dueDay - currentDay
  }
  return daysInMonth - currentDay + dueDay
}

function ordinal(n: number) {
  const s = ['th', 'st', 'nd', 'rd']
  const v = n % 100
  return n + (s[(v - 20) % 10] || s[v] || s[0])
}

function urgencyColor(days: number): 'error' | 'warning' | 'success' {
  if (days <= 3) return 'error'
  if (days <= 7) return 'warning'
  return 'success'
}

const ACCOUNT_ICONS: Record<string, LucideIcon> = {
  bank: Landmark,
  cash: Wallet,
  credit_card: CreditCard,
  savings: PiggyBank,
}

const BAND_STYLES: Record<string, { label: string; tag: string; bar: string }> = {
  excellent: { label: 'Excellent', tag: 'success', bar: 'bg-kpi-emerald' },
  good: { label: 'Good', tag: 'processing', bar: 'bg-primary' },
  fair: { label: 'Fair', tag: 'warning', bar: 'bg-kpi-amber' },
  attention: { label: 'Needs Attention', tag: 'error', bar: 'bg-kpi-red' },
}

function scoreBand(score: number): string {
  return score >= 80 ? 'excellent' : score >= 60 ? 'good' : score >= 40 ? 'fair' : 'attention'
}

function HealthScoreCard({ data }: { data: import('@/types').FinanceHealthScore | undefined }) {
  if (!data) {
    return (
      <GlassCard title="Financial Health" hoverable fadeIn="up">
        <Skeleton className="h-40 w-full" />
      </GlassCard>
    )
  }
  const band = BAND_STYLES[data.band] ?? BAND_STYLES.fair
  return (
    <GlassCard title="Financial Health" action={<Tag color={band.tag}>{band.label}</Tag>} hoverable fadeIn="up">
      <div className="flex items-baseline gap-1 mb-3">
        <span className="text-xl font-semibold text-foreground font-mono tabular-nums tracking-tight">{data.score}</span>
        <span className="text-[11px] text-muted-foreground">/ 100</span>
      </div>
      <div className="space-y-2.5">
        {data.components.map(c => (
          <div key={c.key}>
            <div className="flex items-center justify-between mb-0.5">
              <span className="text-[12px] font-medium text-foreground">{c.label}</span>
              <span className="text-[11px] font-mono tabular-nums text-muted-foreground">{c.available ? c.score : '—'}</span>
            </div>
            <ProgressBar
              size="sm"
              value={c.available ? (c.score ?? 0) : 0}
              colorClassName={c.available ? BAND_STYLES[scoreBand(c.score ?? 0)].bar : 'bg-muted'}
            />
            <div className="text-[11px] text-muted-foreground mt-0.5">{c.display}</div>
          </div>
        ))}
      </div>
    </GlassCard>
  )
}

function NavButton({ onClick }: { onClick: () => void }) {
  return (
    <button onClick={onClick} className="flex items-center gap-0.5 text-[11px] font-medium text-primary hover:underline">
      See all <ChevronRight size={12} />
    </button>
  )
}

export function HomeTab({ onNavigateTab }: { onNavigateTab: (key: string) => void }) {
  const [balanceTab, setBalanceTab] = useState('General')
  const [modal, setModal] = useState<Kind | null>(null)

  const month = format(new Date(), 'yyyy-MM')

  const { data: netWorth, isLoading: loadingSnapshot, isError: errorSnapshot } = useQuery({
    queryKey: ['finance', 'net-worth'],
    queryFn: financeApi.netWorth,
  })

  const { data: snapshots } = useQuery({
    queryKey: ['finance', 'snapshots'],
    queryFn: financeApi.snapshots,
  })

  const { data: accounts, isLoading: loadingAccounts } = useQuery({
    queryKey: ['finance', 'accounts'],
    queryFn: financeApi.accounts,
  })

  const { data: bills } = useQuery({
    queryKey: ['finance', 'bills'],
    queryFn: financeApi.bills,
  })

  const { data: loans } = useQuery({
    queryKey: ['finance', 'loans'],
    queryFn: financeApi.loans,
  })

  const { data: expenses, isLoading: loadingExpenses } = useQuery({
    queryKey: ['finance', 'expenses', month],
    queryFn: () => financeApi.expenses(month, undefined, 100, 0),
  })

  const { data: income } = useQuery({
    queryKey: ['finance', 'income', month],
    queryFn: () => financeApi.income(month),
  })

  const { data: transfers } = useQuery({
    queryKey: ['finance', 'transfers', month],
    queryFn: () => financeApi.transfers(month),
  })

  const { data: healthScore } = useQuery({
    queryKey: ['finance', 'health-score'],
    queryFn: financeApi.healthScore,
  })

  const expenseItems = expenses?.items ?? []

  const chartData = useMemo(() => {
    if (!snapshots) return []
    return snapshots.slice(0, 7).reverse().map(s => ({
      name: s.snapshot_month.slice(5, 7),
      value: Number(s.net_worth ?? 0)
    }))
  }, [snapshots])

  const totalExpenses = useMemo(() => expenseItems.reduce((acc, e) => acc + Number(e.amount), 0), [expenseItems])
  const totalIncome = useMemo(() => (income ?? []).reduce((acc, i) => acc + Number(i.amount), 0), [income])

  const balanceValue = balanceTab === 'General'
    ? Number(netWorth?.net_worth ?? 0)
    : balanceTab === 'Expenses'
      ? totalExpenses
      : totalIncome

  const upcoming = useMemo(() => {
    const billItems = (bills ?? []).filter(b => b.is_active).map(b => ({
      id: `bill-${b.id}`,
      name: b.name,
      amount: Number(b.amount),
      days: getDaysUntilDue(b.due_day),
      dueDay: b.due_day,
      type: 'Bill' as const,
    }))
    const loanItems = (loans ?? []).filter(l => l.is_active).map(l => ({
      id: `loan-${l.id}`,
      name: l.name,
      amount: Number(l.emi_amount),
      days: getDaysUntilDue(l.emi_day),
      dueDay: l.emi_day,
      type: 'EMI' as const,
    }))
    return [...billItems, ...loanItems].sort((a, b) => a.days - b.days).slice(0, 5)
  }, [bills, loans])

  const recentActivity = useMemo(() => {
    const items = [
      ...expenseItems.map(e => ({ id: e.id, label: e.description || e.category, sub: e.category, amount: -Number(e.amount), date: e.logged_at, kind: 'Expense' as const })),
      ...(income ?? []).map(i => ({ id: i.id, label: i.description || i.source, sub: i.source, amount: Number(i.amount), date: i.logged_at, kind: 'Income' as const })),
      ...(transfers ?? []).map(t => ({ id: t.id, label: t.description || 'Transfer', sub: 'Transfer', amount: Number(t.amount), date: t.logged_at, kind: 'Transfer' as const })),
    ]
    return items.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).slice(0, 5)
  }, [expenseItems, income, transfers])

  if (loadingSnapshot || loadingExpenses) {
    return <div className="space-y-4">
      <Skeleton className="w-full h-16 rounded-xl" />
      <div className="grid grid-cols-12 gap-4">
        <Skeleton className="col-span-12 lg:col-span-7 h-[300px] rounded-xl" />
        <Skeleton className="col-span-12 lg:col-span-5 h-[300px] rounded-xl" />
      </div>
    </div>
  }

  if (errorSnapshot) {
    return <ErrorCard message="Could not load financial data" />
  }

  return (
    <div className="space-y-4">
      {/* Quick Add Bar */}
      <div className="grid grid-cols-3 gap-3">
        <button onClick={() => setModal('Expense')} className="bg-card border border-subtle rounded-xl shadow-premium-sm p-3 flex items-center justify-center gap-2 text-[13px] font-medium text-foreground hover:bg-muted/50 transition-colors">
          <ArrowDownCircle size={16} className="text-kpi-red" /> Add Expense
        </button>
        <button onClick={() => setModal('Income')} className="bg-card border border-subtle rounded-xl shadow-premium-sm p-3 flex items-center justify-center gap-2 text-[13px] font-medium text-foreground hover:bg-muted/50 transition-colors">
          <ArrowUpCircle size={16} className="text-kpi-emerald" /> Add Income
        </button>
        <button onClick={() => setModal('Transfer')} className="bg-card border border-subtle rounded-xl shadow-premium-sm p-3 flex items-center justify-center gap-2 text-[13px] font-medium text-foreground hover:bg-muted/50 transition-colors">
          <ArrowLeftRight size={16} className="text-primary" /> Add Transfer
        </button>
      </div>

      <div className="grid grid-cols-12 gap-4">
        {/* Net Worth */}
        <div className="col-span-12 lg:col-span-7 h-[300px]">
          <BalanceWidget
            balance={balanceValue}
            chartData={chartData}
            activeTab={balanceTab}
            onTabChange={setBalanceTab}
          />
        </div>

        {/* Financial Health Score */}
        <div className="col-span-12 lg:col-span-5">
          <HealthScoreCard data={healthScore} />
        </div>

        {/* Accounts Overview */}
        <div className="col-span-12 lg:col-span-5">
          <GlassCard title="Accounts" action={<NavButton onClick={() => onNavigateTab('4')} />} hoverable fadeIn="up" delay={100}>
            {loadingAccounts ? (
              <div className="space-y-2">
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
              </div>
            ) : !accounts || accounts.length === 0 ? (
              <Empty description="No accounts yet — add one in the Accounts tab" image={Empty.PRESENTED_IMAGE_SIMPLE} />
            ) : (
              <div className="space-y-1">
                {accounts.map(a => {
                  const Icon = ACCOUNT_ICONS[a.type] ?? Wallet
                  return (
                    <div key={a.id} className="flex items-center justify-between py-1.5">
                      <div className="flex items-center gap-2.5">
                        <IconBadge icon={Icon} color="muted" size="md" />
                        <div>
                          <div className="text-[13px] font-medium text-foreground">{a.name}</div>
                          <div className="text-[11px] text-muted-foreground">{String(a.type).replace('_', ' ').toUpperCase()}</div>
                        </div>
                      </div>
                      <div className="text-[13px] font-semibold font-mono tabular-nums text-foreground">{formatCurrency(Number(a.balance))}</div>
                    </div>
                  )
                })}
              </div>
            )}
          </GlassCard>
        </div>

        {/* Upcoming Payments */}
        <div className="col-span-12 lg:col-span-7">
          <GlassCard title="Upcoming Payments" action={<NavButton onClick={() => onNavigateTab('5')} />} hoverable fadeIn="up" delay={100}>
            {upcoming.length === 0 ? (
              <Empty description="No bills or EMIs due" image={Empty.PRESENTED_IMAGE_SIMPLE} />
            ) : (
              <div className="space-y-1">
                {upcoming.map(item => (
                  <div key={item.id} className="flex items-center justify-between py-1.5">
                    <div>
                      <div className="text-[13px] font-medium text-foreground">{item.name}</div>
                      <div className="text-[11px] text-muted-foreground">{item.type} · due {ordinal(item.dueDay)}</div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-[13px] font-semibold font-mono tabular-nums text-foreground">{formatCurrency(item.amount)}</span>
                      <Tag color={urgencyColor(item.days)}>{item.days === 0 ? 'Today' : `${item.days}d`}</Tag>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </GlassCard>
        </div>

        {/* Recent Activity */}
        <div className="col-span-12">
          <GlassCard title="Recent Activity" action={<NavButton onClick={() => onNavigateTab('2')} />} hoverable fadeIn="up" delay={200}>
            {recentActivity.length === 0 ? (
              <Empty description="No transactions this month" image={Empty.PRESENTED_IMAGE_SIMPLE} />
            ) : (
              <div className="space-y-1">
                {recentActivity.map(item => (
                  <div key={`${item.kind}-${item.id}`} className="flex items-center justify-between py-1.5">
                    <div>
                      <div className="text-[13px] font-medium text-foreground">{item.label}</div>
                      <div className="text-[11px] text-muted-foreground">{item.sub} · {format(new Date(item.date), 'MMM d')}</div>
                    </div>
                    <span className={cn(
                      "text-[13px] font-semibold font-mono tabular-nums",
                      item.amount < 0 ? "text-kpi-red" : item.kind === 'Transfer' ? "text-primary" : "text-kpi-emerald"
                    )}>
                      {item.amount < 0 ? '-' : '+'}{formatCurrency(Math.abs(item.amount))}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </GlassCard>
        </div>
      </div>

      <TransactionModal open={modal !== null} onClose={() => setModal(null)} editing={null} initialKind={modal ?? 'Expense'} />
    </div>
  )
}
