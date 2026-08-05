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
import { BarChart3, Circle, ClipboardList, Flag } from 'lucide-react'
import { Button, Dialog, Input, Select } from '@ledgr/ui'
import { healthApi, type MealPlan, type MealPlanToday } from '@ct/shared/api/areas'
import { ModuleGrid, type ModuleSpec } from '@ct/shared/components/modules'
import { Skeleton } from '@ct/shared/components/ui/skeleton'
import { parseMealNotes } from '../nutrition/mealNotes'
import { FoodPicker } from '../FoodPicker'
import { MealPlanDialog } from '../MealPlanDialog'

const MEAL_LABEL: Record<string, string> = {
  breakfast: 'Breakfast', lunch: 'Lunch', dinner: 'Dinner', snack: 'Snack',
}

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
  const [planOpen, setPlanOpen] = useState(false)
  const [editingPlan, setEditingPlan] = useState<MealPlan | null>(null)

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

  const { data: planToday } = useQuery({
    queryKey: ['health', 'meal-plan', 'today'],
    queryFn: healthApi.mealPlanToday,
    staleTime: 60_000,
  })
  const { data: plans } = useQuery({
    queryKey: ['health', 'meal-plans'],
    queryFn: healthApi.mealPlans,
    staleTime: 5 * 60_000,
  })
  const activePlanFull = (plans ?? []).find(p => p.is_active) ?? null

  /* Logging a planned line writes the PLANNED macros, so the day's totals
     match the plan exactly rather than drifting on re-entry. */
  const logPlanned = useMutation({
    mutationFn: (e: MealPlanToday['entries'][number]) => healthApi.logMeal({
      food_name: e.name,
      calories: e.macros?.calories ?? 0,
      protein: e.macros?.protein ?? 0,
      carbs: e.macros?.carbs ?? 0,
      fat: e.macros?.fat ?? 0,
      meal_type: e.meal_type,
    }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['health'] })
      toast.success('Logged from your plan')
    },
    onError: () => toast.error('Could not log that'),
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
    /* The plan sits above the day's totals: it is what you meant to do, and
       it is most useful before you have eaten, which is exactly when the
       totals below are all zeros. */
    const planSpecs: ModuleSpec[] = []
    const planned = planToday?.entries ?? []

    if (planToday?.plan && planned.length) {
      const eaten = planned.filter(e => e.matched).length
      planSpecs.push({
        kind: 'checklist',
        span: 12,
        title: `Today's plan — ${planToday.plan.name}`,
        subtitle: planToday.planned_totals
          ? `${eaten} of ${planned.length} eaten · ${Math.round(planToday.planned_totals.calories)} kcal planned${
              planToday.planned_totals.incomplete_lines
                ? ` (+${planToday.planned_totals.incomplete_lines} line${planToday.planned_totals.incomplete_lines === 1 ? '' : 's'} with no macros)`
                : ''
            }`
          : `${eaten} of ${planned.length} eaten`,
        icon: ClipboardList,
        action: 'Edit plan',
        onAction: () => { setEditingPlan(activePlanFull ?? null); setPlanOpen(true) },
        /* Ticking logs the planned meal with its planned macros. Already-eaten
           lines are inert — ticking again would double-count the day. */
        onToggle: (i: number) => {
          const e = planned[i]
          if (!e || e.matched) return
          logPlanned.mutate(e)
        },
        items: planned.map(e => ({
          label: e.name,
          meta: e.macros
            ? `${MEAL_LABEL[e.meal_type] ?? e.meal_type} · ${Math.round(e.macros.calories)} kcal · ${e.macros.protein}g P`
            // No macros is a real state, not zero — say so rather than show 0.
            : `${MEAL_LABEL[e.meal_type] ?? e.meal_type} · macros unknown`,
          done: e.matched,
          ...(e.matched && { tagLabel: 'Eaten', tagKey: 'success' as const }),
          busy: logPlanned.isPending && logPlanned.variables?.id === e.id,
        })),
      })
    } else {
      /* Without this the plan feature is unreachable: the card above only
         renders once a plan HAS meals today, so a user with no plan would
         never see a way to make one. The two empty states are different and
         say different things — no plan at all, versus a plan that is quiet
         today (a rest day is a legitimate plan, not a gap to fill). */
      planSpecs.push({
        kind: 'rows',
        span: 12,
        title: planToday?.plan ? `Today's plan — ${planToday.plan.name}` : 'Meal plan',
        subtitle: planToday?.plan
          ? 'Nothing scheduled for today'
          : 'Plan a normal week once, then tick meals off as you eat them',
        icon: ClipboardList,
        action: planToday?.plan ? 'Edit plan' : 'Create a plan',
        actionVariant: planToday?.plan ? 'ghost' : 'primary',
        onAction: () => { setEditingPlan(activePlanFull ?? null); setPlanOpen(true) },
        rows: [{
          title: planToday?.plan ? 'No meals on today' : 'No active plan',
          meta: planToday?.plan
            ? 'Add meals to this weekday, or leave it as a rest day.'
            : 'Pick foods from your catalogue and the macros come with them.',
        }],
      })
    }

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
      ...planSpecs,
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
        /* Water is one of this card's own rows, so the glass button lives here.
         * "Log meal" is on "Meals today" — each control sits on the card it
         * actually moves, instead of both portalling into a page header. */
        action: '+ Glass of water',
        onAction: () => logWater.mutate(),
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
        actionVariant: 'primary',
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
  }, [today, goals, water, mealLogs, logWater, planToday, activePlanFull, logPlanned])

  if (isLoading) return <Skeleton style={{ height: 320 }} />

  return (
    <Root>
      <ModuleGrid modules={modules} />

      <MealPlanDialog
        open={planOpen}
        onClose={() => { setPlanOpen(false); setEditingPlan(null) }}
        editing={editingPlan}
      />

      <Dialog
        open={logOpen}
        onOpenChange={(o) => !o && setLogOpen(false)}
        icon={<Circle size={18} />}
        eyebrow="Health"
        title="Log a meal"
        description="Pick from your food list to fill the macros, or type them in for a one-off."
        size="md"
      >
        <Form>
          {/* Picking a food overwrites name + all four figures below, which
              stay editable — the catalogue is a starting point, not a lock. */}
          <FoodPicker
            onPick={(m) => setMeal(prev => ({
              ...prev,
              food_name: m.food_name,
              calories: String(m.calories),
              protein: String(m.protein),
              carbs: String(m.carbs),
              fat: String(m.fat),
            }))}
          />
          <div>
            <Label>What did you eat?</Label>
            <Input
              value={meal.food_name}
              onChange={(e: any) => setMeal(m => ({ ...m, food_name: e.target.value }))}
              placeholder="Grilled chicken bowl"
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
