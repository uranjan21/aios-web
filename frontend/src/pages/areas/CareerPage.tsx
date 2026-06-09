import { useQuery } from '@tanstack/react-query'
import { BookOpen, History } from 'lucide-react'
import { careerApi } from '@/api/areas'
import { cn } from '@/lib/utils'
import { Skeleton } from '@/components/ui/skeleton'
import { ErrorCard } from '@/components/ErrorCard'
import { EmptyState } from '@/components/EmptyState'
import type { SkillInventory } from '@/types'

const LEVEL_STYLES: Record<SkillInventory['level'], string> = {
  day_0: 'bg-zinc-500/20 text-zinc-400',
  beginner: 'bg-red-500/20 text-red-400',
  practitioner: 'bg-amber-500/20 text-amber-400',
  competent: 'bg-emerald-500/20 text-emerald-500',
  proficient: 'bg-blue-500/20 text-blue-400',
  expert: 'bg-violet-500/20 text-violet-400',
}

const LEVEL_LABELS: Record<SkillInventory['level'], string> = {
  day_0: 'Day 0',
  beginner: 'Beginner',
  practitioner: 'Practitioner',
  competent: 'Competent',
  proficient: 'Proficient',
  expert: 'Expert',
}

export function CareerPage() {
  const { data: skills, isLoading: loadingSkills, isError: errorSkills, refetch: refetchSkills } = useQuery({
    queryKey: ['career', 'skills'],
    queryFn: careerApi.skills,
  })
  const { data: events, isLoading: loadingEvents, isError: errorEvents, refetch: refetchEvents } = useQuery({
    queryKey: ['career', 'events'],
    queryFn: careerApi.events,
  })

  const byCategory = skills?.reduce<Record<string, SkillInventory[]>>((acc, s) => {
    ;(acc[s.category] ??= []).push(s)
    return acc
  }, {}) ?? {}

  return (
    <div className="p-4 sm:p-6 space-y-6">
      <h1 className="text-2xl font-semibold text-foreground">Career</h1>

      {/* Skills inventory */}
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <div className="px-4 py-3 border-b border-border flex items-center justify-between">
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
                <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{cat}</span>
              </div>
              <div className="divide-y divide-border">
                {catSkills.map(skill => (
                  <div key={skill.id} className="flex items-center justify-between px-4 py-2.5">
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

      {/* Career log */}
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <div className="px-4 py-3 border-b border-border">
          <h2 className="text-sm font-semibold">Career Log</h2>
        </div>

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
            description="Use the chat agent to log milestones, learnings, and career updates."
          />
        ) : (
          <div className="divide-y divide-border">
            {events?.slice(0, 20).map(e => (
              <div key={e.id} className="px-4 py-3">
                <div className="flex items-start justify-between gap-2">
                  <div>
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
