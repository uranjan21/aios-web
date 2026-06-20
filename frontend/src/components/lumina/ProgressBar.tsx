import { Progress } from '@/components/ui/progress'

// Color class → actual color value mapping (replacing Tailwind utilities)
const CLASS_TO_HEX: Record<string, string> = {
  'bg-primary':     '#1e50d0',
  'bg-kpi-emerald': '#16a34a',
  'bg-kpi-blue':    '#0284c7',
  'bg-kpi-purple':  '#7c3aed',
  'bg-kpi-red':     '#dc2626',
  'bg-kpi-amber':   '#d97706',
}

export interface ProgressBarProps {
  value: number
  color?: string
  /** @deprecated Pass color hex directly via color prop */
  colorClassName?: string
  glow?: boolean
  size?: 'sm' | 'md'
}

export function ProgressBar({ value, color, colorClassName, size = 'md' }: ProgressBarProps) {
  const resolvedColor = color ?? (colorClassName ? CLASS_TO_HEX[colorClassName] : undefined)
  return <Progress value={value} height={size === 'sm' ? 6 : 8} color={resolvedColor} />
}
