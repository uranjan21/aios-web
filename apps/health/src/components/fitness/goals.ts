import { Dumbbell, Droplets, Scale } from 'lucide-react'

export interface Goal {
  key: string
  label: string
  unit: string
  defaultTarget: number
  icon: React.FC<{ className?: string }>
  // No `color` field: GoalCard renders the icon and progress from the theme,
  // and never read the per-goal colour these entries used to carry.
  getValue: (summary: Record<string, unknown> | undefined, streak: Record<string, unknown> | undefined, logs: Record<string, unknown>[] | undefined) => number | null
}

export const GOALS: Goal[] = [
  {
    key: 'weight',
    label: 'Target Weight',
    unit: 'kg',
    defaultTarget: 75,
    icon: Scale,
    getValue: (summary) => summary?.weight != null ? Number(summary.weight) : null,
  },
  {
    key: 'weekly_gym',
    label: 'Weekly Sessions',
    unit: 'sessions/week',
    defaultTarget: 5,
    icon: Dumbbell,
    getValue: (_, __, gymLogs) => {
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
    getValue: (_, __, waterLogs) => {
      if (!waterLogs) return null
      const today = new Date().toISOString().slice(0, 10)
      const todayLogs = waterLogs.filter(l => String(l.logged_at).startsWith(today))
      return todayLogs.reduce((s, l) => s + Number(l.value ?? 0), 0)
    },
  },
]
