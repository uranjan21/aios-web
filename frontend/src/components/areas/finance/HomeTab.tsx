// @ts-nocheck
import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import dayjs from 'dayjs'
import { format } from 'date-fns'
import { Select, Badge, EmptyState, Button, HeaderActionPortal } from '@ledgr/ui'
import { financeApi } from '@/api/areas'
import { formatCurrency, cn } from '@/lib/utils'
import { Skeleton } from '@/components/ui/skeleton'
import { ErrorCard } from '@/components/ErrorCard'
import { ProgressBar } from '@/components/lumina';
import { Card as GlassCard } from '@ledgr/ui';
import { WorkspaceLayout, RailHeading } from '@/components/layout/WorkspaceLayout'
import { PageToolbar } from '@/components/layout/PageLayout'
import { AiInsightCard } from '@/components/AiInsightCard'
import { AIInsightsEngine } from './AdvancedWidgets'
import styled, { useTheme } from 'styled-components'
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, LineChart, Line, XAxis, YAxis, CartesianGrid, Legend } from 'recharts'
import { SegmentedControl } from '@ledgr/ui'
import { TrendingDown, TrendingUp, Wallet, PiggyBank, CalendarClock, HeartPulse, Target, PieChart as PieChartIcon } from 'lucide-react'

const StyledSkeleton = styled(Skeleton)<{ $height: string }>`
  height: ${({ $height }) => $height};
  width: 100%;
`

const LoadingWrapper = styled.div`
  display: flex;
  flex-direction: column;
  gap: 1rem;
`

const LoadingHeader = styled(Skeleton)`
  width: 100%;
  height: 4rem;
  border-radius: 0.75rem;
`

const LoadingGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(12, minmax(0, 1fr));
  gap: 1rem;
`

const LoadingGridItem7 = styled(Skeleton)`
  grid-column: span 12 / span 12;
  height: 300px;
  border-radius: 0.75rem;
  @media (min-width: 1024px) {
    grid-column: span 7 / span 7;
  }
`

const LoadingGridItem5 = styled(Skeleton)`
  grid-column: span 12 / span 12;
  height: 300px;
  border-radius: 0.75rem;
  @media (min-width: 1024px) {
    grid-column: span 5 / span 5;
  }
`

const KpiGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 1rem;
  @media (min-width: 1280px) {
    grid-template-columns: repeat(4, minmax(0, 1fr));
  }
`

const StatTileContainer = styled.div`
  background-color: ${({ theme }) => theme.color.card};
  border-radius: ${({ theme }) => theme.radii.lg};
  box-shadow: 0 1px 2px rgba(45, 49, 58, 0.05);
  border: 1px solid ${({ theme }) => theme.color.border};
  padding: 1.5rem;
  display: flex;
  flex-direction: column;
  height: 100%;
`

const StatLabel = styled.span`
  font-size: 14px;
  font-weight: 500;
  color: ${({ theme }) => theme.color.mutedForeground};
  margin-bottom: 0.75rem;
  text-transform: capitalize;
`

const StatValue = styled.span<{ $accent?: string }>`
  font-size: 28px;
  font-weight: 800;
  letter-spacing: -0.02em;
  color: ${({ theme }) => theme.color.foreground};
  font-variant-numeric: tabular-nums;
  margin-bottom: 0.5rem;
`

const StatSub = styled.span`
  font-size: 11px;
  color: ${({ theme }) => theme.color.mutedForeground};
`

const ChartContainer = styled.div`
  height: auto;
  min-height: 0;
  margin-top: 1rem;
`

const AnalyticsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(1, minmax(0, 1fr));
  gap: 1rem;
  margin-top: 1rem;
  @media (min-width: 768px) {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
`

const ListContainer = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
`

const ListItem = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.375rem 0;
  border-bottom: 1px solid ${({ theme }) => theme.color.border}33;
  
  &:last-child {
    border-bottom: 0;
  }
`

const ItemContent = styled.div`
  display: flex;
  align-items: center;
  gap: 0.625rem;
`

const ItemTitle = styled.div`
  font-size: 12px;
  font-weight: 500;
  color: ${({ theme }) => theme.color.foreground};
`

const ItemSubtitle = styled.div`
  font-size: 10px;
  color: ${({ theme }) => theme.color.mutedForeground};
`

const ItemAmountText = styled.span<{ $color?: string }>`
  font-size: 12px;
  font-weight: 500;
  font-variant-numeric: tabular-nums;
  color: ${({ $color, theme }) => $color || theme.color.foreground};
`

const AmountContainer = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
`

const NavBtn = styled.button`
  font-size: 10px;
  padding: 0.125rem 0.375rem;
  background-color: ${({ theme }) => theme.color.muted}80;
  color: ${({ theme }) => theme.color.mutedForeground};
  border-radius: 0.25rem;
  transition: background-color 0.2s;
  font-weight: 500;
  border: none;
  cursor: pointer;

  &:hover {
    background-color: ${({ theme }) => theme.color.muted};
  }
`

const HealthScoreTop = styled.div`
  display: flex;
  align-items: baseline;
  gap: 0.25rem;
  margin-bottom: 0.5rem;
`

const HealthScoreValue = styled.span`
  font-size: 12px;
  font-weight: 600;
  color: ${({ theme }) => theme.color.foreground};
  font-variant-numeric: tabular-nums;
  letter-spacing: -0.025em;
`

const HealthScoreMax = styled.span`
  font-size: 10px;
  color: ${({ theme }) => theme.color.mutedForeground};
`

const HealthScoreComponents = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
`

const ComponentHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 0.125rem;
`

const ComponentLabel = styled.span`
  font-size: 11px;
  font-weight: 500;
  color: ${({ theme }) => theme.color.foreground};
`

const ComponentValue = styled.span`
  font-size: 10px;
  font-variant-numeric: tabular-nums;
  color: ${({ theme }) => theme.color.mutedForeground};
`

const ComponentDisplay = styled.div`
  font-size: 10px;
  color: ${({ theme }) => theme.color.mutedForeground};
  margin-top: 0.125rem;
`

const UnifiedStats = styled.div`
  margin-top: 1rem;
`

const InsightsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(1, minmax(0, 1fr));
  gap: 1rem;
  margin-top: 1rem;
  @media (min-width: 1024px) {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
`

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



const BAND_STYLES: Record<string, { label: string; tag: string; barColor: string }> = {
  excellent: { label: 'Excellent', tag: 'success', barColor: '#F8D168' },
  good: { label: 'Good', tag: 'processing', barColor: 'var(--muted-foreground)' },
  fair: { label: 'Fair', tag: 'warning', barColor: '#F4A261' },
  attention: { label: 'Needs Attention', tag: 'error', barColor: '#F4A261' },
}

function scoreBand(score: number): string {
  return score >= 80 ? 'excellent' : score >= 60 ? 'good' : score >= 40 ? 'fair' : 'attention'
}

function HealthScoreCard({ data, delay = 0 }: { data: import('@/types').FinanceHealthScore | undefined; delay?: 0 | 100 | 200 | 300 }) {
  const theme = useTheme()
  const [healthPeriod, setHealthPeriod] = useState('current')

  if (!data) {
    return (
      <GlassCard title="Financial Health" subtitle="Your overall financial score" icon={<HeartPulse size={16} />} hoverable fadeIn="up" delay={delay} style={{ height: '100%' }}>
        <StyledSkeleton $height="10rem" />
      </GlassCard>
    )
  }
  const currentData = (healthPeriod === 'prev' && data.prev) ? data.prev : data
  const band = BAND_STYLES[currentData.band] ?? BAND_STYLES.fair
  return (
    <GlassCard
      title="Financial Health"
      subtitle="Your overall financial score"
      icon={<HeartPulse size={16} />}
      action={
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Badge tone={band.tag as any} style={{ fontSize: '10px', lineHeight: '1.2', padding: '0 4px' }}>{band.label}</Badge>
          <Select
            size="sm"
            fullWidth={false}
            options={[
              { label: 'Current', value: 'current' },
              { label: 'Previous', value: 'prev' },
            ]}
            value={healthPeriod}
            onChange={(val) => setHealthPeriod(val as string)}
          />
        </div>
      }
      hoverable
      fadeIn="up"
      delay={delay}
      style={{ height: '100%', display: 'flex', flexDirection: 'column' }}
    >
      <HealthScoreTop>
        <HealthScoreValue>{currentData.score}</HealthScoreValue>
        <HealthScoreMax>/ 100</HealthScoreMax>
      </HealthScoreTop>
      <HealthScoreComponents>
        {currentData.components.map(c => (
          <div key={c.key}>
            <ComponentHeader>
              <ComponentLabel>{c.label}</ComponentLabel>
              <ComponentValue>{c.available ? c.score : '—'}</ComponentValue>
            </ComponentHeader>
            <ProgressBar
              size="sm"
              value={c.available ? (c.score ?? 0) : 0}
              style={{ backgroundColor: c.available ? BAND_STYLES[scoreBand(c.score ?? 0)].barColor : theme.color.muted }}
            />
            <ComponentDisplay>{c.display}</ComponentDisplay>
          </div>
        ))}
      </HealthScoreComponents>
    </GlassCard>
  )
}

function NavButton({ onClick }: { onClick: () => void }) {
  return (
    <NavBtn onClick={onClick}>
      See all
    </NavBtn>
  )
}

function StatTile({ label, value, sub, accent, icon, action }: { label: string; value: string; sub?: string; accent?: string; icon?: React.ReactNode; action?: React.ReactNode }) {
  return (
    <GlassCard
      title={label}
      subtitle={sub}
      icon={icon}
      action={action}
      style={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: '120px' }}
    >
      <StatValue $accent={accent} style={{ marginTop: 'auto' }}>{value}</StatValue>
    </GlassCard>
  )
}

export function HomeTab({ onNavigateTab }: { onNavigateTab: (key: string) => void }) {
  const [period, setPeriod] = useState<'This Week' | 'This Month' | 'This Year'>('This Month')
  const [showInsights, setShowInsights] = useState(false)
  const [showExplainMonth, setShowExplainMonth] = useState(false)
  const [chartFilter, setChartFilter] = useState<'Daily' | 'Weekly' | 'Monthly' | 'Yearly' | 'All Time'>('Monthly')

  const [upcomingFilter, setUpcomingFilter] = useState('all')

  const month = format(new Date(), 'yyyy-MM')

  const { data: netWorth, isLoading: loadingSnapshot, isError: errorSnapshot } = useQuery({
    queryKey: ['finance', 'net-worth'],
    queryFn: financeApi.netWorth,
  })

  const { data: budgetStatus } = useQuery({
    queryKey: ['finance', 'budgets', 'status', month],
    queryFn: () => financeApi.budgetStatus(month),
  })

  const { data: snapshots } = useQuery({
    queryKey: ['finance', 'snapshots'],
    queryFn: financeApi.snapshots,
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

  const { data: yearlyExpenses } = useQuery({
    queryKey: ['finance', 'expenses', 'yearly'],
    queryFn: () => financeApi.expenses(undefined, undefined, 200, 0),
    enabled: period === 'This Year',
  })

  const { data: income } = useQuery({
    queryKey: ['finance', 'income', month],
    queryFn: () => financeApi.income(month),
  })

  const { data: healthScore } = useQuery({
    queryKey: ['finance', 'health-score'],
    queryFn: financeApi.healthScore,
  })

  const expenseItems = expenses?.items ?? []

  const totalExpenses = useMemo(() => expenseItems.reduce((acc, e) => acc + Number(e.amount), 0), [expenseItems])
  const totalIncome = useMemo(() => (income ?? []).reduce((acc, i) => acc + Number(i.amount), 0), [income])
  const savingsRate = totalIncome > 0 ? Math.round(((totalIncome - totalExpenses) / totalIncome) * 100) : null

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

  const byCategory = new Map<string, number>()
  filteredExpenseItems.forEach(t => byCategory.set(t.category ?? 'Other', (byCategory.get(t.category ?? 'Other') ?? 0) + Number(t.amount)))
  const allCategories = Array.from(byCategory.entries()).sort((a, b) => b[1] - a[1])
  let topCategories = allCategories.slice(0, 5)
  const otherAmount = allCategories.slice(5).reduce((sum, [, amt]) => sum + amt, 0)
  if (otherAmount > 0) {
    topCategories.push(['Other', otherAmount])
  }

  const COLORS = ['var(--primary)', 'var(--accent)', '#F4A261', '#E76F51', '#2A9D8F', '#E9C46A'];

  const renderCustomizedLabel = (props: any) => {
    const { cx, cy, midAngle, outerRadius, value, name, fill } = props;
    const RADIAN = Math.PI / 180;
    const sin = Math.sin(-RADIAN * midAngle);
    const cos = Math.cos(-RADIAN * midAngle);
    const sx = cx + (outerRadius) * cos;
    const sy = cy + (outerRadius) * sin;
    const mx = cx + (outerRadius + 20) * cos;
    const my = cy + (outerRadius + 20) * sin;
    const ex = mx + (cos >= 0 ? 1 : -1) * 20;
    const ey = my;
    const textAnchor = cos >= 0 ? 'start' : 'end';
    const arrowId = `arrow-${name.replace(/[^a-zA-Z0-9]/g, '')}`;

    return (
      <g>
        <defs>
          <marker id={arrowId} viewBox="0 0 10 10" refX="8" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse">
            <path d="M 0 0 L 10 5 L 0 10 z" fill={fill} />
          </marker>
        </defs>
        <path d={`M${ex},${ey} L${mx},${my} L${sx},${sy}`} stroke={fill} fill="none" strokeWidth={1.5} markerEnd={`url(#${arrowId})`}/>
        <text x={ex + (cos >= 0 ? 1 : -1) * 8} y={ey} dy={-6} textAnchor={textAnchor} fill="var(--foreground)" fontSize={11} fontWeight={600}>
          {name}
        </text>
        <text x={ex + (cos >= 0 ? 1 : -1) * 8} y={ey} dy={10} textAnchor={textAnchor} fill="var(--muted-foreground)" fontSize={10}>
          {formatCurrency(value)}
        </text>
      </g>
    );
  };

  const renderBudgetLegend = () => (
    <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
        <div style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: 'var(--primary)' }} />
        <span style={{ fontSize: 11, color: 'var(--muted-foreground)' }}>Budget</span>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
        <div style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: 'var(--accent)' }} />
        <span style={{ fontSize: 11, color: 'var(--muted-foreground)' }}>Actual</span>
      </div>
    </div>
  );

  const budgetChartData = (budgetStatus?.items?.length ? budgetStatus.items : topCategories.map(([name, value]) => ({ category: name, monthly_limit: value * 1.2, spent: value })))
    .map(b => {
      const mult = chartFilter === 'Daily' ? 1/30 : chartFilter === 'Weekly' ? 1/4 : chartFilter === 'Yearly' ? 12 : chartFilter === 'All Time' ? 24 : 1;
      return {
        category: b.category,
        Budget: Math.round((b.monthly_limit || 0) * mult),
        Actual: Math.round((b.spent || 0) * mult)
      }
    })

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
    const filtered = [...billItems, ...loanItems].filter(item => {
      if (upcomingFilter === '7d') return item.days <= 7
      return true
    })
    return filtered.sort((a, b) => a.days - b.days).slice(0, 5)
  }, [bills, loans, upcomingFilter])

  if (loadingSnapshot || loadingExpenses) {
    return (
      <LoadingWrapper>
        <LoadingHeader />
        <LoadingGrid>
          <LoadingGridItem7 />
          <LoadingGridItem5 />
        </LoadingGrid>
      </LoadingWrapper>
    )
  }

  if (errorSnapshot) {
    return <ErrorCard message="Could not load financial data" />
  }

  return (
    <>
      <WorkspaceLayout>
        <PageToolbar title="Overview">
          <Button
            size="sm"
            variant={showInsights ? "primary" : "outline"}
            onClick={() => setShowInsights(!showInsights)}
          >
            Insights
          </Button>
          <Button
            size="sm"
            variant={showExplainMonth ? "primary" : "outline"}
            onClick={() => setShowExplainMonth(!showExplainMonth)}
          >
            Explain Month
          </Button>
        </PageToolbar>
        {/* KPI lead row */}
        <KpiGrid>
          <StatTile
            label="Net Worth"
            value={formatCurrency(Number(netWorth?.net_worth ?? 0))}
            sub="assets − liabilities"
            accent={Number(netWorth?.net_worth ?? 0) < 0 ? 'var(--accent)' : undefined}
            icon={<Wallet size={16} />}
          />
          <StatTile
            label="Spent"
            value={formatCurrency(totalExpenses)}
            sub={`${expenseItems.length} transactions this month`}
            accent="var(--accent)"
            icon={<TrendingDown size={16} />}
          />
          <StatTile
            label="Income"
            value={formatCurrency(totalIncome)}
            sub={`${(income ?? []).length} entries this month`}
            accent="var(--primary)"
            icon={<TrendingUp size={16} />}
          />
          <StatTile
            label="Savings Rate"
            value={savingsRate === null ? '—' : `${savingsRate}%`}
            sub={savingsRate === null ? 'log income to see' : savingsRate >= 20 ? 'healthy' : 'aim for 20%+'}
            accent={savingsRate !== null && savingsRate >= 20 ? 'var(--primary)' : undefined}
            icon={<PiggyBank size={16} />}
          />
        </KpiGrid>

        {/* Conditional InsightsGrid */}
        {(showInsights || showExplainMonth) && (
          <InsightsGrid>
            {showExplainMonth && (
              <AiInsightCard area="finance" style={{ height: '100%' }} />
            )}
            {showInsights && <AIInsightsEngine />}
          </InsightsGrid>
        )}

        {/* Analytics: 2×2 */}
        <AnalyticsGrid>
          {/* Upcoming Payments */}
          <div>
            <GlassCard 
              title="Upcoming Payments" 
              subtitle="Upcoming bills and EMIs"
              icon={<CalendarClock size={16} />}
              action={
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Select
                    size="sm"
                    fullWidth={false}
                    options={[
                      { label: 'All Due', value: 'all' },
                      { label: 'Next 7 Days', value: '7d' },
                    ]}
                    value={upcomingFilter}
                    onChange={(val) => setUpcomingFilter(val as string)}
                  />
                  <NavButton onClick={() => onNavigateTab('5')} />
                </div>
              } 
              hoverable fadeIn="up" delay={100} style={{ height: 380, display: 'flex', flexDirection: 'column' }}
            >
              <div style={{ flex: 1, overflowY: 'auto' }}>
                {upcoming.length === 0 ? (
                  <EmptyState title="No bills or EMIs due" />
                ) : (
                  <ListContainer>
                    {upcoming.map(item => (
                      <ListItem key={item.id}>
                        <div>
                          <ItemTitle>{item.name}</ItemTitle>
                          <ItemSubtitle>{item.type} · due {ordinal(item.dueDay)}</ItemSubtitle>
                        </div>
                        <AmountContainer>
                          <ItemAmountText>{formatCurrency(item.amount)}</ItemAmountText>
                          <Badge tone={urgencyColor(item.days)} variant="soft" style={{ fontSize: '10px', lineHeight: '1.2', padding: '0 4px', margin: 0 }}>{item.days === 0 ? 'Today' : `${item.days}d`}</Badge>
                        </AmountContainer>
                      </ListItem>
                    ))}
                  </ListContainer>
                )}
              </div>
            </GlassCard>
          </div>

          {/* Financial Health Score */}
          <div>
            <div style={{ height: 380, display: 'flex', flexDirection: 'column' }}>
              <HealthScoreCard data={healthScore} delay={300} />
            </div>
          </div>
        </AnalyticsGrid>

        {/* Budget and Top Categories */}
        <AnalyticsGrid>
          <div>
            <GlassCard 
              title="Budget Tracking" 
              subtitle="Actual spent vs allocated limit"
              icon={<Target size={16} />}
              action={
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                  {renderBudgetLegend()}
                  <SegmentedControl
                    size="sm"
                    aria-label="Budget chart range"
                    options={[
                      { value: 'Daily', label: 'D' },
                      { value: 'Weekly', label: 'W' },
                      { value: 'Monthly', label: 'M' },
                      { value: 'Yearly', label: 'Y' },
                      { value: 'All Time', label: 'All' },
                    ]}
                    value={chartFilter}
                    onChange={(v) => setChartFilter(v as any)}
                  />
                </div>
              }
              hoverable fadeIn="up" delay={150} style={{ height: 380, display: 'flex', flexDirection: 'column' }}
            >
              <div style={{ flex: 1, width: '100%', minHeight: 0 }}>
                {budgetChartData.length === 0 ? (
                  <EmptyState title="No budget data" />
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={budgetChartData} margin={{ top: 10, right: 30, left: 20, bottom: 20 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" />
                      <XAxis dataKey="category" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }} dy={10} />
                      <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }} tickFormatter={v => '₹' + v} />
                      <Tooltip
                        contentStyle={{ backgroundColor: 'var(--card)', borderRadius: 8, border: '1px solid var(--border)' }}
                        formatter={(value: number) => formatCurrency(value)}
                      />
                      <Line type="monotone" dataKey="Budget" stroke="var(--primary)" strokeWidth={2} dot={{ r: 4 }} activeDot={{ r: 6 }} />
                      <Line type="monotone" dataKey="Actual" stroke="var(--accent)" strokeWidth={2} dot={{ r: 4 }} activeDot={{ r: 6 }} />
                    </LineChart>
                  </ResponsiveContainer>
                )}
              </div>
            </GlassCard>
          </div>

          <div>
            <GlassCard 
              title="Top Categories" 
              subtitle="Highest spending categories"
              icon={<PieChartIcon size={16} />}
              action={
                <SegmentedControl
                  size="sm"
                  aria-label="Top categories period"
                  value={period}
                  onChange={v => setPeriod(v as 'This Week' | 'This Month' | 'This Year')}
                  options={[
                    { label: 'Week', value: 'This Week' },
                    { label: 'Month', value: 'This Month' },
                    { label: 'Year', value: 'This Year' },
                  ]}
                />
              }
              hoverable fadeIn="up" delay={200} style={{ height: 380, display: 'flex', flexDirection: 'column' }}
            >
              {topCategories.length === 0 ? <EmptyState title="No expenses" style={{ padding: '16px 0' }} /> : (
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
                      >
                        {topCategories.map((_, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value: number) => formatCurrency(value)} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              )}
            </GlassCard>
          </div>
        </AnalyticsGrid>
      </WorkspaceLayout>
    </>
  )
}
