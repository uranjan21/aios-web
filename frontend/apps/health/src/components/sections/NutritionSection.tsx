/**
 * Health → Nutrition.
 *
 * Phase 4 conversion to the canvas's `health:nutrition` composition —
 * donut(4) · progress(8) · timeline(6) · bars(6) — rebuilt from the live
 * nutrition API. Water joins the daily targets here: the redesign retired the
 * Water tab, and this is the module that answers the same question.
 */
import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import dayjs from 'dayjs'
import styled from 'styled-components'
import { BarChart3, Circle, Flag, Plus } from 'lucide-react'
import { Button, Dialog, Input, Select } from '@ledgr/ui'
import { healthApi } from '@ct/shared/api/areas'
import { ModuleGrid, type ModuleSpec } from '@ct/shared/components/modules'
import { Skeleton } from '@ct/shared/components/ui/skeleton'
import { parseMealNotes } from '../nutrition/mealNotes'

const Root = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.spacing[5]};
`

const Toolbar = styled.div`
  display: flex;
  justify-content: flex-end;
  gap: ${({ theme }) => theme.spacing[2]};
`

const Form = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.spacing[3]};
`

const Grid2 = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
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

/** Atwater factors — the standard kcal per gram for each macro. */
const KCAL = { protein: 4, carbs: 4, fat: 9 }

const MEAL_TYPES = [
  { value: 'breakfast', label: 'Breakfast' },
  { value: 'lunch', label: 'Lunch' },
  { value: 'dinner', label: 'Dinner' },
  { value: 'snack', label: 'Snack' },
]

const EMPTY_MEAL = { food_name: '', calories: '', protein: '', carbs: '', fat: '', meal_type: 'snack' }

export function NutritionSection() {
  const qc = useQueryClient()
  const [logOpen, setLogOpen] = useState(false)
  const [meal, setMeal] = useState({ ...EMPTY_MEAL })

  const { data: today, isLoading } = useQuery({
    queryKey: ['health', 'nutrition', 'today'],
    queryFn: healthApi.nutritionToday,
  })
  const { data: goals } = useQuery({
    queryKey: ['health', 'goals'],
    queryFn: healthApi.healthGoals,
    staleTime: 5 * 60_000,
  })
  const { data: water } = useQuery({
    queryKey: ['health', 'water', 'today'],
    queryFn: healthApi.waterToday,
  })
  const { data: mealLogs } = useQuery({
    queryKey: ['health', 'logs', 'meal'],
    queryFn: () => healthApi.logs('meal'),
    staleTime: 60_000,
  })

  const logMeal = useMutation({
    mutationFn: () => healthApi.logMeal({
      food_name: meal.food_name.trim() || 'Meal',
      calories: Number(meal.calories) || 0,
      protein: Number(meal.protein) || 0,
      carbs: Number(meal.carbs) || 0,
      fat: Number(meal.fat) || 0,
      meal_type: meal.meal_type,
    }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['health'] })
      setLogOpen(false)
      setMeal({ ...EMPTY_MEAL })
      toast.success('Meal logged')
    },
    onError: () => toast.error('Failed to log that meal'),
  })

  const logWater = useMutation({
    mutationFn: () => healthApi.logWater(1),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['health', 'water', 'today'] })
      toast.success('Glass logged')
    },
    onError: () => toast.error('Failed to log water'),
  })

  const modules = useMemo<ModuleSpec[]>(() => {
    const cals = today?.calories ?? 0
    const protein = today?.protein ?? 0
    const carbs = today?.carbs ?? 0
    const fat = today?.fat ?? 0

    const calTarget = goals?.calorie_target ?? 2200
    const proteinTarget = goals?.protein_target ?? 120
    const carbTarget = goals?.carb_target ?? 250
    const fatTarget = goals?.fat_target ?? 70
    const waterTarget = water?.target ?? goals?.water_target ?? 8
    const glasses = water?.glasses_logged ?? 0

    // The donut splits calories by where they came from, so grams are converted
    // with the Atwater factors rather than plotted as raw grams.
    const macroKcal = [
      { label: 'Protein', k: protein * KCAL.protein, colorKey: 'success' },
      { label: 'Carbs', k: carbs * KCAL.carbs, colorKey: 'accent' },
      { label: 'Fat', k: fat * KCAL.fat, colorKey: 'warning' },
    ]
    const macroTotal = macroKcal.reduce((s, m) => s + m.k, 0)

    const meals = [...(today?.meals ?? [])].sort((a, b) => b.logged_at.localeCompare(a.logged_at))
    const lastLogged = meals[0] ? dayjs(meals[0].logged_at).format('h:mm A') : null

    // Seven-day calorie history from the meal logs.
    const last7 = Array.from({ length: 7 }, (_, i) => dayjs().subtract(6 - i, 'day'))
    const calsOn = (d: dayjs.Dayjs) => (mealLogs ?? [])
      .filter(l => dayjs(l.logged_at).isSame(d, 'day'))
      .reduce((s, l) => s + Number(l.value ?? 0), 0)

    const pctOf = (v: number, t: number) => (t > 0 ? Math.min(100, Math.round((v / t) * 100)) : 0)

    return [
      {
        kind: 'donut',
        span: 4,
        title: 'Macros today',
        subtitle: `${Math.round(cals).toLocaleString('en-IN')} kcal of ${calTarget.toLocaleString('en-IN')} target`,
        icon: Circle,
        centerValue: Math.round(cals).toLocaleString('en-IN'),
        centerLabel: 'kcal',
        slices: macroKcal.map(m => ({
          label: m.label,
          pct: macroTotal > 0 ? Math.round((m.k / macroTotal) * 100) : 0,
          value: `${Math.round(m.k)} kcal`,
          colorKey: m.colorKey,
        })),
      },
      {
        kind: 'progress',
        span: 8,
        title: 'Daily targets',
        subtitle: `Where today stands at ${dayjs().format('h A')}`,
        icon: Flag,
        rows: [
          {
            title: 'Calories',
            meta: `${Math.round(cals)} of ${calTarget} kcal`,
            pct: pctOf(cals, calTarget),
            value: `${pctOf(cals, calTarget)}%`,
            colorKey: cals > calTarget ? 'warning' : 'accent',
          },
          {
            title: 'Protein',
            meta: `${Math.round(protein)} of ${proteinTarget} g`,
            pct: pctOf(protein, proteinTarget),
            value: `${pctOf(protein, proteinTarget)}%`,
            colorKey: pctOf(protein, proteinTarget) >= 100 ? 'success' : 'health',
          },
          {
            title: 'Carbs',
            meta: `${Math.round(carbs)} of ${carbTarget} g`,
            pct: pctOf(carbs, carbTarget),
            value: `${pctOf(carbs, carbTarget)}%`,
            colorKey: 'accent',
          },
          {
            title: 'Fat',
            meta: `${Math.round(fat)} of ${fatTarget} g`,
            pct: pctOf(fat, fatTarget),
            value: `${pctOf(fat, fatTarget)}%`,
            colorKey: 'warning',
          },
          {
            title: 'Water',
            meta: `${glasses} of ${waterTarget} glasses`,
            pct: pctOf(glasses, waterTarget),
            value: `${pctOf(glasses, waterTarget)}%`,
            colorKey: pctOf(glasses, waterTarget) >= 100 ? 'success' : 'info',
          },
        ],
      },
      {
        kind: 'timeline',
        span: 6,
        title: 'Meals today',
        subtitle: meals.length
          ? `${meals.length} entr${meals.length === 1 ? 'y' : 'ies'}${lastLogged ? ` · last logged ${lastLogged}` : ''}`
          : 'Nothing logged yet today',
        icon: Circle,
        action: 'Log meal',
        onAction: () => setLogOpen(true),
        entries: meals.map((m) => {
          const parsed = parseMealNotes(m.notes)
          return {
            title: parsed.food_name,
            body: `${Math.round(parsed.protein)}g protein · ${Math.round(parsed.carbs)}g carbs · ${Math.round(parsed.fat)}g fat`,
            date: dayjs(m.logged_at).format('h:mm A'),
            tagLabel: parsed.meal_type,
            colorKey: 'health',
          }
        }),
      },
      {
        kind: 'bars',
        span: 6,
        title: 'Calories last 7 days',
        subtitle: `Against a ${calTarget.toLocaleString('en-IN')} kcal target`,
        icon: BarChart3,
        target: calTarget,
        bars: last7.map((d) => {
          const v = Math.round(calsOn(d))
          return {
            label: d.format('ddd'),
            v,
            t: v > 0 ? String(v) : '',
            colorKey: v === 0 ? 'muted' : v > calTarget ? 'warning' : 'success',
            dim: v === 0,
          }
        }),
      },
    ]
  }, [today, goals, water, mealLogs])

  if (isLoading) return <Skeleton style={{ height: 320 }} />

  return (
    <Root>
      <Toolbar>
        <Button size="sm" variant="outline" onClick={() => logWater.mutate()} loading={logWater.isPending}>
          + Glass of water
        </Button>
        <Button size="sm" variant="primary" onClick={() => setLogOpen(true)}>
          <Plus size={12} style={{ marginRight: 4 }} /> Log meal
        </Button>
      </Toolbar>

      <ModuleGrid modules={modules} />

      <Dialog
        open={logOpen}
        onOpenChange={(o) => !o && setLogOpen(false)}
        icon={<Circle size={18} />}
        eyebrow="Health"
        title="Log a meal"
        description="Calories are required; macros are optional but make the donut useful."
        size="md"
      >
        <Form>
          <div>
            <Label>What did you eat?</Label>
            <Input
              value={meal.food_name}
              onChange={(e: any) => setMeal(m => ({ ...m, food_name: e.target.value }))}
              placeholder="Grilled chicken bowl"
              autoFocus
            />
          </div>
          <Grid2>
            <div>
              <Label>Meal</Label>
              <Select
                fullWidth
                value={meal.meal_type}
                onChange={(v: any) => setMeal(m => ({ ...m, meal_type: String(v) }))}
                options={MEAL_TYPES}
              />
            </div>
            <div>
              <Label>Calories</Label>
              <Input
                type="number"
                min="0"
                value={meal.calories}
                onChange={(e: any) => setMeal(m => ({ ...m, calories: e.target.value }))}
                placeholder="520"
              />
            </div>
          </Grid2>
          <Grid2>
            <div>
              <Label>Protein (g)</Label>
              <Input type="number" min="0" step="0.1" value={meal.protein} onChange={(e: any) => setMeal(m => ({ ...m, protein: e.target.value }))} placeholder="0" />
            </div>
            <div>
              <Label>Carbs (g)</Label>
              <Input type="number" min="0" step="0.1" value={meal.carbs} onChange={(e: any) => setMeal(m => ({ ...m, carbs: e.target.value }))} placeholder="0" />
            </div>
          </Grid2>
          <div>
            <Label>Fat (g)</Label>
            <Input type="number" min="0" step="0.1" value={meal.fat} onChange={(e: any) => setMeal(m => ({ ...m, fat: e.target.value }))} placeholder="0" />
          </div>
          <Actions>
            <Button
              variant="primary"
              loading={logMeal.isPending}
              disabled={!Number(meal.calories)}
              onClick={() => logMeal.mutate()}
            >
              Save meal
            </Button>
            <Button variant="ghost" onClick={() => setLogOpen(false)}>Cancel</Button>
          </Actions>
        </Form>
      </Dialog>
    </Root>
  )
}
