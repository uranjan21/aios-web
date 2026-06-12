import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { healthApi } from '@/api/areas'
import { Target, Dumbbell, Droplets, Scale, CheckCircle2 } from 'lucide-react'
import { cn } from '@/lib/utils'

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
    color: 'text-primary',
    getValue: (summary) => summary?.weight != null ? Number(summary.weight) : null,
  },
  {
    key: 'weekly_gym',
    label: 'Weekly Sessions',
    unit: 'sessions/week',
    defaultTarget: 5,
    icon: Dumbbell,
    color: 'text-emerald-500',
    getValue: (_, streak, gymLogs) => {
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
    color: 'text-cyan-500',
    getValue: (_, __, waterLogs) => {
      if (!waterLogs) return null
      const today = new Date().toISOString().slice(0, 10)
      const todayLogs = waterLogs.filter(l => String(l.logged_at).startsWith(today))
      return todayLogs.reduce((s, l) => s + Number(l.value ?? 0), 0)
    },
  },
]

function GoalCard({ goal, current, target, onTargetChange }: {
  goal: Goal
  current: number | null
  target: number
  onTargetChange: (val: number) => void
}) {
  const Icon = goal.icon
  const pct = current != null && target > 0
    ? Math.min((goal.key === 'weight'
      ? Math.max(0, 1 - (current - target) / target) * 100
      : (current / target) * 100), 100)
    : 0
  const done = goal.key === 'weight'
    ? (current != null && current <= target)
    : (current != null && current >= target)

  return (
    <div className="bg-card border border-subtle shadow-premium-sm rounded-xl p-3">
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className={cn('p-1.5 rounded-lg bg-muted/50', goal.color)}>
            <Icon className="w-3.5 h-3.5" />
          </div>
          <span className="text-[12px] font-medium text-foreground">{goal.label}</span>
        </div>
        {done && <CheckCircle2 className="w-4 h-4 text-kpi-emerald" />}
      </div>

      <div className="flex items-baseline gap-2 mb-3">
        <span className="text-xs font-bold font-mono text-foreground">
          {current != null ? current : '—'}
        </span>
        <span className="text-[10px] text-muted-foreground">/ {target} {goal.unit}</span>
      </div>

      <div className="h-1.5 bg-muted/60 rounded-full overflow-hidden mb-3">
        <div
          className={cn('h-full rounded-full transition-all duration-500', done ? 'bg-kpi-emerald' : 'bg-primary')}
          style={{ width: `${pct}%` }}
        />
      </div>

      <div className="flex items-center gap-2 mt-2">
        <label className="text-[10px] text-muted-foreground shrink-0">Target:</label>
        <input
          type="number"
          value={target}
          min={0.1}
          step={goal.key === 'daily_water' ? 0.5 : 1}
          onChange={e => onTargetChange(parseFloat(e.target.value) || target)}
          className="w-16 px-1.5 py-0.5 text-[11px] font-mono bg-muted/50 border border-border/60 rounded text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
        />
        <span className="text-[10px] text-muted-foreground">{goal.unit}</span>
      </div>
    </div>
  )
}

const STORAGE_KEY = 'aios_fitness_goals'

function loadGoalTargets(): Record<string, number> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) : {}
  } catch {
    return {}
  }
}

function saveGoalTargets(targets: Record<string, number>) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(targets))
}

export function FitnessGoalsTab() {
  const [targets, setTargets] = useState<Record<string, number>>(() => {
    const saved = loadGoalTargets()
    return GOALS.reduce((acc, g) => ({ ...acc, [g.key]: saved[g.key] ?? g.defaultTarget }), {} as Record<string, number>)
  })

  const { data: summary } = useQuery({ queryKey: ['health', 'summary'], queryFn: healthApi.summary })
  const { data: streak } = useQuery({ queryKey: ['health', 'streak'], queryFn: healthApi.streak })
  const { data: gymLogs } = useQuery({ queryKey: ['health', 'logs', 'gym'], queryFn: () => healthApi.logs('gym') })
  const { data: waterLogs } = useQuery({ queryKey: ['health', 'logs', 'water'], queryFn: () => healthApi.logs('water') })

  const handleTargetChange = (key: string, val: number) => {
    const next = { ...targets, [key]: val }
    setTargets(next)
    saveGoalTargets(next)
  }

  return (
    <div className="space-y-3 max-w-2xl">
      <div className="flex items-center gap-2 mb-1">
        <Target className="w-4 h-4 text-muted-foreground" />
        <span className="text-[11px] text-muted-foreground">Targets are saved locally. Current values update live.</span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {GOALS.map(goal => {
          const logs = goal.key === 'daily_water' ? waterLogs : goal.key === 'weekly_gym' ? gymLogs : undefined
          const current = goal.getValue(summary as Record<string, unknown> | undefined, streak as Record<string, unknown> | undefined, logs as Record<string, unknown>[] | undefined)
          return (
            <GoalCard
              key={goal.key}
              goal={goal}
              current={current}
              target={targets[goal.key]}
              onTargetChange={val => handleTargetChange(goal.key, val)}
            />
          )
        })}
      </div>
    </div>
  )
}
