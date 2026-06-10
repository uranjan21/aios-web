import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Button, Form, Input, Select } from 'antd'
import { Plus, Moon, Clock, TrendingUp } from 'lucide-react'
import { healthApi } from '@/api/areas'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'
import { format } from 'date-fns'
import {
  ComposedChart, Bar, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ReferenceLine,
  ResponsiveContainer,
} from 'recharts'

const QUALITY_OPTIONS = ['poor', 'fair', 'good', 'excellent']

export function SleepTab() {
  const [form] = Form.useForm()
  const queryClient = useQueryClient()
  const [showForm, setShowForm] = useState(false)

  const { data: sleep, isLoading } = useQuery({
    queryKey: ['health', 'sleep', 'recent'],
    queryFn: healthApi.sleepRecent,
  })

  const createMutation = useMutation({
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
      form.resetFields()
      setShowForm(false)
    },
    onError: () => toast.error('Failed to log sleep'),
  })

  const target = sleep?.target ?? 8
  const lastNight = sleep?.last_night
  const weeklyAvg = sleep?.weekly_avg ?? 0
  const avgVsTarget = weeklyAvg - target
  const chartData = sleep?.daily ?? []

  return (
    <div className="space-y-4">
      {/* KPI row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="bg-card border border-border rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <Moon className="w-4 h-4 text-indigo-400" />
            <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Last Night</p>
          </div>
          {isLoading ? <Skeleton className="h-7 w-24" /> : (
            <p className="text-2xl font-bold text-foreground">{lastNight != null ? `${lastNight}h` : '—'}</p>
          )}
        </div>
        <div className="bg-card border border-border rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <Clock className="w-4 h-4 text-primary" />
            <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">7-Day Average</p>
          </div>
          {isLoading ? <Skeleton className="h-7 w-24" /> : (
            <p className="text-2xl font-bold text-foreground">{weeklyAvg}h</p>
          )}
        </div>
        <div className="bg-card border border-border rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp className="w-4 h-4 text-muted-foreground" />
            <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">vs Target ({target}h)</p>
          </div>
          {isLoading ? <Skeleton className="h-7 w-24" /> : (
            <p className={cn('text-2xl font-bold', avgVsTarget >= 0 ? 'text-emerald-500' : 'text-rose-500')}>
              {avgVsTarget >= 0 ? '+' : ''}{avgVsTarget.toFixed(1)}h
            </p>
          )}
        </div>
      </div>

      {/* Chart */}
      <div className="bg-card border border-border rounded-xl p-4 shadow-sm">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-4">Sleep — Last 7 Days</p>
        {isLoading ? <Skeleton className="h-[220px]" /> : !chartData.length ? (
          <div className="h-[220px] flex items-center justify-center text-sm text-muted-foreground">No sleep logs yet</div>
        ) : (
          <ResponsiveContainer width="100%" height={220}>
            <ComposedChart data={chartData} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
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
              <ReferenceLine y={target} stroke="#0D9488" strokeDasharray="4 4" label={{ value: `Target ${target}h`, position: 'insideTopRight', fontSize: 10, fill: '#0D9488' }} />
              <Bar dataKey="hours" name="Hours" radius={[3, 3, 0, 0]} maxBarSize={32} isAnimationActive={false}>
                {chartData.map((d, i) => (
                  <Cell key={i} fill={d.hours >= target ? '#0D9488' : '#f59e0b'} />
                ))}
              </Bar>
            </ComposedChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Log form */}
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Recent Sleep</p>
        <Button type="primary" size="small" icon={<Plus className="w-3.5 h-3.5" />} onClick={() => setShowForm(!showForm)}>
          Log Sleep
        </Button>
      </div>

      {showForm && (
        <div className="bg-muted/40 border border-border/60 rounded-xl p-4">
          <Form form={form} layout="vertical" onFinish={createMutation.mutate} requiredMark={false} initialValues={{ quality: 'good' }}>
            <div className="grid grid-cols-3 gap-3">
              <Form.Item name="logged_at" label={<span className="text-[11px] text-muted-foreground">Date</span>}>
                <Input type="date" />
              </Form.Item>
              <Form.Item name="hours" label={<span className="text-[11px] text-muted-foreground">Hours Slept</span>} rules={[{ required: true }]}>
                <Input type="number" placeholder="8" min="0" max="24" step="0.5" />
              </Form.Item>
              <Form.Item name="quality" label={<span className="text-[11px] text-muted-foreground">Quality</span>}>
                <Select>
                  {QUALITY_OPTIONS.map(q => (
                    <Select.Option key={q} value={q} className="capitalize">{q}</Select.Option>
                  ))}
                </Select>
              </Form.Item>
            </div>
            <div className="flex gap-2">
              <Button type="primary" htmlType="submit" loading={createMutation.isPending} size="small">Save</Button>
              <Button type="text" size="small" onClick={() => { setShowForm(false); form.resetFields() }}>Cancel</Button>
            </div>
          </Form>
        </div>
      )}

      {/* Recent list */}
      <div className="bg-card border border-border rounded-xl overflow-hidden shadow-sm">
        {isLoading ? (
          <div className="p-3 space-y-2">{[1, 2, 3].map(i => <Skeleton key={i} className="h-12 w-full" />)}</div>
        ) : !chartData.length ? (
          <div className="p-8 text-center text-sm text-muted-foreground">No sleep logged yet. Click Log Sleep to start.</div>
        ) : (
          <div className="divide-y divide-border/40">
            {[...chartData].reverse().map(d => (
              <div key={d.date} className="flex items-center justify-between px-4 py-3 hover:bg-muted/20 transition-colors">
                <div>
                  <p className="text-sm font-medium text-foreground">{format(new Date(d.date), 'EEE, MMM d')}</p>
                  {d.quality && <p className="text-[11px] text-muted-foreground capitalize">{d.quality} quality</p>}
                </div>
                <span className={cn('text-sm font-bold', d.hours >= target ? 'text-emerald-500' : 'text-amber-500')}>{d.hours}h</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
