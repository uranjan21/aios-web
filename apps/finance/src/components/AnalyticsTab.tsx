
import { useState, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import dayjs from 'dayjs'
import { format } from 'date-fns'
import { financeApi } from '@aios/shared/api/areas'
import { formatCurrency } from '@aios/shared/lib/utils'
import { WorkspaceLayout } from '@aios/shared/components/layout/WorkspaceLayout'
import { Card as GlassCard, EmptyState, Select } from '@ledgr/ui'
import { AiInsightCard } from '@aios/shared/components/AiInsightCard'
import { ChartTooltip } from '@aios/shared/components/ui/ChartTooltip'
import { FinancialInsights, SubscriptionManagement } from './AdvancedWidgets'
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts'
import { PieChart as PieChartIcon, Brain } from 'lucide-react'
import styled from 'styled-components'

const AnalyticsGrid = styled.div`
  display: grid;
  grid-template-columns: 1fr;
  gap: 12px;
  @media (min-width: 1024px) {
    grid-template-columns: repeat(2, 1fr);
  }
`

const InsightsGrid = styled.div`
  display: grid;
  grid-template-columns: 1fr;
  gap: 12px;
  @media (min-width: 1024px) {
    grid-template-columns: repeat(2, 1fr);
  }
`

const COLORS = ['var(--primary)', 'var(--accent)', '#F4A261', '#E76F51', '#2A9D8F', '#E9C46A']


function renderCustomizedLabel(props: any) {
  const { cx, cy, midAngle, outerRadius, value, name, fill } = props
  const RADIAN = Math.PI / 180
  const sin = Math.sin(-RADIAN * midAngle)
  const cos = Math.cos(-RADIAN * midAngle)
  const sx = cx + outerRadius * cos
  const sy = cy + outerRadius * sin
  const mx = cx + (outerRadius + 20) * cos
  const my = cy + (outerRadius + 20) * sin
  const ex = mx + (cos >= 0 ? 1 : -1) * 20
  const ey = my
  const textAnchor = cos >= 0 ? 'start' : 'end'
  const arrowId = `arrow-${name.replace(/[^a-zA-Z0-9]/g, '')}`

  return (
    <g>
      <defs>
        <marker id={arrowId} viewBox="0 0 10 10" refX="8" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse">
          <path d="M 0 0 L 10 5 L 0 10 z" fill={fill} />
        </marker>
      </defs>
      <path d={`M${ex},${ey} L${mx},${my} L${sx},${sy}`} stroke={fill} fill="none" strokeWidth={1.5} markerEnd={`url(#${arrowId})`} />
      <text x={ex + (cos >= 0 ? 1 : -1) * 8} y={ey} dy={-6} textAnchor={textAnchor} fill="var(--foreground)" fontSize={11} fontWeight={600}>{name}</text>
      <text x={ex + (cos >= 0 ? 1 : -1) * 8} y={ey} dy={10} textAnchor={textAnchor} fill="var(--muted-foreground)" fontSize={10}>{formatCurrency(value)}</text>
    </g>
  )
}

export function AnalyticsTab() {
  const [period, setPeriod] = useState<'This Week' | 'This Month' | 'This Year'>('This Month')

  const month = format(new Date(), 'yyyy-MM')

  const { data: expenses } = useQuery({
    queryKey: ['finance', 'expenses', month],
    queryFn: () => financeApi.expenses(month, undefined, 100, 0),
  })

  const { data: yearlyExpenses } = useQuery({
    queryKey: ['finance', 'expenses', 'yearly'],
    queryFn: () => financeApi.expenses(undefined, undefined, 200, 0),
    enabled: period === 'This Year',
  })

  const expenseItems = expenses?.items ?? []

  const filteredExpenseItems = useMemo(() => {
    let items = expenseItems
    if (period === 'This Year') {
      items = yearlyExpenses?.items ?? expenseItems
      const yearStart = dayjs().startOf('year')
      return items.filter(item => dayjs(item.logged_at).isAfter(yearStart))
    }
    if (period === 'This Week') {
      const weekStart = dayjs().subtract(6, 'day').startOf('day')
      return items.filter(item => dayjs(item.logged_at).isAfter(weekStart))
    }
    return items
  }, [expenseItems, yearlyExpenses, period])

  const topCategories = useMemo(() => {
    const byCategory = new Map<string, number>()
    filteredExpenseItems.forEach(t => byCategory.set(t.category ?? 'Other', (byCategory.get(t.category ?? 'Other') ?? 0) + Number(t.amount)))
    const all = Array.from(byCategory.entries()).sort((a, b) => b[1] - a[1])
    const top = all.slice(0, 5)
    const otherAmount = all.slice(5).reduce((sum, [, amt]) => sum + amt, 0)
    if (otherAmount > 0) top.push(['Other', otherAmount])
    return top
  }, [filteredExpenseItems])


  return (
    <WorkspaceLayout rail={undefined}>
      {/* Subscriptions + Top Categories
          (Budget-vs-allocated lives in the Budgets tab — not duplicated here) */}
      <AnalyticsGrid>
        <SubscriptionManagement />

        <GlassCard
          title="Top Categories"
          subtitle="Highest spending categories"
          icon={<PieChartIcon size={16} />}
          action={
            <Select
              size="sm"
              fullWidth={false}
              aria-label="Top categories period"
              value={period}
              onChange={(v: any) => setPeriod(v as 'This Week' | 'This Month' | 'This Year')}
              options={[
                { label: 'This Week', value: 'This Week' },
                { label: 'This Month', value: 'This Month' },
                { label: 'This Year', value: 'This Year' },
              ]}
            />
          }
          hoverable
          style={{ height: 380, display: 'flex', flexDirection: 'column' }}
        >
          {topCategories.length === 0 ? (
            <EmptyState title="No expenses" />
          ) : (
            <div style={{ flex: 1, width: '100%', minHeight: 0 }}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={topCategories.map(([name, value]) => ({ name, value }))}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={90}
                    paddingAngle={2}
                    label={renderCustomizedLabel}
                    labelLine={false}
                    isAnimationActive={false}
                  >
                    {topCategories.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip content={<ChartTooltip valueFormatter={(value: any) => formatCurrency(value)} />} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}
        </GlassCard>
      </AnalyticsGrid>

      {/* Insights + Explain Month */}
      <InsightsGrid>
        <FinancialInsights />
        <GlassCard title="Explain Month" subtitle="AI breakdown of this month's spending" icon={<Brain size={16} />} style={{ height: '100%' }}>
          <AiInsightCard area="finance" />
        </GlassCard>
      </InsightsGrid>
    </WorkspaceLayout>
  )
}
