import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Button, Input, InputNumber, Popconfirm, Tag, AutoComplete } from 'antd'
import { toast } from 'sonner'
import dayjs from 'dayjs'
import { Plus, Trash2, Dumbbell, Trophy, X } from 'lucide-react'
import { healthApi } from '@/api/areas'
import { Skeleton } from '@/components/ui/skeleton'
import { EmptyState } from '@/components/EmptyState'
import type { WorkoutSessionItem } from '@/types'

const COMMON_EXERCISES = [
  'Bench Press', 'Incline Bench Press', 'Squat', 'Deadlift', 'Overhead Press',
  'Barbell Row', 'Lat Pulldown', 'Pull Up', 'Dip', 'Bicep Curl', 'Tricep Pushdown',
  'Leg Press', 'Leg Curl', 'Leg Extension', 'Calf Raise', 'Lateral Raise',
  'Romanian Deadlift', 'Hip Thrust', 'Cable Fly', 'Face Pull',
]

type SetRow = { exercise: string; reps: number | null; weight_kg: number | null }

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
    <div className="bg-card border border-border rounded-xl shadow-sm p-4 group">
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

export function WorkoutsTab() {
  const queryClient = useQueryClient()
  const [showForm, setShowForm] = useState(false)
  const [name, setName] = useState('')
  const [rows, setRows] = useState<SetRow[]>([{ exercise: '', reps: null, weight_kg: null }])

  const { data: sessions, isLoading } = useQuery({
    queryKey: ['health', 'workouts'],
    queryFn: () => healthApi.workouts(10),
  })
  const { data: prs } = useQuery({
    queryKey: ['health', 'workout-prs'],
    queryFn: healthApi.workoutPrs,
  })

  const createMutation = useMutation({
    mutationFn: () => healthApi.createWorkout({
      name: name.trim() || 'Workout',
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
      setName(''); setRows([{ exercise: '', reps: null, weight_kg: null }]); setShowForm(false)
    },
    onError: () => toast.error('Failed to log workout'),
  })

  const validSets = rows.filter(r => r.exercise.trim() && r.reps).length
  const updateRow = (i: number, patch: Partial<SetRow>) =>
    setRows(rs => rs.map((r, idx) => idx === i ? { ...r, ...patch } : r))
  const duplicateRow = (i: number) =>
    setRows(rs => [...rs.slice(0, i + 1), { ...rs[i] }, ...rs.slice(i + 1)])

  return (
    <div className="max-w-2xl space-y-4">
      {/* PRs */}
      {prs && prs.length > 0 && (
        <div className="bg-card border border-border rounded-xl shadow-sm p-4">
          <div className="flex items-center gap-2 mb-2">
            <Trophy size={14} className="text-amber-500" />
            <h2 className="text-[12px] font-semibold uppercase tracking-wide text-muted-foreground">Personal Records</h2>
          </div>
          <div className="flex flex-wrap gap-2">
            {prs.slice(0, 8).map(pr => (
              <Tag key={pr.exercise} color="gold">{pr.exercise} — {pr.weight_kg}kg × {pr.reps}</Tag>
            ))}
          </div>
        </div>
      )}

      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Workout Log</span>
        <Button type="primary" size="small" icon={<Plus size={13} />} onClick={() => setShowForm(s => !s)}>
          Log Workout
        </Button>
      </div>

      {showForm && (
        <div className="bg-muted/40 border border-border/60 rounded-xl p-4 space-y-3">
          <Input placeholder="Session name — Push Day, Legs…" value={name} onChange={e => setName(e.target.value)} />
          <div className="space-y-2">
            {rows.map((row, i) => (
              <div key={i} className="flex gap-2 items-center">
                <AutoComplete
                  className="flex-1"
                  placeholder="Exercise"
                  value={row.exercise}
                  onChange={v => updateRow(i, { exercise: v })}
                  options={COMMON_EXERCISES.filter(e => e.toLowerCase().includes(row.exercise.toLowerCase())).map(e => ({ value: e }))}
                />
                <InputNumber placeholder="Reps" min={1} className="w-20" value={row.reps} onChange={v => updateRow(i, { reps: v })} />
                <InputNumber placeholder="kg" min={0} step={2.5} className="w-24" value={row.weight_kg} onChange={v => updateRow(i, { weight_kg: v })} />
                <Button size="small" type="text" onClick={() => duplicateRow(i)} title="Duplicate set">⧉</Button>
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
            <div className="flex gap-2">
              <Button size="small" type="text" onClick={() => setShowForm(false)}>Cancel</Button>
              <Button size="small" type="primary" disabled={validSets === 0} loading={createMutation.isPending} onClick={() => createMutation.mutate()}>
                Save {validSets > 0 ? `(${validSets} sets)` : ''}
              </Button>
            </div>
          </div>
        </div>
      )}

      {isLoading ? (
        <div className="space-y-3">
          {[1, 2].map(i => <Skeleton key={i} className="h-[120px] rounded-xl" />)}
        </div>
      ) : !sessions?.length ? (
        <EmptyState icon={Dumbbell} title="No workouts logged" description="Log your first session with exercises, sets and weights." />
      ) : (
        <div className="space-y-3">
          {sessions.map(s => <SessionCard key={s.id} session={s} />)}
        </div>
      )}
    </div>
  )
}
