/**
 * Create or edit a meal plan — the intent side of Nutrition.
 *
 * The plan is a whole week, but the editor shows ONE weekday at a time.
 * Seven days × four meals on a single surface is a wall of inputs nobody
 * fills in; a day at a time is the unit people actually think in, and the
 * chips make it obvious which days already have something on them.
 *
 * A line is either a catalogue food (macros known, and they stay correct if
 * the food's numbers are later fixed) or free text. Free text is deliberately
 * allowed: planning "Mum's sabzi" must not require adding it to the catalogue
 * first. Those lines carry no macros and the totals say so rather than
 * quietly treating them as zero.
 */
import { useEffect, useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import styled from 'styled-components'
import { Button, Dialog, Input, Select, Switch } from '@ledgr/ui'
import { Apple, Plus, Trash2 } from 'lucide-react'
import { healthApi, type MealPlan, type MealPlanPayload } from '@ct/shared/api/areas'
import { Popconfirm } from '@ct/shared/components/ui/Popconfirm'

const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
const MEAL_TYPES = [
  { value: 'breakfast', label: 'Breakfast' },
  { value: 'lunch', label: 'Lunch' },
  { value: 'dinner', label: 'Dinner' },
  { value: 'snack', label: 'Snack' },
]
const CUSTOM = '__custom__'

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

const DayChip = styled.button<{ $on: boolean; $filled: boolean }>`
  min-width: 44px;
  height: 32px;
  padding: 0 ${({ theme }) => theme.spacing[3]};
  border-radius: ${({ theme }) => theme.radii.sm};
  border: 1px solid ${({ theme, $on, $filled }) =>
    $on ? theme.color.accent : $filled ? theme.color.success : theme.color.border};
  background: ${({ theme, $on }) => ($on ? theme.color.accent : 'transparent')};
  color: ${({ theme, $on }) => ($on ? theme.color.accentForeground : theme.color.foreground)};
  font-size: ${({ theme }) => theme.typography.fontSize.xs};
  font-weight: 600;
  cursor: pointer;
`

const EntryRow = styled.div`
  display: grid;
  grid-template-columns: 1fr 1.6fr 0.8fr auto;
  gap: ${({ theme }) => theme.spacing[2]};
  align-items: center;
  margin-bottom: ${({ theme }) => theme.spacing[2]};

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

const ToggleRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: ${({ theme }) => theme.spacing[3]};
`

interface Draft {
  weekday: number
  meal_type: string
  food_id: string | null
  custom_name: string
  quantity_grams: string
}

export function MealPlanDialog({
  open, onClose, editing,
}: { open: boolean; onClose: () => void; editing: MealPlan | null }) {
  const qc = useQueryClient()
  const [name, setName] = useState('')
  const [isActive, setIsActive] = useState(false)
  const [day, setDay] = useState(0)
  const [entries, setEntries] = useState<Draft[]>([])

  /* The WHOLE catalogue, not the search default of 25 — these selects have to
     resolve foods the plan already references, and a capped list renders a
     stored choice as "Select…". */
  const { data: foods } = useQuery({
    queryKey: ['health', 'foods', 'all'],
    queryFn: () => healthApi.foods(undefined, 500),
    staleTime: 5 * 60_000,
  })

  useEffect(() => {
    if (!open) return
    setDay(new Date().getDay() === 0 ? 6 : new Date().getDay() - 1) // JS Sun=0 → Mon=0
    if (editing) {
      setName(editing.name)
      setIsActive(editing.is_active)
      setEntries(editing.entries.map(e => ({
        weekday: e.weekday,
        meal_type: e.meal_type,
        food_id: e.food_id,
        custom_name: e.food_id ? '' : e.name,
        quantity_grams: String(e.quantity_grams),
      })))
    } else {
      setName(''); setIsActive(false); setEntries([])
    }
  }, [open, editing])

  const foodOptions = useMemo(() => [
    { value: CUSTOM, label: 'Something else…' },
    ...(foods ?? []).map(f => ({ value: f.id, label: f.name })),
  ], [foods])

  const dayEntries = entries.filter(e => e.weekday === day)
  const filledDays = useMemo(() => new Set(entries.map(e => e.weekday)), [entries])

  const update = (idx: number, patch: Partial<Draft>) => {
    let seen = -1
    setEntries(list => list.map(e => {
      if (e.weekday !== day) return e
      seen += 1
      return seen === idx ? { ...e, ...patch } : e
    }))
  }

  const removeAt = (idx: number) => {
    let seen = -1
    setEntries(list => list.filter(e => {
      if (e.weekday !== day) return true
      seen += 1
      return seen !== idx
    }))
  }

  const save = useMutation({
    mutationFn: (payload: MealPlanPayload) =>
      editing ? healthApi.patchMealPlan(editing.id, payload) : healthApi.createMealPlan(payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['health', 'meal-plans'] })
      qc.invalidateQueries({ queryKey: ['health', 'meal-plan', 'today'] })
      toast.success(editing ? 'Plan updated' : 'Plan created')
      onClose()
    },
    onError: (e: any) => toast.error(e?.response?.data?.detail || 'Failed to save plan'),
  })

  const remove = useMutation({
    mutationFn: (id: string) => healthApi.deleteMealPlan(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['health', 'meal-plans'] })
      qc.invalidateQueries({ queryKey: ['health', 'meal-plan', 'today'] })
      toast.success('Plan deleted')
      onClose()
    },
    onError: () => toast.error('Failed to delete plan'),
  })

  const submit = () => {
    const trimmed = name.trim()
    if (!trimmed) { toast.error('Give the plan a name'); return }
    const cleaned = entries
      .map(e => ({
        weekday: e.weekday,
        meal_type: e.meal_type,
        food_id: e.food_id,
        custom_name: e.food_id ? null : e.custom_name.trim() || null,
        quantity_grams: Number(e.quantity_grams) || 0,
      }))
      .filter(e => e.food_id || e.custom_name)
    if (!cleaned.length) { toast.error('Add at least one meal'); return }
    save.mutate({ name: trimmed, is_active: isActive, entries: cleaned })
  }

  return (
    <Dialog
      open={open}
      icon={<Apple size={18} />}
      eyebrow="Health"
      title={editing ? `Edit — ${editing.name}` : 'New meal plan'}
      description="What a normal week should look like. One day at a time."
      onOpenChange={(o) => { if (!o) onClose() }}
      size="md"
    >
      <Form onSubmit={e => { e.preventDefault(); submit() }}>
        <div>
          <Label>Name</Label>
          <Input value={name} onChange={(e: any) => setName(e.target.value)} placeholder="Cut — 2000 kcal" autoFocus required />
        </div>

        <ToggleRow>
          <div>
            <Label>Active plan</Label>
            <Hint>Only one plan drives "Today" — turning this on stands the others down.</Hint>
          </div>
          <Switch size="sm" checked={isActive} onChange={(e: any) => setIsActive(e.target.checked)} />
        </ToggleRow>

        <div>
          <Label>Day — a green outline means that day has meals on it</Label>
          <DayRow>
            {WEEKDAYS.map((d, i) => (
              <DayChip
                key={d} type="button" $on={day === i} $filled={filledDays.has(i)}
                aria-pressed={day === i} onClick={() => setDay(i)}
              >
                {d}
              </DayChip>
            ))}
          </DayRow>
        </div>

        <div>
          <Label>{WEEKDAYS[day]} meals</Label>
          {!dayEntries.length && <Hint>Nothing planned for {WEEKDAYS[day]} yet.</Hint>}
          {dayEntries.map((e, i) => (
            <EntryRow key={i}>
              <Select
                fullWidth value={e.meal_type}
                onChange={(v: any) => update(i, { meal_type: String(v) })}
                options={MEAL_TYPES}
                aria-label="Meal"
              />
              {e.food_id ? (
                <Select
                  fullWidth value={e.food_id}
                  onChange={(v: any) => update(i, String(v) === CUSTOM
                    ? { food_id: null, custom_name: '' }
                    : { food_id: String(v) })}
                  options={foodOptions}
                  aria-label="Food"
                />
              ) : (
                <Input
                  value={e.custom_name}
                  onChange={(ev: any) => update(i, { custom_name: ev.target.value })}
                  placeholder="Mum's sabzi"
                  aria-label="Food name"
                />
              )}
              <Input
                type="number" min="0" step="10" value={e.quantity_grams}
                onChange={(ev: any) => update(i, { quantity_grams: ev.target.value })}
                aria-label="Grams"
              />
              <Button type="button" variant="ghost" size="sm" aria-label="Remove meal" onClick={() => removeAt(i)}>
                <Trash2 size={14} />
              </Button>
            </EntryRow>
          ))}
          <Button
            type="button" variant="ghost" size="sm"
            onClick={() => setEntries(l => [...l, {
              weekday: day, meal_type: 'lunch',
              food_id: (foods ?? [])[0]?.id ?? null,
              custom_name: '', quantity_grams: '100',
            }])}
          >
            <Plus size={14} style={{ marginRight: 4 }} /> Add meal to {WEEKDAYS[day]}
          </Button>
        </div>

        <Actions>
          <Button variant="primary" type="submit" loading={save.isPending}>
            {editing ? 'Save plan' : 'Create plan'}
          </Button>
          <Button variant="ghost" type="button" onClick={onClose} disabled={save.isPending}>Cancel</Button>
          {editing && (
            <>
              <Spacer />
              <Popconfirm
                title="Delete this plan?"
                description="Meals you already logged are kept — only the plan goes."
                onConfirm={() => remove.mutate(editing.id)}
                okText="Delete" cancelText="Cancel" okButtonProps={{ danger: true }}
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
