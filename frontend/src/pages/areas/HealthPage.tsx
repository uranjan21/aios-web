import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useState, useMemo } from 'react'
import { toast } from 'sonner'
import { Dumbbell, Scale, Plus, Download, Flame, Trophy, Activity, Target, Zap } from 'lucide-react'
import { healthApi } from '@/api/areas'
import { cn, formatRelativeTime, exportToCsv } from '@/lib/utils'
import { Skeleton } from '@/components/ui/skeleton'
import { ErrorCard } from '@/components/ErrorCard'
import { useCountUp } from '@/hooks/useCountUp'
import styled, { keyframes } from 'styled-components'
import { Card, Typography, Button, Input, Select, Tag, Avatar, Space, Tabs } from 'antd'
import { AreaTabs } from '@/components/ui/AreaTabs'
import { HealthLogsTab } from '@/components/areas/health/HealthLogsTab'
import { FitnessGoalsTab } from '@/components/areas/health/FitnessGoalsTab'
import { NutritionTab } from '@/components/areas/health/NutritionTab'
import { WaterTrackerWidget } from '@/components/areas/health/WaterTrackerWidget'
import { SleepTab } from '@/components/areas/health/SleepTab'
import { BodyTab } from '@/components/areas/health/BodyTab'

import Highcharts from 'highcharts'
import HighchartsReact from 'highcharts-react-official'

const { Title, Text } = Typography

const floatAnimation = keyframes`
  0% { transform: translateY(0px); }
  50% { transform: translateY(-5px); }
  100% { transform: translateY(0px); }
`

const PremiumCard = styled(Card)`
  border-radius: 12px;
  background: hsl(var(--card));
  border: 1px solid hsl(var(--border));
  box-shadow: 0 1px 2px 0 rgb(0 0 0 / 0.05);
  transition: all 0.2s ease;
  overflow: hidden;
  &:hover {
    border-color: hsl(var(--primary));
  }
  .ant-card-head {
    border-bottom: none;
    min-height: 40px;
    padding: 16px 16px 0;
    color: hsl(var(--foreground));
    font-size: 14px;
    font-weight: 600;
  }
  .ant-card-body {
    padding: 16px;
  }
`

const PRWidget = styled.div`
  background: hsl(var(--card));
  border-radius: 12px;
  padding: 16px;
  border: 1px solid hsl(var(--border));
  box-shadow: 0 1px 2px 0 rgb(0 0 0 / 0.05);
  display: flex;
  align-items: center;
  justify-content: space-between;
  
  h3 {
    color: hsl(var(--foreground));
    margin: 0;
    font-size: 1.5rem;
    font-weight: 600;
  }
  p {
    margin: 0;
    font-size: 0.875rem;
    color: hsl(var(--muted-foreground));
  }
`

const commonChartOptions = {
  chart: {
    backgroundColor: 'transparent',
    style: { fontFamily: 'inherit' }
  },
  title: { text: null },
  credits: { enabled: false }
}

export function HealthPage() {
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

  const [logType, setLogType] = useState<'gym' | 'weight' | 'water'>('gym')
  const [logValue, setLogValue] = useState('')
  const [logNote, setLogNote] = useState('')
  const [valueError, setValueError] = useState('')

  const animatedStreak = useCountUp(streak?.current_streak ?? null)
  const animatedSessions = useCountUp(gymLogs?.length ?? null)

  const addLog = useMutation({
    mutationFn: () => healthApi.createLog({
      entry_type: logType,
      value: logValue ? parseFloat(logValue) : undefined,
      unit: logType === 'weight' ? 'kg' : logType === 'water' ? 'L' : undefined,
      notes: logNote || undefined,
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['health'] })
      setLogValue('')
      setLogNote('')
      setValueError('')
      toast.success(`${logType === 'gym' ? 'Gym session' : logType === 'weight' ? 'Weight' : 'Water'} logged`)
    },
    onError: () => toast.error('Failed to log entry'),
  })

  const handleLog = () => {
    if (logType !== 'gym' && (!logValue || isNaN(parseFloat(logValue)))) {
      setValueError('Enter a valid number')
      return
    }
    setValueError('')
    addLog.mutate()
  }

  const weightDataProcessed = useMemo(() => {
    return weightLogs?.slice(0, 30).reverse().map(l => [
      new Date(l.logged_at).getTime(),
      Number(l.value)
    ]) ?? [];
  }, [weightLogs])

  const weightOptions = {
    ...commonChartOptions,
    chart: { ...commonChartOptions.chart, type: 'area', height: 180 },
    xAxis: {
      type: 'datetime',
      labels: { style: { color: 'var(--muted-foreground)' } }
    },
    yAxis: {
      title: { text: null },
      labels: { style: { color: 'var(--muted-foreground)' }, format: '{value} kg' }
    },
    tooltip: { valueSuffix: ' kg' },
    series: [{
      name: 'Weight',
      data: weightDataProcessed,
      color: '#0D9488',
      fillColor: {
        linearGradient: { x1: 0, y1: 0, x2: 0, y2: 1 },
        stops: [
          [0, 'rgba(13, 148, 136, 0.35)'],
          [1, 'rgba(13, 148, 136, 0)']
        ]
      }
    }]
  }



  if (errorStreak || errorGym) {
    return <ErrorCard message="Could not load health data" onRetry={() => { refetchStreak(); refetchGym() }} />
  }

  return (
    <div className="min-h-screen bg-[hsl(var(--page-bg))] p-4 md:p-6">
      <div className="mx-auto max-w-[1200px]">
      <AreaTabs defaultActiveKey="1">
        <Tabs.TabPane tab="Dashboard" key="1">
          <div className="grid grid-cols-12 gap-4">
            <div className="col-span-12">
          <PRWidget>
            <div>
              <div className="flex items-center gap-2 mb-1">
                <Trophy className="w-4 h-4 text-emerald-500" />
                <span className="text-sm font-medium text-muted-foreground">New Personal Record</span>
              </div>
              <h3>100kg Bench Press</h3>
              <p>You shattered your previous record of 95kg. Keep pushing!</p>
            </div>
            <div className="hidden sm:block">
              <Zap className="w-5 h-5 text-emerald-500" />
            </div>
          </PRWidget>
        </div>

        <div className="col-span-12 sm:col-span-6 xl:col-span-3">
          <PremiumCard>
            <div className="flex items-center gap-2 mb-2">
              <div className="p-1.5 bg-primary/10 rounded-lg text-primary">
                <Scale className="w-4 h-4" />
              </div>
              <Text type="secondary" className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">Current Weight</Text>
            </div>
            <div className="text-2xl font-bold text-foreground tracking-tight">
              {loadingSummary ? <Skeleton className="h-6 w-24" /> : `${summary?.weight ?? '—'} kg`}
            </div>
          </PremiumCard>
        </div>
        <div className="col-span-12 sm:col-span-6 xl:col-span-3">
          <PremiumCard>
            <div className="flex items-center gap-2 mb-2">
              <div className="p-1.5 bg-orange-500/10 rounded-lg text-orange-500">
                <Flame className="w-4 h-4" />
              </div>
              <Text type="secondary" className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">Gym Streak</Text>
            </div>
            <div className="text-2xl font-bold text-foreground tracking-tight">
              {loadingStreak ? <Skeleton className="h-6 w-24" /> : `${Math.round(animatedStreak ?? 0)} days`}
            </div>
          </PremiumCard>
        </div>
        <div className="col-span-12 sm:col-span-6 xl:col-span-3">
          <PremiumCard>
            <div className="flex items-center gap-2 mb-2">
              <div className="p-1.5 bg-purple-500/10 rounded-lg text-purple-500">
                <Activity className="w-4 h-4" />
              </div>
              <Text type="secondary" className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">Last Workout</Text>
            </div>
            <div className="text-2xl font-bold text-foreground tracking-tight mt-0.5">
              {loadingStreak ? <Skeleton className="h-5 w-32" /> : formatRelativeTime(streak?.last_workout_at ?? null)}
            </div>
          </PremiumCard>
        </div>
        <div className="col-span-12 sm:col-span-6 xl:col-span-3">
          <PremiumCard>
            <div className="flex items-center gap-2 mb-2">
              <div className="p-1.5 bg-emerald-500/10 rounded-lg text-emerald-500">
                <Target className="w-4 h-4" />
              </div>
              <Text type="secondary" className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">Total Sessions</Text>
            </div>
            <div className="text-2xl font-bold text-foreground tracking-tight">
              {loadingGym ? <Skeleton className="h-6 w-24" /> : Math.round(animatedSessions ?? 0)}
            </div>
          </PremiumCard>
        </div>

        <div className="col-span-12 lg:col-span-6">
          <PremiumCard title={<span className="text-foreground">Weight Progression</span>} extra={<div className="flex items-center gap-2"><Tag color="blue">Past 30 Days</Tag><button className="text-xs font-medium px-2.5 py-1 bg-muted/50 hover:bg-muted text-muted-foreground rounded-md transition-colors">Report</button></div>}>
            {loadingWeight ? <Skeleton className="h-[120px]" /> : <HighchartsReact highcharts={Highcharts} options={weightOptions} />}
          </PremiumCard>
        </div>

        <div className="col-span-12 lg:col-span-6">
          <WaterTrackerWidget />
        </div>

        <div className="col-span-12 flex justify-start">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-orange-500/10 border border-orange-500/20">
            <span className="text-sm font-medium text-orange-600/80">Fasting Tracker:</span>
            <span className="text-sm font-bold text-orange-600">14 hours Fasted</span>
          </div>
        </div>

        {/* Quick Log Form */}
        <div className="col-span-12">
          <PremiumCard title={<span className="text-foreground">Quick Log</span>}>
            <div className="flex gap-4 flex-wrap items-start">
              <Select
                value={logType}
                onChange={(value) => { setLogType(value); setValueError('') }}
                style={{ width: 140 }}
                size="large"
                className="bg-muted text-foreground"
                dropdownStyle={{ backgroundColor: 'var(--card)' }}
                options={[
                  { value: 'gym', label: 'Gym session' },
                  { value: 'weight', label: 'Weight' },
                  { value: 'water', label: 'Water intake' },
                ]}
              />
              {logType !== 'gym' && (
                <div className="flex flex-col gap-1">
                  <Input
                    type="number"
                    placeholder={logType === 'weight' ? 'kg' : 'litres'}
                    value={logValue}
                    onChange={e => { setLogValue(e.target.value); setValueError('') }}
                    size="large"
                    style={{ width: 120 }}
                    status={valueError ? 'error' : ''}
                    className="bg-muted text-foreground border-border"
                  />
                  {valueError && <span className="text-xs text-destructive">{valueError}</span>}
                </div>
              )}
              <Input
                placeholder="Note (optional)"
                value={logNote}
                onChange={e => setLogNote(e.target.value)}
                size="large"
                style={{ flex: 1, minWidth: 200 }}
                className="bg-muted text-foreground border-border"
              />
              <Button
                type="primary"
                onClick={handleLog}
                loading={addLog.isPending}
                size="large"
                icon={<Plus className="w-4 h-4" />}
                className="bg-primary hover:bg-primary/90"
              >
                Log
              </Button>
            </div>
          </PremiumCard>
        </div>
          </div>
        </Tabs.TabPane>
        <Tabs.TabPane tab="Health Logs" key="2">
          <HealthLogsTab />
        </Tabs.TabPane>
        <Tabs.TabPane tab="Fitness Goals" key="3">
          <FitnessGoalsTab />
        </Tabs.TabPane>
        <Tabs.TabPane tab="Nutrition" key="4">
          <NutritionTab />
        </Tabs.TabPane>
        <Tabs.TabPane tab="Sleep" key="5">
          <SleepTab />
        </Tabs.TabPane>
        <Tabs.TabPane tab="Body" key="6">
          <BodyTab />
        </Tabs.TabPane>
      </AreaTabs>
      </div>
    </div>
  )
}
