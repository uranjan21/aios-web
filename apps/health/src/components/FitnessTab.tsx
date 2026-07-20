import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Button, Input, Badge, Dialog, SegmentedControl, HeaderActionPortal, Select, EmptyState, Card as GlassCard, KpiCard, KpiGrid } from '@ledgr/ui'
import { toast } from 'sonner'
import dayjs from 'dayjs'
import { Plus, Dumbbell, Trophy, X, Target, CheckCircle2, Flame, Repeat } from 'lucide-react'
import { healthApi } from '@aios/shared/api/areas'
import { Skeleton } from '@aios/shared/components/ui/skeleton'
import { WorkspaceLayout } from '@aios/shared/components/layout/WorkspaceLayout'

import { COMMON_EXERCISES } from './fitness/constants'
import { GOALS } from './fitness/goals'
import { GoalCard } from './fitness/GoalCard'
import { SessionCard } from './fitness/SessionCard'
import { HabitRow } from './fitness/HabitRow'
import {
  StyledContainer,
  StyledSectionHeader,
  StyledSectionTitle,
  StyledBadgesWrapper,
  StyledListWrapper,
  StyledModalContent,
  StyledSegmentedControlWrapper,
  StyledFormWrapper,
  StyledSetsWrapper,
  StyledSetRow,
  StyledExerciseInputWrapper,
  StyledFormActions,
  StyledHabitFormRow,
  StyledButtonContent,
} from './fitness/FitnessTab.styles'

type SetRow = { exercise: string; reps: number | null; weight_kg: number | null }

export function FitnessTab() {
  const queryClient = useQueryClient()

  // Workout form state
  const [workoutName, setWorkoutName] = useState('')
  const [rows, setRows] = useState<SetRow[]>([{ exercise: '', reps: null, weight_kg: null }])

  // Habit form state
  const [habitName, setHabitName] = useState('')
  const [habitIcon, setHabitIcon] = useState('')

  // Goal targets
  const { data: goalsData } = useQuery({ queryKey: ['health', 'goals'], queryFn: healthApi.healthGoals })

  const goalTargets = {
    weight: goalsData?.target_weight ?? GOALS[0].defaultTarget,
    weekly_gym: goalsData?.target_workouts_per_week ?? GOALS[1].defaultTarget,
    daily_water: goalsData?.target_water_l_per_day ?? GOALS[2].defaultTarget,
  }

  const [prLimit, setPrLimit] = useState<number>(8)
  const [workoutLimit, setWorkoutLimit] = useState<number>(10)

  const { data: sessions, isLoading: loadingSessions } = useQuery({
    queryKey: ['health', 'workouts'],
    queryFn: () => healthApi.workouts(20),
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

  const validSets = rows.filter(r => r.exercise.trim() && r.reps).length
  const updateRow = (i: number, patch: Partial<SetRow>) =>
    setRows(rs => rs.map((r, idx) => idx === i ? { ...r, ...patch } : r))
  const duplicateRow = (i: number) =>
    setRows(rs => [...rs.slice(0, i + 1), { ...rs[i] }, ...rs.slice(i + 1)])

  const bestStreak = Math.max(0, ...(habits ?? []).map(h => h.streak))
  const doneToday = (habits ?? []).filter(h => h.checks.includes(dayjs().format('YYYY-MM-DD'))).length

  const [logModalOpen, setLogModalOpen] = useState(false)
  const [logType, setLogType] = useState<'workout' | 'habit'>('workout')
  const [habitFilter, setHabitFilter] = useState<'all' | 'done' | 'pending'>('all')

  useEffect(() => {
    const handleOpen = () => setLogModalOpen(true)
    window.addEventListener('open-new-workout', handleOpen)
    return () => window.removeEventListener('open-new-workout', handleOpen)
  }, [])

  return (
    <>
    <WorkspaceLayout rail={undefined}>
      <HeaderActionPortal>
        <Button size="sm" variant="primary" onClick={() => setLogModalOpen(true)}>
          <Plus size={12} style={{ marginRight: 4 }} /> Log Workout
        </Button>
      </HeaderActionPortal>
      <StyledContainer>
        {/* Goals */}
        <div>
          <StyledSectionHeader>
            <Target style={{ width: '14px', height: '14px', color: 'var(--muted-foreground)' }} />
            <StyledSectionTitle>Fitness Goals — edit targets in Settings</StyledSectionTitle>
          </StyledSectionHeader>
          <KpiGrid $cols={3}>
            {GOALS.map(goal => {
              const logs = goal.key === 'daily_water' ? waterLogs : goal.key === 'weekly_gym' ? gymLogs : undefined
              const current = goal.getValue(summary as Record<string, unknown> | undefined, streak as Record<string, unknown> | undefined, logs as Record<string, unknown>[] | undefined)
              return (
                <GoalCard
                  key={goal.key}
                  goal={goal}
                  current={current}
                  target={goalTargets[goal.key as keyof typeof goalTargets]}
                />
              )
            })}
          </KpiGrid>
        </div>

        {/* PRs */}
        {prs && prs.length > 0 && (
          <GlassCard
            title="Personal Records"
            subtitle="Top lifts logged across every workout session"
            icon={<Trophy size={16} />}
            action={
              <div onClick={(e) => e.stopPropagation()}>
                <Select
                  size="sm"
                  value={String(prLimit)}
                  onChange={(val: any) => setPrLimit(Number(val))}
                  options={[
                    { value: '5', label: 'Top 5 Lifts' },
                    { value: '8', label: 'Top 8 Lifts' },
                    { value: '15', label: 'Top 15 Lifts' },
                  ]}
                />
              </div>
            }
            size="sm"
            style={{ padding: '0.75rem' }}
          >
            <StyledBadgesWrapper>
              {prs.slice(0, prLimit).map(pr => (
                <Badge key={pr.exercise} tone="warning">{pr.exercise} — {pr.weight_kg}kg × {pr.reps}</Badge>
              ))}
            </StyledBadgesWrapper>
          </GlassCard>
        )}

        {/* Habits */}
        <div>
          <KpiGrid $cols={3}>
            <KpiCard
              label="Habits"
              icon={Repeat}
              sub="Total habits monitored"
              loading={loadingHabits}
              value={String(habits?.length ?? 0)}
            />
            <KpiCard
              label="Done Today"
              icon={CheckCircle2}
              sub="Habits checked today"
              loading={loadingHabits}
              value={`${doneToday}/${habits?.length ?? 0}`}
            />
            <KpiCard
              label="Best Streak"
              icon={Flame}
              color="primary"
              sub="Highest habit streak"
              loading={loadingHabits}
              value={`${bestStreak} days`}
            />
          </KpiGrid>
          <GlassCard
            title="Daily Habits"
            subtitle="Toggle each day; build streaks over time"
            icon={<Repeat size={16} />}
            action={
              <SegmentedControl
                size="sm"
                aria-label="Filter habits by today's status"
                value={habitFilter}
                onChange={(v) => setHabitFilter(v as typeof habitFilter)}
                options={[
                  { value: 'all', label: 'All' },
                  { value: 'done', label: 'Done' },
                  { value: 'pending', label: 'Pending' },
                ]}
              />
            }
            size="none"
            style={{ overflow: 'hidden' }}
          >
            {loadingHabits ? (
              <div style={{ padding: '0.75rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {[1, 2, 3].map(i => <Skeleton key={i} style={{ height: '2.5rem', width: '100%' }} />)}
              </div>
            ) : !habits?.length ? (
              <EmptyState
                icon={<Repeat size={24} />}
                title="No habits yet"
                description="Add a daily habit and build your streaks."
                action={
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => {
                      setLogType('habit')
                      setLogModalOpen(true)
                    }}
                  >
                    Add Entry
                  </Button>
                }
              />
            ) : (
              habits
                .filter(h => {
                  if (habitFilter === 'all') return true
                  const today = dayjs().format('YYYY-MM-DD')
                  const doneToday = h.checks?.includes(today) ?? false
                  return habitFilter === 'done' ? doneToday : !doneToday
                })
                .map(h => <HabitRow key={h.id} habit={h} />)
            )}
          </GlassCard>
        </div>

        {/* Workout sessions */}
        <GlassCard
          title="Recent Workouts"
          subtitle="Browse your recently completed workouts and exercises"
          icon={<Dumbbell size={16} />}
          action={
            <div onClick={(e) => e.stopPropagation()}>
              <Select
                size="sm"
                value={String(workoutLimit)}
                onChange={(val: any) => setWorkoutLimit(Number(val))}
                options={[
                  { value: '5', label: 'Last 5 Sessions' },
                  { value: '10', label: 'Last 10 Sessions' },
                  { value: '20', label: 'Last 20 Sessions' },
                ]}
              />
            </div>
          }
        >
          {loadingSessions ? (
            <StyledListWrapper style={{ padding: '0.75rem' }}>
              {[1, 2].map(i => <Skeleton key={i} style={{ height: '100px', borderRadius: '0.75rem', width: '100%' }} />)}
            </StyledListWrapper>
          ) : !sessions?.length ? (
            <EmptyState
              icon={<Dumbbell size={24} />}
              title="No workouts logged"
              description="Log your first session with exercises, sets and weights."
              action={
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => {
                    setLogType('workout')
                    setLogModalOpen(true)
                  }}
                >
                  Log Workout
                </Button>
              }
            />
          ) : (
            <StyledListWrapper style={{ padding: '0.75rem' }}>
              {sessions.slice(0, workoutLimit).map(s => <SessionCard key={s.id} session={s} />)}
            </StyledListWrapper>
          )}
        </GlassCard>
      </StyledContainer>
    </WorkspaceLayout>

    <Dialog open={logModalOpen} onOpenChange={setLogModalOpen} title="Log Fitness Activity">
      <StyledModalContent>
        <StyledSegmentedControlWrapper>
          <SegmentedControl
            options={[
              { label: 'Log Workout', value: 'workout' },
              { label: 'New Habit', value: 'habit' },
            ]}
            value={logType}
            onChange={v => setLogType(v as any)}
            style={{ width: '100%', display: 'flex' }}
          />
        </StyledSegmentedControlWrapper>

        {logType === 'workout' && (
          <StyledFormWrapper>
            <Input placeholder="Session name — Push Day, Legs…" value={workoutName} onChange={e => setWorkoutName(e.target.value)} aria-label="Workout session name" />
            <StyledSetsWrapper>
              {rows.map((row, i) => (
                <StyledSetRow key={i}>
                  <StyledExerciseInputWrapper>
                    <Input
                      size="sm"
                      placeholder="Exercise"
                      list={`exercises-${i}`}
                      value={row.exercise}
                      onChange={(e: any) => updateRow(i, { exercise: e.target.value })}
                      aria-label="Exercise name"
                    />
                    <datalist id={`exercises-${i}`}>
                      {COMMON_EXERCISES.map(e => <option key={e} value={e} />)}
                    </datalist>
                  </StyledExerciseInputWrapper>
                  <Input type="number" size="sm" placeholder="Reps" min={1} style={{ width: '3.5rem' }} value={row.reps ?? ''} onChange={(e: any) => updateRow(i, { reps: e.target.value ? Number(e.target.value) : null })} aria-label="Reps" />
                  <Input type="number" size="sm" placeholder="kg" min={0} step={2.5} style={{ width: '4rem' }} value={row.weight_kg ?? ''} onChange={(e: any) => updateRow(i, { weight_kg: e.target.value ? Number(e.target.value) : null })} aria-label="Weight in kg" />
                  {rows.length > 1 && (
                    <Button size="icon" variant="ghost" onClick={() => setRows(rs => rs.filter((_, idx) => idx !== i))} aria-label="Remove set">
                      <X size={12} />
                    </Button>
                  )}
                </StyledSetRow>
              ))}
            </StyledSetsWrapper>
            <StyledFormActions>
              <Button size="sm" variant="outline" onClick={() => setRows(rs => [...rs, { exercise: '', reps: null, weight_kg: null }])}>
                + Add set
              </Button>
              <Button size="sm" variant="primary" disabled={validSets === 0 || workoutMutation.isPending} onClick={() => workoutMutation.mutate()}>
                Save {validSets > 0 ? `(${validSets})` : ''}
              </Button>
            </StyledFormActions>
          </StyledFormWrapper>
        )}

        {logType === 'habit' && (
          <StyledFormWrapper>
            <StyledHabitFormRow>
              <Input
                placeholder="Habit — Meditate, Read…"
                value={habitName}
                onChange={e => setHabitName(e.target.value)}
                onKeyDown={(e) => { if(e.key === 'Enter') { habitName.trim() && habitMutation.mutate() } }}
                style={{ flex: 1 }}
                aria-label="Habit name"
              />
              <Input placeholder="Icon" value={habitIcon} onChange={e => setHabitIcon(e.target.value)} style={{ width: '3rem', textAlign: 'center' }} maxLength={2} aria-label="Habit emoji icon" />
            </StyledHabitFormRow>
            <Button size="sm" variant="primary" style={{ width: '100%', marginTop: '0.5rem' }} disabled={!habitName.trim() || habitMutation.isPending} onClick={() => habitMutation.mutate()}>
              <StyledButtonContent>
                <Plus size={13} />
                Add Habit
              </StyledButtonContent>
            </Button>
          </StyledFormWrapper>
        )}
      </StyledModalContent>
    </Dialog>
    </>
  )
}
