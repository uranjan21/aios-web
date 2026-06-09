import { useQuery } from '@tanstack/react-query'
import { IndianRupee, Heart, Briefcase, Rocket, PenLine, Zap } from 'lucide-react'
import { financeApi } from '@/api/areas'
import { healthApi } from '@/api/areas'
import { agentsApi } from '@/api/agents'
import { formatCurrency, formatRelativeTime } from '@/lib/utils'
import { cn } from '@/lib/utils'

function KPICard({
  icon: Icon,
  color,
  title,
  stats,
}: {
  icon: React.FC<{ className?: string }>
  color: string
  title: string
  stats: Array<{ label: string; value: string }>
}) {
  return (
    <div className="bg-card border border-border rounded-xl p-4 hover:border-primary/30 transition-colors">
      <div className="flex items-center gap-2 mb-3">
        <div className={cn('p-1.5 rounded-md', color)}>
          <Icon className="w-4 h-4" />
        </div>
        <span className="text-sm font-semibold text-foreground">{title}</span>
      </div>
      <div className="space-y-2">
        {stats.map(({ label, value }) => (
          <div key={label} className="flex items-baseline justify-between">
            <span className="text-xs text-muted-foreground">{label}</span>
            <span className="text-sm font-medium text-foreground font-mono">{value}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

export function DashboardPage() {
  const { data: latestSnapshot } = useQuery({
    queryKey: ['finance', 'latestSnapshot'],
    queryFn: financeApi.latestSnapshot,
  })
  const { data: streak } = useQuery({
    queryKey: ['health', 'streak'],
    queryFn: healthApi.streak,
  })
  const { data: healthSummary } = useQuery({
    queryKey: ['health', 'summary'],
    queryFn: healthApi.summary,
  })
  const { data: agents } = useQuery({
    queryKey: ['agents'],
    queryFn: agentsApi.list,
  })

  const activeAgents = agents?.filter(a => a.is_active).length ?? 0
  const lastAgentRun = agents?.reduce((latest, a) => {
    if (!a.last_run_at) return latest
    if (!latest) return a.last_run_at
    return a.last_run_at > latest ? a.last_run_at : latest
  }, null as string | null)

  return (
    <div className="p-4 sm:p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Good morning</h1>
        <p className="text-muted-foreground text-sm mt-0.5">
          {new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
        </p>
      </div>

      {/* KPI Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <KPICard
          icon={IndianRupee}
          color="bg-emerald-500/10 text-emerald-500"
          title="Finance"
          stats={[
            { label: 'Net worth', value: formatCurrency(latestSnapshot?.net_worth) },
            { label: 'CC Debt', value: formatCurrency(latestSnapshot?.cc_debt) },
            { label: 'Take-home', value: formatCurrency(latestSnapshot?.take_home) },
          ]}
        />
        <KPICard
          icon={Heart}
          color="bg-rose-500/10 text-rose-500"
          title="Health"
          stats={[
            { label: 'Weight', value: healthSummary?.weight ? `${healthSummary.weight} kg` : '—' },
            { label: 'Gym streak', value: streak?.current_streak ? `${streak.current_streak} days` : '—' },
            { label: 'Last workout', value: formatRelativeTime(streak?.last_workout_at ?? null) },
          ]}
        />
        <KPICard
          icon={Briefcase}
          color="bg-blue-500/10 text-blue-500"
          title="Career"
          stats={[
            { label: 'Status', value: 'Active' },
            { label: 'Learning phase', value: '—' },
            { label: 'Last skill update', value: '—' },
          ]}
        />
        <KPICard
          icon={Rocket}
          color="bg-violet-500/10 text-violet-500"
          title="Business"
          stats={[
            { label: 'Product', value: 'Ledgr' },
            { label: 'MRR', value: '₹0' },
            { label: 'Stage', value: 'Building' },
          ]}
        />
        <KPICard
          icon={PenLine}
          color="bg-amber-500/10 text-amber-500"
          title="Content"
          stats={[
            { label: 'In pipeline', value: '—' },
            { label: 'Published this month', value: '—' },
            { label: 'Last post', value: '—' },
          ]}
        />
        <KPICard
          icon={Zap}
          color="bg-sky-500/10 text-sky-500"
          title="Agents"
          stats={[
            { label: 'Active automations', value: String(activeAgents) },
            { label: 'Last run', value: formatRelativeTime(lastAgentRun) },
            { label: 'Total agents', value: String(agents?.length ?? 0) },
          ]}
        />
      </div>

      {/* Quick log widget */}
      <div className="bg-card border border-border rounded-xl p-4">
        <h2 className="text-sm font-semibold text-foreground mb-3">Quick Log</h2>
        <QuickLogInput />
      </div>
    </div>
  )
}

function QuickLogInput() {
  return (
    <div className="flex gap-2">
      <input
        type="text"
        placeholder="Log something… (gym done, ₹500 food, learned X)"
        className="flex-1 px-3 py-2 text-sm rounded-lg bg-muted border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            window.location.href = `/chat?q=${encodeURIComponent((e.target as HTMLInputElement).value)}`
          }
        }}
      />
      <button className="px-3 py-2 text-sm rounded-lg bg-primary text-primary-foreground font-medium hover:bg-primary/90 transition">
        Log
      </button>
    </div>
  )
}
