import { useMemo, useState } from 'react'
import { useQuery, useQueries } from '@tanstack/react-query'
import dayjs from 'dayjs'
import { Segmented, Empty } from 'antd'
import { X } from 'lucide-react'
import Highcharts from 'highcharts'
Highcharts.setOptions({ accessibility: { enabled: false } })
import HighchartsReact from 'highcharts-react-official'
import { financeApi } from '@/api/areas'
import { formatCurrency } from '@/lib/utils'
import { Skeleton } from '@/components/ui/skeleton'
import { AIInsightsEngine } from './AdvancedWidgets'
import { AiInsightCard } from '@/components/AiInsightCard'

const PIE_COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EC4899', '#8B5CF6', '#EF4444', '#14B8A6', '#F97316']

type Period = 'This Week' | 'This Month' | 'This Year'

function ChartCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-card border border-border/60 rounded-xl p-4 h-full relative">
      <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">{title}</h3>
      {children}
    </div>
  )
}

export function StatsTab() {
  const [period, setPeriod] = useState<Period>('This Month')
  const [drillCategory, setDrillCategory] = useState<string | null>(null)
  const month = dayjs().format('YYYY-MM')

  const { data: cashflow, isLoading: loadingCashflow } = useQuery({
    queryKey: ['finance', 'cashflow', month],
    queryFn: () => financeApi.cashflow(month),
  })
  const { data: expensesPage, isLoading: loadingExpenses } = useQuery({
    queryKey: ['finance', 'expenses', 'month', month],
    queryFn: () => financeApi.expenses(month, undefined, 200, 0),
  })
  const { data: budgetStatus } = useQuery({
    queryKey: ['finance', 'budgets', 'status'],
    queryFn: () => financeApi.budgetStatus(),
  })

  const last12Months = useMemo(() => Array.from({ length: 12 }, (_, i) => dayjs().subtract(11 - i, 'month').format('YYYY-MM')), [])
  const yearQueries = useQueries({
    queries: last12Months.map(m => ({
      queryKey: ['finance', 'cashflow', m],
      queryFn: () => financeApi.cashflow(m),
      enabled: period === 'This Year',
      staleTime: 5 * 60 * 1000,
    })),
  })
  const loadingYear = period === 'This Year' && yearQueries.some(q => q.isLoading)

  const isLoading = loadingCashflow || loadingExpenses || loadingYear

  // ── Income vs Expense (donut) ──────────────────────────────────────────
  const donutData = useMemo(() => {
    if (period === 'This Year') {
      const totals = yearQueries.reduce((acc, q) => {
        acc.income += q.data?.income_total ?? 0
        acc.expense += q.data?.expense_total ?? 0
        return acc
      }, { income: 0, expense: 0 })
      return [{ name: 'Income', value: totals.income }, { name: 'Expense', value: totals.expense }]
    }
    if (period === 'This Week') {
      const weekStart = dayjs().subtract(6, 'day').format('YYYY-MM-DD')
      const week = (cashflow?.by_day ?? []).filter(d => d.date >= weekStart)
      const totals = week.reduce((acc, d) => ({ income: acc.income + d.income, expense: acc.expense + d.expense }), { income: 0, expense: 0 })
      return [{ name: 'Income', value: totals.income }, { name: 'Expense', value: totals.expense }]
    }
    return [{ name: 'Income', value: cashflow?.income_total ?? 0 }, { name: 'Expense', value: cashflow?.expense_total ?? 0 }]
  }, [period, cashflow, yearQueries])

  const donutTotal = donutData.reduce((a, b) => a + b.value, 0)

  // ── Category breakdown (pie) ───────────────────────────────────────────
  const pieData = useMemo(() => {
    let items = expensesPage?.items ?? []
    if (period === 'This Week') {
      const weekStart = dayjs().subtract(6, 'day').startOf('day')
      items = items.filter(e => dayjs(e.logged_at).isAfter(weekStart))
    }
    const byCategory = new Map<string, number>()
    items.forEach(e => byCategory.set(e.category, (byCategory.get(e.category) ?? 0) + Number(e.amount)))
    return Array.from(byCategory.entries())
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 8)
  }, [expensesPage, period])

  // ── Trend ───────────────────────────────────────────────────────────────
  const trendOptions = useMemo(() => {
    if (period === 'This Year') {
      const categories = last12Months.map(m => dayjs(m + '-01').format('MMM'))
      const data = yearQueries.map(q => Math.round((q.data?.income_total ?? 0) - (q.data?.expense_total ?? 0)))
      return {
        chart: { type: 'column', backgroundColor: 'transparent', height: 240 },
        title: { text: null },
        xAxis: { categories, labels: { style: { color: 'hsl(var(--muted-foreground))' } }, lineWidth: 0, tickWidth: 0 },
        yAxis: { visible: false },
        legend: { enabled: false },
        credits: { enabled: false },
        tooltip: {
          backgroundColor: 'rgba(0,0,0,0.8)', style: { color: '#fff' }, borderWidth: 0,
          formatter: function (this: any) { return `<b>${this.x}</b><br/>${formatCurrency(this.y as number)}` },
        },
        plotOptions: { column: { borderRadius: 4, borderWidth: 0 } },
        series: [{ name: 'Net Cashflow', data, colors: data.map(v => v >= 0 ? '#10B981' : '#EF4444'), colorByPoint: true }],
      }
    }
    let byDay = cashflow?.by_day ?? []
    if (period === 'This Week') {
      const weekStart = dayjs().subtract(6, 'day').format('YYYY-MM-DD')
      byDay = byDay.filter(d => d.date >= weekStart)
    }
    return {
      chart: { type: 'areaspline', backgroundColor: 'transparent', height: 240, margin: [20, 0, 20, 0] },
      title: { text: null },
      xAxis: {
        categories: byDay.map(d => dayjs(d.date).format('MMM D')),
        labels: { style: { color: 'hsl(var(--muted-foreground))' } },
        lineWidth: 0, tickWidth: 0,
      },
      yAxis: { visible: false },
      legend: { enabled: false },
      credits: { enabled: false },
      tooltip: {
        backgroundColor: 'rgba(0,0,0,0.8)', style: { color: '#fff' }, borderWidth: 0,
        formatter: function (this: any) { return `<b>${this.x}</b><br/>${formatCurrency(this.y as number)}` },
      },
      plotOptions: { areaspline: { fillOpacity: 0.2, lineWidth: 3, marker: { enabled: false, states: { hover: { enabled: true } } } } },
      series: [{
        name: 'Net Cashflow',
        data: byDay.map(d => Math.round(d.income - d.expense)),
        color: '#10B981',
        fillColor: { linearGradient: { x1: 0, y1: 0, x2: 0, y2: 1 }, stops: [[0, 'rgba(16, 185, 129, 0.5)'], [1, 'rgba(16, 185, 129, 0.0)']] },
      }],
    }
  }, [period, cashflow, yearQueries, last12Months])

  return (
    <div className="space-y-4">
      <AiInsightCard area="finance" />
      <AIInsightsEngine />

      <div className="flex justify-end">
        <Segmented options={['This Week', 'This Month', 'This Year']} value={period} onChange={v => setPeriod(v as Period)} />
      </div>

      <div className="grid grid-cols-12 gap-4">
        <div className="col-span-12 lg:col-span-5">
          <ChartCard title="Income vs Expense">
            {isLoading ? <Skeleton className="h-[200px] w-full" /> : donutTotal === 0 ? (
              <Empty description="No data for this period" image={Empty.PRESENTED_IMAGE_SIMPLE} />
            ) : (
              <div className="flex items-center gap-4">
                <div className="h-36 w-36 relative shrink-0">
                  <HighchartsReact highcharts={Highcharts} options={{
                    chart: { type: 'pie', backgroundColor: 'transparent', margin: [0, 0, 0, 0], height: 144, width: 144 },
                    title: { text: null },
                    credits: { enabled: false },
                    tooltip: {
                      backgroundColor: 'rgba(0,0,0,0.85)', style: { color: '#fff', fontSize: '11px' }, borderWidth: 0, shadow: false,
                      pointFormatter: function (this: Highcharts.Point) { return `${this.name}: <b>${formatCurrency(this.y as number)}</b>` },
                    },
                    plotOptions: { pie: { innerSize: '75%', borderWidth: 0, colors: ['#10B981', '#EF4444'], dataLabels: { enabled: false } } },
                    series: [{ data: donutData.map(d => ({ name: d.name, y: d.value })) }],
                  }} />
                  <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                    <span className="text-[9px] text-muted-foreground uppercase tracking-wider font-semibold">Net</span>
                    <span className="text-sm font-bold text-foreground">{formatCurrency(donutData[0].value - donutData[1].value)}</span>
                  </div>
                </div>
                <div className="space-y-2.5 flex-1">
                  {donutData.map((d, i) => (
                    <div key={d.name} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full" style={{ backgroundColor: ['#10B981', '#EF4444'][i] }} />
                        <span className="text-xs text-muted-foreground">{d.name}</span>
                      </div>
                      <span className="text-xs font-semibold text-foreground">{formatCurrency(d.value)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </ChartCard>
        </div>

        <div className="col-span-12 lg:col-span-7">
          <ChartCard title={`Spending by Category${period === 'This Year' ? ' (This Month)' : ''}`}>
            {isLoading ? <Skeleton className="h-[200px] w-full" /> : pieData.length === 0 ? (
              <Empty description="No expenses for this period" image={Empty.PRESENTED_IMAGE_SIMPLE} />
            ) : (
              <div className="flex items-center gap-4">
                <div className="h-36 w-36 shrink-0">
                  <HighchartsReact highcharts={Highcharts} options={{
                    chart: { type: 'pie', backgroundColor: 'transparent', margin: [0, 0, 0, 0], height: 144, width: 144 },
                    title: { text: null },
                    credits: { enabled: false },
                    tooltip: {
                      backgroundColor: 'rgba(0,0,0,0.85)', style: { color: '#fff', fontSize: '11px' }, borderWidth: 0, shadow: false,
                      pointFormatter: function (this: Highcharts.Point) { return `${this.name}: <b>${formatCurrency(this.y as number)}</b> (${this.percentage?.toFixed(0)}%)` },
                    },
                    plotOptions: { pie: { borderWidth: 0, colors: PIE_COLORS, dataLabels: { enabled: false } } },
                    series: [{ data: pieData.map(d => ({ name: d.name, y: d.value })) }],
                  }} />
                </div>
                <div className="space-y-1.5 flex-1 max-h-36 overflow-y-auto pr-1">
                  {pieData.map((d, i) => {
                    const total = pieData.reduce((a, b) => a + b.value, 0)
                    return (
                      <button
                        key={d.name}
                        onClick={() => setDrillCategory(c => c === d.name ? null : d.name)}
                        className={`flex items-center justify-between w-full rounded px-1 py-0.5 transition-colors ${drillCategory === d.name ? 'bg-muted' : 'hover:bg-muted/50'}`}
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: PIE_COLORS[i % PIE_COLORS.length] }} />
                          <span className="text-xs text-muted-foreground truncate">{d.name}</span>
                        </div>
                        <span className="text-xs font-semibold text-foreground shrink-0 ml-2">{total > 0 ? `${((d.value / total) * 100).toFixed(0)}%` : '0%'}</span>
                      </button>
                    )
                  })}
                </div>
              </div>
            )}
          </ChartCard>
        </div>

        {drillCategory && (
          <div className="col-span-12">
            <ChartCard title={`${drillCategory} — Transactions This Month`}>
              <button
                onClick={() => setDrillCategory(null)}
                className="absolute top-4 right-4 p-1 rounded hover:bg-muted text-muted-foreground transition-colors"
                aria-label="Close drill-down"
              >
                <X size={14} />
              </button>
              {(() => {
                const items = (expensesPage?.items ?? []).filter(e => e.category === drillCategory)
                if (items.length === 0) return <Empty description="No transactions" image={Empty.PRESENTED_IMAGE_SIMPLE} />
                return (
                  <div className="max-h-64 overflow-y-auto pr-1">
                    {items.map(e => (
                      <div key={e.id} className="flex items-center justify-between py-2 px-1 border-b border-border/40 last:border-b-0">
                        <div className="min-w-0">
                          <div className="text-xs font-medium text-foreground truncate">{e.description || e.category}</div>
                          <div className="text-[10px] text-muted-foreground">{dayjs(e.logged_at).format('MMM D, h:mm A')}</div>
                        </div>
                        <span className="text-xs font-semibold text-red-500 shrink-0 ml-2">-{formatCurrency(Number(e.amount))}</span>
                      </div>
                    ))}
                  </div>
                )
              })()}
            </ChartCard>
          </div>
        )}

        <div className="col-span-12 lg:col-span-6">
          <ChartCard title="Budget vs Actual — This Month">
            {(budgetStatus?.items ?? []).length === 0 ? (
              <Empty description="No budgets set — add limits in the Budget tab" image={Empty.PRESENTED_IMAGE_SIMPLE} />
            ) : (
              <div className="space-y-3 max-h-64 overflow-y-auto pr-1">
                {(budgetStatus?.items ?? []).map(b => {
                  const pct = Math.min(100, b.pct)
                  const over = b.spent > b.monthly_limit
                  const barColor = over ? 'bg-red-500' : b.pct >= 80 ? 'bg-amber-500' : 'bg-emerald-500'
                  return (
                    <div key={b.category}>
                      <div className="flex items-center justify-between text-xs mb-1">
                        <span className="text-foreground">{b.category}</span>
                        <span className={over ? 'text-red-500 font-medium' : 'text-muted-foreground'}>
                          {formatCurrency(b.spent)} / {formatCurrency(b.monthly_limit)}
                        </span>
                      </div>
                      <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                        <div className={`h-full rounded-full ${barColor}`} style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </ChartCard>
        </div>

        <div className="col-span-12 lg:col-span-6">
          <ChartCard title={`Trend — ${period}`}>
            {isLoading ? <Skeleton className="h-[240px] w-full" /> : (
              <HighchartsReact highcharts={Highcharts} options={trendOptions} />
            )}
          </ChartCard>
        </div>
      </div>
    </div>
  )
}
