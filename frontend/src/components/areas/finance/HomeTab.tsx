// @ts-nocheck
import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { format } from 'date-fns'
import { Select, Badge, EmptyState } from '@ledgr/ui'
import { ArrowDownCircle, ArrowUpCircle, ArrowLeftRight, Wallet, Landmark, CreditCard, PiggyBank, ChevronRight, Plus, type LucideIcon } from 'lucide-react'
import { financeApi } from '@/api/areas'
import { formatCurrency, cn } from '@/lib/utils'
import { Skeleton } from '@/components/ui/skeleton'
import { ErrorCard } from '@/components/ErrorCard'
import { IconBadge, ProgressBar } from '@/components/lumina';
import { Card as GlassCard } from '@ledgr/ui';
import { WorkspaceLayout, RailHeading } from '@/components/layout/WorkspaceLayout'
import { PageToolbar } from '@/components/layout/PageLayout'
import { BalanceWidget } from './WalletWidgets'

import { FinanceStats } from './FinanceStats'
import { TextTabs } from '@/components/ui/TextTabs'
import { AiInsightCard } from '@/components/AiInsightCard'
import { AIInsightsEngine } from './AdvancedWidgets'
import styled, { useTheme } from 'styled-components'

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

const ACCOUNT_ICONS: Record<string, LucideIcon> = {
  bank: Landmark,
  cash: Wallet,
  credit_card: CreditCard,
  savings: PiggyBank,
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
  if (!data) {
    return (
      <GlassCard title="Financial Health" hoverable fadeIn="up" delay={delay}>
        <StyledSkeleton $height="10rem" />
      </GlassCard>
    )
  }
  const band = BAND_STYLES[data.band] ?? BAND_STYLES.fair
  return (
    <GlassCard title="Financial Health" action={<Badge tone={band.tag as any} style={{ fontSize: '10px', lineHeight: '1.2', padding: '0 4px' }}>{band.label}</Badge>} hoverable fadeIn="up" delay={delay}>
      <HealthScoreTop>
        <HealthScoreValue>{data.score}</HealthScoreValue>
        <HealthScoreMax>/ 100</HealthScoreMax>
      </HealthScoreTop>
      <HealthScoreComponents>
        {data.components.map(c => (
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

function StatTile({ label, value, sub, accent }: { label: string; value: string; sub?: string; accent?: string }) {
  return (
    <StatTileContainer>
      <StatLabel>{label}</StatLabel>
      <StatValue $accent={accent}>{value}</StatValue>
      {sub && <StatSub>{sub}</StatSub>}
    </StatTileContainer>
  )
}

export function HomeTab({ onNavigateTab }: { onNavigateTab: (key: string) => void }) {
  const [balanceTab, setBalanceTab] = useState('General')
  const [period, setPeriod] = useState<'This Week' | 'This Month' | 'This Year'>('This Month')

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
  const savingsRate = totalIncome > 0 ? Math.round(((totalIncome - totalExpenses) / totalIncome) * 100) : null

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
        <Select
          size="sm"
          value={period}
          onChange={v => setPeriod(v as 'This Week' | 'This Month' | 'This Year')}
          style={{ minWidth: '130px' }}
          options={[
            { label: 'This Week', value: 'This Week' },
            { label: 'This Month', value: 'This Month' },
            { label: 'This Year', value: 'This Year' },
          ]}
        />
      </PageToolbar>
      {/* KPI lead row */}
      <KpiGrid>
        <StatTile
          label="Net Worth"
          value={formatCurrency(Number(netWorth?.net_worth ?? 0))}
          sub="assets − liabilities"
          accent={Number(netWorth?.net_worth ?? 0) < 0 ? 'var(--accent)' : undefined}
        />
        <StatTile label="Spent · This month" value={formatCurrency(totalExpenses)} sub={`${expenseItems.length} transactions`} accent="var(--accent)" />
        <StatTile label="Income · This month" value={formatCurrency(totalIncome)} sub={`${(income ?? []).length} entries`} accent="var(--primary)" />
        <StatTile
          label="Savings Rate"
          value={savingsRate === null ? '—' : `${savingsRate}%`}
          sub={savingsRate === null ? 'log income to see' : savingsRate >= 20 ? 'healthy' : 'aim for 20%+'}
          accent={savingsRate !== null && savingsRate >= 20 ? 'var(--primary)' : undefined}
        />
      </KpiGrid>

      {/* Net Worth trend — full width */}
      <ChartContainer>
        <BalanceWidget
          balance={balanceValue}
          chartData={chartData}
          activeTab={balanceTab}
          onTabChange={setBalanceTab}
        />
      </ChartContainer>

      {/* Analytics: 2×2 */}
      <AnalyticsGrid>
        {/* Recent Activity */}
        <div>
          <GlassCard title="Recent Activity" action={<NavButton onClick={() => onNavigateTab('2')} />} hoverable fadeIn="up" delay={0}>
            {recentActivity.length === 0 ? (
              <EmptyState title="No transactions this month" />
            ) : (
              <ListContainer>
                {recentActivity.map(item => (
                  <ListItem key={`${item.kind}-${item.id}`}>
                    <div>
                      <ItemTitle>{item.label}</ItemTitle>
                      <ItemSubtitle>{item.sub} · {format(new Date(item.date), 'MMM d')}</ItemSubtitle>
                    </div>
                    <ItemAmountText $color={item.amount < 0 ? "var(--accent)" : item.kind === 'Transfer' ? "var(--muted-foreground)" : "var(--primary)"}>
                      {item.amount < 0 ? '-' : '+'}{formatCurrency(Math.abs(item.amount))}
                    </ItemAmountText>
                  </ListItem>
                ))}
              </ListContainer>
            )}
          </GlassCard>
        </div>

        {/* Upcoming Payments */}
        <div>
          <GlassCard title="Upcoming Payments" action={<NavButton onClick={() => onNavigateTab('5')} />} hoverable fadeIn="up" delay={100}>
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
          </GlassCard>
        </div>

        {/* Accounts Overview */}
        <div>
          <GlassCard title="Accounts" action={<NavButton onClick={() => onNavigateTab('4')} />} hoverable fadeIn="up" delay={200}>
            {loadingAccounts ? (
              <ListContainer>
                <StyledSkeleton $height="2.5rem" />
                <StyledSkeleton $height="2.5rem" />
              </ListContainer>
            ) : !accounts || accounts.length === 0 ? (
              <EmptyState title="No accounts yet — add one in the Accounts tab" />
            ) : (
              <ListContainer>
                {accounts.map(a => {
                  const Icon = ACCOUNT_ICONS[a.type] ?? Wallet
                  return (
                    <ListItem key={a.id}>
                      <ItemContent>
                        <IconBadge icon={Icon} color="muted" size="md" />
                        <div>
                          <ItemTitle>{a.name}</ItemTitle>
                          <ItemSubtitle>{String(a.type).replace('_', ' ').toUpperCase()}</ItemSubtitle>
                        </div>
                      </ItemContent>
                      <ItemAmountText>{formatCurrency(Number(a.balance))}</ItemAmountText>
                    </ListItem>
                  )
                })}
              </ListContainer>
            )}
          </GlassCard>
        </div>

        {/* Financial Health Score */}
        <div>
          <HealthScoreCard data={healthScore} delay={300} />
        </div>
      </AnalyticsGrid>
        
      {/* Unified Stats Widgets */}
      <UnifiedStats>
        <FinanceStats period={period} />
      </UnifiedStats>

      {/* AI Insights & Analytics */}
      <InsightsGrid>
        <AiInsightCard area="finance" style={{ height: '100%' }} />
        <AIInsightsEngine />
      </InsightsGrid>
    </WorkspaceLayout>

    </>
  )
}
