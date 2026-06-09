import { useQuery } from '@tanstack/react-query'
import { careerApi } from '@/api/areas'
import { cn } from '@/lib/utils'
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
  const { data: skills } = useQuery({ queryKey: ['career', 'skills'], queryFn: careerApi.skills })
  const { data: events } = useQuery({ queryKey: ['career', 'events'], queryFn: careerApi.events })

  const byCategory = skills?.reduce<Record<string, SkillInventory[]>>((acc, s) => {
    ;(acc[s.category] ??= []).push(s)
    return acc
  }, {}) ?? {}

  return (
    <div className="p-4 sm:p-6 space-y-6">
      <h1 className="text-2xl font-bold text-foreground">Career</h1>

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
        {Object.entries(byCategory).map(([cat, catSkills]) => (
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
        ))}
        {!skills?.length && (
          <p className="px-4 py-8 text-center text-sm text-muted-foreground">
            No skills synced yet. Add them to your vault's skills inventory file.
          </p>
        )}
      </div>

      {/* Career log */}
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <div className="px-4 py-3 border-b border-border">
          <h2 className="text-sm font-semibold">Career Log</h2>
        </div>
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
          {!events?.length && (
            <p className="px-4 py-8 text-center text-sm text-muted-foreground">No career events logged yet</p>
          )}
        </div>
      </div>
    </div>
  )
}
