import type { LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'
import { GlassCard } from './GlassCard'
import { IconBadge } from './IconBadge'

export type KpiColor = 'emerald' | 'blue' | 'purple' | 'red' | 'amber' | 'primary'

export interface KpiCardProps {
  label: string
  value: React.ReactNode
  icon?: LucideIcon
  color?: KpiColor
  trend?: { value: number; direction: 'up' | 'down' }
  loading?: boolean
  className?: string
}

const GLOW_COLOR: Record<KpiColor, string> = {
  emerald: 'hsl(var(--kpi-emerald))',
  blue: 'hsl(var(--kpi-blue))',
  purple: 'hsl(var(--kpi-purple))',
  red: 'hsl(var(--kpi-red))',
  amber: 'hsl(var(--kpi-amber))',
  primary: 'hsl(var(--primary))',
}

export function KpiCard({ label, value, icon: Icon, color = 'primary', trend, loading, className }: KpiCardProps) {
  return (
    <GlassCard className={cn('relative overflow-hidden', className)} hoverable>
      <div
        className="pointer-events-none absolute -top-8 -right-8 w-24 h-24 rounded-full blur-2xl opacity-20"
        style={{ background: GLOW_COLOR[color] }}
      />
      <div className="relative flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="section-label mb-1.5">{label}</div>
          {loading ? (
            <div className="h-7 w-16 rounded bg-muted count-loading" />
          ) : (
            <div className="tabular-nums text-2xl font-semibold tracking-tight text-foreground">{value}</div>
          )}
          {trend && (
            <div className={cn('mt-1 text-[11px] font-medium tabular-nums', trend.direction === 'up' ? 'text-kpi-emerald' : 'text-kpi-red')}>
              {trend.direction === 'up' ? '+' : '-'}{Math.abs(trend.value)}%
            </div>
          )}
        </div>
        {Icon && <IconBadge icon={Icon} color={color} />}
      </div>
    </GlassCard>
  )
}
