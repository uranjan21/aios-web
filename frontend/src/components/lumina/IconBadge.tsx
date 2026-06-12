import type { LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'

export type IconBadgeColor = 'primary' | 'emerald' | 'blue' | 'purple' | 'red' | 'amber' | 'muted'

export interface IconBadgeProps {
  icon: LucideIcon
  color?: IconBadgeColor
  size?: 'sm' | 'md'
  className?: string
}

const COLOR_CLASSES: Record<IconBadgeColor, string> = {
  primary: 'bg-primary/10 text-primary',
  emerald: 'bg-kpi-emerald/10 text-kpi-emerald',
  blue: 'bg-kpi-blue/10 text-kpi-blue',
  purple: 'bg-kpi-purple/10 text-kpi-purple',
  red: 'bg-kpi-red/10 text-kpi-red',
  amber: 'bg-kpi-amber/10 text-kpi-amber',
  muted: 'bg-muted text-muted-foreground',
}

const SIZE_CLASSES: Record<'sm' | 'md', string> = {
  sm: 'w-7 h-7',
  md: 'w-8 h-8',
}

const ICON_SIZE: Record<'sm' | 'md', number> = {
  sm: 14,
  md: 16,
}

export function IconBadge({ icon: Icon, color = 'primary', size = 'md', className }: IconBadgeProps) {
  return (
    <div className={cn('rounded-xl flex items-center justify-center shrink-0', SIZE_CLASSES[size], COLOR_CLASSES[color], className)}>
      <Icon size={ICON_SIZE[size]} />
    </div>
  )
}
