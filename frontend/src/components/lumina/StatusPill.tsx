import { cn } from '@/lib/utils'

export type StatusPillTone = 'neutral' | 'primary' | 'emerald' | 'blue' | 'purple' | 'red' | 'amber'

export interface StatusPillProps {
  label: string
  tone?: StatusPillTone
  className?: string
}

const TONE_CLASSES: Record<StatusPillTone, string> = {
  neutral: 'bg-muted text-muted-foreground',
  primary: 'bg-primary/10 text-primary',
  emerald: 'bg-kpi-emerald/10 text-kpi-emerald',
  blue: 'bg-kpi-blue/10 text-kpi-blue',
  purple: 'bg-kpi-purple/10 text-kpi-purple',
  red: 'bg-kpi-red/10 text-kpi-red',
  amber: 'bg-kpi-amber/10 text-kpi-amber',
}

export function StatusPill({ label, tone = 'neutral', className }: StatusPillProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wide',
        TONE_CLASSES[tone],
        className
      )}
    >
      {label}
    </span>
  )
}
