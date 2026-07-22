import { useState, useEffect } from 'react'
import { useTheme } from 'styled-components'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'

import { Utensils, Clock, Plus, Flame, ListChecks, Coffee } from 'lucide-react'
import { healthApi } from '@aios/shared/api/areas'
import { Skeleton } from '@aios/shared/components/ui/skeleton'
import { format } from 'date-fns'
import type { FoodDbItem } from '@aios/shared/types'
import { WorkspaceLayout } from '@aios/shared/components/layout/WorkspaceLayout'
import { Dialog, Button, Input, Select, Card, HeaderActionPortal } from '@ledgr/ui'

import { MacroBar } from './nutrition/MacroBar'
import { CalorieRing } from './nutrition/CalorieRing'
import { parseMealNotes } from './nutrition/mealNotes'
import {
  StyledContainer,
  StyledMacrosWrapper,
  StyledMacroBarsContainer,
  StyledEmptyState,
  StyledMealsList,
  StyledMealItem,
  StyledMealInfo,
  StyledMealIconWrapper,
  StyledMealName,
  StyledMealTime,
  StyledMealType,
  StyledMealStats,
  StyledMealCalories,
  StyledMealMacros,
  StyledModalContent,
  StyledQuickAddSection,
  StyledQuickAddTitle,
  StyledQuickAddButtons,
  StyledQuickAddButton,
  StyledSearchSection,
  StyledSearchInputWrapper,
  StyledSearchFeedback,
  StyledForm,
  StyledFormGroup,
  StyledLabel,
  StyledFormGrid,
} from './nutrition/NutritionTab.styles'

const MEAL_TYPES = ['Breakfast', 'Lunch', 'Dinner', 'Snack']

const QUICK_ADDS = [
  { label: 'Dal Rice', kcal: 450, protein: 12, carbs: 75, fat: 8, type: 'Lunch' },
  { label: 'Roti', kcal: 100, protein: 3, carbs: 18, fat: 2, type: 'Dinner' },
  { label: 'Whey', kcal: 130, protein: 24, carbs: 5, fat: 2, type: 'Snack' },
  { label: 'Coffee', kcal: 15, protein: 1, carbs: 2, fat: 1, type: 'Snack' },
]

export function NutritionTab() {
  const theme = useTheme()
  const [formState, setFormState] = useState({ food_name: '', calories: '', protein: '', carbs: '', fat: '', meal_type: 'Snack' })
  const queryClient = useQueryClient()
  const [foodQuery, setFoodQuery] = useState('')
  const [selectedFood, setSelectedFood] = useState<FoodDbItem | null>(null)
  const [grams, setGrams] = useState<number | null>(null)

  const { data: foods } = useQuery({
    queryKey: ['health', 'foods', foodQuery],
    queryFn: () => healthApi.foods(foodQuery || undefined),
  })

  // Scale per-100g macros to the chosen quantity and fill the form
  const applyFood = (food: FoodDbItem, qty: number) => {
    const f = qty / 100
    setFormState(prev => ({
      ...prev,
      food_name: food.name,
      calories: String(Math.round(food.calories * f)),
      protein: String(Math.round(food.protein * f * 10) / 10),
      carbs: String(Math.round(food.carbs * f * 10) / 10),
      fat: String(Math.round(food.fat * f * 10) / 10),
    }))
  }

  const handleFoodSelect = (name: string) => {
    const food = foods?.find(x => x.name === name)
    if (!food) return
    const qty = food.serving_grams ?? 100
    setSelectedFood(food)
    setGrams(qty)
    applyFood(food, qty)
  }

  const handleGramsChange = (v: number | null) => {
    setGrams(v)
    if (selectedFood && v) applyFood(selectedFood, v)
  }

  const { data: goals, isLoading: loadingGoals } = useQuery({
    queryKey: ['health', 'goals'],
    queryFn: healthApi.healthGoals,
  })
  const { data: nutrition, isLoading: loadingNutrition } = useQuery({
    queryKey: ['health', 'nutrition', 'today'],
    queryFn: healthApi.nutritionToday,
  })

  const logMealMutation = useMutation({
    mutationFn: (values: Record<string, string>) =>
      healthApi.logMeal({
        food_name: values.food_name,
        calories: parseInt(values.calories, 10),
        protein: values.protein ? parseFloat(values.protein) : undefined,
        carbs: values.carbs ? parseFloat(values.carbs) : undefined,
        fat: values.fat ? parseFloat(values.fat) : undefined,
        meal_type: values.meal_type || 'snack',
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['health', 'nutrition'] })
      toast.success('Meal logged')
      setFormState({ food_name: '', calories: '', protein: '', carbs: '', fat: '', meal_type: 'Snack' })
      setSelectedFood(null)
      setGrams(null)
    },
    onError: () => toast.error('Failed to log meal'),
  })

  const handleQuickAdd = (item: typeof QUICK_ADDS[0]) => {
    setFormState({
      food_name: item.label,
      calories: String(item.kcal),
      protein: String(item.protein),
      carbs: String(item.carbs),
      fat: String(item.fat),
      meal_type: item.type,
    })
  }

  const calorieTarget = goals?.calorie_target ?? 2000
  const proteinTarget = goals?.protein_target ?? 150
  const carbTarget = goals?.carb_target ?? 250
  const fatTarget = goals?.fat_target ?? 65

  const [logModalOpen, setLogModalOpen] = useState(false)
  const [mealFilter, setMealFilter] = useState<'all' | 'Breakfast' | 'Lunch' | 'Dinner' | 'Snack'>('all')

  useEffect(() => {
    const handleOpen = () => setLogModalOpen(true)
    window.addEventListener('open-new-nutrition', handleOpen)
    return () => window.removeEventListener('open-new-nutrition', handleOpen)
  }, [])



  return (
    <>
    <WorkspaceLayout rail={undefined}>
      <HeaderActionPortal>
        <Button size="sm" variant="primary" onClick={() => setLogModalOpen(true)}>
          <Plus size={12} style={{ marginRight: 4 }} /> Log Food
        </Button>
      </HeaderActionPortal>
      <StyledContainer>
        {/* Calorie ring + macros */}
        <Card
          title="Today's Nutrition"
          subtitle="Calories burned vs target with macro breakdown"
          icon={<Flame size={16} />}
          size="md"
        >
          {loadingNutrition || loadingGoals ? (
            <Skeleton style={{ height: '10rem', width: '100%' }} />
          ) : (
            <StyledMacrosWrapper>
              <CalorieRing calories={nutrition?.calories ?? 0} target={calorieTarget} />
              <StyledMacroBarsContainer>
                <MacroBar label="Protein" current={nutrition?.protein ?? 0} target={proteinTarget} color={theme.chart[0]} />
                <MacroBar label="Carbs" current={nutrition?.carbs ?? 0} target={carbTarget} color={theme.chart[1]} />
                <MacroBar label="Fat" current={nutrition?.fat ?? 0} target={fatTarget} color={theme.chart[2]} />
              </StyledMacroBarsContainer>
            </StyledMacrosWrapper>
          )}
        </Card>

        {/* Today's meals */}
        <Card
          title="Today's Meals"
          subtitle="Each meal you've logged today with macros"
          icon={<ListChecks size={16} />}
          action={
            <div onClick={(e) => e.stopPropagation()}>
              <Select
                size="sm"
                aria-label="Filter meals by type"
                value={mealFilter}
                onChange={(v) => setMealFilter(v as typeof mealFilter)}
                options={[
                  { value: 'all', label: 'All Meals' },
                  { value: 'Breakfast', label: 'Breakfast' },
                  { value: 'Lunch', label: 'Lunch' },
                  { value: 'Dinner', label: 'Dinner' },
                  { value: 'Snack', label: 'Snack' },
                ]}
              />
            </div>
          }
          size="none"
        >
          {loadingNutrition ? (
            <div style={{ padding: '0.75rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>{[1, 2, 3].map(i => <Skeleton key={i} style={{ height: '3rem', width: '100%' }} />)}</div>
          ) : !nutrition?.meals.length ? (
            <StyledEmptyState>No meals logged today. Use the "Log" button above to add one.</StyledEmptyState>
          ) : (
            <StyledMealsList>
              {nutrition.meals
                .filter(meal => {
                  if (mealFilter === 'all') return true
                  const parsed = parseMealNotes(meal.notes)
                  return parsed.meal_type === mealFilter
                })
                .map(meal => {
                const parsed = parseMealNotes(meal.notes)
                return (
                  <StyledMealItem key={meal.id} tabIndex={0}>
                    <StyledMealInfo>
                      <StyledMealIconWrapper>
                        <Utensils style={{ width: '14px', height: '14px', color: 'var(--primary)' }} />
                      </StyledMealIconWrapper>
                      <div>
                        <StyledMealName>{parsed.food_name}</StyledMealName>
                        <StyledMealTime>
                          <Clock style={{ width: '12px', height: '12px' }} />
                          {format(new Date(meal.logged_at), 'h:mm a')}
                          <StyledMealType>· {parsed.meal_type}</StyledMealType>
                        </StyledMealTime>
                      </div>
                    </StyledMealInfo>
                    <StyledMealStats>
                      <StyledMealCalories>{parsed.protein + parsed.carbs + parsed.fat > 0 ? `${Math.round((parsed.protein * 4 + parsed.carbs * 4 + parsed.fat * 9))} kcal` : ''}</StyledMealCalories>
                      <StyledMealMacros>
                        P:{parsed.protein}g C:{parsed.carbs}g F:{parsed.fat}g
                      </StyledMealMacros>
                    </StyledMealStats>
                  </StyledMealItem>
                )
              })}
            </StyledMealsList>
          )}
        </Card>
      </StyledContainer>
    </WorkspaceLayout>

    <Dialog open={logModalOpen} onOpenChange={setLogModalOpen} title="Log Meal">
      <StyledModalContent>
        <StyledQuickAddSection>
          <StyledQuickAddTitle>Quick Add</StyledQuickAddTitle>
          <StyledQuickAddButtons>
            {QUICK_ADDS.map(item => {
              const IconComponent = item.label.toLowerCase() === 'coffee' ? Coffee : Utensils;
              return (
                <StyledQuickAddButton key={item.label} onClick={() => handleQuickAdd(item)}>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                    <IconComponent size={11} /> {item.label}
                  </span>
                </StyledQuickAddButton>
              )
            })}
          </StyledQuickAddButtons>
        </StyledQuickAddSection>

        <StyledSearchSection>
          <StyledSearchInputWrapper>
            <Input
              style={{ width: '100%' }}
              placeholder="Search food — Roti, Dal…"
              list="food-search"
              value={foodQuery}
              onChange={(e: any) => {
                setFoodQuery(e.target.value)
                const match = foods?.find(f => f.name === e.target.value)
                if (match) handleFoodSelect(match.name)
                else if (!e.target.value) { setSelectedFood(null); setGrams(null) }
              }}
              size="sm"
              aria-label="Search food database"
            />
            <datalist id="food-search">
              {(foods ?? []).map(f => (
                <option key={f.name} value={f.name}>
                  {f.name} ({f.calories} kcal/100g)
                </option>
              ))}
            </datalist>
          </StyledSearchInputWrapper>
          <Input
            type="number"
            placeholder="g"
            min={1}
            style={{ width: '4rem' }}
            size="sm"
            value={grams ?? ''}
            onChange={(e: any) => handleGramsChange(e.target.value ? Number(e.target.value) : null)}
            disabled={!selectedFood}
            aria-label="Weight in grams"
          />
        </StyledSearchSection>

        {selectedFood && grams && (
          <StyledSearchFeedback>
            {selectedFood.name} × {grams}g — macros auto-filled
          </StyledSearchFeedback>
        )}

        <StyledForm onSubmit={e => { e.preventDefault(); logMealMutation.mutate(formState); }}>
          <StyledFormGroup>
            <StyledLabel htmlFor="nut-food-name">Food Name</StyledLabel>
            <Input id="nut-food-name" required placeholder="e.g. Chicken Rice Bowl" size="sm" value={formState.food_name} onChange={(e: any) => setFormState(p => ({ ...p, food_name: e.target.value }))} />
          </StyledFormGroup>
          <StyledFormGroup>
            <StyledLabel htmlFor="nut-meal-type">Meal Type</StyledLabel>
            <Select
              id="nut-meal-type"
              size="sm"
              value={formState.meal_type}
              onChange={(v) => setFormState(p => ({ ...p, meal_type: String(v) }))}
              options={MEAL_TYPES.map(m => ({ value: m, label: m }))}
              placeholder="Meal type"
            />
          </StyledFormGroup>
          <StyledFormGrid>
            <StyledFormGroup>
              <StyledLabel htmlFor="nut-calories">Calories</StyledLabel>
              <Input id="nut-calories" type="number" required placeholder="0" min={0} size="sm" value={formState.calories} onChange={(e: any) => setFormState(p => ({ ...p, calories: e.target.value }))} />
            </StyledFormGroup>
            <StyledFormGroup>
              <StyledLabel htmlFor="nut-protein">Protein (g)</StyledLabel>
              <Input id="nut-protein" type="number" placeholder="0" min={0} size="sm" value={formState.protein} onChange={(e: any) => setFormState(p => ({ ...p, protein: e.target.value }))} />
            </StyledFormGroup>
            <StyledFormGroup>
              <StyledLabel htmlFor="nut-carbs">Carbs (g)</StyledLabel>
              <Input id="nut-carbs" type="number" placeholder="0" min={0} size="sm" value={formState.carbs} onChange={(e: any) => setFormState(p => ({ ...p, carbs: e.target.value }))} />
            </StyledFormGroup>
            <StyledFormGroup>
              <StyledLabel htmlFor="nut-fat">Fat (g)</StyledLabel>
              <Input id="nut-fat" type="number" placeholder="0" min={0} size="sm" value={formState.fat} onChange={(e: any) => setFormState(p => ({ ...p, fat: e.target.value }))} />
            </StyledFormGroup>
          </StyledFormGrid>
          <Button variant="primary" type="submit" disabled={logMealMutation.isPending} size="sm" style={{ width: '100%' }}>Log Meal</Button>
        </StyledForm>
      </StyledModalContent>
    </Dialog>
    </>
  )
}
