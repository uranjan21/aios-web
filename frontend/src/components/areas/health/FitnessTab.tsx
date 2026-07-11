// @ts-nocheck
import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Popconfirm } from '@/components/ui/Popconfirm'
import { Button, Input, Badge, Dialog, SegmentedControl, HeaderActionPortal, Select } from '@ledgr/ui'
import { toast } from 'sonner'
import dayjs from 'dayjs'
import { Plus, Trash2, Dumbbell, Trophy, X, Target, Droplets, Scale, CheckCircle2, Flame, Repeat } from 'lucide-react'
import { healthApi } from '@/api/areas'
import { Skeleton } from '@/components/ui/skeleton'
import { EmptyState } from '@ledgr/ui'
import type { WorkoutSessionItem, HabitItem } from '@/types'
import { Card as GlassCard } from '@ledgr/ui';
import { KpiCard, KpiGrid } from '@ledgr/ui';
import { WorkspaceLayout } from '@/components/layout/WorkspaceLayout'

import styled from 'styled-components'

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
    color: 'var(--primary)',
    getValue: (summary) => summary?.weight != null ? Number(summary.weight) : null,
  },
  {
    key: 'weekly_gym',
    label: 'Weekly Sessions',
    unit: 'sessions/week',
    defaultTarget: 5,
    icon: Dumbbell,
    color: '#F8D168',
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
    color: '#F4A261',
    getValue: (_, __, waterLogs) => {
      if (!waterLogs) return null
      const today = new Date().toISOString().slice(0, 10)
      const todayLogs = waterLogs.filter(l => String(l.logged_at).startsWith(today))
      return todayLogs.reduce((s, l) => s + Number(l.value ?? 0), 0)
    },
  },
]



function GoalCard({ goal, current, target }: {
  goal: Goal
  current: number | null
  target: number
}) {
  const done = goal.key === 'weight'
    ? (current != null && current <= target)
    : (current != null && current >= target)

  return (
    <KpiCard
      label={goal.label}
      icon={goal.icon}
      action={done ? <CheckCircle2 size={16} style={{ color: 'var(--primary)' }} /> : undefined}
      value={`${current != null ? current : '—'} / ${target} ${goal.unit}`}
    />
  )
}

const StyledSessionCardHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 0.5rem;
`;

const StyledSessionCardTitle = styled.span`
  font-size: 13px;
  font-weight: 600;
  color: ${({ theme }) => theme.color?.foreground || 'var(--foreground)'};
`;

const StyledSessionCardDate = styled.span`
  font-size: 11px;
  color: ${({ theme }) => theme.color?.mutedForeground || 'var(--muted-foreground)'};
  margin-left: 0.5rem;
`;

const StyledDeleteButton = styled.button`
  padding: 0.25rem;
  border-radius: 0.25rem;
  background: none;
  border: none;
  cursor: pointer;
  color: ${({ theme }) => theme.color?.mutedForeground || 'var(--muted-foreground)'};
  opacity: 0;
  transition: opacity 0.2s, color 0.2s;
  
  .glass-card:hover & {
    opacity: 1;
  }
  
  &:hover {
    color: ${({ theme }) => theme.color?.destructive || 'var(--destructive)'};
  }
  
  &:focus-visible {
    outline: none;
    box-shadow: 0 0 0 2px var(--primary);
    opacity: 1;
  }
`;

const StyledSessionSetsWrapper = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.375rem;
`;

const StyledSessionSetRow = styled.div`
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 0.5rem;
`;

const StyledSessionSetExercise = styled.span`
  font-size: 12px;
  font-weight: 500;
  color: ${({ theme }) => theme.color?.foreground || 'var(--foreground)'};
`;

const StyledSessionSetDetails = styled.span`
  font-size: 11px;
  color: ${({ theme }) => theme.color?.mutedForeground || 'var(--muted-foreground)'};
`;

const StyledSessionNotes = styled.div`
  font-size: 11px;
  color: ${({ theme }) => theme.color?.mutedForeground || 'var(--muted-foreground)'};
  margin-top: 0.5rem;
`;

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
    <GlassCard
      className="glass-card"
      size="sm"
      title={session.name}
      subtitle={dayjs(session.logged_at).format('ddd, MMM D')}
      icon={<Dumbbell size={16} />}
      action={
        <Popconfirm title="Delete this workout?" onConfirm={() => deleteMutation.mutate()} okText="Delete" okButtonProps={{ danger: true }}>
          <StyledDeleteButton aria-label="Delete workout">
            <Trash2 size={13} />
          </StyledDeleteButton>
        </Popconfirm>
      }
    >
      <StyledSessionSetsWrapper>
        {Object.entries(byExercise).map(([ex, sets]) => (
          <StyledSessionSetRow key={ex}>
            <StyledSessionSetExercise>{ex}</StyledSessionSetExercise>
            <StyledSessionSetDetails>
              {sets.map(s => s.weight_kg != null ? `${s.reps}×${s.weight_kg}kg` : `${s.reps} reps`).join(' · ')}
            </StyledSessionSetDetails>
          </StyledSessionSetRow>
        ))}
      </StyledSessionSetsWrapper>
      {session.notes && <StyledSessionNotes>{session.notes}</StyledSessionNotes>}
    </GlassCard>
  )
}

const StyledHabitRowWrapper = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  padding: 0.5rem 20px;
  border-bottom: 1px solid rgba(45, 49, 58, 0.15);
  
  &:last-child {
    border-bottom: 0;
  }
`;

const StyledHabitInfo = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  min-width: 0;
`;

const StyledHabitIcon = styled.span`
  font-size: 1rem;
  flex-shrink: 0;
`;

const StyledHabitDetails = styled.div`
  min-width: 0;
`;

const StyledHabitName = styled.div`
  font-size: 13px;
  font-weight: 500;
  color: ${({ theme }) => theme.color?.foreground || 'var(--foreground)'};
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`;

const StyledHabitStreak = styled.div`
  display: flex;
  align-items: center;
  gap: 0.25rem;
  font-size: 11px;
  color: ${({ theme }) => theme.color?.mutedForeground || 'var(--muted-foreground)'};
`;

const StyledHabitActions = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  flex-shrink: 0;
`;

const StyledHabitDaysWrapper = styled.div`
  display: flex;
  gap: 0.25rem;
`;

const StyledHabitDayButton = styled.button<{ $checked?: boolean; $isToday?: boolean }>`
  width: 1.5rem;
  height: 1.5rem;
  border-radius: 0.375rem;
  font-size: 9px;
  font-weight: 500;
  transition: background-color 0.2s, border-color 0.2s, color 0.2s;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0;
  cursor: pointer;
  border: 1px solid ${({ $checked, $isToday, theme }) => 
    $checked ? 'var(--primary)' : 
    $isToday ? 'var(--accent)' : 
    $checked ? 'var(--primary)' : 'transparent'};
  background-color: ${({ $checked }) => $checked ? 'var(--primary)' : 'var(--muted)'};
  color: ${({ $checked, theme }) => $checked ? 'var(--primary-foreground)' : (theme.color?.mutedForeground || 'var(--muted-foreground)')};
  border-style: ${({ $isToday, $checked }) => ($isToday && !$checked) ? 'dashed' : 'solid'};
  
  &:hover {
    border-color: ${({ $checked }) => $checked ? 'var(--primary)' : 'var(--accent)'};
  }

  &:focus-visible {
    outline: 2px solid ${({ theme }) => theme.color?.ring || '#CA8A04'};
    outline-offset: 1px;
  }
`;

const StyledHabitDeleteButton = styled.button`
  padding: 0.25rem;
  border-radius: 0.25rem;
  background: none;
  border: none;
  cursor: pointer;
  color: ${({ theme }) => theme.color?.mutedForeground || 'var(--muted-foreground)'};
  opacity: 0;
  transition: opacity 0.2s, color 0.2s;
  
  ${StyledHabitRowWrapper}:hover & {
    opacity: 1;
  }
  
  &:hover {
    color: ${({ theme }) => theme.color?.destructive || 'var(--destructive)'};
  }
  
  &:focus-visible {
    outline: none;
    box-shadow: 0 0 0 2px var(--primary);
    opacity: 1;
  }
`;

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
    <StyledHabitRowWrapper>
      <StyledHabitInfo>
        <StyledHabitIcon>{habit.icon || <Target size={12} />}</StyledHabitIcon>
        <StyledHabitDetails>
          <StyledHabitName>{habit.name}</StyledHabitName>
          <StyledHabitStreak>
            <Flame size={11} style={{ color: habit.streak > 0 ? 'var(--accent)' : 'inherit' }} />
            {habit.streak > 0 ? `${habit.streak} day streak` : 'No streak yet'}
          </StyledHabitStreak>
        </StyledHabitDetails>
      </StyledHabitInfo>
      <StyledHabitActions>
        <StyledHabitDaysWrapper>
          {days.map(d => {
            const checked = checks.has(d)
            const isToday = d === dayjs().format('YYYY-MM-DD')
            return (
              <StyledHabitDayButton
                key={d}
                onClick={() => toggleMutation.mutate(d)}
                title={dayjs(d).format('ddd, MMM D')}
                aria-label={`${habit.name} on ${d}: ${checked ? 'done' : 'not done'}`}
                $checked={checked}
                $isToday={isToday}
              >
                {dayjs(d).format('dd')[0]}
              </StyledHabitDayButton>
            )
          })}
        </StyledHabitDaysWrapper>
        <Popconfirm title="Archive this habit?" onConfirm={() => deleteMutation.mutate()} okText="Archive" okButtonProps={{ danger: true }}>
          <StyledHabitDeleteButton aria-label="Archive habit">
            <Trash2 size={12} />
          </StyledHabitDeleteButton>
        </Popconfirm>
      </StyledHabitActions>
    </StyledHabitRowWrapper>
  )
}

const StyledContainer = styled.div`
  display: flex;
  flex-direction: column;
  gap: 1rem;
`;

const StyledSectionHeader = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 0.5rem;
`;

const StyledSectionTitle = styled.span`
  font-size: 11px;
  color: ${({ theme }) => theme.color?.mutedForeground || 'var(--muted-foreground)'};
`;

const StyledBadgesWrapper = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
`;

const StyledListWrapper = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
`;

const StyledPrHeader = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 0.5rem;
`;

const StyledPrTitle = styled.h2`
  font-size: 11px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.025em;
  color: ${({ theme }) => theme.color?.mutedForeground || 'var(--muted-foreground)'};
  margin: 0;
`;

const StyledHabitsStatsLabel = styled.p`
  font-size: 10px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.025em;
  color: ${({ theme }) => theme.color?.mutedForeground || 'var(--muted-foreground)'};
  margin: 0;
`;

const StyledHabitsStatsValue = styled.p`
  font-size: 12px;
  font-weight: 500;
  color: ${({ theme }) => theme.color?.foreground || 'var(--foreground)'};
  letter-spacing: -0.01em;
  margin: 0.125rem 0 0 0;
`;

const StyledWorkoutsHeader = styled.p`
  font-size: 11px;
  font-weight: 600;
  color: ${({ theme }) => theme.color?.mutedForeground || 'var(--muted-foreground)'};
  text-transform: uppercase;
  letter-spacing: 0.025em;
  margin: 0 0 0.5rem 0;
`;

const StyledModalContent = styled.div`
  display: flex;
  flex-direction: column;
  gap: 1rem;
`;

const StyledSegmentedControlWrapper = styled.div`
  margin-bottom: 0.5rem;
  width: 100%;
  display: flex;
  & > * {
    flex: 1;
    display: flex;
  }
  & > * > button {
    flex: 1;
  }
`;

const StyledFormWrapper = styled.div`
  display: flex;
  flex-direction: column;
  gap: 1rem;
`;

const StyledSetsWrapper = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.375rem;
`;

const StyledSetRow = styled.div`
  display: flex;
  gap: 0.375rem;
  align-items: center;
`;

const StyledExerciseInputWrapper = styled.div`
  flex: 1;
  position: relative;
`;

const StyledFormActions = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: 0.5rem;
`;

const StyledHabitFormRow = styled.div`
  display: flex;
  gap: 0.375rem;
`;

const StyledButtonContent = styled.span`
  display: flex;
  align-items: center;
  gap: 0.375rem;
`;

const StyledDivider = styled.div`
  width: 1px;
  height: 1rem;
  background-color: ${({ theme }) => theme.color?.border || 'var(--border)'};
  margin: 0 0.25rem;
  opacity: 0.6;
  
  @media (max-width: 768px) {
    display: none;
  }
`;

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
