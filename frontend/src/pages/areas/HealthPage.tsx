// @ts-nocheck
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useState, useMemo } from 'react'
import { toast } from 'sonner'
import { Scale, Flame, Trophy, Activity, Target, Zap, Heart, LayoutDashboard, Moon, Apple, Dumbbell, History, Bot, Search, Bell, PlusCircle, LineChart as LineChartIcon } from 'lucide-react'
import { SegmentedControl } from '@ledgr/ui'
import { useNavigate } from 'react-router-dom'
import { useUIStore } from '@/stores/uiStore'
import { healthApi } from '@/api/areas'
import { formatRelativeTime, exportToCsv } from '@/lib/utils'
import { Skeleton } from '@/components/ui/skeleton'
import { ErrorCard } from '@/components/ErrorCard'
import { useCountUp } from '@/hooks/useCountUp'
import { StatusPill } from '@/components/lumina';
import { KpiCard } from '@ledgr/ui';
import { Card as GlassCard } from '@ledgr/ui';
import { Card as SectionCard } from '@ledgr/ui'
import { Badge } from '@ledgr/ui'
import { AreaTabs } from '@/components/ui/AreaTabs'
import { HistoryTab } from '@/components/areas/health/HistoryTab'
import { NutritionTab } from '@/components/areas/health/NutritionTab'
import { WaterTrackerWidget } from '@/components/areas/health/WaterTrackerWidget'
import { BodySleepTab } from '@/components/areas/health/BodySleepTab'
import { FitnessTab } from '@/components/areas/health/FitnessTab'
import { HealthLogModal } from '@/components/areas/health/HealthLogModal'
import { PageHeader } from '@ledgr/ui'
import { AiInsightCard } from '@/components/AiInsightCard'
import styled, { useTheme } from 'styled-components'
import { PageContainer, PageContent } from '@/components/layout/PageLayout'
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer } from 'recharts'



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
  background-color: ${({ theme }) => theme.color.accent}0d;
  border: 1px solid ${({ theme }) => theme.color.accent}1a;
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
  const [weightRange, setWeightRange] = useState<'7d' | '30d' | '90d'>('30d')
  const navigate = useNavigate()
  const { setCmdPaletteOpen, setCaptureModalOpen } = useUIStore()

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
    return <ErrorCard message="Could not load health data" onRetry={() => { refetchStreak(); refetchGym() }} />
  }

  return (
    <PageContainer>
      <PageContent>
      <PageHeader
        icon={<Heart />}
        eyebrow="Wellness"
        title="Health"
        subtitle="Body, sleep, nutrition and fitness — track every metric in one place."
      />
      <AreaTabs
        activeKey={activeKey}
        onChange={setActiveKey}
        items={[
        { key: '1', label: <StyledTabLabel><LayoutDashboard size={14} /> Dashboard</StyledTabLabel>, children: (
          <>
            <StyledDashboardGrid>
              {/* Row 1: KPIs */}
            <StyledGridItemKpi>
              <KpiCard label="Current Weight" icon={Scale} sub="Latest logged body weight" loading={loadingSummary} value={`${summary?.weight ?? '—'} kg`} />
            </StyledGridItemKpi>
            <StyledGridItemKpi>
              <KpiCard label="Gym Streak" icon={Flame} sub="Consecutive days with a workout" loading={loadingStreak} value={`${Math.round(animatedStreak ?? 0)} days`} />
            </StyledGridItemKpi>
            <StyledGridItemKpi>
              <KpiCard label="Last Workout" icon={Activity} sub="Time since your last gym session" loading={loadingStreak} value={formatRelativeTime(streak?.last_workout_at ?? null)} />
            </StyledGridItemKpi>
            <StyledGridItemKpi>
              <KpiCard label="Total Sessions" icon={Target} sub="Workouts logged across all time" loading={loadingGym} value={Math.round(animatedSessions ?? 0)} />
            </StyledGridItemKpi>
 
            {/* Weight Progression chart */}
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
                    <SegmentedControl
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
                    <Scale size={24} style={{ color: 'var(--muted-foreground)' }} />
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
          </StyledDashboardGrid>
          </>
        ) },
        { key: '2', label: <StyledTabLabel><Moon size={14} /> Body & Sleep</StyledTabLabel>, children: <BodySleepTab /> },
        { key: '3', label: <StyledTabLabel><Apple size={14} /> Nutrition</StyledTabLabel>, children: <NutritionTab /> },
        { key: '4', label: <StyledTabLabel><Dumbbell size={14} /> Fitness</StyledTabLabel>, children: <FitnessTab /> },
        { key: '5', label: <StyledTabLabel><History size={14} /> History</StyledTabLabel>, children: <HistoryTab onLogClick={() => setIsLogModalOpen(true)} /> },
      ]} />
      <HealthLogModal open={isLogModalOpen} onClose={() => setIsLogModalOpen(false)} />
      </PageContent>
    </PageContainer>
  )
}
