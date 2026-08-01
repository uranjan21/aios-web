/**
 * Today → Weekly review.
 *
 * Phase 4 conversion to the canvas's `today:review` composition —
 * progress(7) · checklist(5) · notes(7) · timeline(5) — rebuilt from live data.
 * It replaces the old four-step wizard: the canvas puts the whole ritual on one
 * page, so the scorecard, the check-in, the reflection composer and the week's
 * writing all read at once instead of behind Next buttons.
 *
 * Where each module comes from:
 *  - scorecard  → `/insights/pulse`, the same per-domain deltas the dashboard
 *                 shows, scored as movement in the direction that is good.
 *  - checklist  → the user's open goals. Ticking one records progress, which is
 *                 exactly what the old wizard's step 2 did.
 *  - reflection → writes a real journal entry, which is what the canvas's own
 *                 subtitle promises.
 *  - timeline   → what was written this week, falling back to the latest brief.
 *
 * ONE DEPARTURE: the canvas's checklist is cross-domain chores ("move
 * unfinished sprint tasks"). Nothing generates that list, so the checklist is
 * the goals — the thing a weekly review is for, and the one list where ticking
 * a box has a real effect.
 */
import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import dayjs from 'dayjs'
import { BarChart3, CalendarCheck, CheckSquare, FileText, Flag } from 'lucide-react'
import { PageHeader } from '@ledgr/ui'
import { api } from '@ct/shared/api/client'
import { goalsApi } from '@ct/shared/api/goals'
import { careerApi } from '@ct/shared/api/areas'
import { insightsApi } from '@ct/shared/api/insights'
import { ModuleGrid, type ModuleSpec } from '@ct/shared/components/modules'
import { PageDivider } from '@ct/shared/components/layout/PageDivider'
import { PageContainer, PageContent } from '@ct/shared/components/layout/PageLayout'
import { isActiveDomain } from '@ct/shared/config/domains'
import { toCalendarDate } from '@ct/shared/lib/calendarDate'

interface PulseTile {
  domain: string
  label: string
  value: number
  unit: 'currency' | 'count'
  delta_pct: number | null
  delta_good_when: 'up' | 'down'
  series: number[] | null
}

const PROMPTS = [
  { label: 'What actually moved this week', placeholder: 'One or two things that mattered…', height: '82px' },
  { label: 'What slipped, and why', placeholder: 'Be specific about the cause, not the guilt…', height: '82px' },
  { label: 'One priority for next week', placeholder: 'The single thing that would make next week a win…', height: '62px' },
]

export function ReviewPage() {
  const qc = useQueryClient()
  const [answers, setAnswers] = useState<string[]>(['', '', ''])

  const weekStart = dayjs().startOf('week')
  const weekEnd = weekStart.add(6, 'day')

  const { data: tiles = [] } = useQuery({
    queryKey: ['insights', 'pulse'],
    queryFn: () => api.get<PulseTile[]>('/insights/pulse').then(r => r.data),
    staleTime: 5 * 60_000,
  })
  const { data: goals = [] } = useQuery({ queryKey: ['goals'], queryFn: goalsApi.list, staleTime: 60_000 })
  const { data: briefing } = useQuery({
    queryKey: ['insights', 'briefing', 'today'],
    queryFn: insightsApi.briefingToday,
    staleTime: 10 * 60_000,
  })
  const { data: journal = [] } = useQuery({
    queryKey: ['career', 'journal'],
    queryFn: () => careerApi.journal(30),
    staleTime: 60_000,
  })

  /** Ticking a goal records a check-in — the old wizard's step 2. */
  const checkIn = useMutation({
    mutationFn: ({ id, onTrack }: { id: string; onTrack: boolean }) =>
      goalsApi.addProgress(id, { progress_score: onTrack ? 100 : 0, ai_insight: 'Weekly review' }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['goals'] })
      toast.success('Goal checked in')
    },
    onError: () => toast.error('Failed to update progress'),
  })

  const submitReflection = useMutation({
    mutationFn: () => {
      const body = PROMPTS
        .map((p, i) => (answers[i].trim() ? `**${p.label}**\n\n${answers[i].trim()}` : null))
        .filter(Boolean)
        .join('\n\n')
      return careerApi.createJournalEntry({
        body,
        title: `Weekly review — ${weekStart.format('D MMM')} to ${weekEnd.format('D MMM')}`,
        entry_date: toCalendarDate(new Date()),
      })
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['career', 'journal'] })
      setAnswers(['', '', ''])
      toast.success('Week closed — reflection saved to your journal')
    },
    onError: () => toast.error('Could not save that reflection'),
  })

  /** Journal entries dated inside this week are the week's record. */
  const thisWeeksEntries = useMemo(
    () => journal.filter(e => {
      const d = dayjs(e.entry_date)
      return !d.isBefore(weekStart, 'day') && !d.isAfter(weekEnd, 'day')
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [journal],
  )

  const modules = useMemo<ModuleSpec[]>(() => {
    const active = tiles.filter(t => isActiveDomain(t.domain))

    // A domain scores on how far it moved in the direction that is good for it.
    // No comparison reads as 50 — holding steady, neither win nor slip.
    const scoreOf = (t: PulseTile) => {
      if (t.delta_pct === null) return 50
      const signed = t.delta_good_when === 'up' ? t.delta_pct : -t.delta_pct
      return Math.max(0, Math.min(100, Math.round(50 + signed)))
    }

    const openGoals = goals.filter(g => g.status !== 'completed' && g.status !== 'archived')
    const specs: ModuleSpec[] = []

    if (active.length) {
      specs.push({
        kind: 'progress',
        span: 7,
        title: 'Week scorecard',
        subtitle: `${weekStart.format('ddd D MMM')} – ${weekEnd.format('ddd D MMM')}`,
        icon: BarChart3,
        rows: active.map((t) => {
          const score = scoreOf(t)
          return {
            title: t.label,
            meta: t.delta_pct === null
              ? 'No comparison against last week yet'
              : `${t.delta_pct >= 0 ? '+' : ''}${t.delta_pct.toFixed(0)}% vs last week · better when ${t.delta_good_when}`,
            pct: score,
            value: String(score),
            colorKey: t.domain,
          }
        }),
      })
    }

    specs.push({
      kind: 'checklist',
      span: active.length ? 5 : 12,
      title: 'Goal check-in',
      subtitle: openGoals.length
        ? `${openGoals.length} open goal${openGoals.length === 1 ? '' : 's'} · tick the ones on track`
        : 'No open goals to review',
      icon: CheckSquare,
      items: openGoals.map(g => ({
        label: g.title,
        meta: g.target_date ? `Target ${dayjs(g.target_date).format('D MMM YYYY')}` : 'No target date',
        done: false,
        tagLabel: g.category,
        tagKey: isActiveDomain(g.category) ? g.category : 'mutedFg',
        busy: checkIn.isPending && checkIn.variables?.id === g.id,
      })),
      onToggle: (i: number) => checkIn.mutate({ id: openGoals[i].id, onTrack: true }),
    })

    specs.push({
      kind: 'notes',
      span: 7,
      title: 'Reflection',
      subtitle: 'Saved to your career journal on submit',
      icon: FileText,
      cta: 'Close the week',
      prompts: PROMPTS,
      values: answers,
      onValueChange: (i: number, v: string) => setAnswers(a => a.map((x, j) => (j === i ? v : x))),
      onSubmit: () => submitReflection.mutate(),
      submitting: submitReflection.isPending,
      hideDraft: true,
    })

    specs.push({
      kind: 'timeline',
      span: 5,
      title: 'Written this week',
      subtitle: thisWeeksEntries.length
        ? `${thisWeeksEntries.length} journal entr${thisWeeksEntries.length === 1 ? 'y' : 'ies'}`
        : 'Nothing written yet this week',
      icon: Flag,
      entries: thisWeeksEntries.length
        ? thisWeeksEntries.map(e => ({
            title: e.title ?? 'Journal entry',
            body: e.body.replace(/\*\*/g, ' ').slice(0, 140),
            date: dayjs(e.entry_date).format('ddd'),
            ...(e.tags ? { tagLabel: e.tags.split(',')[0], colorKey: 'career' } : {}),
          }))
        : briefing?.status === 'ready' && briefing.briefing
          ? [{
              title: 'Latest daily brief',
              body: briefing.briefing.content_md.replace(/\*\*/g, '').slice(0, 240),
              date: dayjs(briefing.briefing.date).format('ddd'),
              tagLabel: 'AI',
              colorKey: 'accent',
            }]
          : [],
    })

    return specs
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tiles, goals, answers, thisWeeksEntries, briefing, checkIn.isPending, submitReflection.isPending])

  return (
    <PageContainer>
      <PageContent>
        <PageHeader
          icon={<CalendarCheck />}
          eyebrow="Routine"
          title="Weekly Review"
          subtitle="Your Sunday ritual to align and focus"
        />
        <PageDivider />
        <ModuleGrid modules={modules} />
      </PageContent>
    </PageContainer>
  )
}
