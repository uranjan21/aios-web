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
import { Card, Row, Col, Typography, Button, Input, Select, Tag, Avatar, Space } from 'antd'

import Highcharts from 'highcharts'
import HighchartsReact from 'highcharts-react-official'
import highchartsMore from 'highcharts/highcharts-more'
import solidGauge from 'highcharts/modules/solid-gauge'
import heatmap from 'highcharts/modules/heatmap'

if (typeof Highcharts === 'object') {
  try {
    if (!(Highcharts as any).seriesTypes.solidgauge) {
      ;(highchartsMore as any)(Highcharts)
      ;(solidGauge as any)(Highcharts)
      ;(heatmap as any)(Highcharts)
    }
  } catch (e) {}
}

const { Title, Text } = Typography

const floatAnimation = keyframes`
  0% { transform: translateY(0px); }
  50% { transform: translateY(-5px); }
  100% { transform: translateY(0px); }
`

const PremiumCard = styled(Card)`
  border-radius: 24px;
  background: var(--card);
  border: 1px solid var(--border);
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.05);
  transition: all 0.3s ease;
  overflow: hidden;
  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 8px 30px rgba(0, 0, 0, 0.1);
  }
  .ant-card-head {
    border-bottom: 1px solid var(--border);
    min-height: 48px;
    padding: 0 24px;
    color: var(--foreground);
    font-weight: 600;
  }
  .ant-card-body {
    padding: 24px;
  }
`

const PRWidget = styled.div`
  background: linear-gradient(135deg, #10b981 0%, #059669 100%);
  border-radius: 24px;
  padding: 24px;
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: space-between;
  box-shadow: 0 10px 20px rgba(16, 185, 129, 0.2);
  animation: ${floatAnimation} 4s ease-in-out infinite;
  
  h3 {
    color: white;
    margin: 0;
    font-size: 1.5rem;
    font-weight: bold;
  }
  p {
    margin: 0;
    opacity: 0.9;
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
    chart: { ...commonChartOptions.chart, type: 'area', height: 250 },
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
      color: '#3b82f6',
      fillColor: {
        linearGradient: { x1: 0, y1: 0, x2: 0, y2: 1 },
        stops: [
          [0, 'rgba(59, 130, 246, 0.4)'],
          [1, 'rgba(59, 130, 246, 0)']
        ]
      }
    }]
  }

  const radarOptions = {
    ...commonChartOptions,
    chart: { ...commonChartOptions.chart, polar: true, type: 'line', height: 250 },
    xAxis: {
      categories: ['Sleep', 'Diet', 'Exercise', 'Hydration', 'Recovery'],
      tickmarkPlacement: 'on',
      lineWidth: 0,
      labels: { style: { color: 'var(--muted-foreground)' } }
    },
    yAxis: {
      gridLineInterpolation: 'polygon',
      lineWidth: 0,
      min: 0,
      max: 100,
      labels: { enabled: false }
    },
    tooltip: {
      shared: true,
      pointFormat: '<span style="color:{series.color}">{series.name}: <b>{point.y}%</b><br/>'
    },
    series: [{
      name: 'Balance',
      data: [85, 75, 90, 80, 70],
      pointPlacement: 'on',
      color: '#8b5cf6',
      fillOpacity: 0.3,
      type: 'area'
    }]
  }

  const muscleHeatmapOptions = {
    ...commonChartOptions,
    chart: { ...commonChartOptions.chart, type: 'heatmap', height: 250 },
    xAxis: {
      categories: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
      labels: { style: { color: 'var(--muted-foreground)' } }
    },
    yAxis: {
      categories: ['Chest', 'Back', 'Legs', 'Arms', 'Core'],
      title: null,
      reversed: true,
      labels: { style: { color: 'var(--muted-foreground)' } }
    },
    colorAxis: {
      min: 0,
      minColor: 'transparent',
      maxColor: '#ef4444',
      stops: [
        [0, 'rgba(239, 68, 68, 0.05)'],
        [0.5, 'rgba(239, 68, 68, 0.5)'],
        [1, 'rgba(239, 68, 68, 1)']
      ]
    },
    legend: { enabled: false },
    tooltip: {
      formatter: function(this: any) {
        return `<b>${this.series.yAxis.categories[this.point.y]}</b> on <b>${this.series.xAxis.categories[this.point.x]}</b>: ${this.point.value} intensity`
      }
    },
    series: [{
      name: 'Muscle Activation',
      borderWidth: 1,
      borderColor: 'var(--border)',
      data: [
        [0, 0, 10], [0, 1, 0], [0, 2, 0], [0, 3, 5], [0, 4, 8],
        [1, 0, 0], [1, 1, 10], [1, 2, 2], [1, 3, 0], [1, 4, 0],
        [2, 0, 0], [2, 1, 0], [2, 2, 10], [2, 3, 2], [2, 4, 0],
        [3, 0, 8], [3, 1, 2], [3, 2, 0], [3, 3, 10], [3, 4, 0],
        [4, 0, 0], [4, 1, 8], [4, 2, 0], [4, 3, 0], [4, 4, 10],
        [5, 0, 0], [5, 1, 0], [5, 2, 0], [5, 3, 0], [5, 4, 0],
        [6, 0, 2], [6, 1, 2], [6, 2, 2], [6, 3, 2], [6, 4, 8],
      ],
      dataLabels: { enabled: false }
    }]
  }

  const fastingGaugeOptions = {
    ...commonChartOptions,
    chart: { ...commonChartOptions.chart, type: 'solidgauge', height: 250 },
    pane: {
      startAngle: 0,
      endAngle: 360,
      background: [{
        outerRadius: '112%',
        innerRadius: '88%',
        backgroundColor: 'rgba(245, 158, 11, 0.1)',
        borderWidth: 0
      }]
    },
    yAxis: {
      min: 0,
      max: 16,
      lineWidth: 0,
      tickPositions: []
    },
    plotOptions: {
      solidgauge: {
        dataLabels: { y: -20, borderWidth: 0, useHTML: true },
        linecap: 'round',
        stickyTracking: false,
        rounded: true
      }
    },
    series: [{
      name: 'Fasting',
      data: [{
        color: '#f59e0b',
        radius: '112%',
        innerRadius: '88%',
        y: 14
      }],
      dataLabels: {
        format: '<div style="text-align:center"><span style="font-size:24px;color:var(--foreground);font-weight:bold">{y}h</span><br/><span style="font-size:12px;color:var(--muted-foreground)">Fasted</span></div>'
      }
    }]
  }

  if (errorStreak || errorGym) {
    return <ErrorCard message="Could not load health data" onRetry={() => { refetchStreak(); refetchGym() }} />
  }

  return (
    <div className="p-4 sm:p-6 space-y-6 max-w-7xl mx-auto pb-24">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold text-foreground tracking-tight">Health Dashboard</h1>
          <p className="text-muted-foreground mt-1">Your premium wellness overview</p>
        </div>
      </div>

      <PRWidget>
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Trophy className="w-6 h-6 text-yellow-200" />
            <span className="text-emerald-100 font-medium uppercase tracking-wider text-sm">New Personal Record</span>
          </div>
          <h3>100kg Bench Press</h3>
          <p>You shattered your previous record of 95kg. Keep pushing!</p>
        </div>
        <div className="hidden sm:block">
          <Avatar size={64} style={{ backgroundColor: 'rgba(255,255,255,0.2)' }} icon={<Zap className="w-8 h-8" />} />
        </div>
      </PRWidget>

      <Row gutter={[24, 24]}>
        <Col xs={24} sm={12} lg={6}>
          <PremiumCard>
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-blue-500/10 rounded-xl text-blue-500">
                <Scale className="w-5 h-5" />
              </div>
              <Text type="secondary" className="font-medium text-muted-foreground">Current Weight</Text>
            </div>
            <div className="text-3xl font-bold text-foreground">
              {loadingSummary ? <Skeleton className="h-9 w-24" /> : `${summary?.weight ?? '—'} kg`}
            </div>
          </PremiumCard>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <PremiumCard>
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-orange-500/10 rounded-xl text-orange-500">
                <Flame className="w-5 h-5" />
              </div>
              <Text type="secondary" className="font-medium text-muted-foreground">Gym Streak</Text>
            </div>
            <div className="text-3xl font-bold text-foreground">
              {loadingStreak ? <Skeleton className="h-9 w-24" /> : `${Math.round(animatedStreak ?? 0)} days`}
            </div>
          </PremiumCard>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <PremiumCard>
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-purple-500/10 rounded-xl text-purple-500">
                <Activity className="w-5 h-5" />
              </div>
              <Text type="secondary" className="font-medium text-muted-foreground">Last Workout</Text>
            </div>
            <div className="text-xl font-bold text-foreground mt-2">
              {loadingStreak ? <Skeleton className="h-7 w-32" /> : formatRelativeTime(streak?.last_workout_at ?? null)}
            </div>
          </PremiumCard>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <PremiumCard>
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-emerald-500/10 rounded-xl text-emerald-500">
                <Target className="w-5 h-5" />
              </div>
              <Text type="secondary" className="font-medium text-muted-foreground">Total Sessions</Text>
            </div>
            <div className="text-3xl font-bold text-foreground">
              {loadingGym ? <Skeleton className="h-9 w-24" /> : Math.round(animatedSessions ?? 0)}
            </div>
          </PremiumCard>
        </Col>
      </Row>

      <Row gutter={[24, 24]}>
        <Col xs={24} lg={16}>
          <PremiumCard title={<span className="text-foreground">Weight Progression</span>} extra={<Tag color="blue">Past 30 Days</Tag>}>
            {loadingWeight ? <Skeleton className="h-[250px]" /> : <HighchartsReact highcharts={Highcharts} options={weightOptions} />}
          </PremiumCard>
        </Col>
        <Col xs={24} lg={8}>
          <PremiumCard title={<span className="text-foreground">Wellness Balance</span>} extra={<Tag color="purple">Current</Tag>}>
            <HighchartsReact highcharts={Highcharts} options={radarOptions} />
          </PremiumCard>
        </Col>
      </Row>

      <Row gutter={[24, 24]}>
        <Col xs={24} lg={12}>
          <PremiumCard title={<span className="text-foreground">Muscle Activation</span>} extra={<Tag color="red">This Week</Tag>}>
            <HighchartsReact highcharts={Highcharts} options={muscleHeatmapOptions} />
          </PremiumCard>
        </Col>
        <Col xs={24} lg={12}>
          <PremiumCard title={<span className="text-foreground">Fasting Tracker</span>} extra={<Tag color="orange">Live</Tag>}>
            <div className="flex items-center justify-center relative">
               <HighchartsReact highcharts={Highcharts} options={fastingGaugeOptions} />
            </div>
          </PremiumCard>
        </Col>
      </Row>

      {/* Quick Log Form */}
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
  )
}
