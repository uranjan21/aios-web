import { useQuery, useMutation } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { useRef, useState } from 'react'
import { motion } from 'framer-motion'
import { IndianRupee, Heart, Briefcase, Rocket, PenLine, Zap, Loader2, CheckCircle2 } from 'lucide-react'
import { toast } from 'sonner'
import { financeApi, careerApi, businessApi, capturesApi, contentApi } from '@/api/areas'
import { healthApi } from '@/api/areas'
import { agentsApi } from '@/api/agents'
import { formatCurrency, formatRelativeTime } from '@/lib/utils'
import { Skeleton } from '@/components/ui/skeleton'
import { staggerContainer, cardEntrance } from '@/components/PageTransition'
import { cn } from '@/lib/utils'
import { useCountUp } from '@/hooks/useCountUp'

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
  className,
  onClick,
}: {
  icon: React.FC<{ className?: string }>
  color: string
  title: string
  stats: Array<{ label: string; value: string }>
  loading?: boolean
  className?: string
  onClick?: () => void
}) {
  if (loading) {
    return (
      <div className="bg-card premium-shadow rounded-xl p-4 space-y-2">
        <Skeleton className="h-3 w-20" />
        <Skeleton className="h-2 w-full" />
        <Skeleton className="h-2 w-4/5" />
        <Skeleton className="h-2 w-3/5" />
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
      className={cn(
        "bg-card premium-shadow rounded-xl p-5 hover:-translate-y-1 hover:shadow-lg transition-all cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary border border-border/40",
        className
      )}
    >
      <div className="flex items-center gap-2.5 mb-4">
        <div className={cn('p-1.5 rounded-lg', color)}>
          <Icon className="w-[18px] h-[18px]" aria-hidden="true" />
        </div>
        <span className="text-[15px] font-bold text-foreground tracking-tight">{title}</span>
      </div>
      <div className="space-y-2">
        {stats.map(({ label, value }) => (
          <div key={label} className="flex items-baseline justify-between">
            <span className="text-[12px] font-medium text-muted-foreground">{label}</span>
            <span className="text-[13px] font-bold text-foreground font-mono">{value}</span>
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

  const { data: contentItems, isLoading: loadingContent } = useQuery({
    queryKey: ['content', 'items'],
    queryFn: () => contentApi.items(),
  })

  const isLoading = loadingFinance || loadingStreak || loadingHealth || loadingAgents || loadingContent

  const activeAgents = agents?.filter(a => a.is_active).length ?? 0
  const lastAgentRun = agents?.reduce((latest, a) => {
    if (!a.last_run_at) return latest
    if (!latest) return a.last_run_at
    return a.last_run_at > latest ? a.last_run_at : latest
  }, null as string | null)

  // Count up animation values
  const animatedNetWorth = useCountUp(latestSnapshot?.net_worth ? Number(latestSnapshot.net_worth) : null)
  const animatedCCDebt = useCountUp(latestSnapshot?.cc_debt ? Number(latestSnapshot.cc_debt) : null)
  const animatedTakeHome = useCountUp(latestSnapshot?.take_home ? Number(latestSnapshot.take_home) : null)
  const animatedWeight = useCountUp(healthSummary?.weight ? Number(healthSummary.weight) : null)
  const animatedStreak = useCountUp(streak?.current_streak ?? null)
  const animatedSkills = useCountUp(careerSummary?.total_skills ?? null)
  const animatedMrr = useCountUp(businessSummary?.mrr ? Number(businessSummary.mrr) : null)
  const animatedAgents = useCountUp(agents?.length ?? null)
  
  const contentTotal = contentItems?.length ?? 0
  const contentPublished = contentItems?.filter(i => i.status === 'published').length ?? 0
  const contentThisMonth = contentItems?.filter(i => {
    if (i.status !== 'published' || !i.publish_date) return false
    const d = new Date(i.publish_date)
    const now = new Date()
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()
  }).length ?? 0
  const contentLatest = contentItems?.filter(i => i.status === 'published' && i.publish_date)
    .sort((a, b) => b.publish_date!.localeCompare(a.publish_date!))[0]?.publish_date ?? null
  
  const animatedContentPipeline = useCountUp(contentTotal - contentPublished)
  const animatedContentMonth = useCountUp(contentThisMonth)


  return (
    <div className="p-3 sm:p-4 max-w-6xl mx-auto space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
        <p className="text-muted-foreground text-sm">Here's a summary of your AIOS.</p>
        <p className="text-muted-foreground text-[11px] tracking-wide">
          {new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
        </p>
      </div>

      <div className="grid grid-cols-12 gap-4">
        <motion.div
          className="col-span-12 lg:col-span-8 grid grid-cols-1 sm:grid-cols-2 gap-4"
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
              { label: 'Net worth', value: animatedNetWorth != null ? formatCurrency(animatedNetWorth) : '—' },
              { label: 'CC Debt', value: animatedCCDebt != null ? formatCurrency(animatedCCDebt) : '—' },
              { label: 'Take-home', value: animatedTakeHome != null ? formatCurrency(animatedTakeHome) : '—' },
            ]}
          />
          <KPICard
            icon={Heart}
            color="bg-rose-500/10 text-rose-500"
            title="Health"
            loading={loadingHealth || loadingStreak}
            onClick={() => navigate('/areas/health')}
            stats={[
              { label: 'Weight', value: animatedWeight != null ? `${animatedWeight.toFixed(1)} kg` : '—' },
              { label: 'Gym streak', value: animatedStreak != null ? `${Math.round(animatedStreak)} days` : '—' },
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
              { label: 'Skills tracked', value: animatedSkills != null ? String(Math.round(animatedSkills)) : '—' },
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
              { label: 'MRR', value: animatedMrr != null ? formatCurrency(animatedMrr) : '₹0' },
              { label: 'Last feature', value: businessSummary?.last_feature ?? '—' },
              { label: 'Last shipped', value: formatRelativeTime(businessSummary?.last_feature_at ?? null) },
            ]}
          />
          <KPICard
            icon={PenLine}
            color="bg-amber-500/10 text-amber-500"
            title="Content"
            loading={loadingContent}
            onClick={() => navigate('/areas/content')}
            stats={[
              { label: 'In pipeline', value: animatedContentPipeline != null ? String(Math.round(animatedContentPipeline)) : '—' },
              { label: 'Published this month', value: animatedContentMonth != null ? String(Math.round(animatedContentMonth)) : '—' },
              { label: 'Last post', value: formatRelativeTime(contentLatest) },
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
              { label: 'Total agents', value: animatedAgents != null ? String(Math.round(animatedAgents)) : '0' },
            ]}
          />
        </motion.div>

        <div className="col-span-12 lg:col-span-4">
          <div className="bg-card premium-shadow rounded-xl p-5 border border-border/40 h-full flex flex-col">
            <h2 className="text-[13px] font-bold uppercase tracking-wider text-muted-foreground mb-4">Quick Log</h2>
            <div className="flex-1">
              <QuickLogInput />
            </div>
          </div>
        </div>
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
    <div className="space-y-1.5">
      <div className="flex gap-2">
        <input
          ref={inputRef}
          type="text"
          placeholder="Log something… (gym done, ₹500 food, learned X)"
          disabled={isPending}
          className="flex-1 px-3 py-1.5 text-[13px] rounded-lg bg-muted border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 disabled:opacity-60"
          onKeyDown={e => { if (e.key === 'Enter') handleSubmit() }}
        />
        <button
          aria-label="Save quick log"
          onClick={handleSubmit}
          disabled={isPending}
          className="px-3 py-1.5 text-[11px] font-semibold rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-60 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
        >
          {isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Log'}
        </button>
      </div>
      {confirmed && (
        <p className="text-[10px] text-emerald-500 flex items-center gap-1 font-medium">
          <CheckCircle2 className="w-3 h-3" /> Captured: {confirmed.length > 60 ? confirmed.slice(0, 60) + '…' : confirmed}
        </p>
      )}
    </div>
  )
}
