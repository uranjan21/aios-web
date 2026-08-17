/**
 * Today → Overview.
 *
 * The canvas's `today:overview` composition, exactly: a plain greeting line,
 * four KPI tiles, Today's Focus beside Schedule, and the 12-week activity heat.
 *
 * 2026-08-02: this replaced a two-column shell that also carried BriefingCard,
 * OverviewInsightCard, DiscoveriesFeed and a 300px sticky calendar rail. The
 * canvas draws none of them and the page had grown to nine cards; those four
 * components are left in the repo unreferenced rather than deleted, since the
 * data behind them (the daily brief, synergy discoveries) is still produced.
 *
 * WHERE THE CANVAS ASKS FOR SOMETHING THE BACKEND DOES NOT STORE, the tile
 * keeps the question and answers it from what exists — the standing Phase 4
 * rule. The two such tiles are noted at their call sites.
 */
import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import styled, { useTheme } from 'styled-components'
import { toast } from 'sonner'
import { motion } from 'framer-motion'
import { Loader2, Activity, Calendar, CheckSquare } from 'lucide-react'
import { ErrorState, SkeletonPage, textRole } from '@ledgr/ui'

import { financeApi, healthApi, careerApi } from '@ct/shared/api/areas'
import { workspaceApi, type Task } from '@ct/shared/api/workspace'
import { useDayEventsStore, fmtDateKey } from '@ct/shared/stores/dayEventsStore'
import { useAuthStore } from '@ct/shared/stores/authStore'
import { categoryColor } from '@ct/shared/theme/domains'
import { ACTIVE_DOMAIN_KEYS, domainLabel } from '@ct/shared/config/domains'
import { useMotion } from '@ct/shared/hooks/useMotion'
import { ModuleGrid, type ModuleSpec } from '@ct/shared/components/modules'
import { PageContainer, PageContent } from '@ct/shared/components/layout/PageLayout'
import { formatCurrency, plural } from '@ct/shared/lib/utils'

const Greeting = styled.h1`
  ${textRole('title-l')};
  font-weight: 700;
  letter-spacing: -0.02em;
  margin: 0;
`

const GreetingMeta = styled.p`
  ${textRole('body-m')};
  color: ${({ theme }) => theme.color.mutedForeground};
  margin: ${({ theme }) => `${theme.spacing[1]} 0 0`};
`

const SpinningLoader = styled(Loader2)<{ $spinning?: boolean }>`
  animation: ${({ $spinning }) => ($spinning ? 'ct-dash-spin 1s linear infinite' : 'none')};

  @keyframes ct-dash-spin {
    from { transform: rotate(0deg); }
    to { transform: rotate(360deg); }
  }
`

const WEEKS = 12
const DAY_MS = 86_400_000

function timeGreeting(): string {
  const h = new Date().getHours()
  if (h < 5) return 'Still up'
  if (h < 12) return 'Good morning'
  if (h < 17) return 'Good afternoon'
  if (h < 21) return 'Good evening'
  return 'Good night'
}

/** 7.2 -> "7h 12m". Sleep is reported in decimal hours. */
function hoursLabel(hours: number): string {
  const whole = Math.floor(hours)
  const mins = Math.round((hours - whole) * 60)
  return mins ? `${whole}h ${mins}m` : `${whole}h`
}

/** Monday of the week containing `d`, at local midnight. */
function mondayOf(d: Date): Date {
  const out = new Date(d)
  out.setHours(0, 0, 0, 0)
  out.setDate(out.getDate() - ((out.getDay() + 6) % 7))
  return out
}

export function DashboardPage() {
  const theme = useTheme()
  const qc = useQueryClient()
  const user = useAuthStore((s) => s.user)
  const events = useDayEventsStore((s) => s.events)
  const { stagger, child } = useMotion()

  const [startY, setStartY] = useState(0)
  const [pullDist, setPullDist] = useState(0)
  const [refreshing, setRefreshing] = useState(false)

  const today = new Date()
  const todayKey = fmtDateKey(today)

  /*
   * Every query on this page opts out of the global throw (App.tsx) and is
   * handled together below: the dashboard is the app's front door, so a failed
   * request must say "couldn't load" with a retry, not blow the route away and
   * not — as it did until 2026-08-16 — print ₹0 and "No streak" as if those
   * were the facts.
   */
  const q = { meta: { inlineError: true } } as const

  const netWorthQ = useQuery({ queryKey: ['finance', 'net-worth'], queryFn: financeApi.netWorth, ...q })
  const snapshotsQ = useQuery({
    queryKey: ['finance', 'snapshots'], queryFn: financeApi.snapshots, staleTime: 300_000, ...q,
  })
  const sleepQ = useQuery({ queryKey: ['health', 'sleep', 'recent'], queryFn: healthApi.sleepRecent, ...q })
  const habitsQ = useQuery({ queryKey: ['health', 'habits'], queryFn: healthApi.habits, ...q })
  const journalStatsQ = useQuery({
    queryKey: ['career', 'journal', 'stats'], queryFn: careerApi.journalStats, staleTime: 300_000, ...q,
  })
  const tasksQ = useQuery({ queryKey: ['workspace', 'tasks'], queryFn: () => workspaceApi.getTasks(), ...q })

  const panels = [netWorthQ, snapshotsQ, sleepQ, habitsQ, journalStatsQ, tasksQ]
  const isError = panels.some((p) => p.isError)
  const isLoading = panels.some((p) => p.isLoading)

  const netWorth = netWorthQ.data
  const snapshots = snapshotsQ.data
  const sleep = sleepQ.data
  const habits = habitsQ.data
  const journalStats = journalStatsQ.data
  const tasks = tasksQ.data

  const toggleTask = useMutation({
    mutationFn: (t: Task) => workspaceApi.updateTask(t.id, { status: t.status === 'done' ? 'todo' : 'done' }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['workspace', 'tasks'] }),
    onError: () => toast.error('Could not update that task'),
  })

  const toggleHabit = useMutation({
    mutationFn: (id: string) => healthApi.toggleHabit(id, todayKey),
    /* Optimistic: a habit chip must feel instant, and the check is a toggle so
       rolling back on failure restores exactly the prior state. */
    onMutate: async (id) => {
      await qc.cancelQueries({ queryKey: ['health', 'habits'] })
      const prev = qc.getQueryData<typeof habits>(['health', 'habits'])
      qc.setQueryData<typeof habits>(['health', 'habits'], (old) =>
        old?.map((h) => h.id === id
          ? {
              ...h,
              checks: h.checks?.includes(todayKey)
                ? h.checks.filter((d) => d !== todayKey)
                : [...(h.checks ?? []), todayKey],
            }
          : h),
      )
      return { prev }
    },
    onError: (_e, _id, ctx) => {
      qc.setQueryData(['health', 'habits'], ctx?.prev)
      toast.error('Could not update that habit')
    },
    onSettled: () => qc.invalidateQueries({ queryKey: ['health', 'habits'] }),
  })

  /** Open tasks that are due today or already late, soonest first. */
  const focusTasks = useMemo(() => (tasks ?? [])
    .filter((t) => t.status !== 'done' && t.due_date && t.due_date <= todayKey)
    .sort((a, b) => (a.due_date ?? '').localeCompare(b.due_date ?? ''))
    .slice(0, 6), [tasks, todayKey])

  const overdueCount = focusTasks.filter((t) => (t.due_date ?? '') < todayKey).length

  const todaysEvents = useMemo(
    () => events
      .filter((e) => e.date === todayKey)
      .sort((a, b) => (a.time ?? '').localeCompare(b.time ?? '')),
    [events, todayKey],
  )

  const attention = focusTasks.length + todaysEvents.length

  const modules = useMemo<ModuleSpec[]>(() => {
    /* Net-worth movement comes from the newest snapshot of an earlier month.
       With no snapshot there is no honest comparison, so the tile says so
       rather than printing a made-up percentage. */
    const thisMonth = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`
    const prior = (snapshots ?? [])
      .filter((s) => s.net_worth != null && s.snapshot_month < thisMonth)
      .sort((a, b) => b.snapshot_month.localeCompare(a.snapshot_month))[0]
    const nwDelta = prior && Number(prior.net_worth) !== 0
      ? ((netWorth?.net_worth ?? 0) - Number(prior.net_worth)) / Math.abs(Number(prior.net_worth)) * 100
      : null

    const lastNight = sleep?.last_night ?? null
    const sleepTarget = sleep?.target ?? 0

    const specs: ModuleSpec[] = [
      {
        kind: 'tiles',
        span: 12,
        cols: 4,
        tiles: [
          {
            label: 'Net worth',
            value: formatCurrency(netWorth?.net_worth ?? 0),
            sub: nwDelta === null
              ? 'No earlier snapshot to compare'
              : `${nwDelta >= 0 ? '↑' : '↓'} ${Math.abs(nwDelta).toFixed(1)}%`,
            subKey: nwDelta === null ? undefined : nwDelta >= 0 ? 'success' : 'destructive',
          },
          {
            label: 'Sleep last night',
            value: lastNight == null ? '—' : hoursLabel(lastNight),
            sub: lastNight == null
              ? 'Nothing logged'
              : sleepTarget > 0
                ? lastNight >= sleepTarget
                  ? 'On target'
                  : `${hoursLabel(sleepTarget - lastNight)} under target`
                : `${hoursLabel(sleep?.weekly_avg ?? 0)} weekly average`,
            subKey: lastNight == null
              ? undefined
              : sleepTarget > 0 && lastNight >= sleepTarget ? 'success' : 'warning',
          },
          {
            /* The canvas labels this "Career streak" and compares it to last
               week. Nothing stores a historical streak, so the sub reports the
               month's volume — the fact that IS recorded. */
            label: 'Career streak',
            value: `${journalStats?.streak_days ?? 0} ${plural(journalStats?.streak_days ?? 0, 'day')}`,
            sub: journalStats?.entries_this_month
              ? `${journalStats.entries_this_month} ${plural(journalStats.entries_this_month, 'entry', 'entries')} this month`
              : 'No journal entries yet',
            dotKey: (journalStats?.streak_days ?? 0) > 0 ? 'success' : 'mutedFg',
          },
          {
            label: 'Tasks due today',
            value: String(focusTasks.length),
            sub: overdueCount
              ? `${overdueCount} overdue`
              : focusTasks.length ? 'All due today' : 'Nothing due',
            subKey: overdueCount ? 'destructive' : 'success',
          },
        ],
      },
      {
        kind: 'checklist',
        span: 7,
        title: "Today's Focus",
        subtitle: 'What needs to happen before you sleep',
        icon: CheckSquare,
        items: focusTasks.length
          ? focusTasks.map((t) => ({
              label: t.title,
              done: false,
              busy: toggleTask.isPending && toggleTask.variables?.id === t.id,
              ...(t.due_date && t.due_date < todayKey && { meta: `Overdue since ${t.due_date}` }),
              ...(t.domain && {
                tagLabel: domainLabel(t.domain),
                /* Only the three live domains are palette slots. A retired or
                   unknown key would otherwise be passed through as a literal
                   CSS colour and silently fail to paint. */
                tagKey: (ACTIVE_DOMAIN_KEYS as readonly string[]).includes(t.domain)
                  ? t.domain
                  : 'accent',
              }),
            }))
          : [{ label: 'Nothing due today', meta: 'Give a task a due date and it lands here' }],
        ...(focusTasks.length > 0 && { onToggle: (i: number) => toggleTask.mutate(focusTasks[i]) }),
        groupLabel: 'Habits',
        chips: (habits ?? []).slice(0, 6).map((h) => ({
          label: h.name,
          done: h.checks?.includes(todayKey),
          colorKey: 'health',
          busy: toggleHabit.isPending && toggleHabit.variables === h.id,
        })),
        onChipToggle: (i: number) => {
          const habit = (habits ?? [])[i]
          if (habit) toggleHabit.mutate(habit.id)
        },
      },
      {
        kind: 'agenda',
        span: 5,
        title: 'Schedule',
        subtitle: 'Your calendar for today',
        icon: Calendar,
        emptyLabel: 'Nothing on the calendar today.',
        entries: todaysEvents.map((e) => ({
          time: e.time ?? 'All day',
          title: e.title,
          colorKey: categoryColor(e.category, theme),
        })),
      },
    ]

    /* 12 columns = the last 12 weeks, one row per habit. Cell intensity is that
       week's check count bucketed into the kind's four steps. */
    if (habits?.length) {
      const weekStarts = Array.from({ length: WEEKS }, (_, i) => {
        const d = mondayOf(today)
        d.setDate(d.getDate() - (WEEKS - 1 - i) * 7)
        return d
      })

      specs.push({
        kind: 'heat',
        span: 12,
        title: '12-Week Activity',
        subtitle: 'Your consistency across all habit tracking',
        icon: Activity,
        colorKey: 'health',
        dayLabels: weekStarts.map((d) => String(d.getDate())),
        habits: habits.slice(0, 6).map((h) => {
          const checks = new Set(h.checks ?? [])
          return {
            label: h.name,
            cells: weekStarts.map((start) => {
              let hit = 0
              for (let i = 0; i < 7; i++) {
                if (checks.has(fmtDateKey(new Date(start.getTime() + i * DAY_MS)))) hit++
              }
              return hit === 0 ? 0 : hit <= 2 ? 1 : hit <= 4 ? 2 : 3
            }),
            streak: h.streak > 0 ? `${h.streak}-day streak` : 'No streak',
            broken: h.streak === 0,
          }
        }),
      })
    }

    return specs
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    netWorth, snapshots, sleep, habits, journalStats, focusTasks, overdueCount,
    todaysEvents, theme, todayKey, toggleTask.isPending, toggleHabit.isPending,
  ])

  const handleTouchStart = (e: React.TouchEvent) => {
    if (window.scrollY === 0) setStartY(e.touches[0].clientY)
  }
  const handleTouchMove = (e: React.TouchEvent) => {
    if (startY > 0) {
      const dist = e.touches[0].clientY - startY
      if (dist > 0) setPullDist(dist)
    }
  }
  const handleTouchEnd = async () => {
    if (pullDist > 80 && !refreshing) {
      setRefreshing(true)
      await qc.invalidateQueries()
      setTimeout(() => setRefreshing(false), 500)
    }
    setStartY(0)
    setPullDist(0)
  }

  const offset = refreshing ? 60 : Math.min(pullDist / 2, 60)
  const firstName = (user?.name ?? '').trim().split(/\s+/)[0]

  return (
    <PageContainer onTouchStart={handleTouchStart} onTouchMove={handleTouchMove} onTouchEnd={handleTouchEnd}>
      <PageContent>
        {/* Pull to refresh indicator */}
        <div style={{
          height: offset, display: 'flex', alignItems: 'center', justifyContent: 'center',
          overflow: 'hidden', transition: pullDist === 0 ? 'height 0.2s' : 'none',
        }}>
          {(pullDist > 40 || refreshing) && (
            <SpinningLoader
              $spinning={refreshing}
              style={{ transform: refreshing ? 'none' : `rotate(${pullDist * 2}deg)` }}
              size={20}
              color="var(--muted-foreground)"
            />
          )}
        </div>

        <motion.div initial={stagger.initial} animate={stagger.animate} variants={stagger.variants}>
          <motion.div variants={child.variants}>
            <Greeting>{timeGreeting()}{firstName ? `, ${firstName}` : ''}</Greeting>
            <GreetingMeta>
              {today.toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long' })}
              {attention > 0 && ` · ${attention} thing${attention === 1 ? '' : 's'} need${attention === 1 ? 's' : ''} your attention today`}
            </GreetingMeta>
          </motion.div>

          <motion.div variants={child.variants} style={{ marginTop: 24 }}>
            {isError ? (
              <ErrorState
                title="We couldn't load your day"
                description="Nothing has been lost — one of the requests behind this page failed."
                onRetry={() => { panels.forEach((p) => { void p.refetch() }) }}
              />
            ) : isLoading ? (
              <SkeletonPage kpis={4} modules={[7, 5, 12]} />
            ) : (
              <ModuleGrid modules={modules} />
            )}
          </motion.div>
        </motion.div>
      </PageContent>
    </PageContainer>
  )
}
