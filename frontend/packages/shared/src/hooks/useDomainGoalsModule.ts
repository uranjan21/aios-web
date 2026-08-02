/**
 * The one goal surface an area page is allowed to have.
 *
 * Goals and milestones are set in Workspace, for every domain (decision
 * 2026-08-02) — the areas no longer carry goal *destinations* or goal editors.
 * What they keep is read-only progress on their own domain's goals, on the
 * Overview page only. This hook builds that module so Finance, Health and
 * Career render the identical thing rather than three near-copies.
 *
 * Progress per goal, in order of preference:
 *  1. `progress_score` — the last score the Weekly Review recorded.
 *  2. hit milestones ÷ total milestones, when the goal has milestones.
 *  3. nothing to show — the row states that instead of drawing a fake 0%.
 */
import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { Target } from 'lucide-react'

import { goalsApi } from '../api/goals'
import { workspaceApi } from '../api/workspace'
import type { ModuleSpec } from '../components/modules'

/** Days until a date-only target, negative once it has passed. */
function daysUntil(target?: string): number | null {
  if (!target) return null
  const d = new Date(`${String(target).slice(0, 10)}T00:00:00`)
  const now = new Date()
  return Math.round(
    (d.getTime() - new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime()) / 86_400_000,
  )
}

const fmtDate = (target: string) =>
  new Date(`${String(target).slice(0, 10)}T00:00:00`)
    .toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })

/**
 * @param domain  The `category` on a macro goal — 'finance' | 'health' | 'career'.
 * @param span    Grid columns out of 12. Defaults to the full row.
 */
export function useDomainGoalsModule(domain: string, span = 12): ModuleSpec | null {
  const navigate = useNavigate()

  const { data: goals } = useQuery({
    queryKey: ['goals'],
    queryFn: goalsApi.list,
    staleTime: 60_000,
  })

  const { data: milestones } = useQuery({
    queryKey: ['workspace', 'milestones', domain],
    queryFn: () => workspaceApi.getMilestones({ domain }),
    staleTime: 60_000,
  })

  return useMemo<ModuleSpec | null>(() => {
    const mine = (goals ?? []).filter(g => g.category === domain && g.status === 'active')
    if (!mine.length) return null

    // hit ÷ total per goal, from this domain's milestones.
    const tally = new Map<string, { hit: number; total: number }>()
    for (const m of milestones ?? []) {
      if (!m.goal_id) continue
      const t = tally.get(m.goal_id) ?? { hit: 0, total: 0 }
      t.total += 1
      if (m.status === 'hit') t.hit += 1
      tally.set(m.goal_id, t)
    }

    return {
      kind: 'progress',
      span,
      title: 'Goal progress',
      subtitle: 'Goals and milestones are set in Workspace',
      icon: Target,
      action: 'Open in Workspace',
      actionVariant: 'link',
      onAction: () => navigate(`/app/workspace/goals?domain=${domain}`),
      rows: mine.map(g => {
        const t = g.id ? tally.get(g.id) : undefined
        const scored = g.progress_score !== null && g.progress_score !== undefined
        const pct = scored
          ? Math.max(0, Math.min(100, Number(g.progress_score)))
          : t && t.total > 0
            ? Math.round((t.hit / t.total) * 100)
            : null

        const left = daysUntil(g.target_date)
        const overdue = left !== null && left < 0 && (pct ?? 0) < 100
        const meta = [
          g.target_date ? (overdue ? `Overdue — was due ${fmtDate(g.target_date)}` : `Due ${fmtDate(g.target_date)}`) : 'No target date',
          t && t.total > 0 ? `${t.hit}/${t.total} milestones` : null,
        ].filter(Boolean).join(' · ')

        return {
          title: g.title,
          meta,
          value: pct === null ? 'Not scored' : `${pct}%`,
          pct: pct ?? 0,
          colorKey: pct !== null && pct >= 100 ? 'success' : overdue ? 'destructive' : domain,
          ...(pct === null && { valueKey: 'mutedFg' as const }),
        }
      }),
    }
  }, [goals, milestones, domain, span, navigate])
}
