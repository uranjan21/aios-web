/**
 * Health → Overview.
 *
 * Phase 4 conversion to the canvas's `health:overview` design — four KPIs, a
 * week of workout minutes, and the daily habits with their streaks. Rebuilt
 * from the live summary, streak, gym-log and habit endpoints.
 *
 * ONE ADDITION beyond the canvas: the AI insight card stays below the grid.
 * The canvas draws no slot for it, but it is a working feature with no other
 * home in the new IA, so removing it would delete capability the redesign never
 * asked to lose.
 */
import { useMemo } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import dayjs from 'dayjs'
import styled from 'styled-components'
import { Activity, CheckSquare, Flame } from 'lucide-react'
import { healthApi } from '@ct/shared/api/areas'
import { ModuleGrid, type ModuleSpec } from '@ct/shared/components/modules'
import { AiInsightCard } from '@ct/shared/components/AiInsightCard'
import { Skeleton } from '@ct/shared/components/ui/skeleton'
import { useDomainGoalsModule } from '@ct/shared/hooks/useDomainGoalsModule'
import { formatRelativeTime } from '@ct/shared/lib/utils'

const Root = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.spacing[5]};
`

export function OverviewSection() {
  const qc = useQueryClient()
  /* Health's workspace goals, read-only — Overview is the only area surface
     that shows goals. `goals` below is a different thing: the numeric targets
     (goal weight, steps) that Health Settings owns. */
  const goalsModule = useDomainGoalsModule('health')

  const { data: streak, isLoading } = useQuery({ queryKey: ['health', 'streak'], queryFn: healthApi.streak })
  const { data: summary } = useQuery({ queryKey: ['health', 'summary'], queryFn: healthApi.summary })
  const { data: gymLogs } = useQuery({ queryKey: ['health', 'logs', 'gym'], queryFn: () => healthApi.logs('gym') })
  const { data: habits } = useQuery({ queryKey: ['health', 'habits'], queryFn: healthApi.habits })
  const { data: goals } = useQuery({
    queryKey: ['health', 'goals'],
    queryFn: healthApi.healthGoals,
    staleTime: 5 * 60_000,
  })

  const toggle = useMutation({
    mutationFn: (id: string) => healthApi.toggleHabit(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['health', 'habits'] }),
    onError: () => toast.error('Could not update that habit'),
  })

  const modules = useMemo<ModuleSpec[]>(() => {
    const today = dayjs()
    const todayKey = today.format('YYYY-MM-DD')
    const rows = habits ?? []
    const doneToday = rows.filter(h => h.checks.includes(todayKey)).length

    const last7 = Array.from({ length: 7 }, (_, i) => today.subtract(6 - i, 'day'))
    const minutesOn = (d: dayjs.Dayjs) => (gymLogs ?? [])
      .filter(l => dayjs(l.logged_at).isSame(d, 'day'))
      .reduce((s, l) => s + Number(l.value ?? 0), 0)
    const dailyTarget = 45

    const specs: ModuleSpec[] = [
      {
        kind: 'tiles',
        span: 12,
        tiles: [
          {
            label: 'Current weight',
            value: summary?.weight ? `${summary.weight} kg` : '—',
            sub: goals?.target_weight ? `Goal ${goals.target_weight} kg` : 'No goal set',
          },
          {
            label: 'Gym streak',
            value: `${streak?.current_streak ?? 0} ${(streak?.current_streak ?? 0) === 1 ? 'day' : 'days'}`,
            sub: 'Consecutive days trained',
            dotKey: (streak?.current_streak ?? 0) > 0 ? 'success' : 'warning',
          },
          {
            label: 'Last workout',
            value: formatRelativeTime(streak?.last_workout_at ?? null),
            sub: `${(gymLogs ?? []).length} session${(gymLogs ?? []).length === 1 ? '' : 's'} logged`,
          },
          {
            label: 'Habits today',
            value: rows.length ? `${doneToday} of ${rows.length}` : '—',
            sub: rows.length ? 'Checked off so far' : 'No habits tracked yet',
            ...(rows.length && {
              bar: Math.round((doneToday / rows.length) * 100),
              barKey: doneToday === rows.length ? 'success' : 'health',
            }),
          },
        ],
      },
      {
        kind: 'bars',
        span: 7,
        title: 'Training this week',
        subtitle: 'Minutes trained per day',
        icon: Activity,
        target: dailyTarget,
        targetLabel: 'Daily target',
        bars: last7.map(d => {
          const v = Math.round(minutesOn(d))
          return {
            label: d.format('ddd'),
            v,
            t: v > 0 ? `${v}m` : '',
            colorKey: v >= dailyTarget ? 'success' : v > 0 ? 'health' : 'muted',
            dim: v === 0,
          }
        }),
      },
    ]

    if (rows.length) {
      specs.push({
        kind: 'checklist',
        span: 5,
        title: 'Daily habits',
        subtitle: `${doneToday} of ${rows.length} done today`,
        icon: CheckSquare,
        items: rows.map(h => ({
          label: `${h.icon ? `${h.icon} ` : ''}${h.name}`,
          meta: h.streak > 0 ? `${h.streak}-day streak` : 'No streak yet',
          done: h.checks.includes(todayKey),
          ...(h.streak > 0 && { tagLabel: `${h.streak}d`, tagKey: 'success' }),
          busy: toggle.isPending && toggle.variables === h.id,
        })),
        onToggle: (i: number) => toggle.mutate(rows[i].id),
      })
    } else {
      specs.push({
        kind: 'rows',
        span: 5,
        title: 'Daily habits',
        subtitle: 'Nothing tracked yet',
        icon: Flame,
        rows: [],
      })
    }

    return specs
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [streak, summary, gymLogs, habits, goals, toggle.isPending])

  if (isLoading) return <Skeleton style={{ height: 320 }} />

  return (
    <Root>
      <ModuleGrid modules={goalsModule ? [...modules, goalsModule] : modules} />
      <AiInsightCard area="health" />
    </Root>
  )
}
