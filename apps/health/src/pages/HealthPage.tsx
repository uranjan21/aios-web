import { useQuery } from '@tanstack/react-query'
import { useState, useMemo } from 'react'
import { Scale, Flame, Activity, Target, Heart, LayoutDashboard, Moon, Apple, Dumbbell, History, LineChart as LineChartIcon, Settings, Brain } from 'lucide-react'
import { Button, Select } from '@ledgr/ui'
import { useNavigate } from 'react-router-dom'
import { healthApi } from '@ct/shared/api/areas'
import { formatRelativeTime } from '@ct/shared/lib/utils'
import { Skeleton } from '@ct/shared/components/ui/skeleton'
import { ErrorState } from '@ledgr/ui'
import { useCountUp } from '@ct/shared/hooks/useCountUp'
import { KpiCard, KpiGrid } from '@ledgr/ui';
import { Card as GlassCard } from '@ledgr/ui';
import { Card as SectionCard } from '@ledgr/ui'

import { HistoryTab } from '@ct/health/components/HistoryTab'
import { NutritionTab } from '@ct/health/components/NutritionTab'
import { WaterTrackerWidget } from '@ct/health/components/WaterTrackerWidget'
import { BodySleepTab } from '@ct/health/components/BodySleepTab'
import { FitnessTab } from '@ct/health/components/FitnessTab'
import { HealthLogModal } from '@ct/health/components/HealthLogModal'
import { PageHeader } from '@ledgr/ui'
import { AiInsightCard } from '@ct/shared/components/AiInsightCard'
import styled, { useTheme } from 'styled-components'

import { ModuleLayout } from '@ct/shared/components/layout/ModuleLayout'
import { ModuleSidebar } from '@ct/shared/components/layout/ModuleSidebar'

import { useSearchParams } from 'react-router-dom'
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

  const [params, setParams] = useSearchParams()
  const activeKey = params.get('tab') || '1'
  const setActiveKey = (key: string) => setParams({ tab: key })
  
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

  const groups = [
    {
      label: 'Overview',
      items: [
        { key: '1', label: 'Dashboard',   icon: <LayoutDashboard size={14} /> },
      ]
    },
    {
      label: 'Tracking',
      items: [
        { key: '2', label: 'Body & Sleep', icon: <Moon size={14} /> },
        { key: '3', label: 'Nutrition',    icon: <Apple size={14} /> },
        { key: '4', label: 'Fitness',      icon: <Dumbbell size={14} /> },
        { key: '5', label: 'History',      icon: <History size={14} /> },
      ]
    }
  ]

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
        <GlassCard title="Health Insights" subtitle="AI breakdown of your wellness" icon={<Brain size={16} />} style={{ flex: 1, minHeight: 200 }}>
          <AiInsightCard area="health" />
        </GlassCard>
      </StyledGridItemSide>
    </StyledDashboardGrid>
    </DashboardContent>
  )

  const renderContent = () => {
    switch (activeKey) {
      case '1': return renderDashboard()
      case '2': return <BodySleepTab />
      case '3': return <NutritionTab />
      case '4': return <FitnessTab />
      case '5': return <HistoryTab onLogClick={() => setIsLogModalOpen(true)} />
      default: return renderDashboard()
    }
  }

  return (
    <ModuleLayout
      header={
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
      }
      sidebar={
        <ModuleSidebar
          groups={groups}
          activeKey={activeKey}
          onChange={setActiveKey}
        />
      }
    >
      {renderContent()}
      <HealthLogModal open={isLogModalOpen} onClose={() => setIsLogModalOpen(false)} />
    </ModuleLayout>
  )
}
