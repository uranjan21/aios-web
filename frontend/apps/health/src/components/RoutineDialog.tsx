/**
 * Create or edit a workout routine — the PLAN side of Health.
 *
 * A routine is a named template, the exercises it prescribes, and the weekdays
 * it is meant to happen on. The weekly pattern is what makes adherence
 * derivable without materialising a row per future date.
 *
 * Targets are optional throughout. "Bench Press" with no numbers is a real
 * plan, and demanding a target weight on day one would make this unusable for
 * anyone who does not already know theirs.
 */
import { useEffect, useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import styled from 'styled-components'
import { Button, Dialog, Input } from '@ledgr/ui'
import { Dumbbell, Plus, Trash2 } from 'lucide-react'
import { healthApi, type WorkoutRoutine, type RoutinePayload } from '@ct/shared/api/areas'
import { Popconfirm } from '@ct/shared/components/ui/Popconfirm'

/** 0 = Monday, matching the backend's date.weekday(). */
const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

const Form = styled.form`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.spacing[3]};
  margin-top: ${({ theme }) => theme.spacing[3]};
`

const Label = styled.label`
  font-size: ${({ theme }) => theme.typography.fontSize.xs};
  color: ${({ theme }) => theme.color.mutedForeground};
  margin-bottom: ${({ theme }) => theme.spacing[1]};
  display: block;
`

const DayRow = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: ${({ theme }) => theme.spacing[2]};
`

/* Toggle chips rather than a multi-select: seven options that all need to be
   visible at once, and the shape mirrors the week itself. */
const DayChip = styled.button<{ $on: boolean }>`
  min-width: 44px;
  height: 32px;
  padding: 0 ${({ theme }) => theme.spacing[3]};
  border-radius: ${({ theme }) => theme.radii.sm};
  border: 1px solid ${({ theme, $on }) => ($on ? theme.color.accent : theme.color.border)};
  background: ${({ theme, $on }) => ($on ? theme.color.accent : 'transparent')};
  color: ${({ theme, $on }) => ($on ? theme.color.accentForeground : theme.color.foreground)};
  font-size: ${({ theme }) => theme.typography.fontSize.xs};
  font-weight: 600;
  cursor: pointer;
  transition: background 160ms ease, border-color 160ms ease;
`

const ExerciseRow = styled.div`
  display: grid;
  grid-template-columns: 2fr 0.7fr 0.7fr 0.9fr auto;
  gap: ${({ theme }) => theme.spacing[2]};
  align-items: center;

  @media ${({ theme }) => theme.media.belowSm} {
    grid-template-columns: 1fr 1fr;
  }
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

const Hint = styled.p`
  font-size: ${({ theme }) => theme.typography.fontSize.xs};
  color: ${({ theme }) => theme.color.mutedForeground};
  margin: 0;
`

interface Draft {
  exercise: string
  target_sets: string
  target_reps: string
  target_weight_kg: string
}

const EMPTY_EX: Draft = { exercise: '', target_sets: '', target_reps: '', target_weight_kg: '' }

export function RoutineDialog({
  open, onClose, editing,
}: { open: boolean; onClose: () => void; editing: WorkoutRoutine | null }) {
  const qc = useQueryClient()
  const [name, setName] = useState('')
  const [notes, setNotes] = useState('')
  const [days, setDays] = useState<number[]>([])
  const [exercises, setExercises] = useState<Draft[]>([{ ...EMPTY_EX }])

  /* Dialog only fires onOpenChange on CLOSE, so prefill hangs off [open,
     editing] — an onOpenChange(true) branch would never run. */
  useEffect(() => {
    if (!open) return
    if (editing) {
      setName(editing.name)
      setNotes(editing.notes ?? '')
      setDays([...editing.days])
      setExercises(
        editing.exercises.length
          ? editing.exercises.map(e => ({
              exercise: e.exercise,
              target_sets: e.target_sets != null ? String(e.target_sets) : '',
              target_reps: e.target_reps != null ? String(e.target_reps) : '',
              target_weight_kg: e.target_weight_kg != null ? String(e.target_weight_kg) : '',
            }))
          : [{ ...EMPTY_EX }],
      )
    } else {
      setName(''); setNotes(''); setDays([]); setExercises([{ ...EMPTY_EX }])
    }
  }, [open, editing])

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ['health', 'routines'] })
    qc.invalidateQueries({ queryKey: ['health', 'adherence'] })
  }

  const save = useMutation({
    mutationFn: (payload: RoutinePayload) =>
      editing ? healthApi.patchRoutine(editing.id, payload) : healthApi.createRoutine(payload),
    onSuccess: () => {
      invalidate()
      toast.success(editing ? 'Routine updated' : 'Routine created')
      onClose()
    },
    onError: (e: any) => toast.error(e?.response?.data?.detail || 'Failed to save routine'),
  })

  const remove = useMutation({
    mutationFn: (id: string) => healthApi.deleteRoutine(id),
    onSuccess: () => {
      invalidate()
      qc.invalidateQueries({ queryKey: ['health', 'workouts'] })
      toast.success('Routine deleted')
      onClose()
    },
    onError: () => toast.error('Failed to delete routine'),
  })

  const toggleDay = (d: number) =>
    setDays(prev => (prev.includes(d) ? prev.filter(x => x !== d) : [...prev, d].sort((a, b) => a - b)))

  const submit = () => {
    const trimmed = name.trim()
    if (!trimmed) { toast.error('Give the routine a name'); return }
    const cleaned = exercises
      .map(e => ({
        exercise: e.exercise.trim(),
        target_sets: e.target_sets ? Number(e.target_sets) : null,
        target_reps: e.target_reps ? Number(e.target_reps) : null,
        target_weight_kg: e.target_weight_kg ? Number(e.target_weight_kg) : null,
      }))
      .filter(e => e.exercise)
    if (!cleaned.length) { toast.error('Add at least one exercise'); return }
    save.mutate({ name: trimmed, notes: notes.trim() || null, is_active: true, days, exercises: cleaned })
  }

  return (
    <Dialog
      open={open}
      icon={<Dumbbell size={18} />}
      eyebrow="Health"
      title={editing ? `Edit — ${editing.name}` : 'New routine'}
      description="What the session should be, and which days it belongs on."
      onOpenChange={(o) => { if (!o) onClose() }}
      size="md"
    >
      <Form onSubmit={e => { e.preventDefault(); submit() }}>
        <div>
          <Label>Name</Label>
          <Input value={name} onChange={(e: any) => setName(e.target.value)} placeholder="Push Day" autoFocus required />
        </div>

        <div>
          <Label>Days</Label>
          <DayRow>
            {WEEKDAYS.map((d, i) => (
              <DayChip
                key={d}
                type="button"
                $on={days.includes(i)}
                aria-pressed={days.includes(i)}
                onClick={() => toggleDay(i)}
              >
                {d}
              </DayChip>
            ))}
          </DayRow>
          {!days.length && (
            <Hint>No days selected — the routine is saved, but nothing will count toward adherence.</Hint>
          )}
        </div>

        <div>
          <Label>Exercises — targets optional</Label>
          {exercises.map((ex, i) => (
            <ExerciseRow key={i} style={{ marginBottom: 8 }}>
              <Input
                value={ex.exercise}
                onChange={(e: any) => setExercises(list => list.map((x, j) => j === i ? { ...x, exercise: e.target.value } : x))}
                placeholder="Bench Press"
                aria-label={`Exercise ${i + 1}`}
              />
              <Input
                type="number" min="0" step="1" value={ex.target_sets}
                onChange={(e: any) => setExercises(list => list.map((x, j) => j === i ? { ...x, target_sets: e.target.value } : x))}
                placeholder="sets" aria-label={`Sets for exercise ${i + 1}`}
              />
              <Input
                type="number" min="0" step="1" value={ex.target_reps}
                onChange={(e: any) => setExercises(list => list.map((x, j) => j === i ? { ...x, target_reps: e.target.value } : x))}
                placeholder="reps" aria-label={`Reps for exercise ${i + 1}`}
              />
              <Input
                type="number" min="0" step="0.5" value={ex.target_weight_kg}
                onChange={(e: any) => setExercises(list => list.map((x, j) => j === i ? { ...x, target_weight_kg: e.target.value } : x))}
                placeholder="kg" aria-label={`Weight for exercise ${i + 1}`}
              />
              <Button
                type="button" variant="ghost" size="sm"
                aria-label={`Remove exercise ${i + 1}`}
                onClick={() => setExercises(list => list.length === 1 ? [{ ...EMPTY_EX }] : list.filter((_, j) => j !== i))}
              >
                <Trash2 size={14} />
              </Button>
            </ExerciseRow>
          ))}
          <Button type="button" variant="ghost" size="sm" onClick={() => setExercises(l => [...l, { ...EMPTY_EX }])}>
            <Plus size={14} style={{ marginRight: 4 }} /> Add exercise
          </Button>
        </div>

        <div>
          <Label>Notes</Label>
          <Input value={notes} onChange={(e: any) => setNotes(e.target.value)} placeholder="Optional" />
        </div>

        <Actions>
          <Button variant="primary" type="submit" loading={save.isPending}>
            {editing ? 'Save changes' : 'Create routine'}
          </Button>
          <Button variant="ghost" type="button" onClick={onClose} disabled={save.isPending}>Cancel</Button>
          {editing && (
            <>
              <Spacer />
              <Popconfirm
                title="Delete this routine?"
                description="Sessions you already logged against it are kept — they just stop being linked to a plan."
                onConfirm={() => remove.mutate(editing.id)}
                okText="Delete"
                cancelText="Cancel"
                okButtonProps={{ danger: true }}
              >
                <Button variant="destructive" type="button" size="sm" loading={remove.isPending}>
                  <Trash2 size={14} style={{ marginRight: 4 }} /> Delete
                </Button>
              </Popconfirm>
            </>
          )}
        </Actions>
      </Form>
    </Dialog>
  )
}
