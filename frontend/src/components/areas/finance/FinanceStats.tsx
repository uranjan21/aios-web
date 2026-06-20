import { useMemo, useState } from 'react'
import { useQuery, useQueries } from '@tanstack/react-query'
import dayjs from 'dayjs'
import { EmptyState, Card, Select, Button } from '@ledgr/ui'
import { X, PieChart as PieChartIcon, Layers, Target, Receipt } from 'lucide-react'
import type { ReactNode } from 'react'
import Highcharts from 'highcharts'
Highcharts.setOptions({ accessibility: { enabled: false } })
import HighchartsReact from 'highcharts-react-official'
import { financeApi } from '@/api/areas'
import { formatCurrency } from '@/lib/utils'
import { Skeleton } from '@/components/ui/skeleton'
import styled, { useTheme } from 'styled-components'

const StyledSkeleton = styled(Skeleton)<{ $height: string }>`
  height: ${({ $height }) => $height};
  width: 100%;
`

type Period = 'This Week' | 'This Month' | 'This Year'

function ChartCard({ title, subtitle, icon, action, children }: { title: string; subtitle?: string; icon?: ReactNode; action?: ReactNode; children: React.ReactNode }) {
  return (
    <Card title={title} subtitle={subtitle} icon={icon} action={action} size="md" style={{ height: '100%' }}>
      {children}
    </Card>
  )
}

// ── Layout ────────────────────────────────────────────────────────────────────

const StatsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(12, minmax(0, 1fr));
  gap: 16px;
  margin-top: 24px;
`

const Col5 = styled.div`
  grid-column: span 12;
  @media (min-width: 1024px) { grid-column: span 5; }
`

const Col7 = styled.div`
  grid-column: span 12;
  @media (min-width: 1024px) { grid-column: span 7; }
`

const Col6 = styled.div`
  grid-column: span 12;
  @media (min-width: 1024px) { grid-column: span 6; }
`

const Col12 = styled.div`
  grid-column: span 12;
`

// ── Donut layout ──────────────────────────────────────────────────────────────

const DonutRow = styled.div`
  display: flex;
  align-items: center;
  gap: 16px;
`

const DonutWrap = styled.div`
  position: relative;
  width: 144px;
  height: 144px;
  flex-shrink: 0;
`

const DonutCenter = styled.div`
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  pointer-events: none;
`

const DonutNetLabel = styled.span`
  font-size: 9px;
  color: ${({ theme }) => theme.color.mutedForeground};
  text-transform: uppercase;
  letter-spacing: 0.08em;
  font-weight: 500;
`

const DonutNetValue = styled.span`
  font-size: 12px;
  font-weight: 500;
  color: ${({ theme }) => theme.color.foreground};
`

const LegendList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 6px;
  flex: 1;
`

const LegendRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
`

const LegendLeft = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
`

const LegendDot = styled.div<{ $color: string }>`
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: ${({ $color }) => $color};
  flex-shrink: 0;
`

const LegendLabel = styled.span`
  font-size: 11px;
  color: ${({ theme }) => theme.color.mutedForeground};
`

const LegendValue = styled.span`
  font-size: 11px;
  font-weight: 500;
  color: ${({ theme }) => theme.color.foreground};
`

// ── Category pie ──────────────────────────────────────────────────────────────

const PieScroll = styled.div`
  display: flex;
  flex-direction: column;
  gap: 6px;
  flex: 1;
  max-height: 144px;
  overflow-y: auto;
  padding-right: 4px;
`

const PieBtn = styled.button<{ $active: boolean }>`
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  border-radius: 4px;
  padding: 2px 4px;
  border: none;
  cursor: pointer;
  background: ${({ theme, $active }) => $active ? theme.color.muted : 'transparent'};
  transition: background 120ms;
  &:hover { background: ${({ theme }) => `${theme.color.muted}88`}; }
`

const PieBtnLeft = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
`

const PieCatLabel = styled.span`
  font-size: 11px;
  color: ${({ theme }) => theme.color.mutedForeground};
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`

const PiePctLabel = styled.span`
  font-size: 11px;
  font-weight: 500;
  color: ${({ theme }) => theme.color.foreground};
  flex-shrink: 0;
  margin-left: 8px;
`

// ── Drill down ────────────────────────────────────────────────────────────────

const CloseBtn = styled.button`
  position: absolute;
  top: 16px;
  right: 16px;
  padding: 4px;
  border-radius: 6px;
  border: none;
  background: none;
  cursor: pointer;
  color: ${({ theme }) => theme.color.mutedForeground};
  transition: background 120ms;
  &:hover { background: ${({ theme }) => theme.color.muted}; }
`

const DrillScroll = styled.div`
  max-height: 256px;
  overflow-y: auto;
  padding-right: 4px;
`

const DrillRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 6px 4px;
  border-bottom: 1px solid ${({ theme }) => `${theme.color.border}66`};
  &:last-child { border-bottom: none; }
`

const DrillDesc = styled.div`
  font-size: 11px;
  font-weight: 500;
  color: ${({ theme }) => theme.color.foreground};
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`

const DrillDate = styled.div`
  font-size: 10px;
  color: ${({ theme }) => theme.color.mutedForeground};
`

const DrillAmt = styled.span`
  font-size: 11px;
  font-weight: 500;
  color: ${({ theme }) => theme.color.accent};
  flex-shrink: 0;
  margin-left: 8px;
`

// ── Budget bar ────────────────────────────────────────────────────────────────

const BudgetList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 12px;
  max-height: 256px;
  overflow-y: auto;
  padding-right: 4px;
`

const BudgetRow = styled.div`
  display: flex;
  flex-direction: column;
  gap: 4px;
`

const BudgetMeta = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size: 12px;
`

const BudgetCat = styled.span`
  color: ${({ theme }) => theme.color.foreground};
`

const BudgetAmt = styled.span<{ $over: boolean }>`
  color: ${({ theme, $over }) => $over ? theme.color.accent : theme.color.mutedForeground};
`

const BudgetTrack = styled.div`
  height: 6px;
  border-radius: 999px;
  background: ${({ theme }) => theme.color.muted};
  overflow: hidden;
`

const BudgetBar = styled.div<{ $pct: number; $color: string }>`
  height: 100%;
  border-radius: 999px;
  background: ${({ $color }) => $color};
  width: ${({ $pct }) => `${$pct}%`};
`

// ── Main component ────────────────────────────────────────────────────────────

export function FinanceStats({ period }: { period: Period }) {
  const theme = useTheme()
  const [drillCategory, setDrillCategory] = useState<string | null>(null)
  const month = dayjs().format('YYYY-MM')

  const [incExpPeriod, setIncExpPeriod] = useState('monthly')
  const [spendPeriod, setSpendPeriod] = useState('monthly')
  const [budgetFilterStatus, setBudgetFilterStatus] = useState('all')
  const [trendTimeline, setTrendTimeline] = useState('6m')

  const pieColors = useMemo(() => [
    theme.color.accent,
    theme.color.primary,
    theme.color.success,
    theme.color.warning,
    theme.color.info,
    theme.color.destructive,
    theme.color.mutedForeground,
    theme.color.border
  ], [theme])

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

  const last12Months = useMemo(() =>
    Array.from({ length: 12 }, (_, i) => dayjs().subtract(11 - i, 'month').format('YYYY-MM')), [])
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

  const trendOptions = useMemo(() => {
    if (period === 'This Year') {
      const categories = last12Months.map(m => dayjs(m + '-01').format('MMM'))
      const data = yearQueries.map(q => Math.round((q.data?.income_total ?? 0) - (q.data?.expense_total ?? 0)))
      return {
        chart: { type: 'column', backgroundColor: 'transparent', height: 240 },
        title: { text: null }, credits: { enabled: false }, legend: { enabled: false },
        xAxis: { categories, labels: { style: { color: theme.color.mutedForeground } }, lineWidth: 0, tickWidth: 0 },
        yAxis: { visible: false },
        tooltip: { backgroundColor: theme.color.popover, style: { color: theme.color.popoverForeground }, borderWidth: 0,
          formatter: function (this: any) { return `<b>${this.x}</b><br/>${formatCurrency(this.y as number)}` } },
        plotOptions: { column: { borderRadius: 4, borderWidth: 0 } },
        series: [{ name: 'Net Cashflow', data, colors: data.map(v => v >= 0 ? theme.color.accent : theme.color.mutedForeground), colorByPoint: true }],
      }
    }
    let byDay = cashflow?.by_day ?? []
    if (period === 'This Week') byDay = byDay.filter(d => d.date >= dayjs().subtract(6, 'day').format('YYYY-MM-DD'))
    return {
      chart: { type: 'areaspline', backgroundColor: 'transparent', height: 240, margin: [20, 0, 20, 0] },
      title: { text: null }, credits: { enabled: false }, legend: { enabled: false },
      xAxis: { categories: byDay.map(d => dayjs(d.date).format('MMM D')),
        labels: { style: { color: theme.color.mutedForeground } }, lineWidth: 0, tickWidth: 0 },
      yAxis: { visible: false },
      tooltip: { backgroundColor: theme.color.popover, style: { color: theme.color.popoverForeground }, borderWidth: 0,
        formatter: function (this: any) { return `<b>${this.x}</b><br/>${formatCurrency(this.y as number)}` } },
      plotOptions: { areaspline: { fillOpacity: 0.2, lineWidth: 3, marker: { enabled: false } } },
      series: [{ name: 'Net Cashflow', data: byDay.map(d => Math.round(d.income - d.expense)),
        color: theme.color.accent,
        fillColor: { linearGradient: { x1: 0, y1: 0, x2: 0, y2: 1 }, stops: [[0, `color-mix(in srgb, ${theme.color.accent} 50%, transparent)`], [1, `color-mix(in srgb, ${theme.color.accent} 0%, transparent)`]] } }],
    }
  }, [period, cashflow, yearQueries, last12Months, theme])

  return (
    <StatsGrid>
      <Col5>
        <ChartCard
          title="Income vs Expense"
          subtitle="Period totals and the resulting net cashflow"
          icon={<Layers size={16} />}
          action={
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
              {!isLoading && donutTotal > 0 && (
                <div style={{ display: 'flex', gap: '12px' }}>
                  {donutData.map((d, i) => (
                    <div key={d.name} style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '11px' }}>
                      <LegendDot $color={[theme.color.accent, theme.color.mutedForeground][i]} />
                      <span>{d.name}</span>
                      <span style={{ fontWeight: 500 }}>{formatCurrency(d.value)}</span>
                    </div>
                  ))}
                </div>
              )}
              <Select
                size="sm"
                fullWidth={false}
                options={[
                  { label: 'Monthly', value: 'monthly' },
                  { label: 'Yearly', value: 'yearly' },
                ]}
                value={incExpPeriod}
                onChange={(val) => setIncExpPeriod(val as string)}
              />
            </div>
          }
        >
          {isLoading ? <StyledSkeleton $height="200px" /> : donutTotal === 0 ? (
            <EmptyState title="No data for this period" />
          ) : (
            <DonutRow>
              <DonutWrap>
                <HighchartsReact highcharts={Highcharts} options={{
                  chart: { type: 'pie', backgroundColor: 'transparent', margin: [0, 0, 0, 0], height: 144, width: 144 },
                  title: { text: null }, credits: { enabled: false },
                  tooltip: { backgroundColor: theme.color.popover, style: { color: theme.color.popoverForeground, fontSize: '11px' }, borderWidth: 0,
                    pointFormatter: function (this: Highcharts.Point) { return `${this.name}: <b>${formatCurrency(this.y as number)}</b>` } },
                  plotOptions: { pie: { innerSize: '75%', borderWidth: 0, colors: [theme.color.accent, theme.color.mutedForeground], dataLabels: { enabled: false } } },
                  series: [{ data: donutData.map(d => ({ name: d.name, y: d.value })) }],
                }} />
                <DonutCenter>
                  <DonutNetLabel>Net</DonutNetLabel>
                  <DonutNetValue>{formatCurrency(donutData[0].value - donutData[1].value)}</DonutNetValue>
                </DonutCenter>
              </DonutWrap>
            </DonutRow>
          )}
        </ChartCard>
      </Col5>

      <Col7>
        <ChartCard
          title={`Spending by Category${period === 'This Year' ? ' (This Month)' : ''}`}
          subtitle="Tap a slice to drill into its transactions"
          icon={<PieChartIcon size={16} />}
          action={
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
              {!isLoading && pieData.length > 0 && (
                <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', maxWidth: '300px' }}>
                  {pieData.map((d, i) => {
                    const total = pieData.reduce((a, b) => a + b.value, 0)
                    return (
                      <PieBtn
                        key={d.name}
                        $active={drillCategory === d.name}
                        onClick={() => setDrillCategory(c => c === d.name ? null : d.name)}
                        style={{ padding: '2px 8px', borderRadius: '4px', display: 'flex', alignItems: 'center', gap: '4px' }}
                      >
                        <LegendDot $color={pieColors[i % pieColors.length]} />
                        <span style={{ fontSize: '11px', fontWeight: 500 }}>{d.name}</span>
                        <span style={{ fontSize: '10px', opacity: 0.7 }}>
                          {total > 0 ? `${((d.value / total) * 100).toFixed(0)}%` : '0%'}
                        </span>
                      </PieBtn>
                    )
                  })}
                </div>
              )}
              <Select
                size="sm"
                fullWidth={false}
                options={[
                  { label: 'Monthly', value: 'monthly' },
                  { label: 'Yearly', value: 'yearly' },
                ]}
                value={spendPeriod}
                onChange={(val) => setSpendPeriod(val as string)}
              />
            </div>
          }
        >
          {isLoading ? <StyledSkeleton $height="200px" /> : pieData.length === 0 ? (
            <EmptyState title="No expenses for this period" />
          ) : (
            <DonutRow>
              <div style={{ width: 144, height: 144, flexShrink: 0, margin: '0 auto' }}>
                <HighchartsReact highcharts={Highcharts} options={{
                  chart: { type: 'pie', backgroundColor: 'transparent', margin: [0, 0, 0, 0], height: 144, width: 144 },
                  title: { text: null }, credits: { enabled: false },
                  tooltip: { backgroundColor: theme.color.popover, style: { color: theme.color.popoverForeground, fontSize: '11px' }, borderWidth: 0,
                    pointFormatter: function (this: Highcharts.Point) { return `${this.name}: <b>${formatCurrency(this.y as number)}</b> (${this.percentage?.toFixed(0)}%)` } },
                  plotOptions: { pie: { borderWidth: 0, colors: pieColors, dataLabels: { enabled: false } } },
                  series: [{ data: pieData.map(d => ({ name: d.name, y: d.value })) }],
                }} />
              </div>
            </DonutRow>
          )}
        </ChartCard>
      </Col7>

      {drillCategory && (
        <Col12>
          <ChartCard
            title={`${drillCategory} — Transactions This Month`}
            subtitle="Drill-down view for the selected category"
            icon={<Receipt size={16} />}
            action={
              <Button size="sm" variant="ghost" onClick={() => setDrillCategory(null)} aria-label="Close drill-down">
                <X size={14} style={{ marginRight: '4px' }} /> Close
              </Button>
            }
          >
            {(() => {
              const items = (expensesPage?.items ?? []).filter(e => e.category === drillCategory)
              if (items.length === 0) return <EmptyState title="No transactions" />
              return (
                <DrillScroll>
                  {items.map(e => (
                    <DrillRow key={e.id}>
                      <div style={{ minWidth: 0 }}>
                        <DrillDesc>{e.description || e.category}</DrillDesc>
                        <DrillDate>{dayjs(e.logged_at).format('MMM D, h:mm A')}</DrillDate>
                      </div>
                      <DrillAmt>-{formatCurrency(Number(e.amount))}</DrillAmt>
                    </DrillRow>
                  ))}
                </DrillScroll>
              )
            })()}
          </ChartCard>
        </Col12>
      )}

      <Col6>
        <ChartCard
          title="Budget vs Actual — This Month"
          subtitle="How much of each category limit you've used"
          icon={<Target size={16} />}
          action={
            <Select
              size="sm"
              fullWidth={false}
              options={[
                { label: 'All Budgets', value: 'all' },
                { label: 'Over Budget', value: 'over' },
                { label: 'Under Budget', value: 'under' },
              ]}
              value={budgetFilterStatus}
              onChange={(val) => setBudgetFilterStatus(val as string)}
            />
          }
        >
          {(budgetStatus?.items ?? []).length === 0 ? (
            <EmptyState title="No budgets set — add limits in the Budget tab" />
          ) : (
            <BudgetList>
              {(budgetStatus?.items ?? [])
                .filter(b => {
                  if (budgetFilterStatus === 'over') return b.spent > b.monthly_limit
                  if (budgetFilterStatus === 'under') return b.spent <= b.monthly_limit
                  return true
                })
                .map(b => {
                  const pct = Math.min(100, b.pct)
                  const over = b.spent > b.monthly_limit
                  const barColor = over ? '#F4A261' : b.pct >= 80 ? '#F4A261' : '#F8D168'
                  return (
                    <BudgetRow key={b.category}>
                      <BudgetMeta>
                        <BudgetCat>{b.category}</BudgetCat>
                        <BudgetAmt $over={over}>{formatCurrency(b.spent)} / {formatCurrency(b.monthly_limit)}</BudgetAmt>
                      </BudgetMeta>
                      <BudgetTrack>
                        <BudgetBar $pct={pct} $color={barColor} />
                      </BudgetTrack>
                    </BudgetRow>
                  )
                })}
            </BudgetList>
          )}
        </ChartCard>
      </Col6>

      <Col6>
        <ChartCard
          title={`Trend — ${period}`}
          subtitle="Net cashflow over the selected horizon"
          icon={<Layers size={16} />}
          action={
            <Select
              size="sm"
              fullWidth={false}
              options={[
                { label: '6 Months', value: '6m' },
                { label: '12 Months', value: '12m' },
                { label: 'All Time', value: 'all' },
              ]}
              value={trendTimeline}
              onChange={(val) => setTrendTimeline(val as string)}
            />
          }
        >
          {isLoading ? <StyledSkeleton $height="240px" /> : (
            <HighchartsReact highcharts={Highcharts} options={trendOptions} />
          )}
        </ChartCard>
      </Col6>
    </StatsGrid>
  )
}
