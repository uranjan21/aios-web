import { KpiCard } from '@ledgr/ui'
import { CheckCircle2 } from 'lucide-react'
import type { Goal } from './goals'

export function GoalCard({ goal, current, target }: {
  goal: Goal
  current: number | null
  target: number
}) {
  const done = goal.key === 'weight'
    ? (current != null && current <= target)
    : (current != null && current >= target)

  return (
    <KpiCard
      label={goal.label}
      icon={goal.icon}
      action={done ? <CheckCircle2 size={16} style={{ color: 'var(--primary)' }} /> : undefined}
      value={`${current != null ? current : '—'} / ${target} ${goal.unit}`}
    />
  )
}
