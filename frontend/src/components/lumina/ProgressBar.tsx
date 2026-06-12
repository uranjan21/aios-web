import { Progress } from '@/components/ui/progress'
import { cn } from '@/lib/utils'

export interface ProgressBarProps {
  value: number
  colorClassName?: string
  glow?: boolean
  size?: 'sm' | 'md'
}

export function ProgressBar({ value, colorClassName = 'bg-primary', glow, size = 'md' }: ProgressBarProps) {
  return (
    <Progress
      value={value}
      className={cn(size === 'sm' ? 'h-1.5' : 'h-2')}
      indicatorClassName={cn(colorClassName, glow && 'shadow-glow')}
    />
  )
}
