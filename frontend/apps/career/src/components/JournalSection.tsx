/**
 * Career → Journal.
 *
 * Second page built the Phase 4 way (after Workspace → Milestones): the
 * canvas's `career:journal` composition — notes(12) · timeline(7) · rows(5) —
 * rebuilt from live API data. The composer writes; the timeline reads back;
 * the themes list is derived server-side by keyword, not by an LLM call.
 */
import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { NotebookPen, History, Tags } from 'lucide-react'
import { ErrorState, SkeletonPage } from '@ledgr/ui'
import { ModuleGrid, type ModuleSpec } from '@ct/shared/components/modules'
import { careerApi, type JournalEntry } from '@ct/shared/api/areas'
import { useDomainGoalsModule } from '@ct/shared/hooks/useDomainGoalsModule'
import { fromCalendarDate } from '@ct/shared/lib/calendarDate'

// Local-day parsing — see lib/calendarDate for why not `new Date(iso)`.
const fmtDay = (iso: string) =>
  fromCalendarDate(iso).toLocaleDateString(undefined, { day: 'numeric', month: 'short' })

/** First line, or the first ~60 characters — entries have no required title. */
function headline(entry: JournalEntry): string {
  if (entry.title) return entry.title
  const firstLine = entry.body.split('\n')[0].trim()
  return firstLine.length > 60 ? `${firstLine.slice(0, 60)}…` : firstLine
}

/** Themes cycle the palette's semantic slots so the tags stay visually distinct. */
const THEME_KEYS = ['career', 'info', 'success', 'accent', 'warning', 'health'] as const

export function JournalSection() {
  const qc = useQueryClient()
  const [body, setBody] = useState('')
  /* Journal is Career's landing page, so it carries the area's one goal
     surface: read-only progress on goals set in Workspace. */
  const goalsModule = useDomainGoalsModule('career')

  const entriesQ = useQuery({
    queryKey: ['career', 'journal'],
    queryFn: () => careerApi.journal(),
    staleTime: 30_000,
  })
  const statsQ = useQuery({
    queryKey: ['career', 'journal', 'stats'],
    queryFn: careerApi.journalStats,
    staleTime: 30_000,
  })

  const save = useMutation({
    mutationFn: () => careerApi.createJournalEntry({ body: body.trim() }),
    onSuccess: () => {
      // Both the list and the stats (streak, word count, themes) change.
      qc.invalidateQueries({ queryKey: ['career', 'journal'] })
      setBody('')
      toast.success('Entry saved')
    },
    onError: () => toast.error('Could not save that entry'),
  })

  const modules = useMemo<ModuleSpec[]>(() => {
    const entries = entriesQ.data ?? []
    const stats = statsQ.data

    const streak = stats?.streak_days ?? 0
    const today = new Date().toLocaleDateString(undefined, {
      weekday: 'long', day: 'numeric', month: 'long',
    })
    const streakLine = streak > 0 ? ` · ${streak} day writing streak` : ''

    const mods: ModuleSpec[] = [
      {
        kind: 'notes',
        span: 12,
        title: 'New entry',
        subtitle: `${today}${streakLine}`,
        icon: NotebookPen,
        iconKey: 'career',
        prompts: [{
          label: 'What did you learn today?',
          placeholder: 'What happened, what you made of it, what you would do differently.',
          height: '120px',
        }],
        cta: 'Save entry',
        hideDraft: true,
        values: [body],
        onValueChange: (_, v) => setBody(v),
        onSubmit: () => save.mutate(),
        submitting: save.isPending,
      },
    ]

    if (entries.length) {
      mods.push({
        kind: 'timeline',
        span: 7,
        title: 'Recent entries',
        subtitle: stats
          ? `${stats.entries_this_month} this month · ${stats.words_this_month.toLocaleString()} words`
          : `${entries.length} entries`,
        icon: History,
        iconKey: 'career',
        entries: entries.slice(0, 8).map((e) => ({
          title: headline(e),
          body: e.body.length > 180 ? `${e.body.slice(0, 180)}…` : e.body,
          date: fmtDay(e.entry_date),
          tagLabel: e.tags?.split(',')[0] || undefined,
          colorKey: 'career',
        })),
      })
    }

    if (stats?.themes.length) {
      mods.push({
        kind: 'rows',
        span: entries.length ? 5 : 12,
        title: 'Themes this month',
        subtitle: 'Tagged from your entries by keyword',
        icon: Tags,
        iconKey: 'career',
        rows: stats.themes.map((t, i) => ({
          title: t.tag.charAt(0).toUpperCase() + t.tag.slice(1),
          meta: `${t.count} ${t.count === 1 ? 'entry' : 'entries'}`,
          tagLabel: String(t.count),
          tagColorKey: THEME_KEYS[i % THEME_KEYS.length],
        })),
      })
    }

    return mods
  }, [entriesQ.data, statsQ.data, body, save])

  if (entriesQ.isLoading) return <SkeletonPage kpis={0} modules={[7, 5, 12]} />
  if (entriesQ.isError) {
    return <ErrorState title="Could not load your journal" onRetry={() => entriesQ.refetch()} />
  }

  return <ModuleGrid modules={goalsModule ? [...modules, goalsModule] : modules} />
}
