import { useQuery, useMutation } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { useRef, useState } from 'react'
import { motion } from 'framer-motion'
import { IndianRupee, Heart, Briefcase, Rocket, PenLine, Zap, Loader2, CheckCircle2 } from 'lucide-react'
import { toast } from 'sonner'
import { financeApi, careerApi, businessApi, capturesApi } from '@/api/areas'
import { healthApi } from '@/api/areas'
import { agentsApi } from '@/api/agents'
import { formatCurrency, formatRelativeTime } from '@/lib/utils'
import { Skeleton } from '@/components/ui/skeleton'
import { staggerContainer, cardEntrance } from '@/components/PageTransition'
import { cn } from '@/lib/utils'

function getGreeting(): string {
  const h = new Date().getHours()
  if (h < 5) return 'Good night'
  if (h < 12) return 'Good morning'
  if (h < 17) return 'Good afternoon'
  if (h < 21) return 'Good evening'
  return 'Good night'
}

function KPICard({
  icon: Icon,
  color,
  title,
  stats,
  loading,
  onClick,
}: {
  icon: React.FC<{ className?: string }>
  color: string
  title: string
  stats: Array<{ label: string; value: string }>
  loading?: boolean
  onClick?: () => void
}) {
  if (loading) {
    return (
      <div className="bg-card border border-border rounded-xl p-4 space-y-3">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-3 w-full" />
        <Skeleton className="h-3 w-4/5" />
        <Skeleton className="h-3 w-3/5" />
      </div>
    )
  }

  return (
    <motion.div
      variants={cardEntrance}
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={onClick ? (e) => { if (e.key === 'Enter' || e.key === ' ') onClick() } : undefined}
      className="bg-card border border-border rounded-xl p-4 hover:border-primary/30 hover:shadow-sm transition-all cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background"
    >
      <div className="flex items-center gap-2 mb-3">
        <div className={cn('p-1.5 rounded-md', color)}>
          <Icon className="w-4 h-4" aria-hidden="true" />
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
    </motion.div>
  )
}

export function DashboardPage() {
  const navigate = useNavigate()
  const { data: latestSnapshot, isLoading: loadingFinance } = useQuery({
    queryKey: ['finance', 'latestSnapshot'],
    queryFn: financeApi.latestSnapshot,
  })
  const { data: streak, isLoading: loadingStreak } = useQuery({
    queryKey: ['health', 'streak'],
    queryFn: healthApi.streak,
  })
  const { data: healthSummary, isLoading: loadingHealth } = useQuery({
    queryKey: ['health', 'summary'],
    queryFn: healthApi.summary,
  })
  const { data: careerSummary, isLoading: loadingCareer } = useQuery({
    queryKey: ['career', 'summary'],
    queryFn: careerApi.summary,
  })
  const { data: businessSummary, isLoading: loadingBusiness } = useQuery({
    queryKey: ['business', 'summary'],
    queryFn: businessApi.summary,
  })
  const { data: agents, isLoading: loadingAgents } = useQuery({
    queryKey: ['agents'],
    queryFn: agentsApi.list,
  })

  const isLoading = loadingFinance || loadingStreak || loadingHealth || loadingAgents

  const activeAgents = agents?.filter(a => a.is_active).length ?? 0
  const lastAgentRun = agents?.reduce((latest, a) => {
    if (!a.last_run_at) return latest
    if (!latest) return a.last_run_at
    return a.last_run_at > latest ? a.last_run_at : latest
  }, null as string | null)

  return (
    <div className="p-4 sm:p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">{getGreeting()}</h1>
        <p className="text-muted-foreground text-sm mt-0.5">
          {new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
        </p>
      </div>

      <motion.div
        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4"
        variants={staggerContainer}
        initial="initial"
        animate="animate"
      >
        <KPICard
          icon={IndianRupee}
          color="bg-emerald-500/10 text-emerald-500"
          title="Finance"
          loading={loadingFinance}
          onClick={() => navigate('/areas/finance')}
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
          loading={loadingHealth || loadingStreak}
          onClick={() => navigate('/areas/health')}
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
          loading={loadingCareer}
          onClick={() => navigate('/areas/career')}
          stats={[
            { label: 'Skills tracked', value: String(careerSummary?.total_skills ?? '—') },
            { label: 'Last activity', value: formatRelativeTime(careerSummary?.last_event_at ?? null) },
            { label: 'Last skill update', value: formatRelativeTime(careerSummary?.last_skill_update ?? null) },
          ]}
        />
        <KPICard
          icon={Rocket}
          color="bg-violet-500/10 text-violet-500"
          title="Business"
          loading={loadingBusiness}
          onClick={() => navigate('/areas/business')}
          stats={[
            { label: 'MRR', value: businessSummary?.mrr != null ? formatCurrency(businessSummary.mrr) : '₹0' },
            { label: 'Last feature', value: businessSummary?.last_feature ?? '—' },
            { label: 'Last shipped', value: formatRelativeTime(businessSummary?.last_feature_at ?? null) },
          ]}
        />
        <KPICard
          icon={PenLine}
          color="bg-amber-500/10 text-amber-500"
          title="Content"
          onClick={() => navigate('/areas/content')}
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
          loading={loadingAgents}
          onClick={() => navigate('/agents')}
          stats={[
            { label: 'Active automations', value: String(activeAgents) },
            { label: 'Last run', value: formatRelativeTime(lastAgentRun) },
            { label: 'Total agents', value: String(agents?.length ?? 0) },
          ]}
        />
      </motion.div>

      <div className="bg-card border border-border rounded-xl p-4">
        <h2 className="text-sm font-semibold text-foreground mb-3">Quick Log</h2>
        <QuickLogInput />
      </div>
    </div>
  )
}

function QuickLogInput() {
  const inputRef = useRef<HTMLInputElement>(null)
  const [confirmed, setConfirmed] = useState<string | null>(null)

  const { mutate, isPending } = useMutation({
    mutationFn: (text: string) => capturesApi.create(text),
    onSuccess: (_data, text) => {
      setConfirmed(text)
      if (inputRef.current) inputRef.current.value = ''
      setTimeout(() => setConfirmed(null), 3000)
    },
    onError: () => toast.error('Failed to save — try again'),
  })

  const handleSubmit = () => {
    const trimmed = inputRef.current?.value.trim() ?? ''
    if (!trimmed) return
    mutate(trimmed)
  }

  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        <input
          ref={inputRef}
          type="text"
          placeholder="Log something… (gym done, ₹500 food, learned X)"
          disabled={isPending}
          className="flex-1 px-3 py-2 text-sm rounded-lg bg-muted border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 disabled:opacity-60"
          onKeyDown={e => { if (e.key === 'Enter') handleSubmit() }}
        />
        <button
          aria-label="Save quick log"
          onClick={handleSubmit}
          disabled={isPending}
          className="px-3 py-2 text-sm rounded-lg bg-primary text-primary-foreground font-medium hover:bg-primary/90 disabled:opacity-60 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
        >
          {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Log'}
        </button>
      </div>
      {confirmed && (
        <p className="text-xs text-emerald-500 flex items-center gap-1">
          <CheckCircle2 className="w-3.5 h-3.5" /> Captured: {confirmed.length > 60 ? confirmed.slice(0, 60) + '…' : confirmed}
        </p>
      )}
    </div>
  )
}
