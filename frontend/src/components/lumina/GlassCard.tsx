import { cn } from '@/lib/utils'

export interface GlassCardProps {
  title?: string
  action?: React.ReactNode
  icon?: React.ReactNode
  className?: string
  contentClassName?: string
  glass?: boolean
  hoverable?: boolean
  fadeIn?: 'none' | 'up'
  delay?: 0 | 100 | 200 | 300
  noPadding?: boolean
  children: React.ReactNode
}

const DELAY_CLASSES: Record<number, string> = {
  0: '',
  100: 'delay-100',
  200: 'delay-200',
  300: 'delay-300',
}

export function GlassCard({
  title,
  action,
  icon,
  className,
  contentClassName,
  glass,
  hoverable,
  fadeIn = 'none',
  delay = 0,
  noPadding,
  children,
}: GlassCardProps) {
  return (
    <div
      className={cn(
        'bg-card border-0 rounded-2xl shadow-premium-sm h-full flex flex-col transition-all duration-200',
        !noPadding && 'p-4',
        hoverable && 'hover:shadow-premium-hover',
        fadeIn === 'up' && 'fade-in-up',
        fadeIn === 'up' && DELAY_CLASSES[delay],
        className
      )}
    >
      {title && (
        <div className={cn('flex items-center justify-between mb-3', noPadding && 'px-4 pt-4')}>
          <div className="flex items-center gap-2">
            {icon}
            <h2 className="text-[12px] font-semibold uppercase tracking-wide text-muted-foreground">{title}</h2>
          </div>
          {action}
        </div>
      )}
      <div className={cn('flex-1', contentClassName)}>{children}</div>
    </div>
  )
}
