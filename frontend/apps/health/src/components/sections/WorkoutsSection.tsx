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
import { Activity, CheckSquare, Dumbbell, Pencil, Plus, Trash2 } from 'lucide-react'
import { Button, Card, Dialog, EmptyState, Input, SkeletonPage } from '@ledgr/ui'
import { healthApi, type WorkoutRoutine } from '@ct/shared/api/areas'
import { ModuleGrid, type ModuleSpec } from '@ct/shared/components/modules'
import type { WorkoutSessionItem } from '@ct/shared/types'
import { RoutineDialog } from '../RoutineDialog'

/** 0 = Monday, matching the backend's date.weekday(). */
const WEEKDAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

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

const EmptyActions = styled.div`
  display: flex;
  gap: ${({ theme }) => theme.spacing[2]};
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
  /* Non-null puts the log dialog into edit mode. A session was correctable
     only by deleting and re-logging it until 2026-08-06. */
  const [editingSession, setEditingSession] = useState<WorkoutSessionItem | null>(null)
  const [loggedOn, setLoggedOn] = useState('')
  const [detail, setDetail] = useState<WorkoutSessionItem | null>(null)
  const [routineOpen, setRoutineOpen] = useState(false)
  const [editingRoutine, setEditingRoutine] = useState<WorkoutRoutine | null>(null)

  const { data: sessions, isLoading } = useQuery({
    queryKey: ['health', 'workouts'],
    queryFn: () => healthApi.workouts(20),
  })
  const { data: goals } = useQuery({
    queryKey: ['health', 'goals'],
    queryFn: healthApi.healthGoals,
    staleTime: 5 * 60_000,
  })
  const { data: routines } = useQuery({
    queryKey: ['health', 'routines'],
    queryFn: healthApi.routines,
    staleTime: 60_000,
  })
  const { data: adherence } = useQuery({
    queryKey: ['health', 'adherence'],
    queryFn: () => healthApi.workoutAdherence(28),
    staleTime: 60_000,
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
      sets: cleanSets(),
    }),
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: ['health'] })
      if (res.new_prs.length > 0) {
        res.new_prs.forEach(pr =>
          toast.success(`🏆 New PR: ${pr.exercise} ${pr.weight_kg}kg${pr.previous ? ` (was ${pr.previous}kg)` : ''}`))
      } else {
        toast.success('Workout logged')
      }
      closeLog()
    },
    onError: () => toast.error('Failed to log workout'),
  })

  const cleanSets = () =>
    sets
      .filter(r => r.exercise.trim() && Number(r.reps) > 0)
      .map(r => ({
        exercise: r.exercise.trim(),
        reps: Number(r.reps),
        ...(r.weight_kg ? { weight_kg: Number(r.weight_kg) } : {}),
      }))

  const closeLog = () => {
    setLogOpen(false)
    setEditingSession(null)
    setName('')
    setLoggedOn('')
    setSets([{ ...EMPTY_SET }])
  }

  const openLog = () => {
    setEditingSession(null)
    setName('')
    setLoggedOn('')
    setSets([{ ...EMPTY_SET }])
    setLogOpen(true)
  }

  const openEditSession = (s: WorkoutSessionItem) => {
    setEditingSession(s)
    setName(s.name)
    setLoggedOn(dayjs(s.logged_at).format('YYYY-MM-DD'))
    setSets(
      s.sets.length
        ? s.sets.map(x => ({
            exercise: x.exercise,
            reps: String(x.reps),
            weight_kg: x.weight_kg != null ? String(x.weight_kg) : '',
          }))
        : [{ ...EMPTY_SET }],
    )
    setDetail(null)
    setLogOpen(true)
  }

  const update = useMutation({
    mutationFn: () =>
      healthApi.patchWorkout(editingSession!.id, {
        name: name.trim() || 'Workout',
        // Naive local, never toISOString() — see the finance datetime rule.
        logged_at: `${loggedOn}T${dayjs(editingSession!.logged_at).format('HH:mm:ss')}`,
        sets: cleanSets(),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['health'] })
      closeLog()
      toast.success('Session updated')
    },
    onError: () => toast.error('Failed to update session'),
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
    /* The plan modules must render even with zero logged sessions — that is
       precisely the state where "you planned 3, did 0" is worth saying. Only
       the history modules below need `rows`. */
    const planSpecs: ModuleSpec[] = []
    const routineList = routines ?? []

    if (routineList.length) {
      planSpecs.push({
        kind: 'tiles',
        span: 12,
        tiles: [
          {
            label: 'Adherence',
            /* NULL means nothing was ever scheduled — not 0%. Telling someone
               with no routines that they are at 0% accuses them of failing at
               something they never committed to. */
            value: adherence?.adherence_pct == null ? '—' : `${adherence.adherence_pct}%`,
            sub: adherence?.adherence_pct == null
              ? 'Put a routine on a weekday to start tracking'
              : `${adherence.completed_total} of ${adherence.planned_total} planned sessions`,
            ...(adherence?.adherence_pct != null && {
              subKey: adherence.adherence_pct >= 80 ? 'success' : adherence.adherence_pct >= 50 ? 'warning' : 'destructive',
              dotKey: adherence.adherence_pct >= 80 ? 'success' : adherence.adherence_pct >= 50 ? 'warning' : 'destructive',
            }),
          },
          { label: 'Routines', value: String(routineList.length), sub: `${routineList.filter(r => r.days.length).length} scheduled` },
          {
            label: 'Missed',
            value: String((adherence?.days ?? []).reduce((n, d) => n + d.missed.length, 0)),
            sub: `In the last ${adherence?.window_days ?? 28} days`,
          },
          {
            label: 'Off-plan sessions',
            value: String((adherence?.days ?? []).reduce((n, d) => n + d.unplanned.length + d.off_schedule.length, 0)),
            sub: 'Trained without a scheduled routine',
          },
        ],
      })

      planSpecs.push({
        kind: 'progress',
        span: 12,
        title: 'Routines',
        subtitle: 'Your plan — click one to edit it',
        icon: Dumbbell,
        action: '+ New routine',
        actionVariant: 'primary',
        onAction: () => { setEditingRoutine(null); setRoutineOpen(true) },
        onRowClick: (i: number) => { setEditingRoutine(routineList[i]); setRoutineOpen(true) },
        rows: routineList.map(r => {
          const doneFor = (adherence?.days ?? []).reduce((n, d) => n + d.completed.filter(c => c.id === r.id).length, 0)
          const planFor = (adherence?.days ?? []).reduce((n, d) => n + d.planned.filter(c => c.id === r.id).length, 0)
          return {
            title: r.name,
            meta: r.days.length
              ? r.days.map(d => WEEKDAY_LABELS[d]).join(' · ')
              : 'Not scheduled on any day',
            value: planFor ? `${doneFor}/${planFor}` : '—',
            valueKey: !planFor ? 'mutedFg' : doneFor >= planFor ? 'success' : 'warning',
            pct: planFor ? Math.round((doneFor / planFor) * 100) : 0,
            colorKey: !planFor ? 'muted' : doneFor >= planFor ? 'success' : 'health',
          }
        }),
      })
    }

    if (!rows.length) return planSpecs

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
      ...planSpecs,
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
        onAction: openLog,
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
     
  }, [rows, gymLogs, goals, routines, adherence])

  if (isLoading) return <SkeletonPage kpis={4} modules={[7, 5, 12]} />

  return (
    <Root>
      {/* Gated on modules, not on `rows`: with routines set up but nothing
          logged yet the plan modules are exactly what should show, and the
          "no sessions" card would wrongly hide them. */}
      {modules.length === 0 ? (
        <Card title="Workouts" subtitle="Plan a routine, then track whether you did it" icon={<Activity size={16} />}>
          <EmptyState
            icon={<Activity size={20} />}
            title="Nothing planned or logged yet"
            description="Build a routine to set what your week should look like, or log a one-off session."
            action={
              <EmptyActions>
                <Button size="sm" variant="primary" onClick={() => { setEditingRoutine(null); setRoutineOpen(true) }}>
                  New routine
                </Button>
                <Button size="sm" variant="outline" onClick={openLog}>Log a workout</Button>
              </EmptyActions>
            }
          />
        </Card>
      ) : (
        <ModuleGrid modules={modules} />
      )}

      <RoutineDialog
        open={routineOpen}
        onClose={() => { setRoutineOpen(false); setEditingRoutine(null) }}
        editing={editingRoutine}
      />

      <Dialog
        open={logOpen}
        onOpenChange={(o) => !o && closeLog()}
        icon={<Activity size={18} />}
        eyebrow="Health"
        title={editingSession ? 'Edit session' : 'Log a workout'}
        description={editingSession
          ? 'Saving replaces the session’s sets with what is listed here.'
          : 'Name the session, then add the sets you did.'}
        size="md"
      >
        <Form>
          <div>
            <Label>Session name</Label>
            <Input value={name} onChange={(e: any) => setName(e.target.value)} placeholder="Push day" autoFocus />
          </div>

          {/* Editing only: a new session is logged as of now, but a mis-dated
              one has to be movable — the server re-points the paired gym log
              so the streak follows. */}
          {editingSession && (
            <div>
              <Label>Date</Label>
              <Input type="date" value={loggedOn} onChange={(e: any) => setLoggedOn(e.target.value)} />
            </div>
          )}

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
              loading={create.isPending || update.isPending}
              disabled={!sets.some(r => r.exercise.trim() && Number(r.reps) > 0)}
              onClick={() => (editingSession ? update.mutate() : create.mutate())}
            >
              {editingSession ? 'Save changes' : 'Save workout'}
            </Button>
            <Button variant="ghost" onClick={closeLog}>Cancel</Button>
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
              variant="outline"
              size="sm"
              onClick={() => detail && openEditSession(detail)}
            >
              <Pencil size={14} style={{ marginRight: 4 }} /> Edit
            </Button>
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
