/**
 * Finance → Overview.
 *
 * Phase 4 conversion to the canvas's `finance:overview` design — a net-worth
 * hero splitting assets from liabilities, three KPIs, spend by category, and
 * recent transactions. Rebuilt from the live net-worth, expense and income
 * endpoints.
 *
 * The hero is the first `tiles` entry with `accent: true`, which is how the
 * module kit renders a lead figure. The assets/liabilities split the canvas
 * shows beside it comes straight from `/areas/finance/net-worth`, so plan
 * §4.2's amber flag on this page needed no new backend work after all.
 */
import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { format } from 'date-fns'
import dayjs from 'dayjs'
import { BarChart3, Landmark, Receipt } from 'lucide-react'
import { financeApi } from '@ct/shared/api/areas'
import { ModuleGrid, type ModuleSpec } from '@ct/shared/components/modules'
import { Skeleton } from '@ct/shared/components/ui/skeleton'
import { formatCurrency } from '@ct/shared/lib/utils'

/** Days until the next occurrence of a day-of-month. */
function getDaysUntilDue(dueDay: number): number {
  const today = new Date()
  const currentDay = today.getDate()
  const daysInMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate()
  if (dueDay >= currentDay) return dueDay - currentDay
  return daysInMonth - currentDay + dueDay
}

export function HomeTab() {
  const navigate = useNavigate()
  const month = format(new Date(), 'yyyy-MM')

  const { data: netWorth, isLoading: loadingSnapshot } = useQuery({
    queryKey: ['finance', 'net-worth'],
    queryFn: financeApi.netWorth,
  })
  const { data: bills } = useQuery({ queryKey: ['finance', 'bills'], queryFn: financeApi.bills })
  const { data: loans } = useQuery({ queryKey: ['finance', 'loans'], queryFn: financeApi.loans })
  const { data: expenses, isLoading: loadingExpenses } = useQuery({
    queryKey: ['finance', 'expenses', month],
    queryFn: () => financeApi.expenses(month, undefined, 100, 0),
  })
  const { data: income } = useQuery({
    queryKey: ['finance', 'income', month],
    queryFn: () => financeApi.income(month),
  })
  const { data: healthScore } = useQuery({
    queryKey: ['finance', 'health-score'],
    queryFn: financeApi.healthScore,
  })

  const modules = useMemo<ModuleSpec[]>(() => {
    const expenseItems = expenses?.items ?? []
    const totalExpenses = expenseItems.reduce((acc, e) => acc + Number(e.amount), 0)
    const totalIncome = (income ?? []).reduce((acc, i) => acc + Number(i.amount), 0)
    const savingsRate = totalIncome > 0
      ? Math.round(((totalIncome - totalExpenses) / totalIncome) * 100)
      : null

    const assets = (netWorth?.accounts_total ?? 0) + (netWorth?.investments_total ?? 0)
    const liabilities = netWorth?.loans_outstanding ?? 0

    // Next obligations across bills and loan EMIs, soonest first.
    const upcoming = [
      ...(bills ?? []).filter(b => b.is_active).map(b => ({
        name: b.name, amount: Number(b.amount), days: getDaysUntilDue(b.due_day), type: 'Bill',
      })),
      ...(loans ?? []).filter(l => l.is_active).map(l => ({
        name: l.name, amount: Number(l.emi_amount), days: getDaysUntilDue(l.emi_day), type: 'EMI',
      })),
    ].sort((a, b) => a.days - b.days).slice(0, 5)

    const byCategory = new Map<string, number>()
    for (const e of expenseItems) {
      const key = e.category || 'Uncategorised'
      byCategory.set(key, (byCategory.get(key) ?? 0) + Number(e.amount))
    }
    const topCategories = [...byCategory.entries()].sort((a, b) => b[1] - a[1]).slice(0, 8)

    const recent = [...expenseItems]
      .sort((a, b) => b.logged_at.localeCompare(a.logged_at))
      .slice(0, 8)

    const specs: ModuleSpec[] = [
      {
        kind: 'tiles',
        span: 12,
        tiles: [
          {
            label: 'Net worth',
            value: formatCurrency(netWorth?.net_worth ?? 0),
            sub: `${formatCurrency(assets)} in assets · ${formatCurrency(liabilities)} owed`,
            accent: true,
          },
          {
            label: 'Spent this month',
            value: formatCurrency(totalExpenses),
            sub: `${expenseItems.length} transaction${expenseItems.length === 1 ? '' : 's'}`,
            subKey: 'destructive',
          },
          {
            label: 'Savings rate',
            value: savingsRate === null ? '—' : `${savingsRate}%`,
            sub: savingsRate === null
              ? 'Log income to see this'
              : `${formatCurrency(totalIncome)} in, ${formatCurrency(totalExpenses)} out`,
            subKey: savingsRate !== null && savingsRate >= 20 ? 'success' : 'warning',
            ...(savingsRate !== null && {
              bar: Math.max(0, Math.min(100, savingsRate)),
              barKey: savingsRate >= 20 ? 'success' : 'warning',
            }),
          },
          {
            label: 'Financial health',
            value: healthScore ? String(healthScore.score) : '—',
            sub: healthScore ? healthScore.band : 'Not enough data yet',
            dotKey: healthScore?.band === 'excellent' || healthScore?.band === 'good'
              ? 'success'
              : healthScore?.band === 'fair' ? 'warning' : 'destructive',
          },
        ],
      },
    ]

    if (topCategories.length) {
      specs.push({
        kind: 'bars',
        span: 7,
        title: 'Spend by category',
        subtitle: dayjs().format('MMMM YYYY'),
        icon: BarChart3,
        bars: topCategories.map(([name, amount]) => ({
          label: name.length > 9 ? `${name.slice(0, 8)}…` : name,
          v: Math.round(amount),
          t: formatCurrency(amount),
          colorKey: 'finance',
        })),
      })
    }

    if (upcoming.length) {
      specs.push({
        kind: 'rows',
        span: topCategories.length ? 5 : 12,
        title: 'Coming up',
        subtitle: 'Bills and EMIs, soonest first',
        icon: Landmark,
        action: 'All bills',
        onAction: () => navigate('/app/finance/bills'),
        rows: upcoming.map(u => ({
          title: u.name,
          meta: u.days === 0 ? 'Due today' : `In ${u.days} day${u.days === 1 ? '' : 's'}`,
          tagLabel: u.type,
          tagColorKey: u.type === 'EMI' ? 'warning' : 'info',
          value: formatCurrency(u.amount),
        })),
      })
    }

    if (recent.length) {
      specs.push({
        kind: 'table',
        span: 12,
        title: 'Recent transactions',
        subtitle: `Latest ${recent.length} this month`,
        icon: Receipt,
        action: 'All transactions',
        onAction: () => navigate('/app/finance/transactions'),
        gridCols: '1fr 1.8fr 1.2fr 1fr',
        cols: [{ l: 'Date' }, { l: 'Description' }, { l: 'Category' }, { l: 'Amount', a: 'right' }],
        rows: recent.map(e => [
          { t: dayjs(e.logged_at).format('D MMM'), bold: true },
          e.description || 'No description',
          e.category || 'Uncategorised',
          { t: formatCurrency(Number(e.amount)), colorKey: 'destructive' },
        ]),
      })
    }

    return specs
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [netWorth, bills, loans, expenses, income, healthScore])

  if (loadingSnapshot || loadingExpenses) return <Skeleton style={{ height: 360 }} />

  return <ModuleGrid modules={modules} />
}
