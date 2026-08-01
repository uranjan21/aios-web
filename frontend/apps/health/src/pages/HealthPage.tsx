import { useQuery } from '@tanstack/react-query'
import { useState, useMemo } from 'react'
import { Scale, Flame, Activity, Target, Heart, LineChart as LineChartIcon, Settings } from 'lucide-react'
import { Button, Select } from '@ledgr/ui'
import { useNavigate } from 'react-router-dom'
import { healthApi } from '@ct/shared/api/areas'
import { formatRelativeTime } from '@ct/shared/lib/utils'
import { Skeleton } from '@ct/shared/components/ui/skeleton'
import { ErrorState } from '@ledgr/ui'
import { useCountUp } from '@ct/shared/hooks/useCountUp'
import { KpiCard, KpiGrid } from '@ledgr/ui';
import { Card as SectionCard } from '@ledgr/ui'

import { NutritionTab } from '@ct/health/components/NutritionTab'
// Water lost its own tab in the 2026-08-01 IA, but the widget still lives on
// the Health overview — the redesign relocates it in Phase 4, not here.
import { WaterTrackerWidget } from '@ct/health/components/WaterTrackerWidget'
import { BodySleepTab } from '@ct/health/components/BodySleepTab'
import { FitnessTab } from '@ct/health/components/FitnessTab'
import { HealthLogModal } from '@ct/health/components/HealthLogModal'
import { PageHeader } from '@ledgr/ui'
import { AiInsightCard } from '@ct/shared/components/AiInsightCard'
import styled, { useTheme } from 'styled-components'

import { PageContainer, PageContent } from '@ct/shared/components/layout/PageLayout'
import { useAreaSection } from '@ct/shared/hooks/useAreaSection'
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer } from 'recharts'



const StyledDashboardGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(12, minmax(0, 1fr));
  gap: ${({ theme }) => theme.spacing[4]};
`;

const DashboardContent = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.spacing[6]};
`;

const StyledGridItemMain = styled.div`
  grid-column: span 12 / span 12;
  
  @media ${({ theme }) => theme.media.lg} {
    grid-column: span 8 / span 8;
  }
`;

/* Grows to fill the side column so it ends level with the chart card beside it
   instead of leaving a gap under the stack. */
const SideInsightCard = styled(AiInsightCard)`
  flex: 1;
`;

const StyledGridItemSide = styled.div`
  grid-column: span 12 / span 12;
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.spacing[4]};

  @media ${({ theme }) => theme.media.lg} {
    grid-column: span 4 / span 4;
  }
`;











export function HealthPage() {
  const theme = useTheme()
  const { data: streak, isLoading: loadingStreak, isError: errorStreak, refetch: refetchStreak } = useQuery({
    queryKey: ['health', 'streak'],
    queryFn: healthApi.streak,
  })
  const { data: summary, isLoading: loadingSummary } = useQuery({
    queryKey: ['health', 'summary'],
    queryFn: healthApi.summary,
  })
  const { data: weightLogs, isLoading: loadingWeight } = useQuery({
    queryKey: ['health', 'logs', 'weight'],
    queryFn: () => healthApi.logs('weight'),
  })
  const { data: gymLogs, isLoading: loadingGym, isError: errorGym, refetch: refetchGym } = useQuery({
    queryKey: ['health', 'logs', 'gym'],
    queryFn: () => healthApi.logs('gym'),
  })

  /*
   * Sub-page routing, 2026-08-01 — see the note in FinancePage. Health's old
   * dashboard key was the numeric '1'; `water` and `history` were dropped from
   * the IA by the redesign and now redirect to Overview. The water endpoint
   * (`/health/water/today`) and HistoryTab's data are untouched on the backend.
   */
  const section = useAreaSection('/app/health', 'overview', {
    '1': 'overview',
    water: 'overview',
    history: 'overview',
  })


  const [isLogModalOpen, setIsLogModalOpen] = useState(false)
  const [weightRange, setWeightRange] = useState<'7d' | '30d' | '90d'>('30d')
  const navigate = useNavigate()

  const animatedStreak = useCountUp(streak?.current_streak ?? null)
  const animatedSessions = useCountUp(gymLogs?.length ?? null)

  const weightDataProcessed = useMemo(() => {
    const days = weightRange === '7d' ? 7 : weightRange === '30d' ? 30 : 90
    return weightLogs?.slice(0, days).reverse().map(l => ({
      date: new Date(l.logged_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
      weight: Number(l.value)
    })) ?? [];
  }, [weightLogs, weightRange])

  if (errorStreak || errorGym) {
    return <ErrorState title="Could not load health data" onRetry={() => { refetchStreak(); refetchGym() }} />
  }

  const renderDashboard = () => (
    <DashboardContent>
      <KpiGrid>
        <KpiCard label="Current Weight" icon={Scale} loading={loadingSummary} value={`${summary?.weight ?? '—'} kg`} />
        <KpiCard label="Gym Streak" icon={Flame} loading={loadingStreak} value={`${Math.round(animatedStreak ?? 0)} ${Math.round(animatedStreak ?? 0) === 1 ? 'day' : 'days'}`} />
        <KpiCard label="Last Workout" icon={Activity} loading={loadingStreak} value={formatRelativeTime(streak?.last_workout_at ?? null)} />
        <KpiCard label="Total Sessions" icon={Target} loading={loadingGym} value={Math.round(animatedSessions ?? 0)} />
      </KpiGrid>

      <StyledDashboardGrid>
      <StyledGridItemMain>
        <SectionCard
          title="Weight Progression"
          subtitle="Body weight logs over the selected window"
          icon={<LineChartIcon size={16} />}
          action={
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }} onClick={(e) => e.stopPropagation()}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', color: theme.color?.mutedForeground || 'var(--muted-foreground)' }}>
                <div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: theme.color?.accent || 'var(--accent)' }} />
                <span>Weight</span>
              </div>
              <Select
                size="sm"
                aria-label="Weight range"
                value={weightRange}
                onChange={(v) => setWeightRange(v as typeof weightRange)}
                options={[
                  { value: '7d', label: '7d' },
                  { value: '30d', label: '30d' },
                  { value: '90d', label: '90d' },
                ]}
              />
            </div>
          }
        >
          {loadingWeight ? <Skeleton style={{ height: '180px' }} /> : !weightDataProcessed.length ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: 180, gap: 8 }}>
              <LineChartIcon size={24} style={{ color: 'var(--muted-foreground)' }} />
              <span style={{ fontSize: 13, color: 'var(--muted-foreground)' }}>No weight logs yet — log your first weight entry to see progression.</span>
            </div>
          ) : (
            <div style={{ height: 180, width: '100%' }}>
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={weightDataProcessed} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorWeight" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={theme.color.accent} stopOpacity={0.35}/>
                      <stop offset="95%" stopColor={theme.color.accent} stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={theme.color.border} />
                  <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: theme.color.mutedForeground }} dy={10} minTickGap={20} />
                  <YAxis domain={['dataMin - 2', 'dataMax + 2']} axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: theme.color.mutedForeground }} tickFormatter={(val) => `${val}kg`} />
                  <RechartsTooltip 
                    contentStyle={{ backgroundColor: theme.color.card, border: `1px solid ${theme.color.border}`, borderRadius: '8px', fontSize: '12px', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                    itemStyle={{ color: theme.color.foreground }}
                    labelStyle={{ color: theme.color.mutedForeground, marginBottom: '4px' }}
                  />
                  <Area type="monotone" dataKey="weight" stroke={theme.color.accent} strokeWidth={2} fillOpacity={1} fill="url(#colorWeight)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          )}
        </SectionCard>
      </StyledGridItemMain>
      <StyledGridItemSide>
        <WaterTrackerWidget />
        {/* AiInsightCard is itself a card — the old wrapper nested two borders
            and repeated the heading. */}
        <SideInsightCard area="health" />
      </StyledGridItemSide>
    </StyledDashboardGrid>
    </DashboardContent>
  )

  const renderContent = () => {
    switch (section) {
      case 'overview':  return renderDashboard()
      case 'workouts':  return <FitnessTab section="workouts" />
      case 'nutrition': return <NutritionTab />
      case 'body':      return <BodySleepTab section="body" />
      case 'sleep':     return <BodySleepTab section="sleep" />
      case 'habits':    return <FitnessTab section="habits" />
      default:          return renderDashboard()
    }
  }

  return (
    <PageContainer>
      <PageContent>
        <PageHeader
          icon={<Heart />}
          eyebrow="Wellness"
          title="Health"
          subtitle="Body, sleep, nutrition and fitness — track every metric in one place."
          actions={
            <Button variant="outline" size="sm" onClick={() => navigate('/app/health/settings')}>
              <Settings size={14} style={{ marginRight: 6 }} /> Settings
            </Button>
          }
        />
        {renderContent()}
        <HealthLogModal open={isLogModalOpen} onClose={() => setIsLogModalOpen(false)} />
      </PageContent>
    </PageContainer>
  )
}
