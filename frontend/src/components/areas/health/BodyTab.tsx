import { useState, useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Button, Form, Input } from 'antd'
import { Plus, Scale, Percent, Ruler } from 'lucide-react'
import { healthApi } from '@/api/areas'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'
import { format } from 'date-fns'
import {
  ComposedChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer,
} from 'recharts'

function bmiCategory(bmi: number) {
  if (bmi < 18.5) return { label: 'Underweight', color: 'text-amber-500' }
  if (bmi < 25) return { label: 'Normal', color: 'text-emerald-500' }
  if (bmi < 30) return { label: 'Overweight', color: 'text-amber-500' }
  return { label: 'Obese', color: 'text-rose-500' }
}

export function BodyTab() {
  const [form] = Form.useForm()
  const [heightForm] = Form.useForm()
  const queryClient = useQueryClient()
  const [showForm, setShowForm] = useState(false)
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

  const createMutation = useMutation({
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
      form.resetFields()
      setShowForm(false)
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

  const latestWeight = weightLogs?.[0]?.value != null ? Number(weightLogs[0].value) : null
  const latestBodyFat = bodyFatLogs?.[0]?.value != null ? Number(bodyFatLogs[0].value) : null
  const heightCm = goals?.height_cm ?? null

  const bmi = useMemo(() => {
    if (!latestWeight || !heightCm) return null
    const heightM = heightCm / 100
    return latestWeight / (heightM * heightM)
  }, [latestWeight, heightCm])

  const chartData = useMemo(() => {
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

  const isLoading = loadingWeight || loadingBodyFat

  return (
    <div className="space-y-4">
      {/* KPI row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="bg-card border border-border rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <Scale className="w-4 h-4 text-primary" />
            <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Current Weight</p>
          </div>
          {loadingWeight ? <Skeleton className="h-7 w-24" /> : (
            <p className="text-2xl font-bold text-foreground">{latestWeight != null ? `${latestWeight} kg` : '—'}</p>
          )}
        </div>
        <div className="bg-card border border-border rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <Percent className="w-4 h-4 text-purple-500" />
            <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Body Fat</p>
          </div>
          {loadingBodyFat ? <Skeleton className="h-7 w-24" /> : (
            <p className="text-2xl font-bold text-foreground">{latestBodyFat != null ? `${latestBodyFat}%` : '—'}</p>
          )}
        </div>
        <div className="bg-card border border-border rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <Ruler className="w-4 h-4 text-muted-foreground" />
            <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">BMI</p>
          </div>
          {loadingGoals ? <Skeleton className="h-7 w-24" /> : heightCm == null ? (
            editingHeight ? (
              <Form form={heightForm} layout="inline" onFinish={heightMutation.mutate} requiredMark={false} className="flex gap-2">
                <Form.Item name="height_cm" rules={[{ required: true }]} className="mb-0 flex-1">
                  <Input type="number" placeholder="Height (cm)" min="0" size="small" autoFocus />
                </Form.Item>
                <Button type="primary" htmlType="submit" size="small" loading={heightMutation.isPending}>Save</Button>
              </Form>
            ) : (
              <button onClick={() => setEditingHeight(true)} className="text-sm font-semibold text-primary hover:text-primary/80 transition">
                Set height to calculate
              </button>
            )
          ) : bmi != null ? (
            <p className={cn('text-2xl font-bold', bmiCategory(bmi).color)}>
              {bmi.toFixed(1)} <span className="text-sm font-semibold">{bmiCategory(bmi).label}</span>
            </p>
          ) : (
            <p className="text-sm text-muted-foreground">Log weight to calculate</p>
          )}
        </div>
      </div>

      {/* Chart */}
      <div className="bg-card border border-border rounded-xl p-4 shadow-sm">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-4">Weight &amp; Body Fat Trend</p>
        {isLoading ? <Skeleton className="h-[220px]" /> : !chartData.length ? (
          <div className="h-[220px] flex items-center justify-center text-sm text-muted-foreground">No body composition logs yet</div>
        ) : (
          <ResponsiveContainer width="100%" height={220}>
            <ComposedChart data={chartData} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
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
              <Area yAxisId="weight" type="monotone" dataKey="weight" name="Weight (kg)" stroke="#0D9488" fill="rgba(13,148,136,0.15)" connectNulls strokeWidth={2} isAnimationActive={false} />
              <Area yAxisId="fat" type="monotone" dataKey="body_fat" name="Body Fat (%)" stroke="#8b5cf6" fill="rgba(139,92,246,0.12)" connectNulls strokeWidth={2} isAnimationActive={false} />
            </ComposedChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Log form */}
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Log Body Stats</p>
        <Button type="primary" size="small" icon={<Plus className="w-3.5 h-3.5" />} onClick={() => setShowForm(!showForm)}>
          Log Entry
        </Button>
      </div>

      {showForm && (
        <div className="bg-muted/40 border border-border/60 rounded-xl p-4">
          <Form form={form} layout="vertical" onFinish={createMutation.mutate} requiredMark={false}>
            <div className="grid grid-cols-3 gap-3">
              <Form.Item name="logged_at" label={<span className="text-[11px] text-muted-foreground">Date</span>}>
                <Input type="date" />
              </Form.Item>
              <Form.Item name="weight_kg" label={<span className="text-[11px] text-muted-foreground">Weight (kg)</span>} rules={[{ required: true }]}>
                <Input type="number" placeholder="0" min="0" step="0.1" />
              </Form.Item>
              <Form.Item name="body_fat_pct" label={<span className="text-[11px] text-muted-foreground">Body Fat % (optional)</span>}>
                <Input type="number" placeholder="0" min="0" max="100" step="0.1" />
              </Form.Item>
              <Form.Item name="notes" label={<span className="text-[11px] text-muted-foreground">Notes</span>} className="col-span-3">
                <Input placeholder="Optional note" />
              </Form.Item>
            </div>
            <div className="flex gap-2">
              <Button type="primary" htmlType="submit" loading={createMutation.isPending} size="small">Save</Button>
              <Button type="text" size="small" onClick={() => { setShowForm(false); form.resetFields() }}>Cancel</Button>
            </div>
          </Form>
        </div>
      )}
    </div>
  )
}
