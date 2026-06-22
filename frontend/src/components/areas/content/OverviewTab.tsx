import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { KpiCard, Card as SectionCard } from '@ledgr/ui'
import { FileText, Send, CalendarClock, Lightbulb, TrendingUp, Clock } from 'lucide-react'
import styled, { useTheme } from 'styled-components'
import {
  BarChart, Bar, PieChart, Pie, Cell, AreaChart, Area,
  XAxis, YAxis, CartesianGrid, Tooltip as RTooltip, ResponsiveContainer,
} from 'recharts'
import { contentApi } from '@/api/areas'
import { Skeleton } from '@/components/ui/skeleton'
import type { ContentItem } from '@/types'
import { ContentCard } from './ContentCard'
import { PLATFORM_META, STATUS_LABELS, platformLabel } from './contentMeta'

const Grid = styled.div`
  display: grid;
  grid-template-columns: repeat(12, minmax(0, 1fr));
  gap: 16px;
`
const KpiCell = styled.div`
  grid-column: span 6;
  @media (min-width: 1024px) { grid-column: span 3; }
`
const Half = styled.div`
  grid-column: span 12;
  @media (min-width: 1024px) { grid-column: span 6; }
`
const ChartBox = styled.div`
  height: 240px;
  width: 100%;
`
const List = styled.div`
  display: flex;
  flex-direction: column;
  gap: 10px;
`
const EmptyNote = styled.div`
  font-size: 13px;
  color: ${({ theme }) => theme.color.mutedForeground};
  padding: 24px;
  text-align: center;
`

export function OverviewTab({ items, isLoading, onEdit }: {
  items: ContentItem[]
  isLoading: boolean
  onEdit: (item: ContentItem) => void
}) {
  const theme = useTheme()
  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ['content', 'stats'],
    queryFn: contentApi.stats,
    staleTime: 30_000,
  })

  const statusData = useMemo(() => {
    const by = stats?.by_status ?? {}
    return (['idea', 'in_progress', 'scheduled', 'published'] as const)
      .map(s => ({ name: STATUS_LABELS[s], value: by[s] ?? 0 }))
  }, [stats])

  const platformData = useMemo(() => {
    const by = stats?.by_platform ?? {}
    return Object.entries(by).map(([k, v]) => ({ name: platformLabel(k), value: v, color: PLATFORM_META[k as keyof typeof PLATFORM_META]?.color ?? theme.color.accent }))
  }, [stats, theme])

  const cadenceData = useMemo(() => {
    const by = stats?.by_month ?? {}
    return Object.entries(by).map(([k, v]) => {
      const [y, m] = k.split('-')
      const label = new Date(Number(y), Number(m) - 1, 1).toLocaleDateString('en-IN', { month: 'short', year: '2-digit' })
      return { month: label, published: v }
    })
  }, [stats])

  const upcoming = useMemo(() =>
    items.filter(i => i.status === 'scheduled')
      .sort((a, b) => (a.publish_date ?? '').localeCompare(b.publish_date ?? ''))
      .slice(0, 5),
  [items])

  const recent = useMemo(() =>
    items.filter(i => i.status === 'published')
      .sort((a, b) => (b.published_at ?? b.publish_date ?? '').localeCompare(a.published_at ?? a.publish_date ?? ''))
      .slice(0, 5),
  [items])

  const counts = stats?.by_status ?? {}

  return (
    <Grid>
      <KpiCell><KpiCard label="Total Content" icon={FileText} sub="All pieces across every stage" loading={statsLoading} value={stats?.total ?? 0} /></KpiCell>
      <KpiCell><KpiCard label="Published" icon={Send} sub="Shipped and live" loading={statsLoading} value={counts.published ?? 0} /></KpiCell>
      <KpiCell><KpiCard label="Scheduled" icon={CalendarClock} sub="Queued to go out" loading={statsLoading} value={counts.scheduled ?? 0} /></KpiCell>
      <KpiCell><KpiCard label="Ideas" icon={Lightbulb} sub="In the backlog" loading={statsLoading} value={counts.idea ?? 0} /></KpiCell>

      <Half>
        <SectionCard title="Pipeline by Stage" subtitle="How much content sits in each stage" icon={<TrendingUp size={16} />}>
          {statsLoading ? <Skeleton style={{ height: 240 }} /> : (
            <ChartBox>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={statusData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={theme.color.border} />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: theme.color.mutedForeground }} />
                  <YAxis allowDecimals={false} axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: theme.color.mutedForeground }} />
                  <RTooltip contentStyle={{ background: theme.color.card, border: `1px solid ${theme.color.border}`, borderRadius: 8, fontSize: 12 }} />
                  <Bar dataKey="value" fill={theme.color.accent} radius={[6, 6, 0, 0]} isAnimationActive={false} />
                </BarChart>
              </ResponsiveContainer>
            </ChartBox>
          )}
        </SectionCard>
      </Half>

      <Half>
        <SectionCard title="Platform Mix" subtitle="Distribution across channels" icon={<TrendingUp size={16} />}>
          {statsLoading ? <Skeleton style={{ height: 240 }} /> : platformData.length === 0 ? (
            <EmptyNote>No content yet — create your first piece to see the breakdown.</EmptyNote>
          ) : (
            <ChartBox>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={platformData} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={50} outerRadius={85} paddingAngle={2} isAnimationActive={false}>
                    {platformData.map((d, i) => <Cell key={i} fill={d.color} />)}
                  </Pie>
                  <RTooltip contentStyle={{ background: theme.color.card, border: `1px solid ${theme.color.border}`, borderRadius: 8, fontSize: 12 }} />
                </PieChart>
              </ResponsiveContainer>
            </ChartBox>
          )}
        </SectionCard>
      </Half>

      <Half>
        <SectionCard title="Publishing Cadence" subtitle="Pieces published per month" icon={<TrendingUp size={16} />}>
          {statsLoading ? <Skeleton style={{ height: 240 }} /> : cadenceData.length === 0 ? (
            <EmptyNote>Nothing published yet — your cadence shows up here once you ship.</EmptyNote>
          ) : (
            <ChartBox>
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={cadenceData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="cadence" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={theme.color.accent} stopOpacity={0.35} />
                      <stop offset="95%" stopColor={theme.color.accent} stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={theme.color.border} />
                  <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: theme.color.mutedForeground }} />
                  <YAxis allowDecimals={false} axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: theme.color.mutedForeground }} />
                  <RTooltip contentStyle={{ background: theme.color.card, border: `1px solid ${theme.color.border}`, borderRadius: 8, fontSize: 12 }} />
                  <Area type="monotone" dataKey="published" stroke={theme.color.accent} strokeWidth={2} fill="url(#cadence)" isAnimationActive={false} />
                </AreaChart>
              </ResponsiveContainer>
            </ChartBox>
          )}
        </SectionCard>
      </Half>

      <Half>
        <SectionCard title="Upcoming Scheduled" subtitle="Next pieces queued to publish" icon={<CalendarClock size={16} />}>
          {isLoading ? <Skeleton style={{ height: 120 }} /> : upcoming.length === 0 ? (
            <EmptyNote>Nothing scheduled. Move ideas into Scheduled to plan your calendar.</EmptyNote>
          ) : (
            <List>{upcoming.map(i => <ContentCard key={i.id} item={i} draggable={false} onClick={onEdit} />)}</List>
          )}
        </SectionCard>
      </Half>

      <Half>
        <SectionCard title="Recently Published" subtitle="Your latest live content" icon={<Clock size={16} />}>
          {isLoading ? <Skeleton style={{ height: 120 }} /> : recent.length === 0 ? (
            <EmptyNote>No published content yet.</EmptyNote>
          ) : (
            <List>{recent.map(i => <ContentCard key={i.id} item={i} draggable={false} onClick={onEdit} />)}</List>
          )}
        </SectionCard>
      </Half>
    </Grid>
  )
}
