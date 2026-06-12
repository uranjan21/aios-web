import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Button, Form, Input, Select, AutoComplete, InputNumber } from 'antd'
import { Plus, Utensils, Clock, Search } from 'lucide-react'
import { healthApi } from '@/api/areas'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'
import { format } from 'date-fns'
import type { FoodDbItem } from '@/types'

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

function MacroBar({ label, current, target, unit = 'g', color }: MacroBarProps) {
  const pct = target > 0 ? Math.min(100, Math.round((current / target) * 100)) : 0
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-[11px]">
        <span className="font-medium text-foreground">{label}</span>
        <span className="text-muted-foreground">{current}{unit} / {target}{unit}</span>
      </div>
      <div className="h-2 bg-muted rounded-full overflow-hidden">
        <div className="h-full rounded-full transition-all duration-500" style={{ width: `${pct}%`, background: color }} />
      </div>
    </div>
  )
}

interface CalorieRingProps {
  calories: number
  target: number
}

function CalorieRing({ calories, target }: CalorieRingProps) {
  const pct = target > 0 ? Math.min(100, (calories / target) * 100) : 0
  const size = 120
  const stroke = 10
  const r = (size - stroke) / 2
  const circ = 2 * Math.PI * r
  const offset = circ - (pct / 100) * circ

  return (
    <div className="flex flex-col items-center gap-2">
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="-rotate-90">
          <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="hsl(var(--muted))" strokeWidth={stroke} />
          <circle
            cx={size / 2} cy={size / 2} r={r} fill="none"
            stroke="#f97316" strokeWidth={stroke}
            strokeDasharray={circ} strokeDashoffset={offset}
            strokeLinecap="round"
            style={{ transition: 'stroke-dashoffset 0.5s ease' }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-xl font-bold text-foreground">{calories}</span>
          <span className="text-[10px] text-muted-foreground">kcal</span>
        </div>
      </div>
      <p className="text-[11px] text-muted-foreground">Target: {target} kcal · {Math.round(pct)}% reached</p>
    </div>
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

export function NutritionTab() {
  const [form] = Form.useForm()
  const queryClient = useQueryClient()
  const [showForm, setShowForm] = useState(false)
  const [foodQuery, setFoodQuery] = useState('')
  const [selectedFood, setSelectedFood] = useState<FoodDbItem | null>(null)
  const [grams, setGrams] = useState<number | null>(null)

  const { data: foods } = useQuery({
    queryKey: ['health', 'foods', foodQuery],
    queryFn: () => healthApi.foods(foodQuery || undefined),
    enabled: showForm,
  })

  // Scale per-100g macros to the chosen quantity and fill the form
  const applyFood = (food: FoodDbItem, qty: number) => {
    const f = qty / 100
    form.setFieldsValue({
      food_name: food.name,
      calories: String(Math.round(food.calories * f)),
      protein: String(Math.round(food.protein * f * 10) / 10),
      carbs: String(Math.round(food.carbs * f * 10) / 10),
      fat: String(Math.round(food.fat * f * 10) / 10),
    })
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
      form.resetFields()
      setShowForm(false)
    },
    onError: () => toast.error('Failed to log meal'),
  })

  const handleQuickAdd = (item: typeof QUICK_ADDS[0]) => {
    form.setFieldsValue({
      food_name: item.label.replace(/^[^\s]+ /, ''),
      calories: String(item.kcal),
      protein: String(item.protein),
      carbs: String(item.carbs),
      fat: String(item.fat),
      meal_type: item.type,
    })
    setShowForm(true)
  }

  const calorieTarget = goals?.calorie_target ?? 2000
  const proteinTarget = goals?.protein_target ?? 150
  const carbTarget = goals?.carb_target ?? 250
  const fatTarget = goals?.fat_target ?? 65

  return (
    <div className="space-y-4 max-w-2xl">
      {/* Calorie ring + macros */}
      <div className="bg-card border border-subtle rounded-xl p-4 shadow-premium-sm">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-4">Today's Nutrition</p>
        {loadingNutrition || loadingGoals ? (
          <Skeleton className="h-40 w-full" />
        ) : (
          <div className="flex flex-col sm:flex-row items-center gap-6">
            <CalorieRing calories={nutrition?.calories ?? 0} target={calorieTarget} />
            <div className="flex-1 w-full space-y-3">
              <MacroBar label="Protein" current={nutrition?.protein ?? 0} target={proteinTarget} color="#10b981" />
              <MacroBar label="Carbs" current={nutrition?.carbs ?? 0} target={carbTarget} color="#f59e0b" />
              <MacroBar label="Fat" current={nutrition?.fat ?? 0} target={fatTarget} color="#f43f5e" />
            </div>
          </div>
        )}
      </div>

      {/* Quick adds */}
      <div>
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Quick Add</p>
        <div className="flex gap-2 flex-wrap">
          {QUICK_ADDS.map(item => (
            <button
              key={item.label}
              onClick={() => handleQuickAdd(item)}
              className="text-[11px] font-medium px-3 py-1.5 rounded-lg bg-muted hover:bg-muted/70 text-foreground border border-border/60 transition"
            >
              {item.label} <span className="text-muted-foreground">{item.kcal}kcal</span>
            </button>
          ))}
        </div>
      </div>

      {/* Log meal form */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Utensils className="w-4 h-4 text-muted-foreground" />
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Log a Meal</p>
        </div>
        {!showForm && (
          <Button type="primary" size="small" icon={<Plus className="w-3.5 h-3.5" />} onClick={() => setShowForm(true)}>
            Add Meal
          </Button>
        )}
      </div>

      {showForm && (
        <div className="bg-muted/40 border border-border/60 rounded-xl p-4">
          <div className="flex gap-2 mb-3">
            <AutoComplete
              className="flex-1"
              placeholder="Search food database — Roti, Dal, Paneer…"
              onSearch={setFoodQuery}
              onSelect={handleFoodSelect}
              options={(foods ?? []).map(f => ({
                value: f.name,
                label: (
                  <div className="flex justify-between gap-2">
                    <span>{f.name}</span>
                    <span className="text-muted-foreground text-[11px]">{f.calories} kcal/100g{f.serving_desc ? ` · ${f.serving_desc}` : ''}</span>
                  </div>
                ),
              }))}
              suffixIcon={<Search size={12} />}
              allowClear
              onClear={() => { setSelectedFood(null); setGrams(null) }}
            />
            <InputNumber
              placeholder="g"
              min={1}
              className="w-24"
              value={grams}
              onChange={handleGramsChange}
              disabled={!selectedFood}
              addonAfter="g"
            />
          </div>
          {selectedFood && grams && (
            <div className="text-[11px] text-muted-foreground mb-2">
              {selectedFood.name} × {grams}g — macros auto-filled below, adjust if needed
            </div>
          )}
          <Form form={form} layout="vertical" onFinish={logMealMutation.mutate} requiredMark={false}>
            <div className="grid grid-cols-2 gap-3">
              <Form.Item name="food_name" label={<span className="text-[11px] text-muted-foreground">Food Name</span>} rules={[{ required: true }]} className="col-span-2">
                <Input placeholder="e.g. Chicken Rice Bowl" />
              </Form.Item>
              <Form.Item name="meal_type" label={<span className="text-[11px] text-muted-foreground">Meal Type</span>}>
                <Select placeholder="Snack" defaultValue="Snack">
                  {MEAL_TYPES.map(m => <Select.Option key={m} value={m}>{m}</Select.Option>)}
                </Select>
              </Form.Item>
              <Form.Item name="calories" label={<span className="text-[11px] text-muted-foreground">Calories</span>} rules={[{ required: true }]}>
                <Input type="number" suffix="kcal" placeholder="0" min="0" />
              </Form.Item>
              <Form.Item name="protein" label={<span className="text-[11px] text-muted-foreground">Protein (g)</span>}>
                <Input type="number" suffix="g" placeholder="0" min="0" />
              </Form.Item>
              <Form.Item name="carbs" label={<span className="text-[11px] text-muted-foreground">Carbs (g)</span>}>
                <Input type="number" suffix="g" placeholder="0" min="0" />
              </Form.Item>
              <Form.Item name="fat" label={<span className="text-[11px] text-muted-foreground">Fat (g)</span>}>
                <Input type="number" suffix="g" placeholder="0" min="0" />
              </Form.Item>
            </div>
            <div className="flex gap-2">
              <Button type="primary" htmlType="submit" loading={logMealMutation.isPending} size="small">Log Meal</Button>
              <Button type="text" size="small" onClick={() => { setShowForm(false); form.resetFields() }}>Cancel</Button>
            </div>
          </Form>
        </div>
      )}

      {/* Today's meals */}
      <div className="bg-card border border-subtle rounded-xl overflow-hidden shadow-premium-sm">
        <div className="px-4 py-2.5 border-b border-border/40">
          <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">Today's Meals</p>
        </div>
        {loadingNutrition ? (
          <div className="p-3 space-y-2">{[1, 2, 3].map(i => <Skeleton key={i} className="h-12 w-full" />)}</div>
        ) : !nutrition?.meals.length ? (
          <div className="p-8 text-center text-sm text-muted-foreground">No meals logged today.</div>
        ) : (
          <div className="divide-y divide-border/40">
            {nutrition.meals.map(meal => {
              const parsed = parseMealNotes(meal.notes)
              return (
                <div key={meal.id} className="flex items-center justify-between px-4 py-3 hover:bg-muted/20 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="p-1.5 bg-primary/10 rounded-lg">
                      <Utensils className="w-3.5 h-3.5 text-primary" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-foreground">{parsed.food_name}</p>
                      <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                        <Clock className="w-3 h-3" />
                        {format(new Date(meal.logged_at), 'h:mm a')}
                        <span className="capitalize">· {parsed.meal_type}</span>
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold text-foreground">{parsed.protein + parsed.carbs + parsed.fat > 0 ? `${Math.round((parsed.protein * 4 + parsed.carbs * 4 + parsed.fat * 9))} kcal` : ''}</p>
                    <p className="text-[10px] text-muted-foreground">
                      P:{parsed.protein}g C:{parsed.carbs}g F:{parsed.fat}g
                    </p>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
