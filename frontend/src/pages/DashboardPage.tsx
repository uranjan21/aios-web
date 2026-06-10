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
import { cardEntrance } from '@/components/PageTransition'
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

function TrendChip({ value, suffix = '%' }: { value: number; suffix?: string }) {
  const up = value >= 0
  return (
    <span className={cn(
      'inline-flex items-center gap-0.5 text-[10px] font-semibold px-1.5 py-0.5 rounded-md',
      up ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
         : 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400'
    )}>
      {up ? '↑' : '↓'} {Math.abs(value)}{suffix}
    </span>
  )
}

function SummaryCard({
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
        <Skeleton className="h-3 w-24" />
        <Skeleton className="h-2 w-full" />
        <Skeleton className="h-2 w-3/4" />
        <Skeleton className="h-2 w-1/2" />
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
        'bg-card border border-border rounded-xl p-4 hover:border-primary/30 transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary shadow-sm'
      )}
    >
      <div className="flex items-center gap-2 mb-3">
        <div className={cn('p-1.5 rounded-lg', color)}>
          <Icon className="w-[14px] h-[14px]" aria-hidden="true" />
        </div>
        <span className="text-[12px] font-semibold text-muted-foreground uppercase tracking-wide">{title}</span>
      </div>
      <div className="space-y-2">
        {stats.map(({ label, value }) => (
          <div key={label} className="flex justify-between items-center">
            <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide">{label}</span>
            <span className="text-[13px] font-semibold text-foreground font-mono">{value}</span>
          </div>
        ))}
      </div>
    </motion.div>
  )
}

function AreaTile({
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
      <div className="bg-card border border-border rounded-xl p-3 space-y-2">
        <Skeleton className="h-3 w-20" />
        <Skeleton className="h-2 w-full" />
        <Skeleton className="h-2 w-3/4" />
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
      className="bg-card border border-border rounded-xl p-3 hover:border-primary/30 cursor-pointer transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
    >
      <div className="flex items-center gap-1.5 mb-2">
        <Icon className={cn('w-4 h-4', color)} aria-hidden="true" />
        <span className="text-[12px] font-semibold text-foreground">{title}</span>
      </div>
      <div className="space-y-1.5">
        {stats.map(({ label, value }) => (
          <div key={label} className="flex justify-between items-center">
            <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">{label}</span>
            <span className="text-[11px] font-semibold text-foreground font-mono">{value}</span>
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

  const dateString = new Date().toLocaleDateString('en-IN', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  })

  return (
    <div className="min-h-screen bg-[hsl(var(--page-bg))] p-4 md:p-6">
      <div className="mx-auto max-w-[1200px] space-y-4">

        {/* Row 0: Greeting */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-[15px] font-semibold text-foreground">{getGreeting()}, Utsav</h1>
            <p className="text-[12px] text-muted-foreground">{dateString}</p>
          </div>
        </div>

        {/* Row 1: 3 summary stat cards */}
        <div className="grid grid-cols-12 gap-4">
          <div className="col-span-12 md:col-span-4">
            <SummaryCard
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
          </div>
          <div className="col-span-12 md:col-span-4">
            <SummaryCard
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
          </div>
          <div className="col-span-12 md:col-span-4">
            <SummaryCard
              icon={Zap}
              color="bg-sky-500/10 text-sky-500"
              title="Agents"
              loading={loadingAgents}
              onClick={() => navigate('/agents')}
              stats={[
                { label: 'Active', value: String(activeAgents) },
                { label: 'Last run', value: formatRelativeTime(lastAgentRun) },
                { label: 'Total', value: animatedAgents != null ? String(Math.round(animatedAgents)) : '0' },
              ]}
            />
          </div>
        </div>

        {/* Row 2: Area tiles + Quick Log */}
        <div className="grid grid-cols-12 gap-4">
          {/* Left: 5 area overview tiles */}
          <div className="col-span-12 xl:col-span-8">
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              <AreaTile
                icon={IndianRupee}
                color="text-emerald-500"
                title="Finance"
                loading={loadingFinance}
                onClick={() => navigate('/areas/finance')}
                stats={[
                  { label: 'Net worth', value: animatedNetWorth != null ? formatCurrency(animatedNetWorth) : '—' },
                  { label: 'Take-home', value: animatedTakeHome != null ? formatCurrency(animatedTakeHome) : '—' },
                ]}
              />
              <AreaTile
                icon={Heart}
                color="text-rose-500"
                title="Health"
                loading={loadingHealth || loadingStreak}
                onClick={() => navigate('/areas/health')}
                stats={[
                  { label: 'Weight', value: animatedWeight != null ? `${animatedWeight.toFixed(1)} kg` : '—' },
                  { label: 'Streak', value: animatedStreak != null ? `${Math.round(animatedStreak)}d` : '—' },
                ]}
              />
              <AreaTile
                icon={Briefcase}
                color="text-primary"
                title="Career"
                loading={loadingCareer}
                onClick={() => navigate('/areas/career')}
                stats={[
                  { label: 'Skills', value: animatedSkills != null ? String(Math.round(animatedSkills)) : '—' },
                  { label: 'Last activity', value: formatRelativeTime(careerSummary?.last_event_at ?? null) },
                ]}
              />
              <AreaTile
                icon={Rocket}
                color="text-violet-500"
                title="Business"
                loading={loadingBusiness}
                onClick={() => navigate('/areas/business')}
                stats={[
                  { label: 'MRR', value: animatedMrr != null ? formatCurrency(animatedMrr) : '₹0' },
                  { label: 'Last shipped', value: formatRelativeTime(businessSummary?.last_feature_at ?? null) },
                ]}
              />
              <AreaTile
                icon={PenLine}
                color="text-amber-500"
                title="Content"
                loading={loadingContent}
                onClick={() => navigate('/areas/content')}
                stats={[
                  { label: 'In pipeline', value: animatedContentPipeline != null ? String(Math.round(animatedContentPipeline)) : '—' },
                  { label: 'This month', value: animatedContentMonth != null ? String(Math.round(animatedContentMonth)) : '—' },
                ]}
              />
            </div>
          </div>

          {/* Right: Quick Log */}
          <div className="col-span-12 xl:col-span-4">
            <div className="bg-card border border-border rounded-xl p-4 h-full flex flex-col">
              <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide mb-3">
                Quick Capture
              </p>
              <div className="flex-1">
                <QuickLogInput />
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  )
}

function QuickLogInput() {
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const [confirmed, setConfirmed] = useState<string | null>(null)
  const { data: recentCaptures } = useQuery({
    queryKey: ['captures', 'recent'],
    queryFn: () => capturesApi.list?.() ?? Promise.resolve([]),
  })

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
    <div className="space-y-3">
      <textarea
        ref={inputRef}
        rows={3}
        placeholder="Log something… (gym done, ₹500 food, learned X)"
        disabled={isPending}
        className="w-full px-3 py-2 text-[13px] rounded-lg bg-background border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 disabled:opacity-60 resize-none"
        onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSubmit() } }}
      />
      <button
        aria-label="Save quick capture"
        onClick={handleSubmit}
        disabled={isPending}
        className="w-full px-3 py-1.5 text-[12px] font-semibold rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-60 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
      >
        {isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin mx-auto" /> : 'Capture'}
      </button>
      {confirmed && (
        <p className="text-[10px] text-emerald-500 flex items-center gap-1 font-medium">
          <CheckCircle2 className="w-3 h-3" /> Captured: {confirmed.length > 60 ? confirmed.slice(0, 60) + '…' : confirmed}
        </p>
      )}
      {recentCaptures && recentCaptures.length > 0 && (
        <div className="space-y-1.5">
          <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">Recent</p>
          <div className="flex flex-col gap-1">
            {recentCaptures.slice(0, 3).map((c: { id: string; text: string }) => (
              <span
                key={c.id}
                className="text-[11px] text-muted-foreground bg-muted/50 rounded-md px-2 py-1 truncate"
              >
                {c.text}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
