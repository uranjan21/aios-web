import { useQuery } from '@tanstack/react-query'
import { businessApi } from '@/api/areas'
import { formatCurrency, formatRelativeTime } from '@/lib/utils'
import { Skeleton } from '@/components/ui/skeleton'
import { TrendingUp, Package, Clock, DollarSign } from 'lucide-react'
import { cn } from '@/lib/utils'

function MetricTile({
  icon: Icon,
  label,
  value,
  sub,
  accent,
}: {
  icon: React.FC<{ className?: string }>
  label: string
  value: string
  sub?: string
  accent?: string
}) {
  return (
    <div className="bg-card border border-border/60 shadow-sm rounded-xl p-3">
      <div className="flex items-center gap-2 mb-2">
        <div className={cn('p-1.5 rounded-lg bg-muted/50', accent ?? 'text-muted-foreground')}>
          <Icon className="w-3.5 h-3.5" />
        </div>
        <span className="text-[11px] text-muted-foreground font-medium">{label}</span>
      </div>
      <p className="text-xs font-bold font-mono text-foreground tracking-tight">{value}</p>
      {sub && <p className="text-[10px] text-muted-foreground mt-0.5 truncate">{sub}</p>}
    </div>
  )
}

export function SummaryTab() {
  const { data: summary, isLoading } = useQuery({
    queryKey: ['business', 'summary'],
    queryFn: businessApi.summary,
  })

  if (isLoading) {
    return (
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 max-w-2xl">
        {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-20 rounded-xl" />)}
      </div>
    )
  }

  const mrr = summary?.mrr ?? 0
  const arr = mrr * 12

  return (
    <div className="space-y-4 max-w-2xl">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <MetricTile
          icon={DollarSign}
          label="MRR"
          value={formatCurrency(mrr)}
          sub={mrr > 0 ? `ARR ${formatCurrency(arr)}` : 'Not yet monetised'}
          accent="text-emerald-500"
        />
        <MetricTile
          icon={TrendingUp}
          label="Product"
          value={summary?.product ?? 'Ledgr'}
          sub="Building"
          accent="text-violet-500"
        />
        <MetricTile
          icon={Package}
          label="Last Feature"
          value={summary?.last_feature ?? '—'}
          sub={summary?.last_feature_at ? formatRelativeTime(summary.last_feature_at) : undefined}
          accent="text-primary"
        />
        <MetricTile
          icon={Clock}
          label="Last Shipped"
          value={summary?.last_feature_at ? formatRelativeTime(summary.last_feature_at) : 'Never'}
          sub={summary?.last_feature ?? undefined}
          accent="text-amber-500"
        />
      </div>

      {/* Status banner */}
      <div className={cn(
        'rounded-xl p-3 border text-[11px] font-medium flex items-center gap-2',
        mrr > 0
          ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-600 dark:text-emerald-400'
          : 'bg-amber-500/10 border-amber-500/20 text-amber-600 dark:text-amber-400'
      )}>
        <span>{mrr > 0 ? '🟢' : '🟡'}</span>
        {mrr > 0
          ? `Revenue-generating. MRR ${formatCurrency(mrr)} · ARR ${formatCurrency(arr)}`
          : 'Pre-revenue. Keep shipping — first ₹ is the hardest.'}
      </div>
    </div>
  )
}
