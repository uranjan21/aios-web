import { Dumbbell, Droplets, Scale } from 'lucide-react'

export interface Goal {
  key: string
  label: string
  unit: string
  defaultTarget: number
  icon: React.FC<{ className?: string }>
  color: string
  getValue: (summary: Record<string, unknown> | undefined, streak: Record<string, unknown> | undefined, logs: Record<string, unknown>[] | undefined) => number | null
}

export const GOALS: Goal[] = [
  {
    key: 'weight',
    label: 'Target Weight',
    unit: 'kg',
    defaultTarget: 75,
    icon: Scale,
    color: 'var(--primary)',
    getValue: (summary) => summary?.weight != null ? Number(summary.weight) : null,
  },
  {
    key: 'weekly_gym',
    label: 'Weekly Sessions',
    unit: 'sessions/week',
    defaultTarget: 5,
    icon: Dumbbell,
    color: '#F8D168',
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
    color: '#F4A261',
    getValue: (_, __, waterLogs) => {
      if (!waterLogs) return null
      const today = new Date().toISOString().slice(0, 10)
      const todayLogs = waterLogs.filter(l => String(l.logged_at).startsWith(today))
      return todayLogs.reduce((s, l) => s + Number(l.value ?? 0), 0)
    },
  },
]
