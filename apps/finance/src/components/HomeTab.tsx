
import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { format } from 'date-fns'
import { Select, Badge, EmptyState, KpiCard } from '@ledgr/ui'
import { financeApi } from '@aios/shared/api/areas'
import { formatCurrency } from '@aios/shared/lib/utils'
import { Skeleton } from '@aios/shared/components/ui/skeleton'
import { ErrorState } from '@ledgr/ui'
import { ProgressBar } from '@aios/shared/components/lumina';
import { Card as GlassCard } from '@ledgr/ui';
import { WorkspaceLayout } from '@aios/shared/components/layout/WorkspaceLayout'
import styled, { useTheme } from 'styled-components'
import { TrendingDown, TrendingUp, Wallet, PiggyBank, CalendarClock, HeartPulse } from 'lucide-react'

const StyledSkeleton = styled(Skeleton)<{ $height: string }>`
  height: ${({ $height }) => $height};
  width: 100%;
`

const LoadingWrapper = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => `${theme.spacing[3]}`};
`

const LoadingHeader = styled(Skeleton)`
  width: 100%;
  height: 4rem;
  border-radius: 0.75rem;
`

const LoadingGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(12, minmax(0, 1fr));
  gap: ${({ theme }) => `${theme.spacing[3]}`};
`

const LoadingGridItem7 = styled(Skeleton)`
  grid-column: span 12 / span 12;
  height: 300px;
  border-radius: 0.75rem;
  @media ${({ theme }) => theme.media.lg} {
    grid-column: span 7 / span 7;
  }
`

const LoadingGridItem5 = styled(Skeleton)`
  grid-column: span 12 / span 12;
  height: 300px;
  border-radius: 0.75rem;
  @media ${({ theme }) => theme.media.lg} {
    grid-column: span 5 / span 5;
  }
`

const KpiGrid = styled.div`
  display: flex;
  overflow-x: auto;
  gap: ${({ theme }) => `${theme.spacing[2]}`};
  padding-bottom: ${({ theme }) => `${theme.spacing[1]}`};
  
  scrollbar-width: none;
  -ms-overflow-style: none;
  &::-webkit-scrollbar { display: none; }
  
  > * {
    flex: 0 0 auto;
    min-width: 140px;
  }

  @media ${({ theme }) => theme.media.sm} {
    display: grid;
    grid-template-columns: repeat(4, minmax(0, 1fr));
    gap: ${({ theme }) => `${theme.spacing[3]}`};
    padding-bottom: 0;
    
    > * { min-width: 0; }
  }
`




const AnalyticsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(1, minmax(0, 1fr));
  gap: ${({ theme }) => `${theme.spacing[3]}`};
  @media ${({ theme }) => theme.media.lg} {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
`

/* Fixed height only where the 2-col grid needs equal cards — on mobile the
   stacked cards auto-size so a short list doesn't leave a large dead area. */
const AnalyticsCell = styled.div`
  display: flex;
  flex-direction: column;
  @media ${({ theme }) => theme.media.lg} {
    height: 380px;
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

const ItemTitle = styled.div`
  font-size: ${({ theme }) => theme.typography.fontSize.sm};
  font-weight: 500;
  color: ${({ theme }) => theme.color.foreground};
`

const ItemSubtitle = styled.div`
  font-size: ${({ theme }) => theme.typography.fontSize.xs};
  color: ${({ theme }) => theme.color.mutedForeground};
`

const ItemAmountText = styled.span<{ $color?: string }>`
  font-size: ${({ theme }) => theme.typography.fontSize.sm};
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
  font-size: ${({ theme }) => theme.typography.fontSize.xs};
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
  font-size: ${({ theme }) => theme.typography.fontSize.sm};
  font-weight: 600;
  color: ${({ theme }) => theme.color.foreground};
  font-variant-numeric: tabular-nums;
  letter-spacing: -0.025em;
`

const HealthScoreMax = styled.span`
  font-size: ${({ theme }) => theme.typography.fontSize.xs};
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
  font-size: ${({ theme }) => theme.typography.fontSize.xs};
  font-weight: 500;
  color: ${({ theme }) => theme.color.foreground};
`

const ComponentValue = styled.span`
  font-size: ${({ theme }) => theme.typography.fontSize.xs};
  font-variant-numeric: tabular-nums;
  color: ${({ theme }) => theme.color.mutedForeground};
`

const ComponentDisplay = styled.div`
  font-size: ${({ theme }) => theme.typography.fontSize.xs};
  color: ${({ theme }) => theme.color.mutedForeground};
  margin-top: 0.125rem;
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

function urgencyColor(days: number): 'destructive' | 'warning' | 'success' {
  if (days <= 3) return 'destructive'
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

function HealthScoreCard({ data, delay = 0 }: { data: import('@aios/shared/types').FinanceHealthScore | undefined; delay?: 0 | 100 | 200 | 300 }) {
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
  return (
    <GlassCard
      title="Financial Health"
      subtitle="Your overall financial score"
      icon={<HeartPulse size={16} />}
      action={
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
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
              color={c.available ? BAND_STYLES[scoreBand(c.score ?? 0)].barColor : theme.color.muted}
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


export function HomeTab() {
  const navigate = useNavigate()

  const [upcomingFilter, setUpcomingFilter] = useState('all')

  const month = format(new Date(), 'yyyy-MM')

  const { data: netWorth, isLoading: loadingSnapshot, isError: errorSnapshot } = useQuery({
    queryKey: ['finance', 'net-worth'],
    queryFn: financeApi.netWorth,
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

  const { data: healthScore } = useQuery({
    queryKey: ['finance', 'health-score'],
    queryFn: financeApi.healthScore,
  })

  const expenseItems = expenses?.items ?? []

  const totalExpenses = useMemo(() => expenseItems.reduce((acc, e) => acc + Number(e.amount), 0), [expenseItems])
  const totalIncome = useMemo(() => (income ?? []).reduce((acc, i) => acc + Number(i.amount), 0), [income])
  const savingsRate = totalIncome > 0 ? Math.round(((totalIncome - totalExpenses) / totalIncome) * 100) : null

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
    return <ErrorState title="Could not load financial data" />
  }

  return (
    <>
      <WorkspaceLayout>
        {/* KPI lead row */}
        <KpiGrid>
          <KpiCard
            label="Net Worth"
            value={formatCurrency(Number(netWorth?.net_worth ?? 0))}
            color={Number(netWorth?.net_worth ?? 0) < 0 ? 'rose' : undefined}
            icon={Wallet}
          />
          <KpiCard
            label="Spent"
            value={formatCurrency(totalExpenses)}
            color="rose"
            icon={TrendingDown}
          />
          <KpiCard
            label="Income"
            value={formatCurrency(totalIncome)}
            color="primary"
            icon={TrendingUp}
          />
          <KpiCard
            label="Savings Rate"
            value={savingsRate === null ? '—' : `${savingsRate}%`}
            color={savingsRate !== null && savingsRate >= 20 ? 'primary' : undefined}
            icon={PiggyBank}
          />
        </KpiGrid>

        {/* Analytics: 2×2 */}
        <AnalyticsGrid>
          {/* Upcoming Payments */}
          <AnalyticsCell>
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
                  <NavButton onClick={() => navigate('/app/finance/settings?section=bills')} />
                </div>
              } 
              hoverable fadeIn="up" delay={100} style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}
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
                          <Badge tone={urgencyColor(item.days)} style={{ fontSize: '10px', lineHeight: '1.2', padding: '0 4px', margin: 0 }}>{item.days === 0 ? 'Today' : `${item.days}d`}</Badge>
                        </AmountContainer>
                      </ListItem>
                    ))}
                  </ListContainer>
                )}
              </div>
            </GlassCard>
          </AnalyticsCell>

          {/* Financial Health Score */}
          <AnalyticsCell>
            <HealthScoreCard data={healthScore} delay={300} />
          </AnalyticsCell>
        </AnalyticsGrid>


      </WorkspaceLayout>
    </>
  )
}
