import { useMemo } from 'react'
import { toast } from 'sonner'
import styled from 'styled-components'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Flame, Activity, Target, Layers, History, IndianRupee, Heart, Briefcase, Rocket, PenLine, Check, Clock, AlertCircle } from 'lucide-react'
import { Card, Stack, Sparkline } from '@ledgr/ui'
import { useNavigate } from 'react-router-dom'
import {
  healthApi, financeApi, careerApi, businessApi, contentApi, capturesApi,
} from '@/api/areas'
import { useDayEventsStore, fmtDateKey, parseLocalDate } from '@/stores/dayEventsStore'
import { formatCurrency, formatRelativeTime } from '@/lib/utils'
import { Skeleton } from '@/components/ui/skeleton'
import { CATEGORY_COLOR } from './MonthlyCalendar'

/* ─────────────────────── Shared bits ─────────────────────── */

const Empty = styled.p`
  margin: 8px 0 0 0;
  font-size: 12px;
  color: ${({ theme }) => theme.color.mutedForeground};
  line-height: 1.4;
`

const StatRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size: 12.5px;
  padding: 6px 0;
  &:not(:last-child) {
    border-bottom: 1px solid ${({ theme }) => theme.color.border};
  }
`

const StatLabel = styled.span`
  display: flex;
  align-items: center;
  gap: 6px;
  color: ${({ theme }) => theme.color.mutedForeground};
  font-weight: 500;
`

const StatValue = styled.span`
  color: ${({ theme }) => theme.color.foreground};
  font-weight: 600;
  font-variant-numeric: tabular-nums;
`

/* ─────────────────────── 1. HabitsCard ─────────────────────── */

const HabitRow = styled.button<{ $checkedToday: boolean }>`
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  padding: 8px 10px;
  border-radius: ${({ theme }) => theme.radii.md};
  border: 1px solid ${({ theme }) => theme.color.border};
  background: ${({ theme, $checkedToday }) =>
    $checkedToday ? theme.color.success + '14' : theme.color.background};
  color: ${({ theme }) => theme.color.foreground};
  cursor: pointer;
  transition: background 120ms, transform 120ms;
  text-align: left;
  &:hover { transform: translateY(-1px); background: ${({ theme }) => theme.color.muted}; }
  &:focus-visible { outline: 2px solid ${({ theme }) => theme.color.ring}; outline-offset: 1px; }
`

const HabitName = styled.span`
  font-size: 12.5px;
  font-weight: 600;
  display: flex;
  align-items: center;
  gap: 8px;
`

const StreakBadge = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 3px;
  font-size: 11px;
  font-weight: 700;
  color: ${({ theme }) => theme.color.accent};
  background: ${({ theme }) => theme.color.accent}1A;
  padding: 2px 7px;
  border-radius: ${({ theme }) => theme.radii.sm};
`

const CheckIcon = styled.span<{ $on: boolean }>`
  width: 18px;
  height: 18px;
  border-radius: 50%;
  border: 1.5px solid ${({ theme, $on }) => $on ? theme.color.success : theme.color.border};
  background: ${({ theme, $on }) => $on ? theme.color.success : 'transparent'};
  color: ${({ theme }) => theme.color.successForeground};
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
`

export function HabitsCard() {
  const qc = useQueryClient()
  const { data: habits, isLoading } = useQuery({ queryKey: ['health', 'habits'], queryFn: healthApi.habits })
  const { data: streak } = useQuery({ queryKey: ['health', 'streak'], queryFn: healthApi.streak })

  const today = fmtDateKey(new Date())
  const toggle = useMutation({
    mutationFn: (id: string) => healthApi.toggleHabit(id, today),
    onMutate: async (id) => {
      await qc.cancelQueries({ queryKey: ['health', 'habits'] })
      const prev = qc.getQueryData<typeof habits>(['health', 'habits'])
      qc.setQueryData<typeof habits>(['health', 'habits'], (old) =>
        old?.map((h) =>
          h.id === id
            ? {
                ...h,
                checks: Array.isArray(h.checks) && h.checks.includes(today)
                  ? h.checks.filter((d: string) => d !== today)
                  : [...(h.checks ?? []), today],
              }
            : h
        )
      )
      return { prev }
    },
    onError: (_err, _id, ctx) => {
      qc.setQueryData(['health', 'habits'], ctx?.prev)
      toast.error('Failed to toggle habit')
    },
    onSettled: () => qc.invalidateQueries({ queryKey: ['health', 'habits'] }),
  })

  return (
    <Card title="Habits & Streaks" subtitle="Daily check-ins" icon={<Flame size={14} style={{ color: '#CA8A04' }} />}>
      {isLoading ? (
        <Stack direction="column" gap={2}>
          <Skeleton style={{ height: 34, width: '100%' }} />
          <Skeleton style={{ height: 34, width: '100%' }} />
          <Skeleton style={{ height: 34, width: '100%' }} />
        </Stack>
      ) : !habits || habits.length === 0 ? (
        <>
          <Empty>No habits tracked yet. Add some on the Health page.</Empty>
          {streak && streak.current_streak > 0 && (
            <StatRow style={{ marginTop: 10 }}>
              <StatLabel><Flame size={12} /> Gym streak</StatLabel>
              <StatValue>{streak.current_streak} days</StatValue>
            </StatRow>
          )}
        </>
      ) : (
        <Stack direction="column" gap={2}>
          {habits.slice(0, 5).map((h) => {
            const checkedToday = h.checks?.includes(today)
            return (
              <HabitRow key={h.id} $checkedToday={checkedToday} onClick={() => toggle.mutate(h.id)}>
                <HabitName>
                  <CheckIcon $on={checkedToday}>{checkedToday && <Check size={11} strokeWidth={3} />}</CheckIcon>
                  {h.name}
                </HabitName>
                {h.streak > 0 && <StreakBadge><Flame size={10} /> {h.streak}</StreakBadge>}
              </HabitRow>
            )
          })}
        </Stack>
      )}
    </Card>
  )
}

/* ───────────────── 2. WeekActivityCard ───────────────── */

const BarsWrap = styled.div`
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 6px;
  align-items: end;
  height: 90px;
  margin-top: 4px;
`

const BarColumn = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  height: 100%;
  justify-content: flex-end;
`

const Bar = styled.div<{ $heightPct: number; $today: boolean }>`
  width: 100%;
  height: ${({ $heightPct }) => Math.max(4, $heightPct)}%;
  background: ${({ theme, $today }) => $today ? theme.color.accent : theme.color.foreground + 'AA'};
  border-radius: 4px 4px 2px 2px;
  transition: height 220ms ease-out;
`

const DowSm = styled.span<{ $today: boolean }>`
  font-size: 10px;
  font-weight: ${({ $today }) => $today ? 700 : 500};
  color: ${({ theme, $today }) => $today ? theme.color.accent : theme.color.mutedForeground};
`

const Total = styled.div`
  margin-top: 12px;
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  padding-top: 10px;
  border-top: 1px solid ${({ theme }) => theme.color.border};
`

const TotalNum = styled.span`
  font-size: 20px;
  font-weight: 700;
  color: ${({ theme }) => theme.color.foreground};
  font-variant-numeric: tabular-nums;
`

const TotalLabel = styled.span`
  font-size: 11px;
  color: ${({ theme }) => theme.color.mutedForeground};
  text-transform: uppercase;
  letter-spacing: 0.06em;
`

export function WeekActivityCard() {
  const { data: captures, isLoading, isError } = useQuery({
    queryKey: ['captures', 'list'],
    queryFn: () => capturesApi.list(),
    staleTime: 60_000,
  })

  const week = useMemo(() => {
    const buckets: Array<{ date: Date; key: string; count: number; dow: string }> = []
    const todayDow = ['Su','Mo','Tu','We','Th','Fr','Sa']
    for (let i = 6; i >= 0; i--) {
      const d = new Date()
      d.setDate(d.getDate() - i)
      buckets.push({ date: d, key: fmtDateKey(d), count: 0, dow: todayDow[d.getDay()] })
    }
    if (Array.isArray(captures)) {
      for (const c of captures as Array<{ created_at?: string }>) {
        if (!c.created_at) continue
        const key = fmtDateKey(new Date(c.created_at))
        const b = buckets.find((x) => x.key === key)
        if (b) b.count += 1
      }
    }
    return buckets
  }, [captures])

  const max = Math.max(1, ...week.map((b) => b.count))
  const total = week.reduce((acc, b) => acc + b.count, 0)
  const todayKey = fmtDateKey(new Date())

  return (
    <Card title="This Week" subtitle="Captures per day" icon={<Activity size={14} style={{ color: '#0EA5E9' }} />}>
      {isError ? (
        <Empty style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <AlertCircle size={13} /> Failed to load captures.
        </Empty>
      ) : isLoading ? (
        <Skeleton style={{ height: 110, width: '100%' }} />
      ) : (
        <>
          <BarsWrap>
            {week.map((b) => (
              <BarColumn key={b.key}>
                <Bar $heightPct={(b.count / max) * 100} $today={b.key === todayKey} title={`${b.count} captures`} />
                <DowSm $today={b.key === todayKey}>{b.dow}</DowSm>
              </BarColumn>
            ))}
          </BarsWrap>
          <Total>
            <div>
              <TotalNum>{total}</TotalNum>
              <TotalLabel style={{ marginLeft: 6 }}>logged</TotalLabel>
            </div>
            <TotalLabel>last 7 days</TotalLabel>
          </Total>
        </>
      )}
    </Card>
  )
}

/* ─────────────────── 3. FocusCard ─────────────────── */

const FocusItem = styled.li<{ $color: string }>`
  display: flex;
  align-items: flex-start;
  gap: 10px;
  padding: 8px 0;
  &:not(:last-child) {
    border-bottom: 1px solid ${({ theme }) => theme.color.border};
  }
`

const FocusNum = styled.span<{ $color: string }>`
  flex-shrink: 0;
  width: 22px;
  height: 22px;
  border-radius: 50%;
  background: ${({ $color }) => $color}1F;
  color: ${({ $color }) => $color};
  font-size: 11px;
  font-weight: 700;
  display: inline-flex;
  align-items: center;
  justify-content: center;
`

const FocusBody = styled.div`
  flex: 1;
  min-width: 0;
`

const FocusTitle = styled.div`
  font-size: 13px;
  font-weight: 600;
  color: ${({ theme }) => theme.color.foreground};
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`

const FocusMeta = styled.div`
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 11px;
  color: ${({ theme }) => theme.color.mutedForeground};
  margin-top: 2px;
`

export function FocusCard() {
  const todayKey = fmtDateKey(new Date())
  const events = useDayEventsStore((s) => s.events)

  const top3 = useMemo(() => {
    return events
      .filter((e) => e.date >= todayKey && !e.done)
      .sort((a, b) => {
        if (a.date !== b.date) return a.date.localeCompare(b.date)
        if (!a.time && !b.time) return 0
        if (!a.time) return -1
        if (!b.time) return 1
        return a.time.localeCompare(b.time)
      })
      .slice(0, 3)
  }, [events, todayKey])

  return (
    <Card title="Focus" subtitle="Next 3 things on deck" icon={<Target size={14} style={{ color: '#DC2626' }} />}>
      {top3.length === 0 ? (
        <Empty>Nothing scheduled yet. Add an event on the calendar to set your focus.</Empty>
      ) : (
        <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
          {top3.map((e, i) => {
            const color = CATEGORY_COLOR[e.category] ?? '#6B7280'
            const dateLabel = e.date === todayKey
              ? 'Today'
              : parseLocalDate(e.date).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric' })
            return (
              <FocusItem key={e.id} $color={color}>
                <FocusNum $color={color}>{i + 1}</FocusNum>
                <FocusBody>
                  <FocusTitle>{e.title}</FocusTitle>
                  <FocusMeta>
                    <Clock size={10} /> {dateLabel}{e.time ? ` · ${e.time}` : ''}
                    <span style={{ color, fontWeight: 600 }}>· {e.category}</span>
                  </FocusMeta>
                </FocusBody>
              </FocusItem>
            )
          })}
        </ul>
      )}
    </Card>
  )
}

/* ─────────────────── 4. DomainPulseCard ─────────────────── */

const PulseGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  gap: 10px;
  @media (max-width: 640px) {
    display: flex;
    overflow-x: auto;
    scroll-snap-type: x mandatory;
    margin: 0 -16px;
    padding: 0 16px;
    scrollbar-width: none;
    &::-webkit-scrollbar { display: none; }
    & > * {
      scroll-snap-align: center;
      min-width: 140px;
      flex-shrink: 0;
    }
  }
`

const PulseTile = styled.button<{ $accent: string }>`
  border: 1px solid ${({ theme }) => theme.color.border};
  background: ${({ theme }) => theme.color.background};
  border-radius: ${({ theme }) => theme.radii.md};
  padding: 12px 10px;
  cursor: pointer;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 6px;
  transition: transform 120ms, box-shadow 120ms, border-color 120ms;
  text-align: left;
  &:hover {
    transform: translateY(-2px);
    border-color: ${({ $accent }) => $accent};
  }
  &:focus-visible { outline: 2px solid ${({ theme }) => theme.color.ring}; outline-offset: 1px; }
`

const PulseIcon = styled.div<{ $color: string }>`
  width: 28px;
  height: 28px;
  border-radius: ${({ theme }) => theme.radii.md};
  background: ${({ $color }) => $color}1A;
  color: ${({ $color }) => $color};
  display: inline-flex;
  align-items: center;
  justify-content: center;
`

const PulseLabel = styled.span`
  font-size: 10.5px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: ${({ theme }) => theme.color.mutedForeground};
`

const PulseValue = styled.span`
  font-size: 14px;
  font-weight: 700;
  color: ${({ theme }) => theme.color.foreground};
  font-variant-numeric: tabular-nums;
  line-height: 1.1;
`

const DeltaWrap = styled.div<{ $good: boolean }>`
  font-size: 11px;
  font-weight: 600;
  display: flex;
  align-items: center;
  gap: 2px;
  color: ${({ theme, $good }) => $good ? theme.color.success : theme.color.destructive};
`

export function DomainPulseCard() {
  const navigate = useNavigate()
  const { data: netWorth } = useQuery({ queryKey: ['finance', 'net-worth'], queryFn: financeApi.netWorth, staleTime: 60_000 })
  const { data: streak } = useQuery({ queryKey: ['health', 'streak'], queryFn: healthApi.streak, staleTime: 60_000 })
  const { data: career } = useQuery({ queryKey: ['career', 'summary'], queryFn: careerApi.summary, staleTime: 60_000 })
  const { data: business } = useQuery({ queryKey: ['business', 'summary'], queryFn: () => businessApi.summary(), staleTime: 60_000 })
  const { data: content } = useQuery({ queryKey: ['content', 'items'], queryFn: () => contentApi.items(), staleTime: 60_000 })

  const thisMonth = content
    ? content.filter((i) => {
        if (i.status !== 'published' || !i.publish_date) return false
        const d = new Date(i.publish_date)
        const now = new Date()
        return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()
      }).length
    : null

  const mrrValue = (() => {
    if (!business) return '—'
    const n = Number(business.mrr)
    return Number.isFinite(n) && n > 0 ? formatCurrency(n) : '—'
  })()

  const tiles = [
    { label: 'Finance', value: netWorth ? formatCurrency(netWorth.net_worth) : '—', color: '#CA8A04', icon: <IndianRupee size={14} />, path: '/areas/finance', spark: [12, 15, 18, 17, 21], delta: { val: '4%', up: true, good: true } },
    { label: 'Health',  value: streak ? `${streak.current_streak}d` : '—', color: '#16A34A', icon: <Heart size={14} />, path: '/areas/health', spark: [1, 2, 0, 1, 3], delta: { val: '2d', up: true, good: true } },
    { label: 'Career',  value: career?.total_skills != null ? `${career.total_skills} skills` : '—', color: '#0EA5E9', icon: <Briefcase size={14} />, path: '/areas/career', spark: [5, 5, 5, 6, 7], delta: { val: '1', up: true, good: true } },
    { label: 'Business',value: mrrValue, color: '#DC2626', icon: <Rocket size={14} />, path: '/areas/business', spark: [100, 100, 120, 120, 150], delta: { val: '12%', up: true, good: true } },
    { label: 'Content', value: thisMonth !== null ? `${thisMonth}/mo` : '—', color: '#A855F7', icon: <PenLine size={14} />, path: '/areas/content', spark: [0, 1, 0, 2, 4], delta: { val: '3', up: true, good: true } },
  ]

  return (
    <Card title="Domain Pulse" subtitle="At-a-glance across all 5 life areas" icon={<Layers size={14} style={{ color: '#1C1917' }} />}>
      <PulseGrid>
        {tiles.map((t) => (
          <PulseTile key={t.label} $accent={t.color} onClick={() => navigate(t.path)} aria-label={`${t.label}: ${t.value}`}>
            <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', alignItems: 'flex-start' }}>
              <PulseIcon $color={t.color}>{t.icon}</PulseIcon>
              <DeltaWrap $good={t.delta.good}>
                {t.delta.up ? '▲' : '▼'} {t.delta.val}
              </DeltaWrap>
            </div>
            <div style={{ marginTop: 4 }}>
              <PulseLabel>{t.label}</PulseLabel>
              <br />
              <PulseValue>{t.value}</PulseValue>
            </div>
            <div style={{ marginTop: 'auto', width: '100%', paddingTop: 4 }}>
              <Sparkline data={t.spark} width={100} height={20} stroke={t.color} />
            </div>
          </PulseTile>
        ))}
      </PulseGrid>
    </Card>
  )
}

/* ─────────────────── 5. RecentActivityCard ─────────────────── */

const ActivityList = styled.ul`
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
`

const ActivityItem = styled.li`
  display: flex;
  align-items: flex-start;
  gap: 10px;
  padding: 10px 0;
  &:not(:last-child) {
    border-bottom: 1px solid ${({ theme }) => theme.color.border};
  }
`

const ActivityDot = styled.span`
  flex-shrink: 0;
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: ${({ theme }) => theme.color.accent};
  margin-top: 7px;
`

const ActivityText = styled.span`
  flex: 1;
  font-size: 12.5px;
  color: ${({ theme }) => theme.color.foreground};
  line-height: 1.45;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`

const ActivityTime = styled.span`
  flex-shrink: 0;
  font-size: 11px;
  color: ${({ theme }) => theme.color.mutedForeground};
  font-variant-numeric: tabular-nums;
`

export function RecentActivityCard() {
  const navigate = useNavigate()
  const { data: captures, isLoading } = useQuery({
    queryKey: ['captures', 'list'],
    queryFn: () => capturesApi.list(),
    staleTime: 60_000,
  })

  const items = Array.isArray(captures)
    ? (captures as Array<{ id: string; raw_text?: string; text?: string; created_at?: string }>)
        .slice()
        .sort((a, b) => (b.created_at ?? '').localeCompare(a.created_at ?? ''))
        .filter((c) => !!(c.raw_text || c.text))
        .slice(0, 6)
    : []

  return (
    <Card
      title="Recent Activity"
      subtitle="Latest captures across your inbox"
      icon={<History size={14} style={{ color: '#0891B2' }} />}
      action={
        <button
          onClick={() => navigate('/captures')}
          style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 12, color: 'inherit' }}
        >
          View all →
        </button>
      }
    >
      {isLoading ? (
        <Stack direction="column" gap={2}>
          <Skeleton style={{ height: 16, width: '100%' }} />
          <Skeleton style={{ height: 16, width: '85%' }} />
          <Skeleton style={{ height: 16, width: '70%' }} />
        </Stack>
      ) : items.length === 0 ? (
        <Empty>Nothing captured yet. Hit ⌘L or the Quick Capture button to log something.</Empty>
      ) : (
        <ActivityList>
          {items.map((c) => (
            <ActivityItem key={c.id}>
              <ActivityDot />
              <ActivityText title={c.raw_text || c.text || ''}>{c.raw_text || c.text || '—'}</ActivityText>
              <ActivityTime>{formatRelativeTime(c.created_at ?? null)}</ActivityTime>
            </ActivityItem>
          ))}
        </ActivityList>
      )}
    </Card>
  )
}
