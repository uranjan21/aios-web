import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Button, Input, InputNumber, Popconfirm, Tag, AutoComplete } from 'antd'
import { toast } from 'sonner'
import dayjs from 'dayjs'
import { Plus, Trash2, Dumbbell, Trophy, X, Target, Droplets, Scale, CheckCircle2, Flame, Repeat } from 'lucide-react'
import { healthApi } from '@/api/areas'
import { Skeleton } from '@/components/ui/skeleton'
import { EmptyState } from '@/components/EmptyState'
import { cn } from '@/lib/utils'
import type { WorkoutSessionItem, HabitItem } from '@/types'
import { GlassCard } from '@/components/lumina'
import { WorkspaceLayout, RailHeading } from '@/components/layout/WorkspaceLayout'

const COMMON_EXERCISES = [
  'Bench Press', 'Incline Bench Press', 'Squat', 'Deadlift', 'Overhead Press',
  'Barbell Row', 'Lat Pulldown', 'Pull Up', 'Dip', 'Bicep Curl', 'Tricep Pushdown',
  'Leg Press', 'Leg Curl', 'Leg Extension', 'Calf Raise', 'Lateral Raise',
  'Romanian Deadlift', 'Hip Thrust', 'Cable Fly', 'Face Pull',
]

const DAYS_SHOWN = 7

type SetRow = { exercise: string; reps: number | null; weight_kg: number | null }

interface Goal {
  key: string
  label: string
  unit: string
  defaultTarget: number
  icon: React.FC<{ className?: string }>
  color: string
  getValue: (summary: Record<string, unknown> | undefined, streak: Record<string, unknown> | undefined, logs: Record<string, unknown>[] | undefined) => number | null
}

const GOALS: Goal[] = [
  {
    key: 'weight',
    label: 'Target Weight',
    unit: 'kg',
    defaultTarget: 75,
    icon: Scale,
    color: 'text-primary',
    getValue: (summary) => summary?.weight != null ? Number(summary.weight) : null,
  },
  {
    key: 'weekly_gym',
    label: 'Weekly Sessions',
    unit: 'sessions/week',
    defaultTarget: 5,
    icon: Dumbbell,
    color: 'text-emerald-500',
    getValue: (_, __, gymLogs) => {
      if (!gymLogs) return null
      const oneWeekAgo = new Date()
      oneWeekAgo.setDate(oneWeekAgo.getDate() - 7)
      return gymLogs.filter(l => new Date(String(l.logged_at)) > oneWeekAgo).length
    },
  },
  {
    key: 'daily_water',
    label: 'Daily Water',
    unit: 'L/day',
    defaultTarget: 3,
    icon: Droplets,
    color: 'text-cyan-500',
    getValue: (_, __, waterLogs) => {
      if (!waterLogs) return null
      const today = new Date().toISOString().slice(0, 10)
      const todayLogs = waterLogs.filter(l => String(l.logged_at).startsWith(today))
      return todayLogs.reduce((s, l) => s + Number(l.value ?? 0), 0)
    },
  },
]

const STORAGE_KEY = 'aios_fitness_goals'

function loadGoalTargets(): Record<string, number> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) : {}
  } catch {
    return {}
  }
}

function saveGoalTargets(targets: Record<string, number>) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(targets))
}

function GoalCard({ goal, current, target, onTargetChange }: {
  goal: Goal
  current: number | null
  target: number
  onTargetChange: (val: number) => void
}) {
  const Icon = goal.icon
  const pct = current != null && target > 0
    ? Math.min((goal.key === 'weight'
      ? Math.max(0, 1 - (current - target) / target) * 100
      : (current / target) * 100), 100)
    : 0
  const done = goal.key === 'weight'
    ? (current != null && current <= target)
    : (current != null && current >= target)

  return (
    <div className="bg-card border-0 shadow-premium-sm rounded-2xl p-3">
      <div className="flex items-start justify-between mb-2">
        <div className="flex items-center gap-2">
          <div className={cn('p-1.5 rounded-lg bg-muted/50', goal.color)}>
            <Icon className="w-3.5 h-3.5" />
          </div>
          <span className="text-[12px] font-medium text-foreground">{goal.label}</span>
        </div>
        {done && <CheckCircle2 className="w-4 h-4 text-kpi-emerald" />}
      </div>

      <div className="flex items-baseline gap-2 mb-2">
        <span className="text-xs font-bold font-mono text-foreground">
          {current != null ? current : '—'}
        </span>
        <span className="text-[10px] text-muted-foreground">/ {target} {goal.unit}</span>
      </div>

      <div className="h-1.5 bg-muted/60 rounded-full overflow-hidden mb-2">
        <div
          className={cn('h-full rounded-full transition-all duration-500', done ? 'bg-kpi-emerald' : 'bg-primary')}
          style={{ width: `${pct}%` }}
        />
      </div>

      <div className="flex items-center gap-2">
        <label className="text-[10px] text-muted-foreground shrink-0">Target:</label>
        <input
          type="number"
          value={target}
          min={0.1}
          step={goal.key === 'daily_water' ? 0.5 : 1}
          onChange={e => onTargetChange(parseFloat(e.target.value) || target)}
          className="w-16 px-1.5 py-0.5 text-[11px] font-mono bg-muted/50 border border-border/60 rounded text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
        />
        <span className="text-[10px] text-muted-foreground">{goal.unit}</span>
      </div>
    </div>
  )
}

function SessionCard({ session }: { session: WorkoutSessionItem }) {
  const queryClient = useQueryClient()
  const deleteMutation = useMutation({
    mutationFn: () => healthApi.deleteWorkout(session.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['health'] })
      toast.success('Workout deleted')
    },
    onError: () => toast.error('Failed to delete workout'),
  })

  const byExercise = session.sets.reduce<Record<string, typeof session.sets>>((acc, s) => {
    (acc[s.exercise] = acc[s.exercise] ?? []).push(s)
    return acc
  }, {})

  return (
    <div className="bg-card border-0 rounded-2xl shadow-sm p-3 group">
      <div className="flex items-center justify-between mb-2">
        <div>
          <span className="text-[13px] font-semibold text-foreground">{session.name}</span>
          <span className="text-[11px] text-muted-foreground ml-2">{dayjs(session.logged_at).format('ddd, MMM D')}</span>
        </div>
        <Popconfirm title="Delete this workout?" onConfirm={() => deleteMutation.mutate()} okText="Delete" okButtonProps={{ danger: true }}>
          <button className="p-1 rounded opacity-0 group-hover:opacity-100 transition text-muted-foreground hover:text-destructive" aria-label="Delete workout">
            <Trash2 size={13} />
          </button>
        </Popconfirm>
      </div>
      <div className="space-y-1.5">
        {Object.entries(byExercise).map(([ex, sets]) => (
          <div key={ex} className="flex items-baseline justify-between gap-2">
            <span className="text-[12px] font-medium text-foreground">{ex}</span>
            <span className="text-[11px] font-mono text-muted-foreground">
              {sets.map(s => s.weight_kg != null ? `${s.reps}×${s.weight_kg}kg` : `${s.reps} reps`).join(' · ')}
            </span>
          </div>
        ))}
      </div>
      {session.notes && <div className="text-[11px] text-muted-foreground mt-2">{session.notes}</div>}
    </div>
  )
}

function HabitRow({ habit }: { habit: HabitItem }) {
  const queryClient = useQueryClient()
  const checks = new Set(habit.checks)
  const days = Array.from({ length: DAYS_SHOWN }, (_, i) =>
    dayjs().subtract(DAYS_SHOWN - 1 - i, 'day').format('YYYY-MM-DD')
  )

  const toggleMutation = useMutation({
    mutationFn: (date: string) => healthApi.toggleHabit(habit.id, date),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['health', 'habits'] }),
    onError: () => toast.error('Failed to update habit'),
  })

  const deleteMutation = useMutation({
    mutationFn: () => healthApi.deleteHabit(habit.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['health', 'habits'] })
      toast.success('Habit archived')
    },
    onError: () => toast.error('Failed to archive habit'),
  })

  return (
    <div className="flex items-center justify-between gap-3 px-3 py-2 border-b border-border/40 last:border-b-0 group">
      <div className="flex items-center gap-2 min-w-0">
        <span className="text-base shrink-0">{habit.icon || '🎯'}</span>
        <div className="min-w-0">
          <div className="text-[13px] font-medium text-foreground truncate">{habit.name}</div>
          <div className="flex items-center gap-1 text-[11px] text-muted-foreground">
            <Flame size={11} className={habit.streak > 0 ? 'text-orange-500' : ''} />
            {habit.streak > 0 ? `${habit.streak} day streak` : 'No streak yet'}
          </div>
        </div>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <div className="flex gap-1">
          {days.map(d => {
            const checked = checks.has(d)
            const isToday = d === dayjs().format('YYYY-MM-DD')
            return (
              <button
                key={d}
                onClick={() => toggleMutation.mutate(d)}
                title={dayjs(d).format('ddd, MMM D')}
                aria-label={`${habit.name} on ${d}: ${checked ? 'done' : 'not done'}`}
                className={cn(
                  'w-6 h-6 rounded-md border text-[9px] font-medium transition-colors',
                  checked
                    ? 'bg-primary border-primary text-primary-foreground'
                    : 'bg-muted/40 border-border text-muted-foreground hover:border-primary/50',
                  isToday && !checked && 'border-primary/60 border-dashed',
                )}
              >
                {dayjs(d).format('dd')[0]}
              </button>
            )
          })}
        </div>
        <Popconfirm title="Archive this habit?" onConfirm={() => deleteMutation.mutate()} okText="Archive" okButtonProps={{ danger: true }}>
          <button className="p-1 rounded opacity-0 group-hover:opacity-100 transition text-muted-foreground hover:text-destructive" aria-label="Archive habit">
            <Trash2 size={12} />
          </button>
        </Popconfirm>
      </div>
    </div>
  )
}

export function FitnessTab() {
  const queryClient = useQueryClient()

  // Workout form state
  const [workoutName, setWorkoutName] = useState('')
  const [rows, setRows] = useState<SetRow[]>([{ exercise: '', reps: null, weight_kg: null }])

  // Habit form state
  const [habitName, setHabitName] = useState('')
  const [habitIcon, setHabitIcon] = useState('')

  // Goal targets
  const [targets, setTargets] = useState<Record<string, number>>(() => {
    const saved = loadGoalTargets()
    return GOALS.reduce((acc, g) => ({ ...acc, [g.key]: saved[g.key] ?? g.defaultTarget }), {} as Record<string, number>)
  })

  const { data: sessions, isLoading: loadingSessions } = useQuery({
    queryKey: ['health', 'workouts'],
    queryFn: () => healthApi.workouts(10),
  })
  const { data: prs } = useQuery({
    queryKey: ['health', 'workout-prs'],
    queryFn: healthApi.workoutPrs,
  })
  const { data: habits, isLoading: loadingHabits } = useQuery({
    queryKey: ['health', 'habits'],
    queryFn: healthApi.habits,
  })
  const { data: summary } = useQuery({ queryKey: ['health', 'summary'], queryFn: healthApi.summary })
  const { data: streak } = useQuery({ queryKey: ['health', 'streak'], queryFn: healthApi.streak })
  const { data: gymLogs } = useQuery({ queryKey: ['health', 'logs', 'gym'], queryFn: () => healthApi.logs('gym') })
  const { data: waterLogs } = useQuery({ queryKey: ['health', 'logs', 'water'], queryFn: () => healthApi.logs('water') })

  const workoutMutation = useMutation({
    mutationFn: () => healthApi.createWorkout({
      name: workoutName.trim() || 'Workout',
      sets: rows
        .filter(r => r.exercise.trim() && r.reps)
        .map(r => ({ exercise: r.exercise.trim(), reps: r.reps!, weight_kg: r.weight_kg ?? undefined })),
    }),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['health'] })
      if (res.new_prs.length > 0) {
        res.new_prs.forEach(pr => toast.success(`🏆 New PR: ${pr.exercise} ${pr.weight_kg}kg${pr.previous ? ` (was ${pr.previous}kg)` : ''}`))
      } else {
        toast.success('Workout logged')
      }
      setWorkoutName('')
      setRows([{ exercise: '', reps: null, weight_kg: null }])
    },
    onError: () => toast.error('Failed to log workout'),
  })

  const habitMutation = useMutation({
    mutationFn: () => healthApi.createHabit({ name: habitName.trim(), icon: habitIcon.trim() || undefined }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['health', 'habits'] })
      toast.success('Habit added')
      setHabitName(''); setHabitIcon('')
    },
    onError: () => toast.error('Failed to add habit'),
  })

  const handleTargetChange = (key: string, val: number) => {
    const next = { ...targets, [key]: val }
    setTargets(next)
    saveGoalTargets(next)
  }

  const validSets = rows.filter(r => r.exercise.trim() && r.reps).length
  const updateRow = (i: number, patch: Partial<SetRow>) =>
    setRows(rs => rs.map((r, idx) => idx === i ? { ...r, ...patch } : r))
  const duplicateRow = (i: number) =>
    setRows(rs => [...rs.slice(0, i + 1), { ...rs[i] }, ...rs.slice(i + 1)])

  const bestStreak = Math.max(0, ...(habits ?? []).map(h => h.streak))
  const doneToday = (habits ?? []).filter(h => h.checks.includes(dayjs().format('YYYY-MM-DD'))).length

  const rail = (
    <>
      <RailHeading>Log Workout</RailHeading>
      <GlassCard hoverable fadeIn="up" contentClassName="space-y-2">
        <Input size="small" placeholder="Session name — Push Day, Legs…" value={workoutName} onChange={e => setWorkoutName(e.target.value)} />
        <div className="space-y-1.5">
          {rows.map((row, i) => (
            <div key={i} className="flex gap-1.5 items-center">
              <AutoComplete
                className="flex-1"
                size="small"
                placeholder="Exercise"
                value={row.exercise}
                onChange={v => updateRow(i, { exercise: v })}
                options={COMMON_EXERCISES.filter(e => e.toLowerCase().includes(row.exercise.toLowerCase())).map(e => ({ value: e }))}
              />
              <InputNumber size="small" placeholder="Reps" min={1} className="w-14" value={row.reps} onChange={v => updateRow(i, { reps: v })} />
              <InputNumber size="small" placeholder="kg" min={0} step={2.5} className="w-16" value={row.weight_kg} onChange={v => updateRow(i, { weight_kg: v })} />
              {rows.length > 1 && (
                <Button size="small" type="text" onClick={() => setRows(rs => rs.filter((_, idx) => idx !== i))} aria-label="Remove set">
                  <X size={12} />
                </Button>
              )}
            </div>
          ))}
        </div>
        <div className="flex items-center justify-between">
          <Button size="small" type="dashed" onClick={() => setRows(rs => [...rs, { exercise: '', reps: null, weight_kg: null }])}>
            + Add set
          </Button>
          <Button size="small" type="primary" disabled={validSets === 0} loading={workoutMutation.isPending} onClick={() => workoutMutation.mutate()}>
            Save {validSets > 0 ? `(${validSets})` : ''}
          </Button>
        </div>
      </GlassCard>

      <RailHeading>New Habit</RailHeading>
      <GlassCard hoverable fadeIn="up" contentClassName="space-y-2">
        <div className="flex gap-1.5">
          <Input
            size="small"
            placeholder="Habit — Meditate, Read…"
            value={habitName}
            onChange={e => setHabitName(e.target.value)}
            onPressEnter={() => habitName.trim() && habitMutation.mutate()}
          />
          <Input size="small" placeholder="🧘" value={habitIcon} onChange={e => setHabitIcon(e.target.value)} className="!w-12 text-center" maxLength={2} />
        </div>
        <Button size="small" type="primary" block icon={<Plus size={13} />} disabled={!habitName.trim()} loading={habitMutation.isPending} onClick={() => habitMutation.mutate()}>
          Add Habit
        </Button>
      </GlassCard>
    </>
  )

  return (
    <WorkspaceLayout rail={rail}>
      <div className="space-y-4">
        {/* Goals */}
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Target className="w-3.5 h-3.5 text-muted-foreground" />
            <span className="text-[11px] text-muted-foreground">Fitness Goals — targets saved locally</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {GOALS.map(goal => {
              const logs = goal.key === 'daily_water' ? waterLogs : goal.key === 'weekly_gym' ? gymLogs : undefined
              const current = goal.getValue(summary as Record<string, unknown> | undefined, streak as Record<string, unknown> | undefined, logs as Record<string, unknown>[] | undefined)
              return (
                <GoalCard
                  key={goal.key}
                  goal={goal}
                  current={current}
                  target={targets[goal.key]}
                  onTargetChange={val => handleTargetChange(goal.key, val)}
                />
              )
            })}
          </div>
        </div>

        {/* PRs */}
        {prs && prs.length > 0 && (
          <div className="bg-card border-0 rounded-2xl shadow-premium-sm p-3">
            <div className="flex items-center gap-2 mb-2">
              <Trophy size={14} className="text-amber-500" />
              <h2 className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Personal Records</h2>
            </div>
            <div className="flex flex-wrap gap-2">
              {prs.slice(0, 8).map(pr => (
                <Tag key={pr.exercise} color="gold">{pr.exercise} — {pr.weight_kg}kg × {pr.reps}</Tag>
              ))}
            </div>
          </div>
        )}

        {/* Habits */}
        <div>
          <div className="grid grid-cols-3 gap-3 mb-2">
            {[
              { label: 'Habits', value: String(habits?.length ?? 0) },
              { label: 'Done Today', value: `${doneToday}/${habits?.length ?? 0}` },
              { label: 'Best Streak', value: bestStreak > 0 ? `${bestStreak}d` : '—' },
            ].map(c => (
              <div key={c.label} className="bg-card border-0 shadow-premium-sm rounded-2xl p-2.5 text-center">
                <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">{c.label}</p>
                <p className="text-lg font-semibold text-foreground font-mono tracking-tight mt-0.5">{c.value}</p>
              </div>
            ))}
          </div>
          <div className="bg-card border-0 rounded-2xl shadow-premium-sm overflow-hidden">
            {loadingHabits ? (
              <div className="p-3 space-y-2">
                {[1, 2, 3].map(i => <Skeleton key={i} className="h-10 w-full" />)}
              </div>
            ) : !habits?.length ? (
              <EmptyState icon={Repeat} title="No habits yet" description="Add a daily habit in the rail and build your streaks." />
            ) : (
              habits.map(h => <HabitRow key={h.id} habit={h} />)
            )}
          </div>
        </div>

        {/* Workout sessions */}
        <div>
          <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide mb-2">Recent Workouts</p>
          {loadingSessions ? (
            <div className="space-y-3">
              {[1, 2].map(i => <Skeleton key={i} className="h-[100px] rounded-xl" />)}
            </div>
          ) : !sessions?.length ? (
            <EmptyState icon={Dumbbell} title="No workouts logged" description="Log your first session in the rail with exercises, sets and weights." />
          ) : (
            <div className="space-y-3">
              {sessions.map(s => <SessionCard key={s.id} session={s} />)}
            </div>
          )}
        </div>
      </div>
    </WorkspaceLayout>
  )
}
