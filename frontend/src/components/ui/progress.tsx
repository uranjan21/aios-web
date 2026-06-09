import * as ProgressPrimitive from '@radix-ui/react-progress'
import { cn } from '@/lib/utils'

export function Progress({ value, className, indicatorClassName }: {
  value: number
  className?: string
  indicatorClassName?: string
}) {
  return (
    <ProgressPrimitive.Root
      value={value}
      className={cn('relative h-2 w-full overflow-hidden rounded-full bg-muted', className)}
    >
      <ProgressPrimitive.Indicator
        className={cn('h-full transition-all duration-500 rounded-full', indicatorClassName ?? 'bg-primary')}
        style={{ width: `${Math.min(100, Math.max(0, value))}%` }}
      />
    </ProgressPrimitive.Root>
  )
}
