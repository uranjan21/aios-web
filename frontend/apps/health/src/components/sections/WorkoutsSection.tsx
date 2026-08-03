/**
 * Health → Workouts.
 *
 * Phase 4 conversion to the canvas's `health:workouts` composition —
 * bars(7) · checklist(5) · table(12) — rebuilt from the live workouts API.
 *
 * ONE DEPARTURE: the canvas's checklist is "this week plan", a prescribed set
 * of sessions. There is no training-plan model, only a weekly session target,
 * so the checklist is the seven days of this week, ticked where a session was
 * actually logged. It answers the same question — how is the week going against
 * the target — from the record that exists, and stays inert because ticking a
 * day is not a thing you can do; you log the session instead.
 */
import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import dayjs from 'dayjs'
import styled from 'styled-components'
import { Activity, CheckSquare, Plus, Trash2 } from 'lucide-react'
import { Button, Card, Dialog, EmptyState, Input } from '@ledgr/ui'
import { healthApi } from '@ct/shared/api/areas'
import { ModuleGrid, type ModuleSpec } from '@ct/shared/components/modules'
import { Skeleton } from '@ct/shared/components/ui/skeleton'
import type { WorkoutSessionItem } from '@ct/shared/types'

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

const SetRowGrid = styled.div`
  display: grid;
  grid-template-columns: 2fr 1fr 1fr auto;
  gap: ${({ theme }) => theme.spacing[2]};
  align-items: end;
`

const Actions = styled.div`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing[2]};
  padding-top: ${({ theme }) => theme.spacing[2]};
`

const Spacer = styled.div`
  flex: 1;
`

type SetRow = { exercise: string; reps: string; weight_kg: string }
const EMPTY_SET: SetRow = { exercise: '', reps: '', weight_kg: '' }

/** Total kilos moved in a session: the standard sets × reps × weight. */
const volumeOf = (s: WorkoutSessionItem) =>
  s.sets.reduce((sum, set) => sum + set.reps * (set.weight_kg ?? 0), 0)

const bestSetOf = (s: WorkoutSessionItem) => {
  if (!s.sets.length) return null
  return s.sets.reduce((a, b) => ((a.weight_kg ?? 0) >= (b.weight_kg ?? 0) ? a : b))
}

export function WorkoutsSection() {
  const qc = useQueryClient()
  const [logOpen, setLogOpen] = useState(false)
  const [name, setName] = useState('')
  const [sets, setSets] = useState<SetRow[]>([{ ...EMPTY_SET }])
  const [detail, setDetail] = useState<WorkoutSessionItem | null>(null)

  const { data: sessions, isLoading } = useQuery({
    queryKey: ['health', 'workouts'],
    queryFn: () => healthApi.workouts(20),
  })
  const { data: goals } = useQuery({
    queryKey: ['health', 'goals'],
    queryFn: healthApi.healthGoals,
    staleTime: 5 * 60_000,
  })
  // Gym logs carry a duration in minutes, which the session rows do not.
  const { data: gymLogs } = useQuery({
    queryKey: ['health', 'logs', 'gym'],
    queryFn: () => healthApi.logs('gym'),
    staleTime: 60_000,
  })

  const create = useMutation({
    mutationFn: () => healthApi.createWorkout({
      name: name.trim() || 'Workout',
      sets: sets
        .filter(r => r.exercise.trim() && Number(r.reps) > 0)
        .map(r => ({
          exercise: r.exercise.trim(),
          reps: Number(r.reps),
          ...(r.weight_kg ? { weight_kg: Number(r.weight_kg) } : {}),
        })),
    }),
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: ['health'] })
      if (res.new_prs.length > 0) {
        res.new_prs.forEach(pr =>
          toast.success(`🏆 New PR: ${pr.exercise} ${pr.weight_kg}kg${pr.previous ? ` (was ${pr.previous}kg)` : ''}`))
      } else {
        toast.success('Workout logged')
      }
      setLogOpen(false)
      setName('')
      setSets([{ ...EMPTY_SET }])
    },
    onError: () => toast.error('Failed to log workout'),
  })

  const remove = useMutation({
    mutationFn: (id: string) => healthApi.deleteWorkout(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['health'] })
      setDetail(null)
      toast.success('Session removed')
    },
    onError: () => toast.error('Failed to remove session'),
  })

  const rows = useMemo(() => sessions ?? [], [sessions])

  const modules = useMemo<ModuleSpec[]>(() => {
    if (!rows.length) return []

    const today = dayjs()
    const last7 = Array.from({ length: 7 }, (_, i) => today.subtract(6 - i, 'day'))

    // Minutes come from the gym logs; a session with no matching log still
    // counts as trained, so it falls back to the session's set count.
    const minutesOn = (d: dayjs.Dayjs) => {
      const logged = (gymLogs ?? [])
        .filter(l => dayjs(l.logged_at).isSame(d, 'day'))
        .reduce((sum, l) => sum + Number(l.value ?? 0), 0)
      if (logged > 0) return Math.round(logged)
      const sessionsThatDay = rows.filter(s => dayjs(s.logged_at).isSame(d, 'day'))
      return sessionsThatDay.length ? sessionsThatDay.reduce((sum, s) => sum + s.sets.length * 3, 0) : 0
    }

    const dailyTarget = 45
    const weeklyTarget = goals?.target_workouts_per_week ?? 4

    const weekStart = today.startOf('week')
    const weekDays = Array.from({ length: 7 }, (_, i) => weekStart.add(i, 'day'))
    const sessionOn = (d: dayjs.Dayjs) => rows.find(s => dayjs(s.logged_at).isSame(d, 'day'))
    const doneThisWeek = weekDays.filter(d => !!sessionOn(d)).length

    return [
      {
        kind: 'bars',
        span: 7,
        title: 'Training load',
        subtitle: 'Last 7 days, minutes trained',
        icon: Activity,
        target: dailyTarget,
        targetLabel: 'Daily target',
        bars: last7.map((d) => {
          const v = minutesOn(d)
          return {
            label: d.format('ddd'),
            v,
            t: v > 0 ? `${v}m` : '',
            colorKey: v >= dailyTarget ? 'success' : v > 0 ? 'health' : 'muted',
            dim: v === 0,
          }
        }),
      },
      {
        kind: 'checklist',
        span: 5,
        title: 'This week',
        subtitle: `${doneThisWeek} of ${weeklyTarget} session${weeklyTarget === 1 ? '' : 's'} done`,
        icon: CheckSquare,
        items: weekDays.map((d) => {
          const s = sessionOn(d)
          return {
            label: d.format('dddd'),
            meta: s ? s.name : d.isAfter(today, 'day') ? 'Ahead' : 'Rest',
            done: !!s,
            ...(d.isSame(today, 'day') && { tagLabel: 'Today', tagKey: 'accent' }),
          }
        }),
      },
      {
        kind: 'table',
        span: 12,
        title: 'Session log',
        subtitle: 'Latest sessions with volume and best sets · click a row for detail',
        icon: Activity,
        action: 'Log workout',
        onAction: () => setLogOpen(true),
        gridCols: '1fr 1.6fr 1fr 0.9fr 1.1fr',
        cols: [
          { l: 'Date' },
          { l: 'Session' },
          { l: 'Sets', a: 'right' },
          { l: 'Volume', a: 'right' },
          { l: 'Best set', a: 'right' },
        ],
        rows: rows.map((s) => {
          const best = bestSetOf(s)
          return [
            { t: dayjs(s.logged_at).format('D MMM'), bold: true },
            s.name,
            String(s.sets.length),
            `${Math.round(volumeOf(s)).toLocaleString('en-IN')} kg`,
            best ? { t: `${best.exercise} ${best.weight_kg ?? 0}kg`, colorKey: 'success' } : '—',
          ]
        }),
        onRowClick: (i: number) => setDetail(rows[i]),
      },
    ]
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rows, gymLogs, goals])

  if (isLoading) return <Skeleton style={{ height: 320 }} />

  return (
    <Root>
      {rows.length === 0 ? (
        <Card title="Workouts" subtitle="Sessions, volume and personal bests" icon={<Activity size={16} />}>
          <EmptyState
            icon={<Activity size={20} />}
            title="No sessions logged"
            description="Log a workout and the training load, week view and session history fill in."
            action={<Button size="sm" onClick={() => setLogOpen(true)}>Log a workout</Button>}
          />
        </Card>
      ) : (
        <ModuleGrid modules={modules} />
      )}

      <Dialog
        open={logOpen}
        onOpenChange={(o) => !o && setLogOpen(false)}
        icon={<Activity size={18} />}
        eyebrow="Health"
        title="Log a workout"
        description="Name the session, then add the sets you did."
        size="md"
      >
        <Form>
          <div>
            <Label>Session name</Label>
            <Input value={name} onChange={(e: any) => setName(e.target.value)} placeholder="Push day" autoFocus />
          </div>

          {sets.map((r, i) => (
            <SetRowGrid key={i}>
              <div>
                {i === 0 && <Label>Exercise</Label>}
                <Input
                  value={r.exercise}
                  onChange={(e: any) => setSets(s => s.map((x, j) => (j === i ? { ...x, exercise: e.target.value } : x)))}
                  placeholder="Bench press"
                />
              </div>
              <div>
                {i === 0 && <Label>Reps</Label>}
                <Input
                  type="number"
                  min="1"
                  value={r.reps}
                  onChange={(e: any) => setSets(s => s.map((x, j) => (j === i ? { ...x, reps: e.target.value } : x)))}
                  placeholder="8"
                />
              </div>
              <div>
                {i === 0 && <Label>Weight (kg)</Label>}
                <Input
                  type="number"
                  min="0"
                  step="0.5"
                  value={r.weight_kg}
                  onChange={(e: any) => setSets(s => s.map((x, j) => (j === i ? { ...x, weight_kg: e.target.value } : x)))}
                  placeholder="60"
                />
              </div>
              <Button
                variant="ghost"
                size="icon"
                aria-label="Remove set"
                disabled={sets.length === 1}
                onClick={() => setSets(s => s.filter((_, j) => j !== i))}
              >
                <Trash2 size={14} />
              </Button>
            </SetRowGrid>
          ))}

          <Button variant="outline" size="sm" onClick={() => setSets(s => [...s, { ...EMPTY_SET }])}>
            <Plus size={12} style={{ marginRight: 4 }} /> Add set
          </Button>

          <Actions>
            <Button
              variant="primary"
              loading={create.isPending}
              disabled={!sets.some(r => r.exercise.trim() && Number(r.reps) > 0)}
              onClick={() => create.mutate()}
            >
              Save workout
            </Button>
            <Button variant="ghost" onClick={() => setLogOpen(false)}>Cancel</Button>
          </Actions>
        </Form>
      </Dialog>

      <Dialog
        open={!!detail}
        onOpenChange={(o) => !o && setDetail(null)}
        icon={<Activity size={18} />}
        eyebrow={detail ? dayjs(detail.logged_at).format('D MMM YYYY') : undefined}
        title={detail?.name ?? 'Session'}
        description={detail ? `${detail.sets.length} set(s) · ${Math.round(volumeOf(detail)).toLocaleString('en-IN')} kg total volume` : undefined}
      >
        <Form>
          {(detail?.sets ?? []).map((s) => (
            <div key={s.id} style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
              <span>{s.exercise}</span>
              <span style={{ fontVariantNumeric: 'tabular-nums' }}>
                {s.reps} × {s.weight_kg ?? 0} kg
              </span>
            </div>
          ))}
          <Actions>
            <Button variant="ghost" onClick={() => setDetail(null)}>Close</Button>
            <Spacer />
            <Button
              variant="destructive"
              size="sm"
              loading={remove.isPending}
              onClick={() => detail && remove.mutate(detail.id)}
            >
              <Trash2 size={14} style={{ marginRight: 4 }} /> Delete session
            </Button>
          </Actions>
        </Form>
      </Dialog>
    </Root>
  )
}
