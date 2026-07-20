import { Progress } from '@aios/shared/components/ui/progress'

export interface ProgressBarProps {
  value: number
  /** Any CSS colour. Prefer a theme token or `var(--*)` over a literal. */
  color?: string
  glow?: boolean
  size?: 'sm' | 'md'
}

export function ProgressBar({ value, color, size = 'md' }: ProgressBarProps) {
  return <Progress value={value} height={size === 'sm' ? 6 : 8} color={color} />
}
