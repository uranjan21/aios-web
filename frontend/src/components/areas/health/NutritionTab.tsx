import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import styled from 'styled-components'

import { Utensils, Clock, Search, Plus, Flame, ListChecks } from 'lucide-react'
import { healthApi } from '@/api/areas'
import { Skeleton } from '@/components/ui/skeleton'
import { format } from 'date-fns'
import type { FoodDbItem } from '@/types'
import { Card as GlassCard } from '@ledgr/ui';
import { WorkspaceLayout, RailHeading } from '@/components/layout/WorkspaceLayout'
import { Dialog, Button, Input, Select, SelectItem, Card, HeaderActionPortal, SegmentedControl } from '@ledgr/ui'

const MEAL_TYPES = ['Breakfast', 'Lunch', 'Dinner', 'Snack']

const QUICK_ADDS = [
  { label: '🍛 Dal Rice', kcal: 450, protein: 12, carbs: 75, fat: 8, type: 'Lunch' },
  { label: '🫓 Roti', kcal: 100, protein: 3, carbs: 18, fat: 2, type: 'Dinner' },
  { label: '🥛 Whey', kcal: 130, protein: 24, carbs: 5, fat: 2, type: 'Snack' },
  { label: '☕ Coffee', kcal: 15, protein: 1, carbs: 2, fat: 1, type: 'Snack' },
]

interface MacroBarProps {
  label: string
  current: number
  target: number
  unit?: string
  color: string
}

const StyledMacroBarWrapper = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
`;

const StyledMacroBarHeader = styled.div`
  display: flex;
  justify-content: space-between;
  font-size: 11px;
`;

const StyledMacroBarLabel = styled.span`
  font-weight: 500;
  color: ${({ theme }) => theme.color?.foreground || 'var(--foreground)'};
`;

const StyledMacroBarValues = styled.span`
  color: ${({ theme }) => theme.color?.mutedForeground || 'var(--muted-foreground)'};
`;

const StyledMacroBarTrack = styled.div`
  height: 0.5rem;
  background-color: ${({ theme }) => theme.color?.muted || 'var(--muted)'};
  border-radius: 9999px;
  overflow: hidden;
`;

const StyledMacroBarFill = styled.div<{ $pct: number; $color: string }>`
  height: 100%;
  border-radius: 9999px;
  transition: width 0.5s ease;
  width: ${({ $pct }) => `${$pct}%`};
  background-color: ${({ $color }) => $color};
`;

function MacroBar({ label, current, target, unit = 'g', color }: MacroBarProps) {
  const pct = target > 0 ? Math.min(100, Math.round((current / target) * 100)) : 0
  return (
    <StyledMacroBarWrapper>
      <StyledMacroBarHeader>
        <StyledMacroBarLabel>{label}</StyledMacroBarLabel>
        <StyledMacroBarValues>{current}{unit} / {target}{unit}</StyledMacroBarValues>
      </StyledMacroBarHeader>
      <StyledMacroBarTrack>
        <StyledMacroBarFill $pct={pct} $color={color} />
      </StyledMacroBarTrack>
    </StyledMacroBarWrapper>
  )
}

interface CalorieRingProps {
  calories: number
  target: number
}

const StyledCalorieRingWrapper = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.5rem;
`;

const StyledCalorieRingSvgWrapper = styled.div`
  position: relative;
`;

const StyledCalorieRingSvg = styled.svg`
  transform: rotate(-90deg);
`;

const StyledCalorieRingTextWrapper = styled.div`
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
`;

const StyledCalorieRingValue = styled.span`
  font-size: 1.25rem;
  font-weight: 700;
  color: ${({ theme }) => theme.color?.foreground || 'var(--foreground)'};
`;

const StyledCalorieRingUnit = styled.span`
  font-size: 10px;
  color: ${({ theme }) => theme.color?.mutedForeground || 'var(--muted-foreground)'};
`;

const StyledCalorieRingSubtitle = styled.p`
  font-size: 11px;
  color: ${({ theme }) => theme.color?.mutedForeground || 'var(--muted-foreground)'};
  margin: 0;
`;

function CalorieRing({ calories, target }: CalorieRingProps) {
  const pct = target > 0 ? Math.min(100, (calories / target) * 100) : 0
  const size = 120
  const stroke = 10
  const r = (size - stroke) / 2
  const circ = 2 * Math.PI * r
  const offset = circ - (pct / 100) * circ

  return (
    <StyledCalorieRingWrapper>
      <StyledCalorieRingSvgWrapper style={{ width: size, height: size }}>
        <StyledCalorieRingSvg width={size} height={size}>
          <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--muted)" strokeWidth={stroke} />
          <circle
            cx={size / 2} cy={size / 2} r={r} fill="none"
            stroke="#F8D168" strokeWidth={stroke}
            strokeDasharray={circ} strokeDashoffset={offset}
            strokeLinecap="round"
            style={{ transition: 'stroke-dashoffset 0.5s ease' }}
          />
        </StyledCalorieRingSvg>
        <StyledCalorieRingTextWrapper>
          <StyledCalorieRingValue>{calories}</StyledCalorieRingValue>
          <StyledCalorieRingUnit>kcal</StyledCalorieRingUnit>
        </StyledCalorieRingTextWrapper>
      </StyledCalorieRingSvgWrapper>
      <StyledCalorieRingSubtitle>Target: {target} kcal · {Math.round(pct)}% reached</StyledCalorieRingSubtitle>
    </StyledCalorieRingWrapper>
  )
}

interface ParsedMeal {
  food_name: string
  protein: number
  carbs: number
  fat: number
  meal_type: string
}

function parseMealNotes(notes: string | null): ParsedMeal {
  if (!notes) return { food_name: 'Meal', protein: 0, carbs: 0, fat: 0, meal_type: 'snack' }
  try {
    return JSON.parse(notes) as ParsedMeal
  } catch {
    return { food_name: notes, protein: 0, carbs: 0, fat: 0, meal_type: 'snack' }
  }
}

const StyledContainer = styled.div`
  display: flex;
  flex-direction: column;
  gap: 1rem;
`;

const StyledMacrosWrapper = styled.div`
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
  align-items: center;

  @media (min-width: 640px) {
    flex-direction: row;
  }
`;

const StyledMacroBarsContainer = styled.div`
  flex: 1;
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
`;
const StyledEmptyState = styled.div`
  padding: 2rem;
  text-align: center;
  font-size: 0.875rem;
  color: ${({ theme }) => theme.color?.mutedForeground || 'var(--muted-foreground)'};
`;

const StyledMealsList = styled.div`
  display: flex;
  flex-direction: column;
  
  & > div {
    border-bottom: 1px solid rgba(45, 49, 58, 0.15);
  }
  
  & > div:last-child {
    border-bottom: none;
  }
`;

const StyledMealItem = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.75rem 20px;
  transition: background-color 0.2s;
  
  &:hover {
    background-color: rgba(45, 49, 58, 0.02);
  }
`;

const StyledMealInfo = styled.div`
  display: flex;
  align-items: center;
  gap: 0.75rem;
`;

const StyledMealIconWrapper = styled.div`
  padding: 0.375rem;
  border-radius: 0.5rem;
  background-color: rgba(248, 209, 104, 0.1);
`;

const StyledMealName = styled.p`
  font-size: 0.875rem;
  font-weight: 500;
  color: ${({ theme }) => theme.color?.foreground || 'var(--foreground)'};
  margin: 0;
`;

const StyledMealTime = styled.div`
  display: flex;
  align-items: center;
  gap: 0.375rem;
  font-size: 10px;
  color: ${({ theme }) => theme.color?.mutedForeground || 'var(--muted-foreground)'};
  margin-top: 0.125rem;
`;

const StyledMealType = styled.span`
  text-transform: capitalize;
`;

const StyledMealStats = styled.div`
  text-align: right;
`;

const StyledMealCalories = styled.p`
  font-size: 0.875rem;
  font-weight: 700;
  color: ${({ theme }) => theme.color?.foreground || 'var(--foreground)'};
  margin: 0;
`;

const StyledMealMacros = styled.p`
  font-size: 10px;
  color: ${({ theme }) => theme.color?.mutedForeground || 'var(--muted-foreground)'};
  margin: 0;
`;

const StyledModalContent = styled.div`
  display: flex;
  flex-direction: column;
  gap: 1rem;
`;

const StyledQuickAddSection = styled.div`
  margin-bottom: 0.5rem;
`;

const StyledQuickAddTitle = styled.p`
  font-size: 11px;
  color: ${({ theme }) => theme.color?.mutedForeground || 'var(--muted-foreground)'};
  margin: 0 0 0.375rem 0;
`;

const StyledQuickAddButtons = styled.div`
  display: flex;
  gap: 0.375rem;
  flex-wrap: wrap;
`;

const StyledQuickAddButton = styled.button`
  font-size: 11px;
  font-weight: 500;
  padding: 0.25rem 0.5rem;
  border-radius: 0.5rem;
  background-color: ${({ theme }) => theme.color?.muted || 'var(--muted)'};
  color: ${({ theme }) => theme.color?.foreground || 'var(--foreground)'};
  border: 1px solid rgba(45, 49, 58, 0.15);
  transition: background-color 0.2s;
  cursor: pointer;
  
  &:hover {
    background-color: rgba(45, 49, 58, 0.2);
  }
`;

const StyledSearchSection = styled.div`
  display: flex;
  gap: 0.5rem;
  margin-bottom: 0.5rem;
`;

const StyledSearchInputWrapper = styled.div`
  flex: 1;
  position: relative;
`;

const StyledSearchFeedback = styled.div`
  font-size: 11px;
  color: ${({ theme }) => theme.color?.mutedForeground || 'var(--muted-foreground)'};
  margin-bottom: 0.5rem;
`;

const StyledForm = styled.form`
  display: flex;
  flex-direction: column;
  gap: 1rem;
`;

const StyledFormGroup = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
`;

const StyledLabel = styled.label`
  font-size: 11px;
  color: ${({ theme }) => theme.color?.mutedForeground || 'var(--muted-foreground)'};
  display: block;
`;

const StyledFormGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 0.5rem;
`;

const StyledButtonContent = styled.span`
  display: flex;
  align-items: center;
  gap: 0.375rem;
`;

export function NutritionTab() {
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
      food_name: item.label.replace(/^[^\s]+ /, ''),
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
          <Plus size={12} style={{ marginRight: 4 }} /> Log Meal
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
                <MacroBar label="Protein" current={nutrition?.protein ?? 0} target={proteinTarget} color="#F8D168" />
                <MacroBar label="Carbs" current={nutrition?.carbs ?? 0} target={carbTarget} color="#F8D168" />
                <MacroBar label="Fat" current={nutrition?.fat ?? 0} target={fatTarget} color="#F4A261" />
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
            <SegmentedControl
              size="sm"
              aria-label="Filter meals by type"
              value={mealFilter}
              onChange={(v) => setMealFilter(v as typeof mealFilter)}
              options={[
                { value: 'all', label: 'All' },
                { value: 'Breakfast', label: 'B' },
                { value: 'Lunch', label: 'L' },
                { value: 'Dinner', label: 'D' },
                { value: 'Snack', label: 'S' },
              ]}
            />
          }
          size="none"
        >
          {loadingNutrition ? (
            <div style={{ padding: '0.75rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>{[1, 2, 3].map(i => <Skeleton key={i} style={{ height: '3rem', width: '100%' }} />)}</div>
          ) : !nutrition?.meals.length ? (
            <StyledEmptyState>No meals logged today. Use the rail to log one.</StyledEmptyState>
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
                  <StyledMealItem key={meal.id}>
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
            {QUICK_ADDS.map(item => (
              <StyledQuickAddButton key={item.label} onClick={() => handleQuickAdd(item)}>
                {item.label}
              </StyledQuickAddButton>
            ))}
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
          />
        </StyledSearchSection>
        
        {selectedFood && grams && (
          <StyledSearchFeedback>
            {selectedFood.name} × {grams}g — macros auto-filled
          </StyledSearchFeedback>
        )}
        
        <StyledForm onSubmit={e => { e.preventDefault(); logMealMutation.mutate(formState); }}>
          <StyledFormGroup>
            <StyledLabel>Food Name</StyledLabel>
            <Input required placeholder="e.g. Chicken Rice Bowl" size="sm" value={formState.food_name} onChange={(e: any) => setFormState(p => ({ ...p, food_name: e.target.value }))} />
          </StyledFormGroup>
          <StyledFormGroup>
            <StyledLabel>Meal Type</StyledLabel>
            <Select size="sm" value={formState.meal_type} onChange={(v: any) => setFormState(p => ({ ...p, meal_type: v }))}>
              {MEAL_TYPES.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}
            </Select>
          </StyledFormGroup>
          <StyledFormGrid>
            <StyledFormGroup>
              <StyledLabel>Calories</StyledLabel>
              <Input type="number" required placeholder="0" min={0} size="sm" value={formState.calories} onChange={(e: any) => setFormState(p => ({ ...p, calories: e.target.value }))} />
            </StyledFormGroup>
            <StyledFormGroup>
              <StyledLabel>Protein (g)</StyledLabel>
              <Input type="number" placeholder="0" min={0} size="sm" value={formState.protein} onChange={(e: any) => setFormState(p => ({ ...p, protein: e.target.value }))} />
            </StyledFormGroup>
            <StyledFormGroup>
              <StyledLabel>Carbs (g)</StyledLabel>
              <Input type="number" placeholder="0" min={0} size="sm" value={formState.carbs} onChange={(e: any) => setFormState(p => ({ ...p, carbs: e.target.value }))} />
            </StyledFormGroup>
            <StyledFormGroup>
              <StyledLabel>Fat (g)</StyledLabel>
              <Input type="number" placeholder="0" min={0} size="sm" value={formState.fat} onChange={(e: any) => setFormState(p => ({ ...p, fat: e.target.value }))} />
            </StyledFormGroup>
          </StyledFormGrid>
          <Button variant="primary" type="submit" disabled={logMealMutation.isPending} size="sm" style={{ width: '100%' }}>Log Meal</Button>
        </StyledForm>
      </StyledModalContent>
    </Dialog>
    </>
  )
}
