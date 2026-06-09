import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { BookOpen, History, Plus, Briefcase, X, ExternalLink, ChevronDown } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { toast } from 'sonner'
import { careerApi } from '@/api/areas'
import { cn } from '@/lib/utils'
import { Skeleton } from '@/components/ui/skeleton'
import { ErrorCard } from '@/components/ErrorCard'
import { EmptyState } from '@/components/EmptyState'
import { staggerContainer, cardEntrance } from '@/components/PageTransition'
import type { SkillInventory, JobOpportunity, OpportunityStatus } from '@/types'

// ─── Constants ──────────────────────────────────────────────────────────────

const LEVEL_STYLES: Record<SkillInventory['level'], string> = {
  day_0: 'bg-zinc-500/20 text-zinc-400',
  beginner: 'bg-red-500/20 text-red-400',
  practitioner: 'bg-amber-500/20 text-amber-400',
  competent: 'bg-emerald-500/20 text-emerald-500',
  proficient: 'bg-blue-500/20 text-blue-400',
  expert: 'bg-violet-500/20 text-violet-400',
}
const LEVEL_LABELS: Record<SkillInventory['level'], string> = {
  day_0: 'Day 0', beginner: 'Beginner', practitioner: 'Practitioner',
  competent: 'Competent', proficient: 'Proficient', expert: 'Expert',
}

const OPP_STATUS_CONFIG: Record<OpportunityStatus, { label: string; cls: string }> = {
  prospect:   { label: 'Prospect',   cls: 'bg-zinc-500/20 text-zinc-400' },
  applied:    { label: 'Applied',    cls: 'bg-blue-500/20 text-blue-400' },
  screening:  { label: 'Screening',  cls: 'bg-amber-500/20 text-amber-400' },
  interview:  { label: 'Interview',  cls: 'bg-violet-500/20 text-violet-400' },
  offer:      { label: 'Offer 🎉',   cls: 'bg-emerald-500/20 text-emerald-500' },
  rejected:   { label: 'Rejected',   cls: 'bg-red-500/20 text-red-400' },
  closed:     { label: 'Closed',     cls: 'bg-muted text-muted-foreground' },
}

const EVENT_TYPE_LABELS: Record<string, string> = {
  learning:        'Learning',
  milestone:       'Milestone',
  skill_update:    'Skill Update',
  project:         'Project',
  achievement:     'Achievement',
  feedback:        'Feedback',
}

// ─── Milestone Log Form ──────────────────────────────────────────────────────

function MilestoneForm({ onClose }: { onClose: () => void }) {
  const queryClient = useQueryClient()
  const [eventType, setEventType] = useState('milestone')
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')

  const { mutate, isPending } = useMutation({
    mutationFn: () => careerApi.createEvent({ event_type: eventType, title: title.trim(), description: description.trim() || undefined }),
    onSuccess: () => {
      toast.success('Milestone logged')
      queryClient.invalidateQueries({ queryKey: ['career', 'events'] })
      queryClient.invalidateQueries({ queryKey: ['career', 'summary'] })
      onClose()
    },
    onError: () => toast.error('Failed to log milestone'),
  })

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!title.trim()) return
    mutate()
  }

  return (
    <motion.form
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: 'auto' }}
      exit={{ opacity: 0, height: 0 }}
      transition={{ duration: 0.2 }}
      onSubmit={handleSubmit}
      className="px-4 py-4 border-b border-border bg-muted/20 space-y-3"
    >
      <div className="flex gap-2">
        <select
          value={eventType}
          onChange={e => setEventType(e.target.value)}
          className="text-xs px-2 py-1.5 rounded-lg bg-muted border border-border text-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
        >
          {Object.entries(EVENT_TYPE_LABELS).map(([v, l]) => (
            <option key={v} value={v}>{l}</option>
          ))}
        </select>
        <input
          required
          value={title}
          onChange={e => setTitle(e.target.value)}
          placeholder="What did you do / learn / achieve?"
          className="flex-1 text-sm px-3 py-1.5 rounded-lg bg-muted border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
        />
      </div>
      <input
        value={description}
        onChange={e => setDescription(e.target.value)}
        placeholder="Details (optional)"
        className="w-full text-sm px-3 py-1.5 rounded-lg bg-muted border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
      />
      <div className="flex items-center gap-2 justify-end">
        <button type="button" onClick={onClose} className="text-xs text-muted-foreground hover:text-foreground transition">Cancel</button>
        <button
          type="submit"
          disabled={isPending || !title.trim()}
          className="text-xs px-3 py-1.5 rounded-lg bg-primary text-primary-foreground font-medium hover:bg-primary/90 disabled:opacity-50 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
        >
          {isPending ? 'Saving…' : 'Log'}
        </button>
      </div>
    </motion.form>
  )
}

// ─── Opportunity Form ────────────────────────────────────────────────────────

function OpportunityForm({ onClose }: { onClose: () => void }) {
  const queryClient = useQueryClient()
  const [company, setCompany] = useState('')
  const [role, setRole] = useState('')
  const [status, setStatus] = useState<OpportunityStatus>('prospect')
  const [url, setUrl] = useState('')

  const { mutate, isPending } = useMutation({
    mutationFn: () => careerApi.createOpportunity({
      company: company.trim(), role: role.trim(), status,
      url: url.trim() || undefined,
    }),
    onSuccess: () => {
      toast.success('Opportunity added')
      queryClient.invalidateQueries({ queryKey: ['career', 'opportunities'] })
      onClose()
    },
    onError: () => toast.error('Failed to add opportunity'),
  })

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!company.trim() || !role.trim()) return
    mutate()
  }

  return (
    <motion.form
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: 'auto' }}
      exit={{ opacity: 0, height: 0 }}
      transition={{ duration: 0.2 }}
      onSubmit={handleSubmit}
      className="px-4 py-4 border-b border-border bg-muted/20 space-y-3"
    >
      <div className="grid grid-cols-2 gap-2">
        <input required value={company} onChange={e => setCompany(e.target.value)} placeholder="Company"
          className="text-sm px-3 py-1.5 rounded-lg bg-muted border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/50" />
        <input required value={role} onChange={e => setRole(e.target.value)} placeholder="Role"
          className="text-sm px-3 py-1.5 rounded-lg bg-muted border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/50" />
      </div>
      <div className="flex gap-2">
        <select
          value={status}
          onChange={e => setStatus(e.target.value as OpportunityStatus)}
          className="text-xs px-2 py-1.5 rounded-lg bg-muted border border-border text-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
        >
          {(Object.keys(OPP_STATUS_CONFIG) as OpportunityStatus[]).map(s => (
            <option key={s} value={s}>{OPP_STATUS_CONFIG[s].label}</option>
          ))}
        </select>
        <input value={url} onChange={e => setUrl(e.target.value)} placeholder="Job posting URL (optional)"
          className="flex-1 text-sm px-3 py-1.5 rounded-lg bg-muted border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/50" />
      </div>
      <div className="flex items-center gap-2 justify-end">
        <button type="button" onClick={onClose} className="text-xs text-muted-foreground hover:text-foreground transition">Cancel</button>
        <button
          type="submit"
          disabled={isPending || !company.trim() || !role.trim()}
          className="text-xs px-3 py-1.5 rounded-lg bg-primary text-primary-foreground font-medium hover:bg-primary/90 disabled:opacity-50 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
        >
          {isPending ? 'Saving…' : 'Add'}
        </button>
      </div>
    </motion.form>
  )
}

// ─── Opportunity Row ─────────────────────────────────────────────────────────

function OpportunityRow({ opp }: { opp: JobOpportunity }) {
  const queryClient = useQueryClient()
  const cfg = OPP_STATUS_CONFIG[opp.status]

  const { mutate: patch } = useMutation({
    mutationFn: (status: OpportunityStatus) => careerApi.patchOpportunity(opp.id, { status }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['career', 'opportunities'] }),
    onError: () => toast.error('Failed to update status'),
  })

  const { mutate: del } = useMutation({
    mutationFn: () => careerApi.deleteOpportunity(opp.id),
    onSuccess: () => {
      toast.success('Removed')
      queryClient.invalidateQueries({ queryKey: ['career', 'opportunities'] })
    },
    onError: () => toast.error('Failed to delete'),
  })

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: -6 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -6 }}
      className="flex items-center gap-3 px-4 py-3 border-b border-border last:border-0 hover:bg-muted/20 transition-colors group"
    >
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-foreground truncate">{opp.company}</span>
          <span className="text-xs text-muted-foreground truncate">· {opp.role}</span>
        </div>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        {/* Status selector */}
        <div className="relative">
          <select
            value={opp.status}
            onChange={e => patch(e.target.value as OpportunityStatus)}
            className={cn(
              'appearance-none text-xs font-medium pl-2 pr-5 py-1 rounded-full border-0 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-primary',
              cfg.cls
            )}
          >
            {(Object.keys(OPP_STATUS_CONFIG) as OpportunityStatus[]).map(s => (
              <option key={s} value={s} className="bg-card text-foreground">{OPP_STATUS_CONFIG[s].label}</option>
            ))}
          </select>
          <ChevronDown className="w-3 h-3 absolute right-1.5 top-1/2 -translate-y-1/2 pointer-events-none opacity-60" />
        </div>
        {opp.url && (
          <a href={opp.url} target="_blank" rel="noopener noreferrer"
            aria-label="View job posting"
            className="p-1 text-muted-foreground hover:text-foreground transition"
          >
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        )}
        <button
          onClick={() => del()}
          aria-label="Remove opportunity"
          className="p-1 text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
    </motion.div>
  )
}

// ─── Main Page ───────────────────────────────────────────────────────────────

export function CareerPage() {
  const [showMilestoneForm, setShowMilestoneForm] = useState(false)
  const [showOpportunityForm, setShowOpportunityForm] = useState(false)

  const { data: skills, isLoading: loadingSkills, isError: errorSkills, refetch: refetchSkills } = useQuery({
    queryKey: ['career', 'skills'],
    queryFn: careerApi.skills,
  })
  const { data: events, isLoading: loadingEvents, isError: errorEvents, refetch: refetchEvents } = useQuery({
    queryKey: ['career', 'events'],
    queryFn: careerApi.events,
  })
  const { data: opportunities, isLoading: loadingOpps, isError: errorOpps, refetch: refetchOpps } = useQuery({
    queryKey: ['career', 'opportunities'],
    queryFn: careerApi.opportunities,
  })

  const byCategory = skills?.reduce<Record<string, SkillInventory[]>>((acc, s) => {
    ;(acc[s.category] ??= []).push(s)
    return acc
  }, {}) ?? {}

  const activeOpps = opportunities?.filter(o => !['rejected', 'closed'].includes(o.status)) ?? []
  const archivedOpps = opportunities?.filter(o => ['rejected', 'closed'].includes(o.status)) ?? []

  return (
    <div className="p-4 sm:p-6 space-y-6">
      <h1 className="text-2xl font-semibold text-foreground">Career</h1>

      {/* ── Opportunities Tracker ── */}
      <div className="bg-card premium-shadow rounded-3xl overflow-hidden pb-2">
        <div className="px-6 py-4 border-b border-border flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-semibold">Opportunities</h2>
            {activeOpps.length > 0 && (
              <span className="text-[11px] font-medium px-1.5 py-0.5 rounded-full bg-primary/10 text-primary">
                {activeOpps.length} active
              </span>
            )}
          </div>
          <button
            onClick={() => { setShowOpportunityForm(o => !o); setShowMilestoneForm(false) }}
            aria-label="Add opportunity"
            className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded"
          >
            <Plus className="w-3.5 h-3.5" /> Add
          </button>
        </div>

        <AnimatePresence>
          {showOpportunityForm && <OpportunityForm onClose={() => setShowOpportunityForm(false)} />}
        </AnimatePresence>

        {loadingOpps ? (
          <div className="divide-y divide-border">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="flex items-center justify-between px-4 py-3 gap-3">
                <div className="space-y-1"><Skeleton className="h-4 w-32" /><Skeleton className="h-3 w-20" /></div>
                <Skeleton className="h-5 w-20 rounded-full" />
              </div>
            ))}
          </div>
        ) : errorOpps ? (
          <ErrorCard message="Could not load opportunities" onRetry={() => refetchOpps()} />
        ) : opportunities?.length === 0 ? (
          <EmptyState
            icon={Briefcase}
            title="No opportunities yet"
            description="Track job applications and conversations. Click Add above to start."
          />
        ) : (
          <>
            <AnimatePresence initial={false}>
              {activeOpps.map(opp => <OpportunityRow key={opp.id} opp={opp} />)}
            </AnimatePresence>
            {archivedOpps.length > 0 && (
              <div className="border-t border-border">
                <div className="px-4 py-2 bg-muted/20">
                  <span className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground/60">
                    Archived ({archivedOpps.length})
                  </span>
                </div>
                <AnimatePresence initial={false}>
                  {archivedOpps.map(opp => <OpportunityRow key={opp.id} opp={opp} />)}
                </AnimatePresence>
              </div>
            )}
          </>
        )}
      </div>

      {/* ── Skills Inventory ── */}
      <div className="bg-card premium-shadow rounded-3xl overflow-hidden pb-2">
        <div className="px-6 py-4 border-b border-border flex items-center justify-between">
          <h2 className="text-sm font-semibold">Skills Inventory</h2>
          <div className="flex flex-wrap gap-1.5">
            {(Object.entries(LEVEL_STYLES) as [SkillInventory['level'], string][]).map(([level, style]) => (
              <span key={level} className={cn('text-[10px] font-medium px-2 py-0.5 rounded-full', style)}>
                {LEVEL_LABELS[level]}
              </span>
            ))}
          </div>
        </div>

        {loadingSkills ? (
          <div className="divide-y divide-border">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="flex items-center justify-between px-4 py-2.5">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-5 w-20 rounded-full" />
              </div>
            ))}
          </div>
        ) : errorSkills ? (
          <ErrorCard message="Could not load skills" onRetry={() => refetchSkills()} />
        ) : skills?.length === 0 ? (
          <EmptyState
            icon={BookOpen}
            title="No skills yet"
            description="Add skills to your vault's skills inventory file and they'll sync here."
          />
        ) : (
          Object.entries(byCategory).map(([cat, catSkills]) => (
            <div key={cat} className="border-b border-border last:border-0">
              <div className="px-4 py-2 bg-muted/30">
                <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground/60">{cat}</span>
              </div>
              <div className="divide-y divide-border">
                {catSkills.map(skill => (
                  <div key={skill.id} className="flex items-center justify-between px-4 py-2.5 hover:bg-muted/20 transition-colors">
                    <span className="text-sm text-foreground">{skill.skill_name}</span>
                    <span className={cn('text-xs font-medium px-2 py-0.5 rounded-full', LEVEL_STYLES[skill.level])}>
                      {LEVEL_LABELS[skill.level]}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ))
        )}
      </div>

      {/* ── Career Log ── */}
      <div className="bg-card premium-shadow rounded-3xl overflow-hidden pb-2">
        <div className="px-6 py-4 border-b border-border flex items-center justify-between">
          <h2 className="text-sm font-semibold">Career Log</h2>
          <button
            onClick={() => { setShowMilestoneForm(o => !o); setShowOpportunityForm(false) }}
            aria-label="Log a milestone"
            className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded"
          >
            <Plus className="w-3.5 h-3.5" /> Log
          </button>
        </div>

        <AnimatePresence>
          {showMilestoneForm && <MilestoneForm onClose={() => setShowMilestoneForm(false)} />}
        </AnimatePresence>

        {loadingEvents ? (
          <div className="divide-y divide-border">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="px-4 py-3 space-y-1.5">
                <Skeleton className="h-4 w-48" />
                <Skeleton className="h-3 w-64" />
              </div>
            ))}
          </div>
        ) : errorEvents ? (
          <ErrorCard message="Could not load career log" onRetry={() => refetchEvents()} />
        ) : events?.length === 0 ? (
          <EmptyState
            icon={History}
            title="No career events yet"
            description="Click Log above to record a milestone, learning, or achievement."
          />
        ) : (
          <div className="divide-y divide-border">
            {events?.slice(0, 30).map(e => (
              <div key={e.id} className="px-4 py-3 hover:bg-muted/20 transition-colors">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="flex items-center gap-2">
                      {EVENT_TYPE_LABELS[e.event_type] && (
                        <span className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground/60">
                          {EVENT_TYPE_LABELS[e.event_type] ?? e.event_type}
                        </span>
                      )}
                    </div>
                    <span className="text-sm font-medium text-foreground">{e.title}</span>
                    {e.description && <p className="text-xs text-muted-foreground mt-0.5">{e.description}</p>}
                  </div>
                  <span className="text-xs text-muted-foreground shrink-0">
                    {new Date(e.occurred_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                  </span>
                </div>
                {e.skill && (
                  <div className="mt-1 flex items-center gap-1.5">
                    <span className="text-[11px] bg-muted px-1.5 py-0.5 rounded text-muted-foreground">{e.skill}</span>
                    {e.skill_level && (
                      <span className={cn('text-[11px] px-1.5 py-0.5 rounded', LEVEL_STYLES[e.skill_level as SkillInventory['level']])}>
                        {LEVEL_LABELS[e.skill_level as SkillInventory['level']]}
                      </span>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
