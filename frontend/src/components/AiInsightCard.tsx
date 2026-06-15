import { useMutation } from '@tanstack/react-query'
import { Button } from 'antd'
import { toast } from 'sonner'
import { Sparkles, RefreshCw } from 'lucide-react'
import { aiApi } from '@/api/areas'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'

/** "Explain this month/week" — one-click LLM insight card for an area page. */
export function AiInsightCard({ area, title, className }: { area: 'finance' | 'health'; title?: string; className?: string }) {
  const { mutate, data, isPending, isError } = useMutation({
    mutationFn: () => aiApi.explain(area),
    onError: () => toast.error('AI temporarily unavailable'),
  })

  return (
    <div className={cn("bg-card border-0 rounded-2xl shadow-premium-sm p-4", className)}>
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <Sparkles size={14} className="text-violet-400" />
          <h2 className="text-[12px] font-semibold uppercase tracking-wide text-muted-foreground">
            {title ?? (area === 'finance' ? 'Explain This Month' : 'Explain This Week')}
          </h2>
        </div>
        <Button
          size="small"
          type={data ? 'text' : 'primary'}
          icon={data ? <RefreshCw size={12} /> : <Sparkles size={12} />}
          loading={isPending}
          onClick={() => mutate()}
        >
          {data ? 'Refresh' : 'Analyse'}
        </Button>
      </div>
      {isPending ? (
        <div className="space-y-2">
          <Skeleton className="h-3.5 w-full" />
          <Skeleton className="h-3.5 w-5/6" />
          <Skeleton className="h-3.5 w-4/6" />
        </div>
      ) : data ? (
        <div className="text-[13px] text-foreground leading-relaxed whitespace-pre-wrap">{data.text}</div>
      ) : (
        <p className="text-[12px] text-muted-foreground">
          {isError ? 'Could not reach the AI — try again.' : `One click — AI reads your ${area} data and tells you what matters.`}
        </p>
      )}
    </div>
  )
}
