import { useState, useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Button, Form, Input, Select } from 'antd'
import { Scale, Percent, Ruler, Moon, Clock } from 'lucide-react'
import { healthApi } from '@/api/areas'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'
import { format } from 'date-fns'
import {
  ComposedChart, Area, Bar, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ReferenceLine,
  ResponsiveContainer,
} from 'recharts'
import { GlassCard } from '@/components/lumina'
import { WorkspaceLayout, RailHeading } from '@/components/layout/WorkspaceLayout'

const QUALITY_OPTIONS = ['poor', 'fair', 'good', 'excellent']

function bmiCategory(bmi: number) {
  if (bmi < 18.5) return { label: 'Underweight', color: 'text-kpi-amber' }
  if (bmi < 25) return { label: 'Normal', color: 'text-kpi-emerald' }
  if (bmi < 30) return { label: 'Overweight', color: 'text-kpi-amber' }
  return { label: 'Obese', color: 'text-rose-500' }
}

export function BodySleepTab() {
  const [bodyForm] = Form.useForm()
  const [heightForm] = Form.useForm()
  const [sleepForm] = Form.useForm()
  const queryClient = useQueryClient()
  const [editingHeight, setEditingHeight] = useState(false)

  const { data: weightLogs, isLoading: loadingWeight } = useQuery({
    queryKey: ['health', 'logs', 'weight'],
    queryFn: () => healthApi.logs('weight'),
  })
  const { data: bodyFatLogs, isLoading: loadingBodyFat } = useQuery({
    queryKey: ['health', 'logs', 'body_fat'],
    queryFn: () => healthApi.logs('body_fat'),
  })
  const { data: goals, isLoading: loadingGoals } = useQuery({
    queryKey: ['health', 'goals'],
    queryFn: healthApi.healthGoals,
  })
  const { data: sleep, isLoading: loadingSleep } = useQuery({
    queryKey: ['health', 'sleep', 'recent'],
    queryFn: healthApi.sleepRecent,
  })

  const bodyMutation = useMutation({
    mutationFn: async (values: Record<string, string>) => {
      const logged_at = values.logged_at ? new Date(values.logged_at).toISOString() : undefined
      await healthApi.createLog({ entry_type: 'weight', value: parseFloat(values.weight_kg), unit: 'kg', notes: values.notes || undefined, logged_at })
      if (values.body_fat_pct) {
        await healthApi.createLog({ entry_type: 'body_fat', value: parseFloat(values.body_fat_pct), unit: '%', logged_at })
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['health', 'logs'] })
      queryClient.invalidateQueries({ queryKey: ['health', 'summary'] })
      toast.success('Body stats logged')
      bodyForm.resetFields()
    },
    onError: () => toast.error('Failed to log body stats'),
  })

  const heightMutation = useMutation({
    mutationFn: (values: { height_cm: string }) => healthApi.updateHealthGoals({ height_cm: parseFloat(values.height_cm) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['health', 'goals'] })
      toast.success('Height saved')
      setEditingHeight(false)
    },
    onError: () => toast.error('Failed to save height'),
  })

  const sleepMutation = useMutation({
    mutationFn: (values: Record<string, string>) =>
      healthApi.createLog({
        entry_type: 'sleep',
        value: parseFloat(values.hours),
        unit: 'hours',
        notes: values.quality || undefined,
        logged_at: values.logged_at ? new Date(values.logged_at).toISOString() : undefined,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['health', 'sleep'] })
      toast.success('Sleep logged')
      sleepForm.resetFields()
    },
    onError: () => toast.error('Failed to log sleep'),
  })

  const latestWeight = weightLogs?.[0]?.value != null ? Number(weightLogs[0].value) : null
  const latestBodyFat = bodyFatLogs?.[0]?.value != null ? Number(bodyFatLogs[0].value) : null
  const heightCm = goals?.height_cm ?? null

  const bmi = useMemo(() => {
    if (!latestWeight || !heightCm) return null
    const heightM = heightCm / 100
    return latestWeight / (heightM * heightM)
  }, [latestWeight, heightCm])

  const bodyChartData = useMemo(() => {
    const map = new Map<string, { date: string; weight?: number; body_fat?: number }>()
    weightLogs?.slice(0, 30).forEach(l => {
      const d = l.logged_at.slice(0, 10)
      map.set(d, { ...(map.get(d) ?? { date: d }), weight: l.value != null ? Number(l.value) : undefined })
    })
    bodyFatLogs?.slice(0, 30).forEach(l => {
      const d = l.logged_at.slice(0, 10)
      map.set(d, { ...(map.get(d) ?? { date: d }), body_fat: l.value != null ? Number(l.value) : undefined })
    })
    return Array.from(map.values()).sort((a, b) => a.date.localeCompare(b.date))
  }, [weightLogs, bodyFatLogs])

  const target = sleep?.target ?? 8
  const lastNight = sleep?.last_night
  const weeklyAvg = sleep?.weekly_avg ?? 0
  const avgVsTarget = weeklyAvg - target
  const sleepChartData = sleep?.daily ?? []

  const isLoadingBody = loadingWeight || loadingBodyFat

  const rail = (
    <>
      <RailHeading>Log Body Stats</RailHeading>
      <GlassCard hoverable fadeIn="up">
        <Form form={bodyForm} layout="vertical" onFinish={bodyMutation.mutate} requiredMark={false} className="space-y-0">
          <Form.Item name="logged_at" label={<span className="text-[11px] text-muted-foreground">Date</span>}>
            <Input type="date" size="small" />
          </Form.Item>
          <Form.Item name="weight_kg" label={<span className="text-[11px] text-muted-foreground">Weight (kg)</span>} rules={[{ required: true }]}>
            <Input type="number" placeholder="0" min="0" step="0.1" size="small" />
          </Form.Item>
          <Form.Item name="body_fat_pct" label={<span className="text-[11px] text-muted-foreground">Body Fat % (optional)</span>}>
            <Input type="number" placeholder="0" min="0" max="100" step="0.1" size="small" />
          </Form.Item>
          <Form.Item name="notes" label={<span className="text-[11px] text-muted-foreground">Notes</span>}>
            <Input placeholder="Optional note" size="small" />
          </Form.Item>
          <Button type="primary" htmlType="submit" loading={bodyMutation.isPending} size="small" block>Log Body Stats</Button>
        </Form>

        <div className="mt-3 pt-3 border-t border-border/40">
          <p className="text-[11px] text-muted-foreground mb-1.5">Height</p>
          {heightCm == null || editingHeight ? (
            <Form form={heightForm} layout="inline" onFinish={heightMutation.mutate} requiredMark={false} className="flex gap-2">
              <Form.Item name="height_cm" rules={[{ required: true }]} className="mb-0 flex-1">
                <Input type="number" placeholder="Height (cm)" min="0" size="small" />
              </Form.Item>
              <Button type="primary" htmlType="submit" size="small" loading={heightMutation.isPending}>Save</Button>
            </Form>
          ) : (
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold text-foreground">{heightCm} cm</span>
              <button onClick={() => setEditingHeight(true)} className="text-[11px] font-semibold text-primary hover:text-primary/80 transition">Edit</button>
            </div>
          )}
        </div>
      </GlassCard>

      <RailHeading>Log Sleep</RailHeading>
      <GlassCard hoverable fadeIn="up">
        <Form form={sleepForm} layout="vertical" onFinish={sleepMutation.mutate} requiredMark={false} initialValues={{ quality: 'good' }}>
          <Form.Item name="logged_at" label={<span className="text-[11px] text-muted-foreground">Date</span>}>
            <Input type="date" size="small" />
          </Form.Item>
          <Form.Item name="hours" label={<span className="text-[11px] text-muted-foreground">Hours Slept</span>} rules={[{ required: true }]}>
            <Input type="number" placeholder="8" min="0" max="24" step="0.5" size="small" />
          </Form.Item>
          <Form.Item name="quality" label={<span className="text-[11px] text-muted-foreground">Quality</span>}>
            <Select size="small">
              {QUALITY_OPTIONS.map(q => (
                <Select.Option key={q} value={q} className="capitalize">{q}</Select.Option>
              ))}
            </Select>
          </Form.Item>
          <Button type="primary" htmlType="submit" loading={sleepMutation.isPending} size="small" block>Log Sleep</Button>
        </Form>
      </GlassCard>
    </>
  )

  return (
    <WorkspaceLayout rail={rail}>
      <div className="space-y-4">
        {/* KPI row */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          <div className="bg-card border border-subtle rounded-xl p-3 shadow-premium-sm">
            <div className="flex items-center gap-2 mb-1.5">
              <Scale className="w-3.5 h-3.5 text-primary" />
              <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Weight</p>
            </div>
            {loadingWeight ? <Skeleton className="h-6 w-16" /> : (
              <p className="text-lg font-bold text-foreground">{latestWeight != null ? `${latestWeight} kg` : '—'}</p>
            )}
          </div>
          <div className="bg-card border border-subtle rounded-xl p-3 shadow-premium-sm">
            <div className="flex items-center gap-2 mb-1.5">
              <Percent className="w-3.5 h-3.5 text-kpi-purple" />
              <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Body Fat</p>
            </div>
            {loadingBodyFat ? <Skeleton className="h-6 w-16" /> : (
              <p className="text-lg font-bold text-foreground">{latestBodyFat != null ? `${latestBodyFat}%` : '—'}</p>
            )}
          </div>
          <div className="bg-card border border-subtle rounded-xl p-3 shadow-premium-sm">
            <div className="flex items-center gap-2 mb-1.5">
              <Ruler className="w-3.5 h-3.5 text-muted-foreground" />
              <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">BMI</p>
            </div>
            {loadingGoals ? <Skeleton className="h-6 w-16" /> : bmi != null ? (
              <p className={cn('text-lg font-bold', bmiCategory(bmi).color)}>{bmi.toFixed(1)}</p>
            ) : (
              <p className="text-[11px] text-muted-foreground">Set height &amp; weight</p>
            )}
          </div>
          <div className="bg-card border border-subtle rounded-xl p-3 shadow-premium-sm">
            <div className="flex items-center gap-2 mb-1.5">
              <Moon className="w-3.5 h-3.5 text-indigo-400" />
              <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Last Night</p>
            </div>
            {loadingSleep ? <Skeleton className="h-6 w-16" /> : (
              <p className="text-lg font-bold text-foreground">{lastNight != null ? `${lastNight}h` : '—'}</p>
            )}
          </div>
          <div className="bg-card border border-subtle rounded-xl p-3 shadow-premium-sm">
            <div className="flex items-center gap-2 mb-1.5">
              <Clock className="w-3.5 h-3.5 text-primary" />
              <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">7-Day Avg</p>
            </div>
            {loadingSleep ? <Skeleton className="h-6 w-16" /> : (
              <p className={cn('text-lg font-bold', avgVsTarget >= 0 ? 'text-kpi-emerald' : 'text-foreground')}>{weeklyAvg}h</p>
            )}
          </div>
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="bg-card border border-subtle rounded-xl p-4 shadow-premium-sm">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">Weight &amp; Body Fat Trend</p>
            {isLoadingBody ? <Skeleton className="h-[200px]" /> : !bodyChartData.length ? (
              <div className="h-[200px] flex items-center justify-center text-sm text-muted-foreground">No body composition logs yet</div>
            ) : (
              <ResponsiveContainer width="100%" height={200}>
                <ComposedChart data={bodyChartData} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis
                    dataKey="date"
                    tickFormatter={d => { try { return format(new Date(d), 'MMM d') } catch { return d } }}
                    tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
                  />
                  <YAxis yAxisId="weight" tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} tickFormatter={v => `${v}kg`} domain={['dataMin - 2', 'dataMax + 2']} />
                  <YAxis yAxisId="fat" orientation="right" tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} tickFormatter={v => `${v}%`} domain={['dataMin - 2', 'dataMax + 2']} />
                  <Tooltip
                    contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: 8, fontSize: 12 }}
                    labelFormatter={d => { try { return format(new Date(d as string), 'MMM d, yyyy') } catch { return d as string } }}
                  />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  <Area yAxisId="weight" type="monotone" dataKey="weight" name="Weight (kg)" stroke="#f97316" fill="rgba(249,115,22,0.15)" connectNulls strokeWidth={2} isAnimationActive={false} />
                  <Area yAxisId="fat" type="monotone" dataKey="body_fat" name="Body Fat (%)" stroke="#8b5cf6" fill="rgba(139,92,246,0.12)" connectNulls strokeWidth={2} isAnimationActive={false} />
                </ComposedChart>
              </ResponsiveContainer>
            )}
          </div>

          <div className="bg-card border border-subtle rounded-xl p-4 shadow-premium-sm">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">Sleep — Last 7 Days</p>
            {loadingSleep ? <Skeleton className="h-[200px]" /> : !sleepChartData.length ? (
              <div className="h-[200px] flex items-center justify-center text-sm text-muted-foreground">No sleep logs yet</div>
            ) : (
              <ResponsiveContainer width="100%" height={200}>
                <ComposedChart data={sleepChartData} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis
                    dataKey="date"
                    tickFormatter={d => { try { return format(new Date(d), 'EEE') } catch { return d } }}
                    tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
                  />
                  <YAxis
                    tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
                    tickFormatter={v => `${v}h`}
                    domain={[0, 'dataMax + 1']}
                  />
                  <Tooltip
                    contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: 8, fontSize: 12 }}
                    formatter={(val: number, _name: string, entry: any) => [`${val}h${entry?.payload?.quality ? ` · ${entry.payload.quality}` : ''}`, 'Sleep']}
                    labelFormatter={d => { try { return format(new Date(d as string), 'EEE, MMM d') } catch { return d as string } }}
                  />
                  <ReferenceLine y={target} stroke="#f97316" strokeDasharray="4 4" label={{ value: `Target ${target}h`, position: 'insideTopRight', fontSize: 10, fill: '#f97316' }} />
                  <Bar dataKey="hours" name="Hours" radius={[3, 3, 0, 0]} maxBarSize={32} isAnimationActive={false}>
                    {sleepChartData.map((d, i) => (
                      <Cell key={i} fill={d.hours >= target ? '#f97316' : '#f59e0b'} />
                    ))}
                  </Bar>
                </ComposedChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Recent sleep list */}
        <div className="bg-card border border-subtle rounded-xl overflow-hidden shadow-premium-sm">
          <div className="px-4 py-2.5 border-b border-border/40">
            <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">Recent Sleep</p>
          </div>
          {loadingSleep ? (
            <div className="p-3 space-y-2">{[1, 2, 3].map(i => <Skeleton key={i} className="h-12 w-full" />)}</div>
          ) : !sleepChartData.length ? (
            <div className="p-8 text-center text-sm text-muted-foreground">No sleep logged yet. Use the rail to log tonight's sleep.</div>
          ) : (
            <div className="divide-y divide-border/40">
              {[...sleepChartData].reverse().map(d => (
                <div key={d.date} className="flex items-center justify-between px-4 py-3 hover:bg-muted/20 transition-colors">
                  <div>
                    <p className="text-sm font-medium text-foreground">{format(new Date(d.date), 'EEE, MMM d')}</p>
                    {d.quality && <p className="text-[11px] text-muted-foreground capitalize">{d.quality} quality</p>}
                  </div>
                  <span className={cn('text-sm font-bold', d.hours >= target ? 'text-kpi-emerald' : 'text-kpi-amber')}>{d.hours}h</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </WorkspaceLayout>
  )
}
