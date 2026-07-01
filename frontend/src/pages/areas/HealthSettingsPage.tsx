import { useEffect, useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Heart, Scale, Dumbbell, Apple } from 'lucide-react'
import { Card, Input, Button } from '@ledgr/ui'
import { healthApi } from '@/api/areas'
import type { HealthGoal } from '@/types'
import { AreaSettingsPage } from '@/components/layout/AreaSettingsPage'
import styled from 'styled-components'

const FormBody = styled.div`
  padding: 16px 20px;
  display: flex;
  flex-direction: column;
  gap: 12px;
`

const Label = styled.label`
  font-size: 12px;
  font-weight: 500;
  margin-bottom: 4px;
  display: block;
  color: ${({ theme }) => theme.color.foreground};
`

function BodyGoalsSection() {
  const queryClient = useQueryClient()
  const { data: goals } = useQuery({ queryKey: ['health', 'goals'], queryFn: healthApi.healthGoals })
  const [form, setForm] = useState({ height_cm: '', target_weight: '' })

  useEffect(() => {
    if (goals) {
      setForm({
        height_cm: goals.height_cm != null ? String(goals.height_cm) : '',
        target_weight: goals.target_weight != null ? String(goals.target_weight) : '',
      })
    }
  }, [goals])

  const mutation = useMutation({
    mutationFn: (v: Partial<HealthGoal>) => healthApi.updateHealthGoals(v),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['health', 'goals'] })
      toast.success('Body goals saved')
    },
    onError: () => toast.error('Failed to save body goals'),
  })

  return (
    <Card title="Body Profile" subtitle="Height and target weight — used for BMI and progress tracking" icon={<Scale size={16} />}>
      <FormBody>
        <div>
          <Label htmlFor="goal-height">Height (cm)</Label>
          <Input id="goal-height" type="number" min="0" step="0.1" placeholder="e.g. 175" value={form.height_cm} onChange={e => setForm(f => ({ ...f, height_cm: e.target.value }))} />
        </div>
        <div>
          <Label htmlFor="goal-target-weight">Target weight (kg)</Label>
          <Input id="goal-target-weight" type="number" min="0" step="0.1" placeholder="e.g. 75" value={form.target_weight} onChange={e => setForm(f => ({ ...f, target_weight: e.target.value }))} />
        </div>
        <div>
          <Button
            variant="primary"
            size="sm"
            loading={mutation.isPending}
            onClick={() => mutation.mutate({
              height_cm: form.height_cm ? parseFloat(form.height_cm) : undefined,
              target_weight: form.target_weight ? parseFloat(form.target_weight) : undefined,
            })}
          >
            Save
          </Button>
        </div>
      </FormBody>
    </Card>
  )
}

function FitnessGoalsSection() {
  const queryClient = useQueryClient()
  const { data: goals } = useQuery({ queryKey: ['health', 'goals'], queryFn: healthApi.healthGoals })
  const [form, setForm] = useState({ target_workouts_per_week: '', target_water_l_per_day: '' })

  useEffect(() => {
    if (goals) {
      setForm({
        target_workouts_per_week: goals.target_workouts_per_week != null ? String(goals.target_workouts_per_week) : '',
        target_water_l_per_day: goals.target_water_l_per_day != null ? String(goals.target_water_l_per_day) : '',
      })
    }
  }, [goals])

  const mutation = useMutation({
    mutationFn: (v: Partial<HealthGoal>) => healthApi.updateHealthGoals(v),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['health', 'goals'] })
      toast.success('Fitness goals saved')
    },
    onError: () => toast.error('Failed to save fitness goals'),
  })

  return (
    <Card title="Fitness Targets" subtitle="Weekly workout count and daily water intake goals" icon={<Dumbbell size={16} />}>
      <FormBody>
        <div>
          <Label htmlFor="goal-workouts">Workouts per week</Label>
          <Input id="goal-workouts" type="number" min="0" step="1" placeholder="e.g. 5" value={form.target_workouts_per_week} onChange={e => setForm(f => ({ ...f, target_workouts_per_week: e.target.value }))} />
        </div>
        <div>
          <Label htmlFor="goal-water">Water per day (L)</Label>
          <Input id="goal-water" type="number" min="0" step="0.5" placeholder="e.g. 3" value={form.target_water_l_per_day} onChange={e => setForm(f => ({ ...f, target_water_l_per_day: e.target.value }))} />
        </div>
        <div>
          <Button
            variant="primary"
            size="sm"
            loading={mutation.isPending}
            onClick={() => mutation.mutate({
              target_workouts_per_week: form.target_workouts_per_week ? parseInt(form.target_workouts_per_week, 10) : undefined,
              target_water_l_per_day: form.target_water_l_per_day ? parseFloat(form.target_water_l_per_day) : undefined,
            })}
          >
            Save
          </Button>
        </div>
      </FormBody>
    </Card>
  )
}

function NutritionGoalsSection() {
  const queryClient = useQueryClient()
  const { data: goals } = useQuery({ queryKey: ['health', 'goals'], queryFn: healthApi.healthGoals })
  const [form, setForm] = useState({ calorie_target: '', protein_target: '', carb_target: '', fat_target: '' })

  useEffect(() => {
    if (goals) {
      setForm({
        calorie_target: String(goals.calorie_target ?? ''),
        protein_target: String(goals.protein_target ?? ''),
        carb_target: String(goals.carb_target ?? ''),
        fat_target: String(goals.fat_target ?? ''),
      })
    }
  }, [goals])

  const mutation = useMutation({
    mutationFn: (v: Partial<HealthGoal>) => healthApi.updateHealthGoals(v),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['health', 'goals'] })
      toast.success('Nutrition goals saved')
    },
    onError: () => toast.error('Failed to save nutrition goals'),
  })

  return (
    <Card title="Nutrition Targets" subtitle="Daily calorie and macro goals" icon={<Apple size={16} />}>
      <FormBody>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <div>
            <Label htmlFor="goal-calories">Calories (kcal)</Label>
            <Input id="goal-calories" type="number" min="0" step="50" value={form.calorie_target} onChange={e => setForm(f => ({ ...f, calorie_target: e.target.value }))} />
          </div>
          <div>
            <Label htmlFor="goal-protein">Protein (g)</Label>
            <Input id="goal-protein" type="number" min="0" step="5" value={form.protein_target} onChange={e => setForm(f => ({ ...f, protein_target: e.target.value }))} />
          </div>
          <div>
            <Label htmlFor="goal-carbs">Carbs (g)</Label>
            <Input id="goal-carbs" type="number" min="0" step="5" value={form.carb_target} onChange={e => setForm(f => ({ ...f, carb_target: e.target.value }))} />
          </div>
          <div>
            <Label htmlFor="goal-fat">Fat (g)</Label>
            <Input id="goal-fat" type="number" min="0" step="5" value={form.fat_target} onChange={e => setForm(f => ({ ...f, fat_target: e.target.value }))} />
          </div>
        </div>
        <div>
          <Button
            variant="primary"
            size="sm"
            loading={mutation.isPending}
            onClick={() => mutation.mutate({
              calorie_target: form.calorie_target ? parseInt(form.calorie_target, 10) : undefined,
              protein_target: form.protein_target ? parseInt(form.protein_target, 10) : undefined,
              carb_target: form.carb_target ? parseInt(form.carb_target, 10) : undefined,
              fat_target: form.fat_target ? parseInt(form.fat_target, 10) : undefined,
            })}
          >
            Save
          </Button>
        </div>
      </FormBody>
    </Card>
  )
}

export function HealthSettingsPage() {
  return (
    <AreaSettingsPage
      icon={<Heart />}
      title="Health Settings"
      subtitle="Body, fitness, and nutrition targets used across your dashboards."
      backTo="/app/areas/health"
      groups={[
        {
          label: 'Goals',
          items: [
            { key: 'body', label: 'Body', icon: <Scale size={15} />, content: <BodyGoalsSection /> },
            { key: 'fitness', label: 'Fitness', icon: <Dumbbell size={15} />, content: <FitnessGoalsSection /> },
            { key: 'nutrition', label: 'Nutrition', icon: <Apple size={15} />, content: <NutritionGoalsSection /> },
          ],
        },
      ]}
    />
  )
}
