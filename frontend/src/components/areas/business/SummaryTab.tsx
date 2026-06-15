import { useQuery } from '@tanstack/react-query'
import { businessApi } from '@/api/areas'
import { formatCurrency, formatRelativeTime } from '@/lib/utils'
import { Skeleton } from '@/components/ui/skeleton'
import { TrendingUp, Package, Clock, DollarSign, LineChart } from 'lucide-react'
import { cn } from '@/lib/utils'
import Highcharts from 'highcharts'
Highcharts.setOptions({ accessibility: { enabled: false } })
import HighchartsReact from 'highcharts-react-official'

function MrrTrendCard() {
  const { data: history } = useQuery({
    queryKey: ['business', 'mrr-history'],
    queryFn: businessApi.mrrHistory,
  })

  if (!history || history.length < 2) return null

  return (
    <div className="bg-card border-0 rounded-2xl shadow-sm p-4">
      <div className="flex items-center gap-2 mb-2">
        <LineChart size={14} className="text-muted-foreground" />
        <h2 className="text-[12px] font-semibold uppercase tracking-wide text-muted-foreground">MRR Trend</h2>
      </div>
      <HighchartsReact
        highcharts={Highcharts}
        options={{
          chart: { type: 'areaspline', backgroundColor: 'transparent', height: 180, margin: [10, 0, 25, 0] },
          title: { text: null },
          credits: { enabled: false },
          legend: { enabled: false },
          xAxis: {
            categories: history.map(h => h.date.slice(5)),
            labels: { style: { color: 'hsl(var(--muted-foreground))', fontSize: '10px' } },
            lineWidth: 0, tickWidth: 0,
          },
          yAxis: { visible: false },
          tooltip: {
            backgroundColor: 'rgba(0,0,0,0.85)', style: { color: '#fff', fontSize: '11px' }, borderWidth: 0,
            formatter: function (this: any) {
              const point = history[this.point.index]
              return `<b>${point.date}</b><br/>${formatCurrency(point.mrr)}<br/><span style="opacity:.7">${point.title}</span>`
            },
          },
          plotOptions: { areaspline: { lineWidth: 2, marker: { enabled: true, radius: 3 } } },
          series: [{
            data: history.map(h => h.mrr),
            color: 'hsl(var(--primary))',
            fillColor: {
              linearGradient: { x1: 0, y1: 0, x2: 0, y2: 1 },
              stops: [[0, 'rgba(20,184,166,0.3)'], [1, 'rgba(20,184,166,0)']],
            },
          }],
        }}
      />
    </div>
  )
}

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
    <div className="bg-card border-0 rounded-2xl p-3 shadow-premium-sm">
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
          accent="text-kpi-emerald"
        />
        <MetricTile
          icon={TrendingUp}
          label="Product"
          value={summary?.product ?? 'Ledgr'}
          sub="Building"
          accent="text-kpi-purple"
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
          accent="text-kpi-amber"
        />
      </div>

      <MrrTrendCard />

      {/* Status banner */}
      <div className={cn(
        'rounded-xl p-3 border text-[11px] font-medium flex items-center gap-2',
        mrr > 0
          ? 'bg-kpi-emerald/10 border-kpi-emerald/20 text-kpi-emerald'
          : 'bg-kpi-amber/10 border-kpi-amber/20 text-kpi-amber'
      )}>
        <span>{mrr > 0 ? '🟢' : '🟡'}</span>
        {mrr > 0
          ? `Revenue-generating. MRR ${formatCurrency(mrr)} · ARR ${formatCurrency(arr)}`
          : 'Pre-revenue. Keep shipping — first ₹ is the hardest.'}
      </div>
    </div>
  )
}
