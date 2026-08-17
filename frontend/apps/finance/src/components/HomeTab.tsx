/**
 * Finance → Overview.
 *
 * The canvas's `finance:overview` composition, exactly: a full-width net-worth
 * hero splitting assets from liabilities, three KPIs, then spend-by-category
 * and recent transactions side by side.
 *
 * 2026-08-02: the hero was previously the first tile of a four-tile row and the
 * transactions were a full-width table below a "Coming up" list. The canvas
 * gives net worth its own card — it is the page's lead figure, not one KPI
 * among four — and pairs the two half-width cards underneath.
 *
 * MONTH-OVER-MONTH DELTAS ARE MEASURED TO THE SAME DAY. Comparing this month
 * to date against ALL of last month would report a fall every month until the
 * last day of it. Previous-month rows are filtered to day-of-month <= today's
 * before summing. The net-worth delta is the one figure with no same-day
 * equivalent — it comes from the most recent prior-month snapshot, and is
 * omitted rather than invented when no snapshot exists.
 */
import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { format } from 'date-fns'
import dayjs from 'dayjs'
import { CreditCard, PieChart, Receipt } from 'lucide-react'
import { financeApi } from '@ct/shared/api/areas'
import { ErrorState, SkeletonPage } from '@ledgr/ui'
import { ModuleGrid, type ModuleSpec } from '@ct/shared/components/modules'
import { useDomainGoalsModule } from '@ct/shared/hooks/useDomainGoalsModule'
import { formatAmount } from '@ct/shared/lib/utils'

/** Days until the next occurrence of a day-of-month. */
function getDaysUntilDue(dueDay: number): number {
  const today = new Date()
  const currentDay = today.getDate()
  const daysInMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate()
  if (dueDay >= currentDay) return dueDay - currentDay
  return daysInMonth - currentDay + dueDay
}

/** Two-letter monogram for a merchant, the canvas's stand-in for a logo. */
function monogram(label: string): string {
  const words = label.trim().split(/\s+/).filter(Boolean)
  if (!words.length) return '—'
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase()
  return (words[0][0] + words[1][0]).toUpperCase()
}

/** "↑ 4.2%" / "↓ 6%" with the arrow the direction actually earns. */
function deltaLabel(pct: number, suffix: string): string {
  const arrow = pct >= 0 ? '↑' : '↓'
  return `${arrow} ${Math.abs(pct).toFixed(Math.abs(pct) < 10 ? 1 : 0)}% ${suffix}`
}

export function HomeTab() {
  const navigate = useNavigate()
  /* Overview is the ONLY area surface that shows goals — they are set in
     Workspace. Renders nothing when this domain has no active goals. */
  const goalsModule = useDomainGoalsModule('finance')
  const now = dayjs()
  const month = format(new Date(), 'yyyy-MM')
  const prevMonth = now.subtract(1, 'month').format('YYYY-MM')

  /*
   * All eight queries opt out of the global throw (App.tsx) and are handled
   * together below (F1, 2026-08-16). Every figure on this page is a SUM, so a
   * request that failed silently does not render "unknown" — it renders a
   * SMALLER, entirely plausible number. A user cannot tell an under-reported
   * net worth from a real one, which is why this page must say "couldn't load"
   * rather than degrade.
   */
  const q = { meta: { inlineError: true } } as const

  const netWorthQ = useQuery({
    queryKey: ['finance', 'net-worth'],
    queryFn: financeApi.netWorth,
    ...q,
  })
  const snapshotsQ = useQuery({
    queryKey: ['finance', 'snapshots'],
    queryFn: financeApi.snapshots,
    staleTime: 300_000,
    ...q,
  })
  const billsQ = useQuery({ queryKey: ['finance', 'bills'], queryFn: financeApi.bills, ...q })
  const loansQ = useQuery({ queryKey: ['finance', 'loans'], queryFn: financeApi.loans, ...q })
  /*
   * 500, not the default 50: every figure on this page is a SUM over the
   * month's rows, so a truncated page would silently under-report the total.
   */
  const expensesQ = useQuery({
    queryKey: ['finance', 'expenses', month],
    queryFn: () => financeApi.expenses(month, undefined, 500, 0),
    ...q,
  })
  const prevExpensesQ = useQuery({
    queryKey: ['finance', 'expenses', prevMonth],
    queryFn: () => financeApi.expenses(prevMonth, undefined, 500, 0),
    staleTime: 300_000,
    ...q,
  })
  const incomeQ = useQuery({
    queryKey: ['finance', 'income', month],
    queryFn: () => financeApi.income(month),
    ...q,
  })
  const prevIncomeQ = useQuery({
    queryKey: ['finance', 'income', prevMonth],
    queryFn: () => financeApi.income(prevMonth),
    staleTime: 300_000,
    ...q,
  })

  /*
   * Gated on ALL eight, not on two. Until 2026-08-16 the skeleton cleared as
   * soon as net worth and this month's expenses arrived, so the other six
   * sections popped in afterwards against a page that had already declared
   * itself loaded.
   */
  const panels = [
    netWorthQ, snapshotsQ, billsQ, loansQ,
    expensesQ, prevExpensesQ, incomeQ, prevIncomeQ,
  ]
  const isError = panels.some((p) => p.isError)
  const isLoading = panels.some((p) => p.isLoading)

  const netWorth = netWorthQ.data
  const snapshots = snapshotsQ.data
  const bills = billsQ.data
  const loans = loansQ.data
  const expenses = expensesQ.data
  const prevExpenses = prevExpensesQ.data
  const income = incomeQ.data
  const prevIncome = prevIncomeQ.data

  const modules = useMemo<ModuleSpec[]>(() => {
    const today = now.date()
    const expenseItems = expenses?.items ?? []

    const sum = (rows: Array<{ amount: number | string }>) =>
      rows.reduce((acc, r) => acc + Number(r.amount), 0)
    /** Same-day cut: only rows from the first N days of the previous month. */
    const toDate = <T extends { logged_at: string }>(rows: T[]) =>
      rows.filter(r => dayjs(r.logged_at).date() <= today)

    const totalExpenses = sum(expenseItems)
    const totalIncome = sum(income ?? [])
    const prevExpenseTotal = sum(toDate(prevExpenses?.items ?? []))
    const prevIncomeTotal = sum(toDate(prevIncome ?? []))

    const savingsRate = totalIncome > 0
      ? Math.round(((totalIncome - totalExpenses) / totalIncome) * 100)
      : null
    const prevSavingsRate = prevIncomeTotal > 0
      ? Math.round(((prevIncomeTotal - prevExpenseTotal) / prevIncomeTotal) * 100)
      : null

    const assets = (netWorth?.accounts_total ?? 0) + (netWorth?.investments_total ?? 0)
    const liabilities = netWorth?.loans_outstanding ?? 0

    /* Most recent snapshot from a month before this one, with a usable figure. */
    const priorSnapshot = (snapshots ?? [])
      .filter(s => s.net_worth != null && s.snapshot_month < month)
      .sort((a, b) => b.snapshot_month.localeCompare(a.snapshot_month))[0]
    const nwDelta = priorSnapshot && Number(priorSnapshot.net_worth) !== 0
      ? ((netWorth?.net_worth ?? 0) - Number(priorSnapshot.net_worth)) / Math.abs(Number(priorSnapshot.net_worth)) * 100
      : null

    // Next obligations across bills and loan EMIs, soonest first.
    const upcoming = [
      ...(bills ?? []).filter(b => b.is_active).map(b => ({
        amount: Number(b.amount), days: getDaysUntilDue(b.due_day),
      })),
      ...(loans ?? []).filter(l => l.is_active).map(l => ({
        amount: Number(l.emi_amount), days: getDaysUntilDue(l.emi_day),
      })),
    ].sort((a, b) => a.days - b.days)
    const dueSoon = upcoming.filter(u => u.days <= 7)
    const soonest = upcoming[0]

    const byCategory = new Map<string, number>()
    for (const e of expenseItems) {
      const key = e.category || 'Uncategorised'
      byCategory.set(key, (byCategory.get(key) ?? 0) + Number(e.amount))
    }
    const topCategories = [...byCategory.entries()].sort((a, b) => b[1] - a[1]).slice(0, 6)
    const topSpend = topCategories[0]?.[1] ?? 0

    const recent = [...expenseItems]
      .sort((a, b) => b.logged_at.localeCompare(a.logged_at))
      .slice(0, 5)

    const specs: ModuleSpec[] = [
      {
        kind: 'hero',
        span: 12,
        title: 'Net Worth',
        subtitle: 'Combined value across all accounts',
        icon: CreditCard,
        value: formatAmount(netWorth?.net_worth ?? 0),
        ...(nwDelta !== null && {
          delta: deltaLabel(nwDelta, 'vs last month'),
          deltaKey: nwDelta >= 0 ? 'success' : 'destructive',
        }),
        stats: [
          { label: 'Assets', value: formatAmount(assets) },
          { label: 'Liabilities', value: formatAmount(liabilities) },
        ],
      },
      {
        kind: 'tiles',
        span: 12,
        cols: 3,
        tiles: [
          {
            label: 'Spend this month',
            value: formatAmount(totalExpenses),
            ...(prevExpenseTotal > 0 && {
              // Spending less than last month is the good direction here.
              sub: deltaLabel(
                (totalExpenses - prevExpenseTotal) / prevExpenseTotal * 100,
                'vs last month',
              ),
              subKey: totalExpenses <= prevExpenseTotal ? 'success' : 'destructive',
            }),
          },
          {
            label: 'Savings rate',
            value: savingsRate === null ? '—' : `${savingsRate}%`,
            ...(savingsRate === null
              ? { sub: 'Log income to see this' }
              : prevSavingsRate === null
                ? { sub: `${formatAmount(totalIncome)} in, ${formatAmount(totalExpenses)} out` }
                : {
                    sub: `${savingsRate >= prevSavingsRate ? '↑' : '↓'} ${Math.abs(savingsRate - prevSavingsRate)}pts`,
                    subKey: savingsRate >= prevSavingsRate ? 'success' : 'destructive',
                  }),
          },
          {
            label: 'Upcoming bills',
            value: formatAmount(dueSoon.reduce((acc, u) => acc + u.amount, 0)),
            sub: !soonest
              ? 'Nothing scheduled'
              : soonest.days === 0
                ? 'Due today'
                : `Due in ${soonest.days} day${soonest.days === 1 ? '' : 's'}`,
            subKey: soonest && soonest.days <= 3 ? 'destructive' : 'warning',
          },
        ],
      },
    ]

    if (topCategories.length) {
      specs.push({
        kind: 'progress',
        span: 6,
        title: 'Spend by Category',
        subtitle: 'Where your money went this month',
        icon: PieChart,
        /*
         * Bars are scaled against the LARGEST category, not the month's total.
         * Against the total every bar but the first is a sliver; against the
         * leader the comparison the card exists to make is legible.
         */
        rows: topCategories.map(([name, amount]) => ({
          title: name,
          value: formatAmount(amount),
          valueKey: 'fg',
          pct: topSpend > 0 ? (amount / topSpend) * 100 : 0,
          colorKey: 'finance',
        })),
      })
    }

    if (recent.length) {
      specs.push({
        kind: 'rows',
        span: topCategories.length ? 6 : 12,
        title: 'Recent Transactions',
        subtitle: 'Latest activity across accounts',
        icon: Receipt,
        action: 'View all',
        actionVariant: 'link',
        onAction: () => navigate('/app/finance/transactions'),
        rows: recent.map(e => {
          const label = e.description || e.category || 'Transaction'
          const when = dayjs(e.logged_at)
          return {
            mono: monogram(label),
            title: label,
            meta: when.isSame(now, 'day')
              ? `Today, ${when.format('h:mm A')}`
              : when.isSame(now.subtract(1, 'day'), 'day')
                ? 'Yesterday'
                : when.format('D MMM'),
            value: `-${formatAmount(Number(e.amount))}`,
            valueKey: 'destructive',
          }
        }),
      })
    }

    return specs
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [netWorth, snapshots, bills, loans, expenses, prevExpenses, income, prevIncome])

  if (isError) {
    return (
      <ErrorState
        title="We couldn't load your finances"
        description="Nothing has been lost — a request behind this page failed. These figures are sums, so we won't show a partial one."
        onRetry={() => { panels.forEach((p) => { void p.refetch() }) }}
      />
    )
  }

  /* Shape-matching, not a grey slab: net-worth hero, three KPIs, two halves. */
  if (isLoading) return <SkeletonPage kpis={3} modules={[12, 6, 6]} />

  return <ModuleGrid modules={goalsModule ? [...modules, goalsModule] : modules} />
}
