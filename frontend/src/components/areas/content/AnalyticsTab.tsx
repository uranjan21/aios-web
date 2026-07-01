import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { KpiGrid, KpiCard, Card as SectionCard } from '@ledgr/ui'
import { Eye, Heart, MessageCircle, Share2, Trophy, PieChart as PieIcon } from 'lucide-react'
import styled, { useTheme } from 'styled-components'
import {
  BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid,
  Tooltip as RTooltip, ResponsiveContainer,
} from 'recharts'
import { contentApi } from '@/api/areas'
import { Skeleton } from '@/components/ui/skeleton'
import { PLATFORM_META, platformLabel } from './contentMeta'

const Grid = styled.div`
  display: grid;
  grid-template-columns: repeat(12, minmax(0, 1fr));
  gap: 16px;
`
const KpiCell = styled.div``
const Half = styled.div`
  grid-column: span 12;
  @media (min-width: 1024px) { grid-column: span 6; }
`
const ChartBox = styled.div`
  height: 260px;
  width: 100%;
`
const Empty = styled.div`
  font-size: 13px;
  color: ${({ theme }) => theme.color.mutedForeground};
  padding: 32px;
  text-align: center;
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
`
const PerfList = styled.div`
  display: flex;
  flex-direction: column;
`
const PerfRow = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 4px;
  border-bottom: 1px solid ${({ theme }) => theme.color.border};
  &:last-child { border-bottom: none; }
`
const Rank = styled.span`
  font-size: 13px;
  font-weight: 700;
  color: ${({ theme }) => theme.color.accent};
  width: 20px;
  font-variant-numeric: tabular-nums;
`
const PerfInfo = styled.div`
  flex: 1;
  min-width: 0;
`
const PerfTitle = styled.div`
  font-size: 13px;
  font-weight: 500;
  color: ${({ theme }) => theme.color.foreground};
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`
const PerfMeta = styled.div`
  font-size: 11px;
  color: ${({ theme }) => theme.color.mutedForeground};
  display: flex;
  gap: 12px;
  margin-top: 2px;
  font-variant-numeric: tabular-nums;
`
const MetaItem = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 3px;
`

export function AnalyticsTab() {
  const theme = useTheme()
  const { data: stats, isLoading } = useQuery({ queryKey: ['content', 'stats'], queryFn: contentApi.stats, staleTime: 30_000 })

  const platformPerf = useMemo(() => {
    const by = stats?.by_platform ?? {}
    return Object.entries(by).map(([k, v]) => ({
      name: platformLabel(k), value: v,
      color: PLATFORM_META[k as keyof typeof PLATFORM_META]?.color ?? theme.color.accent,
    }))
  }, [stats, theme])

  const typeData = useMemo(() => {
    const by = stats?.by_type ?? {}
    return Object.entries(by).map(([k, v]) => ({ name: k.charAt(0).toUpperCase() + k.slice(1), value: v }))
  }, [stats])

  const totals = stats?.totals ?? { views: 0, likes: 0, comments: 0, shares: 0 }
  const performers = stats?.top_performers ?? []

  return (
    <>
      <KpiGrid $cols={4}>
        <KpiCell><KpiCard label="Total Views" icon={Eye} sub="Across published content" loading={isLoading} value={totals.views.toLocaleString('en-IN')} /></KpiCell>
        <KpiCell><KpiCard label="Total Likes" icon={Heart} sub="Reactions earned" loading={isLoading} value={totals.likes.toLocaleString('en-IN')} /></KpiCell>
        <KpiCell><KpiCard label="Comments" icon={MessageCircle} sub="Conversations sparked" loading={isLoading} value={totals.comments.toLocaleString('en-IN')} /></KpiCell>
        <KpiCell><KpiCard label="Shares" icon={Share2} sub="Amplification" loading={isLoading} value={totals.shares.toLocaleString('en-IN')} /></KpiCell>
      </KpiGrid>

      <Grid>
        <Half>
        <SectionCard title="Content by Platform" subtitle="Where you publish most" icon={<PieIcon size={16} />} style={{ height: '100%' }}>
          {isLoading ? <Skeleton style={{ height: 260 }} /> : platformPerf.length === 0 ? (
            <Empty>No data yet — publish content with metrics to see analytics.</Empty>
          ) : (
            <ChartBox>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={platformPerf} layout="vertical" margin={{ top: 8, right: 16, left: 8, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke={theme.color.border} />
                  <XAxis type="number" allowDecimals={false} axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: theme.color.mutedForeground }} />
                  <YAxis type="category" dataKey="name" width={70} axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: theme.color.mutedForeground }} />
                  <RTooltip contentStyle={{ background: theme.color.card, border: `1px solid ${theme.color.border}`, borderRadius: 8, fontSize: 12 }} />
                  <Bar dataKey="value" radius={[0, 6, 6, 0]} isAnimationActive={false}>
                    {platformPerf.map((d, i) => <Cell key={i} fill={d.color} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </ChartBox>
          )}
        </SectionCard>
      </Half>

      <Half>
        <SectionCard title="Content Type Mix" subtitle="Formats you produce" icon={<PieIcon size={16} />} style={{ height: '100%' }}>
          {isLoading ? <Skeleton style={{ height: 260 }} /> : typeData.length === 0 ? (
            <Empty>No content types tagged yet.</Empty>
          ) : (
            <ChartBox>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={typeData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={90} isAnimationActive={false} label={{ fontSize: 11 }}>
                    {typeData.map((_, i) => <Cell key={i} fill={[theme.color.accent, '#0A66C2', '#7c3aed', '#16a34a', '#dc2626', '#0284c7', '#d97706', '#64748b'][i % 8]} />)}
                  </Pie>
                  <RTooltip contentStyle={{ background: theme.color.card, border: `1px solid ${theme.color.border}`, borderRadius: 8, fontSize: 12 }} />
                </PieChart>
              </ResponsiveContainer>
            </ChartBox>
          )}
        </SectionCard>
      </Half>

      <Half>
        <SectionCard title="Top Performers" subtitle="Your highest-engagement published content" icon={<Trophy size={16} />} style={{ height: '100%' }}>
          {isLoading ? <Skeleton style={{ height: 200 }} /> : performers.length === 0 ? (
            <Empty>No published content with metrics yet. Log views/likes on published pieces to rank them.</Empty>
          ) : (
            <PerfList>
              {performers.map((p, i) => (
                <PerfRow key={p.id}>
                  <Rank>#{i + 1}</Rank>
                  <PerfInfo>
                    <PerfTitle>{p.title}</PerfTitle>
                    <PerfMeta>
                      <MetaItem><Eye size={11} />{p.views.toLocaleString('en-IN')}</MetaItem>
                      <MetaItem><Heart size={11} />{p.likes.toLocaleString('en-IN')}</MetaItem>
                      <MetaItem><MessageCircle size={11} />{p.comments.toLocaleString('en-IN')}</MetaItem>
                      <MetaItem><Share2 size={11} />{p.shares.toLocaleString('en-IN')}</MetaItem>
                    </PerfMeta>
                  </PerfInfo>
                </PerfRow>
              ))}
            </PerfList>
          )}
        </SectionCard>
      </Half>
      </Grid>
    </>
  )
}
