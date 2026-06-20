// @ts-nocheck
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useState, useMemo } from 'react'
import { toast } from 'sonner'
import { Scale, Plus, Flame, Trophy, Activity, Target, Zap, Heart, LayoutDashboard, Moon, Apple, Dumbbell, History, Bot, Search, Bell, PlusCircle } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useUIStore } from '@/stores/uiStore'
import { FilterBar, PeriodSelect } from '@/components/ui/FilterBar'
import { healthApi } from '@/api/areas'
import { formatRelativeTime, exportToCsv } from '@/lib/utils'
import { Skeleton } from '@/components/ui/skeleton'
import { ErrorCard } from '@/components/ErrorCard'
import { useCountUp } from '@/hooks/useCountUp'
import { StatusPill } from '@/components/lumina';
import { KpiCard } from '@ledgr/ui';
import { Card as GlassCard } from '@ledgr/ui';
import { Card as SectionCard } from '@ledgr/ui'
import { Badge, Button } from '@ledgr/ui'
import { AreaTabs } from '@/components/ui/AreaTabs'
import { HistoryTab } from '@/components/areas/health/HistoryTab'
import { NutritionTab } from '@/components/areas/health/NutritionTab'
import { WaterTrackerWidget } from '@/components/areas/health/WaterTrackerWidget'
import { BodySleepTab } from '@/components/areas/health/BodySleepTab'
import { FitnessTab } from '@/components/areas/health/FitnessTab'
import { HealthLogModal } from '@/components/areas/health/HealthLogModal'
import { PageHeader, ActionChip } from '@/components/layout/PageLayout'
import { AiInsightCard } from '@/components/AiInsightCard'
import styled, { useTheme } from 'styled-components'

import Highcharts from 'highcharts'
Highcharts.setOptions({ accessibility: { enabled: false } })
import HighchartsReact from 'highcharts-react-official'

const commonChartOptions = {
  chart: {
    backgroundColor: 'transparent',
    style: { fontFamily: 'inherit' }
  },
  title: { text: null },
  credits: { enabled: false }
}

const StyledPageWrapper = styled.div`
  min-height: 100vh;
  background-color: var(--page-bg);
  padding: 1rem;
  
  @media (min-width: 768px) {
    padding: 1.5rem;
  }
`;

const StyledContentWrapper = styled.div`
  margin: 0 auto;
  max-width: 1200px;
`;

const StyledButtonContent = styled.span`
  display: flex;
  align-items: center;
  gap: 0.25rem;
  font-size: 12px;
  font-weight: 500;
`;

const StyledDashboardGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(12, minmax(0, 1fr));
  gap: 1rem;
`;

const StyledGridItemKpi = styled.div`
  grid-column: span 6 / span 6;
  
  @media (min-width: 1280px) {
    grid-column: span 3 / span 3;
  }
`;

const StyledGridItemMain = styled.div`
  grid-column: span 12 / span 12;
  
  @media (min-width: 1024px) {
    grid-column: span 8 / span 8;
  }
`;

const StyledGridItemSide = styled.div`
  grid-column: span 12 / span 12;
  display: flex;
  align-items: center;
  
  @media (min-width: 1024px) {
    grid-column: span 4 / span 4;
  }
`;

const StyledGridItemPr = styled.div`
  grid-column: span 12 / span 12;
  
  @media (min-width: 1024px) {
    grid-column: span 7 / span 7;
  }
`;

const StyledPrContent = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 0.25rem;
`;

const StyledPrTitle = styled.span`
  font-size: 11px;
  font-weight: 500;
  color: ${({ theme }) => theme.color?.mutedForeground || 'var(--muted-foreground)'};
`;

const StyledPrHeading = styled.h3`
  font-size: 1.125rem;
  font-weight: 600;
  color: ${({ theme }) => theme.color?.foreground || 'var(--foreground)'};
  margin: 0;
`;

const StyledPrDescription = styled.p`
  font-size: 12px;
  color: ${({ theme }) => theme.color?.mutedForeground || 'var(--muted-foreground)'};
  margin: 0;
`;

const StyledFastingWrapper = styled.div`
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 0.75rem;
  border-radius: 0.75rem;
  background-color: rgba(var(--primary-rgb, 249, 115, 22), 0.05);
  border: 1px solid rgba(var(--primary-rgb, 249, 115, 22), 0.1);
`;

const StyledFastingLabel = styled.span`
  font-size: 11px;
  font-weight: 500;
  color: ${({ theme }) => theme.color?.foreground || 'var(--foreground)'};
  opacity: 0.8;
`;

const StyledTabLabel = styled.span`
  display: flex;
  align-items: center;
  gap: 0.375rem;
`;

const StyledPrIconWrapper = styled.div`
  display: none;
  @media (min-width: 640px) {
    display: block;
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
  const queryClient = useQueryClient()

  const [activeKey, setActiveKey] = useState('1')
  const [isLogModalOpen, setIsLogModalOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [logType, setLogType] = useState('all')
  const [period, setPeriod] = useState('2026-06')
  const navigate = useNavigate()
  const { setCmdPaletteOpen, setCaptureModalOpen } = useUIStore()

  const animatedStreak = useCountUp(streak?.current_streak ?? null)
  const animatedSessions = useCountUp(gymLogs?.length ?? null)

  const weightDataProcessed = useMemo(() => {
    return weightLogs?.slice(0, 30).reverse().map(l => [
      new Date(l.logged_at).getTime(),
      Number(l.value)
    ]) ?? [];
  }, [weightLogs])

  const weightOptions = useMemo(() => ({
    ...commonChartOptions,
    chart: { ...commonChartOptions.chart, type: 'area', height: 180 },
    xAxis: {
      type: 'datetime',
      labels: { style: { color: theme.color.mutedForeground } }
    },
    yAxis: {
      title: { text: null },
      labels: { style: { color: theme.color.mutedForeground }, format: '{value} kg' }
    },
    tooltip: { valueSuffix: ' kg' },
    series: [{
      name: 'Weight',
      data: weightDataProcessed,
      color: theme.color.accent,
      fillColor: {
        linearGradient: { x1: 0, y1: 0, x2: 0, y2: 1 },
        stops: [
          [0, `color-mix(in srgb, ${theme.color.accent} 35%, transparent)`],
          [1, 'transparent']
        ]
      }
    }]
  }), [theme, weightDataProcessed])

  if (errorStreak || errorGym) {
    return <ErrorCard message="Could not load health data" onRetry={() => { refetchStreak(); refetchGym() }} />
  }

  return (
    <StyledPageWrapper>
      <StyledContentWrapper>
      <PageHeader
        icon={Heart}
        category="Wellness"
        title="Health"
        description="Body, sleep, nutrition and fitness — track every metric in one place."
        actions={
          <>
            <ActionChip onClick={() => navigate('/chat')}><Bot /> Ask AI</ActionChip>
            <ActionChip onClick={() => setCaptureModalOpen(true)}><PlusCircle /> Capture</ActionChip>
            <ActionChip onClick={() => setCmdPaletteOpen(true)}><Search /> Search</ActionChip>
            <ActionChip onClick={() => navigate('/agents')}><Bell /> Reminders</ActionChip>
          </>
        }
      />
      <AreaTabs
        activeKey={activeKey}
        onChange={setActiveKey}
        toolbar={
          <FilterBar
            search={{ value: query, onChange: setQuery, placeholder: 'Search logs, meals, workouts…' }}
            filters={[
              { id: 'type', label: 'Type', value: logType, onChange: setLogType, options: [
                { value: 'all', label: 'All types' },
                { value: 'gym', label: 'Gym' },
                { value: 'weight', label: 'Weight' },
                { value: 'meal', label: 'Meal' },
                { value: 'sleep', label: 'Sleep' },
              ] },
            ]}
            period={<PeriodSelect value={period} onChange={setPeriod} />}
            actions={
              activeKey === '2' ? (
                <Button size="sm" variant="primary" onClick={() => window.dispatchEvent(new CustomEvent('open-new-body-sleep'))}>
                  <StyledButtonContent><Plus size={12} /><span>Log Body Stats / Sleep</span></StyledButtonContent>
                </Button>
              ) : activeKey === '3' ? (
                <Button size="sm" variant="primary" onClick={() => window.dispatchEvent(new CustomEvent('open-new-nutrition'))}>
                  <StyledButtonContent><Plus size={12} /><span>Log Meal</span></StyledButtonContent>
                </Button>
              ) : activeKey === '4' ? (
                <Button size="sm" variant="primary" onClick={() => window.dispatchEvent(new CustomEvent('open-new-workout'))}>
                  <StyledButtonContent><Plus size={12} /><span>Log Health Data</span></StyledButtonContent>
                </Button>
              ) : (
                <Button size="sm" variant="primary" onClick={() => setIsLogModalOpen(true)}>
                  <StyledButtonContent><Plus size={12} /><span>Log Health Data</span></StyledButtonContent>
                </Button>
              )
            }
          />
        }
        items={[
        { key: '1', label: <StyledTabLabel><LayoutDashboard size={14} /> Dashboard</StyledTabLabel>, children: (
          <>
            <StyledDashboardGrid>
              {/* Row 1: KPIs */}
            <StyledGridItemKpi>
              <KpiCard label="Current Weight" icon={Scale} color="primary" loading={loadingSummary} value={`${summary?.weight ?? '—'} kg`} />
            </StyledGridItemKpi>
            <StyledGridItemKpi>
              <KpiCard label="Gym Streak" icon={Flame} color="amber" loading={loadingStreak} value={`${Math.round(animatedStreak ?? 0)} days`} />
            </StyledGridItemKpi>
            <StyledGridItemKpi>
              <KpiCard label="Last Workout" icon={Activity} color="purple" loading={loadingStreak} value={formatRelativeTime(streak?.last_workout_at ?? null)} />
            </StyledGridItemKpi>
            <StyledGridItemKpi>
              <KpiCard label="Total Sessions" icon={Target} color="emerald" loading={loadingGym} value={Math.round(animatedSessions ?? 0)} />
            </StyledGridItemKpi>

            {/* Weight Progression chart */}
            <StyledGridItemMain>
              <SectionCard title="Weight Progression" action={<Badge tone="primary" size="sm" style={{ fontSize: '10px' }}>Past 30 Days</Badge>}>
                {loadingWeight ? <Skeleton style={{ height: '120px' }} /> : <HighchartsReact highcharts={Highcharts} options={weightOptions} />}
              </SectionCard>
            </StyledGridItemMain>
          </StyledDashboardGrid>
          </>
        ) },
        { key: '2', label: <StyledTabLabel><Moon size={14} /> Body & Sleep</StyledTabLabel>, children: <BodySleepTab /> },
        { key: '3', label: <StyledTabLabel><Apple size={14} /> Nutrition</StyledTabLabel>, children: <NutritionTab /> },
        { key: '4', label: <StyledTabLabel><Dumbbell size={14} /> Fitness</StyledTabLabel>, children: <FitnessTab /> },
        { key: '5', label: <StyledTabLabel><History size={14} /> History</StyledTabLabel>, children: <HistoryTab onLogClick={() => setIsLogModalOpen(true)} /> },
      ]} />
      <HealthLogModal open={isLogModalOpen} onClose={() => setIsLogModalOpen(false)} />
      </StyledContentWrapper>
    </StyledPageWrapper>
  )
}
