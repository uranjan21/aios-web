import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { healthApi } from '@/api/areas'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'

function GlassIcon({ filled }: { filled: boolean }) {
  return (
    <svg width="24" height="32" viewBox="0 0 24 32" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path
        d="M4 4 L2 28 L22 28 L20 4 Z"
        fill={filled ? 'hsl(var(--primary))' : 'hsl(var(--muted))'}
        stroke={filled ? '#f97316' : 'hsl(var(--border))'}
        strokeWidth="1.5"
        strokeLinejoin="round"
        opacity={filled ? 1 : 0.5}
      />
      {filled && (
        <path
          d="M5 22 L19 22 L18.5 26 L5.5 26 Z"
          fill="rgba(255,255,255,0.15)"
        />
      )}
    </svg>
  )
}

export function WaterTrackerWidget() {
  const queryClient = useQueryClient()

  const { data: water, isLoading } = useQuery({
    queryKey: ['health', 'water', 'today'],
    queryFn: healthApi.waterToday,
  })

  const logWaterMutation = useMutation({
    mutationFn: () => healthApi.logWater(1),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['health', 'water', 'today'] })
      toast.success('Water logged')
    },
    onError: () => toast.error('Failed to log water'),
  })

  const glasses = water?.glasses_logged ?? 0
  const target = water?.target ?? 8
  const remaining = Math.max(0, target - glasses)

  return (
    <div className="bg-card border border-subtle rounded-xl p-4 shadow-premium-sm h-full flex flex-col">
      <div className="flex items-center justify-between mb-3">
        <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">Water Intake</p>
        <span className="text-sm font-bold text-primary">{glasses} / {target} glasses</span>
      </div>

      {isLoading ? (
        <Skeleton className="h-12 w-full" />
      ) : (
        <div className="flex-1 flex flex-col justify-center">
          <div className="flex items-end gap-1.5 flex-wrap mb-3">
            {Array.from({ length: target }).map((_, i) => (
              <button
                key={i}
                onClick={() => i >= glasses && logWaterMutation.mutate()}
                disabled={i < glasses || logWaterMutation.isPending}
                className={cn(
                  'transition-transform hover:scale-110 disabled:cursor-default',
                  i < glasses ? 'cursor-default' : 'cursor-pointer'
                )}
                title={i < glasses ? 'Logged' : 'Click to log'}
              >
                <GlassIcon filled={i < glasses} />
              </button>
            ))}
          </div>

          <p className="text-[11px] text-muted-foreground">
            {remaining === 0
              ? 'You hit your water goal today!'
              : `Drink ${remaining} more glass${remaining === 1 ? '' : 'es'} to hit your goal`}
          </p>
        </div>
      )}
    </div>
  )
}
