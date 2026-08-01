/**
 * Health → Sleep.
 *
 * Phase 4 conversion to the canvas's `health:sleep` composition, and the one
 * page where the canvas asks for data the product does not collect at all.
 * A sleep log is a DURATION and an optional quality word — there is no bedtime,
 * no wake time, and no stage breakdown.
 *
 * TWO DEPARTURES, both forced by that:
 *  - The canvas's `spans` module positions each night between bedtime and wake
 *    on a 10 PM – 9 AM axis. Without a bedtime there is nothing to position, and
 *    placing bars by assumption would draw a sleep schedule the user never
 *    recorded. The module becomes `bars`: hours slept per night against the
 *    target, which is the same "how were the last seven nights" question.
 *  - The canvas's donut is the stage mix (deep/REM/light/awake). Nothing records
 *    stages, so the donut shows last night against the target — slept versus
 *    shortfall — keeping the module and the glanceable centre value.
 *  The correlations module keeps its shape and is computed honestly: quality
 *  words are grouped and each group's average duration is compared with the
 *  overall average, which is a real correlation over the logged nights.
 *
 * BACKEND FOLLOW-UP: bedtime/wake timestamps and a stage breakdown on the sleep
 * log (from Google Fit, which is already an integration) would let this page
 * render the canvas exactly.
 */
import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import dayjs from 'dayjs'
import styled from 'styled-components'
import { Moon, Zap } from 'lucide-react'
import { Button, Card, Dialog, EmptyState, Input, Select } from '@ledgr/ui'
import { healthApi } from '@ct/shared/api/areas'
import { ModuleGrid, type ModuleSpec } from '@ct/shared/components/modules'
import { Skeleton } from '@ct/shared/components/ui/skeleton'

const Root = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.spacing[5]};
`

const Toolbar = styled.div`
  display: flex;
  justify-content: flex-end;
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

const QUALITY_OPTIONS = [
  { value: '', label: 'Not sure' },
  { value: 'great', label: 'Great' },
  { value: 'good', label: 'Good' },
  { value: 'ok', label: 'OK' },
  { value: 'poor', label: 'Poor' },
]

const fmtHours = (h: number) => `${Math.floor(h)}h ${Math.round((h % 1) * 60)}m`

export function SleepSection() {
  const qc = useQueryClient()
  const [logOpen, setLogOpen] = useState(false)
  const [entry, setEntry] = useState({ hours: '', quality: '' })

  const { data: recent, isLoading } = useQuery({
    queryKey: ['health', 'sleep', 'recent'],
    queryFn: healthApi.sleepRecent,
  })

  const create = useMutation({
    mutationFn: () => healthApi.createLog({
      entry_type: 'sleep',
      value: Number(entry.hours),
      unit: 'hours',
      notes: entry.quality || undefined,
    }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['health'] })
      setLogOpen(false)
      setEntry({ hours: '', quality: '' })
      toast.success('Sleep logged')
    },
    onError: () => toast.error('Could not log that night'),
  })

  const nights = useMemo(
    () => [...(recent?.daily ?? [])].sort((a, b) => a.date.localeCompare(b.date)).slice(-7),
    [recent],
  )

  const modules = useMemo<ModuleSpec[]>(() => {
    if (!nights.length) return []

    const target = recent?.target ?? 8
    const weeklyAvg = recent?.weekly_avg ?? 0
    const lastNight = recent?.last_night ?? nights[nights.length - 1]?.hours ?? 0
    const onTarget = nights.filter(n => n.hours >= target).length
    const best = nights.reduce((a, b) => (a.hours >= b.hours ? a : b))

    const colorFor = (h: number) =>
      h >= target ? 'success' : h >= target - 1 ? 'accent' : 'warning'

    // Correlations: group the logged nights by their quality word and compare
    // each group's mean duration with the overall mean.
    const withQuality = (recent?.daily ?? []).filter(n => !!n.quality)
    const overallMean = withQuality.length
      ? withQuality.reduce((s, n) => s + n.hours, 0) / withQuality.length
      : 0
    const byQuality = new Map<string, number[]>()
    for (const n of withQuality) {
      const k = String(n.quality)
      if (!byQuality.has(k)) byQuality.set(k, [])
      byQuality.get(k)!.push(n.hours)
    }
    const correlations = [...byQuality.entries()]
      .map(([quality, hours]) => {
        const mean = hours.reduce((s, h) => s + h, 0) / hours.length
        return { quality, nights: hours.length, mean, delta: mean - overallMean }
      })
      .sort((a, b) => b.delta - a.delta)

    const shortfall = Math.max(0, target - lastNight)
    const sleptPct = target > 0 ? Math.min(100, Math.round((lastNight / target) * 100)) : 0

    return [
      {
        kind: 'tiles',
        span: 12,
        tiles: [
          {
            label: 'Last night',
            value: fmtHours(lastNight),
            sub: lastNight >= target ? 'Hit your target' : `${fmtHours(shortfall)} short of ${target}h`,
            subKey: lastNight >= target ? 'success' : 'warning',
            bar: sleptPct,
            barKey: colorFor(lastNight),
          },
          {
            label: 'Weekly average',
            value: fmtHours(weeklyAvg),
            sub: `Target ${target}h a night`,
            subKey: weeklyAvg >= target ? 'success' : 'warning',
          },
          {
            label: 'Nights on target',
            value: `${onTarget} of ${nights.length}`,
            sub: 'In the last week',
            dotKey: onTarget >= nights.length - 1 ? 'success' : onTarget >= 4 ? 'accent' : 'warning',
          },
          {
            label: 'Best night',
            value: fmtHours(best.hours),
            sub: dayjs(best.date).format('dddd D MMM'),
          },
        ],
      },
      {
        kind: 'bars',
        span: 7,
        title: 'Last 7 nights',
        subtitle: `Hours slept against a ${target}h target`,
        icon: Moon,
        target,
        bars: nights.map(n => ({
          label: dayjs(n.date).format('ddd'),
          v: Number(n.hours.toFixed(1)),
          t: fmtHours(n.hours),
          colorKey: colorFor(n.hours),
        })),
      },
      {
        kind: 'donut',
        span: 5,
        title: 'Last night against target',
        subtitle: `${fmtHours(lastNight)} of a ${target}h target`,
        icon: Moon,
        centerValue: `${sleptPct}%`,
        centerLabel: 'Of target',
        slices: [
          {
            label: 'Slept',
            pct: sleptPct,
            value: fmtHours(lastNight),
            colorKey: colorFor(lastNight),
          },
          {
            label: 'Shortfall',
            pct: 100 - sleptPct,
            value: shortfall > 0 ? fmtHours(shortfall) : 'None',
            colorKey: 'muted',
          },
        ],
      },
      {
        kind: 'rows',
        span: 12,
        title: 'What went with a good night',
        subtitle: correlations.length
          ? `Across ${withQuality.length} night${withQuality.length === 1 ? '' : 's'} where you rated the sleep`
          : 'Rate a few nights and patterns show up here',
        icon: Zap,
        rows: correlations.map(c => ({
          title: `Rated "${c.quality}"`,
          meta: `${c.nights} night${c.nights === 1 ? '' : 's'} · averaged ${fmtHours(c.mean)}`,
          tagLabel: `${c.delta >= 0 ? '+' : '−'}${fmtHours(Math.abs(c.delta))} vs your average`,
          tagColorKey: c.delta >= 0 ? 'success' : 'warning',
        })),
      },
    ]
  }, [nights, recent])

  if (isLoading) return <Skeleton style={{ height: 320 }} />

  return (
    <Root>
      <Toolbar>
        <Button size="sm" variant="primary" onClick={() => setLogOpen(true)}>Log sleep</Button>
      </Toolbar>

      {nights.length === 0 ? (
        <Card title="Sleep" subtitle="Duration, consistency and what helps" icon={<Moon size={16} />}>
          <EmptyState
            icon={<Moon size={20} />}
            title="No nights logged"
            description="Log how long you slept and the trend, target and patterns fill in."
            action={<Button size="sm" onClick={() => setLogOpen(true)}>Log a night</Button>}
          />
        </Card>
      ) : (
        <ModuleGrid modules={modules} />
      )}

      <Dialog
        open={logOpen}
        onOpenChange={(o) => !o && setLogOpen(false)}
        icon={<Moon size={18} />}
        eyebrow="Health"
        title="Log a night"
        description="How long you slept, and how it felt."
      >
        <Form>
          <div>
            <Label>Hours slept</Label>
            <Input
              type="number"
              min="0"
              max="24"
              step="0.25"
              value={entry.hours}
              onChange={(e: any) => setEntry(s => ({ ...s, hours: e.target.value }))}
              placeholder="7.5"
              autoFocus
            />
          </div>
          <div>
            <Label>Quality</Label>
            <Select
              fullWidth
              value={entry.quality}
              onChange={(v: any) => setEntry(s => ({ ...s, quality: String(v) }))}
              options={QUALITY_OPTIONS}
            />
          </div>
          <Actions>
            <Button variant="primary" loading={create.isPending} disabled={!Number(entry.hours)} onClick={() => create.mutate()}>
              Save
            </Button>
            <Button variant="ghost" onClick={() => setLogOpen(false)}>Cancel</Button>
          </Actions>
        </Form>
      </Dialog>
    </Root>
  )
}
