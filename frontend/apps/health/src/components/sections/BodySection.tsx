/**
 * Health → Body metrics.
 *
 * Phase 4 conversion to the canvas's `health:body` composition —
 * tiles(12) · bars(8) · progress(4) · table(12) — rebuilt from the live health
 * logs.
 *
 * ONE DEPARTURE: the canvas's progress module is "Composition — muscle, fat,
 * hydration, from a smart scale". Only body fat is recorded, and inventing
 * muscle and hydration figures would put numbers on screen that came from
 * nowhere. The module keeps the composition question and answers it with what
 * is measured: body fat against a healthy band, BMI from the logged height, and
 * distance to the goal weight.
 *
 * BACKEND FOLLOW-UP: `muscle_mass` and `hydration` log types would let this
 * render the canvas exactly.
 */
import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import dayjs from 'dayjs'
import styled from 'styled-components'
import { Scale, TrendingUp, User } from 'lucide-react'
import { Button, Card, Dialog, EmptyState, Input, Select, SkeletonPage } from '@ledgr/ui'
import { healthApi } from '@ct/shared/api/areas'
import { ModuleGrid, type ModuleSpec } from '@ct/shared/components/modules'

const Root = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.spacing[5]};
`

const Form = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.spacing[3]};
`

const Label = styled.label`
  display: block;
  font-size: ${({ theme }) => theme.typography.fontSize.xs};
  color: ${({ theme }) => theme.color.mutedForeground};
  margin-bottom: ${({ theme }) => theme.spacing[1]};
`

const Actions = styled.div`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing[2]};
  padding-top: ${({ theme }) => theme.spacing[2]};
`

const MEASUREMENTS = [
  { value: 'weight', label: 'Weight (kg)', unit: 'kg' },
  { value: 'body_fat', label: 'Body fat (%)', unit: '%' },
  { value: 'steps', label: 'Steps', unit: 'steps' },
]

const WEEKS = 8

export function BodySection() {
  const qc = useQueryClient()
  const [logOpen, setLogOpen] = useState(false)
  const [entry, setEntry] = useState({ entry_type: 'weight', value: '' })

  const { data: weightLogs, isLoading } = useQuery({
    queryKey: ['health', 'logs', 'weight'],
    queryFn: () => healthApi.logs('weight'),
  })
  const { data: fatLogs } = useQuery({
    queryKey: ['health', 'logs', 'body_fat'],
    queryFn: () => healthApi.logs('body_fat'),
    staleTime: 60_000,
  })
  const { data: stepLogs } = useQuery({
    queryKey: ['health', 'logs', 'steps'],
    queryFn: () => healthApi.logs('steps'),
    staleTime: 60_000,
  })
  const { data: goals } = useQuery({
    queryKey: ['health', 'goals'],
    queryFn: healthApi.healthGoals,
    staleTime: 5 * 60_000,
  })

  const create = useMutation({
    mutationFn: () => healthApi.createLog({
      entry_type: entry.entry_type,
      value: Number(entry.value),
      unit: MEASUREMENTS.find(m => m.value === entry.entry_type)?.unit,
    }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['health'] })
      setLogOpen(false)
      setEntry({ entry_type: 'weight', value: '' })
      toast.success('Measurement logged')
    },
    onError: () => toast.error('Could not log that measurement'),
  })

  const weights = useMemo(
    () => [...(weightLogs ?? [])].sort((a, b) => b.logged_at.localeCompare(a.logged_at)),
    [weightLogs],
  )

  const modules = useMemo<ModuleSpec[]>(() => {
    if (!weights.length) return []

    const latest = weights[0]
    const latestWeight = Number(latest.value ?? 0)
    const goalWeight = goals?.target_weight ?? null
    const heightCm = goals?.height_cm ?? null

    const fats = [...(fatLogs ?? [])].sort((a, b) => b.logged_at.localeCompare(a.logged_at))
    const latestFat = fats[0] ? Number(fats[0].value ?? 0) : null

    const stepsToday = (stepLogs ?? [])
      .filter(l => dayjs(l.logged_at).isSame(dayjs(), 'day'))
      .reduce((s, l) => s + Number(l.value ?? 0), 0)
    const stepTarget = goals?.steps_target ?? 10000

    // Change over the window the bars cover, so the tile and chart agree.
    const windowStart = dayjs().subtract(WEEKS, 'week')
    const oldestInWindow = [...weights].reverse().find(l => !dayjs(l.logged_at).isBefore(windowStart))
    const delta = oldestInWindow ? latestWeight - Number(oldestInWindow.value ?? 0) : null

    // One point per week: the last reading in each week.
    const weekBuckets = Array.from({ length: WEEKS }, (_, i) => dayjs().subtract(WEEKS - 1 - i, 'week'))
    const weeklyWeights = weekBuckets.map((w) => {
      const inWeek = weights.filter(l => dayjs(l.logged_at).isSame(w, 'week'))
      return { week: w, value: inWeek.length ? Number(inWeek[0].value ?? 0) : null }
    })
    const plotted = weeklyWeights.filter(w => w.value !== null)
    const maxWeight = Math.max(latestWeight, ...plotted.map(w => w.value!), goalWeight ?? 0)

    const bmi = heightCm ? latestWeight / ((heightCm / 100) ** 2) : null

    const compositionRows: ModuleSpec extends never ? never : Array<{ title: string; meta: string; pct: number; value: string; colorKey?: string }> = []
    if (latestFat !== null) {
      // 8–20% is the commonly cited healthy band; the bar reads against 30%.
      compositionRows.push({
        title: 'Body fat',
        meta: `Measured ${dayjs(fats[0].logged_at).format('D MMM')}`,
        pct: Math.min(100, Math.round((latestFat / 30) * 100)),
        value: `${latestFat.toFixed(1)}%`,
        colorKey: latestFat <= 20 ? 'success' : latestFat <= 25 ? 'warning' : 'destructive',
      })
    }
    if (bmi !== null) {
      compositionRows.push({
        title: 'BMI',
        meta: `From ${heightCm} cm and ${latestWeight.toFixed(1)} kg`,
        pct: Math.min(100, Math.round((bmi / 40) * 100)),
        value: bmi.toFixed(1),
        colorKey: bmi >= 18.5 && bmi < 25 ? 'success' : bmi < 30 ? 'warning' : 'destructive',
      })
    }
    if (goalWeight !== null) {
      const toGo = Math.abs(latestWeight - goalWeight)
      const startWeight = oldestInWindow ? Number(oldestInWindow.value ?? 0) : latestWeight
      const span = Math.abs(startWeight - goalWeight)
      compositionRows.push({
        title: 'Toward goal weight',
        meta: `${toGo.toFixed(1)} kg to ${goalWeight} kg`,
        pct: span > 0 ? Math.max(0, Math.min(100, Math.round(((span - toGo) / span) * 100))) : 100,
        value: `${goalWeight} kg`,
        colorKey: 'health',
      })
    }

    const specs: ModuleSpec[] = [
      {
        kind: 'tiles',
        span: 12,
        tiles: [
          {
            label: 'Weight',
            value: `${latestWeight.toFixed(1)} kg`,
            sub: delta === null ? `Logged ${dayjs(latest.logged_at).format('D MMM')}` : `${delta >= 0 ? '+' : ''}${delta.toFixed(1)} kg over ${WEEKS} weeks`,
            subKey: delta === null ? undefined : goalWeight !== null && goalWeight < latestWeight
              ? (delta < 0 ? 'success' : 'warning')
              : (delta > 0 ? 'success' : 'warning'),
          },
          {
            label: 'Body fat',
            value: latestFat === null ? '—' : `${latestFat.toFixed(1)}%`,
            sub: latestFat === null ? 'Not logged yet' : `Measured ${dayjs(fats[0].logged_at).format('D MMM')}`,
            dotKey: latestFat === null ? undefined : latestFat <= 20 ? 'success' : 'warning',
          },
          {
            label: 'Steps today',
            value: stepsToday ? Math.round(stepsToday).toLocaleString('en-IN') : '—',
            sub: `Target ${stepTarget.toLocaleString('en-IN')}`,
            bar: stepTarget > 0 ? Math.min(100, Math.round((stepsToday / stepTarget) * 100)) : 0,
            barKey: stepsToday >= stepTarget ? 'success' : 'health',
          },
          {
            label: 'Readings',
            value: String(weights.length),
            sub: `Since ${dayjs(weights[weights.length - 1].logged_at).format('MMM YYYY')}`,
          },
        ],
      },
      {
        kind: 'bars',
        span: 8,
        title: 'Weight trend',
        subtitle: goalWeight !== null ? `${WEEKS} weeks · goal ${goalWeight} kg` : `${WEEKS} weeks`,
        icon: TrendingUp,
        ...(goalWeight !== null && { target: goalWeight, targetLabel: 'Goal' }),
        max: Math.ceil(maxWeight + 2),
        bars: weeklyWeights.map(w => ({
          label: w.week.format('D MMM'),
          v: w.value ?? 0,
          t: w.value === null ? '' : w.value.toFixed(1),
          colorKey: w.value === null ? 'muted'
            : goalWeight !== null && Math.abs(w.value - goalWeight) < 0.5 ? 'success' : 'health',
          dim: w.value === null,
        })),
      },
    ]

    if (compositionRows.length) {
      specs.push({
        kind: 'progress',
        span: 4,
        title: 'Composition',
        subtitle: 'From your latest readings',
        icon: User,
        rows: compositionRows as any,
      })
    }

    specs.push({
      kind: 'table',
      span: 12,
      title: 'Measurement log',
      subtitle: 'Most recent first',
      icon: User,
      action: 'Add measurement',
      onAction: () => setLogOpen(true),
      gridCols: '1.2fr 1fr 1fr 1fr',
      cols: [{ l: 'Date' }, { l: 'Weight', a: 'right' }, { l: 'Body fat', a: 'right' }, { l: 'Change', a: 'right' }],
      rows: weights.slice(0, 12).map((l, i) => {
        const prev = weights[i + 1]
        const change = prev ? Number(l.value ?? 0) - Number(prev.value ?? 0) : null
        const sameDayFat = fats.find(f => dayjs(f.logged_at).isSame(dayjs(l.logged_at), 'day'))
        return [
          { t: dayjs(l.logged_at).format('D MMM YYYY'), bold: true },
          `${Number(l.value ?? 0).toFixed(1)} kg`,
          sameDayFat ? `${Number(sameDayFat.value ?? 0).toFixed(1)}%` : '—',
          change === null
            ? '—'
            : { t: `${change >= 0 ? '+' : ''}${change.toFixed(1)}`, colorKey: change <= 0 ? 'success' : 'warning' },
        ]
      }),
    })

    return specs
  }, [weights, fatLogs, stepLogs, goals])

  if (isLoading) return <SkeletonPage kpis={4} modules={[7, 5, 12]} />

  return (
    <Root>
      {weights.length === 0 ? (
        <Card title="Body metrics" subtitle="Weight, composition and trend" icon={<Scale size={16} />}>
          <EmptyState
            icon={<Scale size={20} />}
            title="No measurements yet"
            description="Log a weight and the trend, composition and history fill in."
            action={<Button size="sm" onClick={() => setLogOpen(true)}>Add a measurement</Button>}
          />
        </Card>
      ) : (
        <ModuleGrid modules={modules} />
      )}

      <Dialog
        open={logOpen}
        onOpenChange={(o) => !o && setLogOpen(false)}
        icon={<Scale size={18} />}
        eyebrow="Health"
        title="Add a measurement"
        description="Morning, fasted, same scale gives the cleanest trend."
      >
        <Form>
          <div>
            <Label>What are you logging?</Label>
            <Select
              fullWidth
              value={entry.entry_type}
              onChange={(v: any) => setEntry(e => ({ ...e, entry_type: String(v) }))}
              options={MEASUREMENTS.map(m => ({ value: m.value, label: m.label }))}
            />
          </div>
          <div>
            <Label>Value</Label>
            <Input
              type="number"
              min="0"
              step="0.1"
              value={entry.value}
              onChange={(e: any) => setEntry(s => ({ ...s, value: e.target.value }))}
              placeholder="74.5"
              autoFocus
            />
          </div>
          <Actions>
            <Button variant="primary" loading={create.isPending} disabled={!entry.value} onClick={() => create.mutate()}>
              Save
            </Button>
            <Button variant="ghost" onClick={() => setLogOpen(false)}>Cancel</Button>
          </Actions>
        </Form>
      </Dialog>
    </Root>
  )
}
