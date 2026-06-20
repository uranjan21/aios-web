// @ts-nocheck
import { useQuery } from '@tanstack/react-query'
import { businessApi } from '@/api/areas'
import { formatCurrency, formatRelativeTime } from '@/lib/utils'
import { Skeleton } from '@/components/ui/skeleton'
import { TrendingUp, Package, Clock, IndianRupee, LineChart } from 'lucide-react'
import Highcharts from 'highcharts'
Highcharts.setOptions({ accessibility: { enabled: false } })
import HighchartsReact from 'highcharts-react-official'
import styled, { useTheme } from 'styled-components'
import { Card } from '@ledgr/ui'
import type React from 'react'

const ACCENT_HEX: Record<string, string> = {
  'text-kpi-emerald': 'success',
  'text-kpi-purple':  'accent',
  'text-primary':     'primary',
  'text-kpi-amber':   'warning',
}



function MrrTrendCard() {
  const theme = useTheme()
  const { data: history } = useQuery({
    queryKey: ['business', 'mrr-history'],
    queryFn: businessApi.mrrHistory,
  })

  if (!history || history.length < 2) return null

  return (
    <Card title="MRR Trend" size="md" icon={<LineChart size={14} style={{ color: theme.color.mutedForeground }} />}>
      <HighchartsReact
        highcharts={Highcharts}
        options={{
          chart: { type: 'areaspline', backgroundColor: 'transparent', height: 180, margin: [10, 0, 25, 0] },
          title: { text: null },
          credits: { enabled: false },
          legend: { enabled: false },
          xAxis: {
            categories: history.map(h => h.date.slice(5)),
            labels: { style: { color: theme.color.mutedForeground, fontSize: '10px' } },
            lineWidth: 0, tickWidth: 0,
          },
          yAxis: { visible: false },
          tooltip: {
            backgroundColor: theme.color.popover, style: { color: theme.color.popoverForeground, fontSize: '11px' }, borderWidth: 0,
            formatter: function (this: any) {
              const point = history[this.point.index]
              return `<b>${point.date}</b><br/>${formatCurrency(point.mrr)}<br/><span style="opacity:.7">${point.title}</span>`
            },
          },
          plotOptions: { areaspline: { lineWidth: 2, marker: { enabled: true, radius: 3 } } },
          series: [{
            data: history.map(h => h.mrr),
            color: theme.color.accent,
            fillColor: {
              linearGradient: { x1: 0, y1: 0, x2: 0, y2: 1 },
              stops: [[0, `color-mix(in srgb, ${theme.color.accent} 25%, transparent)`], [1, `color-mix(in srgb, ${theme.color.accent} 0%, transparent)`]],
            },
          }],
        }}
      />
    </Card>
  )
}

// ── Metric Tile ───────────────────────────────────────────────────────────────



const IconWrap = styled.div<{ $color: string }>`
  padding: 6px;
  border-radius: 8px;
  background: ${({ theme, $color }) => `${(theme.color as any)[$color] || theme.color.primary}18`};
  color: ${({ theme, $color }) => (theme.color as any)[$color] || theme.color.primary};
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
`



const TileValue = styled.p`
  font-size: 12px;
  font-weight: 700;
  color: ${({ theme }) => theme.color.foreground};
  letter-spacing: -0.01em;
  margin: 0;
`

const TileSub = styled.p`
  font-size: 10px;
  color: ${({ theme }) => theme.color.mutedForeground};
  margin: 2px 0 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`

function MetricTile({ icon: Icon, label, value, sub, accent }: {
  icon: React.FC<{ size?: number }>
  label: string
  value: string
  sub?: string
  accent?: string
}) {
  return (
    <Card 
      title={label} 
      size="sm" 
      icon={
        <IconWrap $color={ACCENT_HEX[accent || ''] || 'primary'}>
          <Icon size={12} />
        </IconWrap>
      }
    >
      <TileValue>{value}</TileValue>
      {sub && <TileSub>{sub}</TileSub>}
    </Card>
  )
}

// ── Main ──────────────────────────────────────────────────────────────────────

const Root = styled.div`
  display: flex;
  flex-direction: column;
  gap: 16px;
  max-width: 42rem;
`

const TileGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
  @media (min-width: 640px) {
    grid-template-columns: repeat(4, minmax(0, 1fr));
  }
`

const SkeletonGrid = styled(TileGrid)`
  max-width: 42rem;
`

const StyledSummarySkeleton = styled(Skeleton)`
  height: 80px;
  border-radius: 12px;
`

const StatusBanner = styled.div<{ $positive: boolean }>`
  border-radius: 12px;
  padding: 12px;
  border: 1px solid ${({ theme, $positive }) => $positive ? `${theme.color.success}33` : `${theme.color.warning}33`};
  background: ${({ theme, $positive }) => $positive ? `${theme.color.success}14` : `${theme.color.warning}14`};
  color: ${({ theme, $positive }) => $positive ? theme.color.success : theme.color.warning};
  font-size: 11px;
  font-weight: 500;
  display: flex;
  align-items: center;
  gap: 8px;
`

export function SummaryTab() {
  const { data: summary, isLoading } = useQuery({
    queryKey: ['business', 'summary'],
    queryFn: businessApi.summary,
  })

  if (isLoading) {
    return (
      <SkeletonGrid>
        {[1, 2, 3, 4].map(i => <StyledSummarySkeleton key={i} />)}
      </SkeletonGrid>
    )
  }

  const mrr = summary?.mrr ?? 0
  const arr = mrr * 12

  return (
    <Root>
      <TileGrid>
        <MetricTile
          icon={IndianRupee}
          label="MRR"
          value={formatCurrency(mrr)}
          sub={mrr > 0 ? `ARR ${formatCurrency(arr)}` : 'Not yet monetised'}
          accent="text-kpi-emerald"
        />
        <MetricTile
          icon={TrendingUp}
          label="Product"
          value={summary?.product ?? 'Ledgr'}
          sub="Building"
          accent="text-kpi-purple"
        />
        <MetricTile
          icon={Package}
          label="Last Feature"
          value={summary?.last_feature ?? '—'}
          sub={summary?.last_feature_at ? formatRelativeTime(summary.last_feature_at) : undefined}
          accent="text-primary"
        />
        <MetricTile
          icon={Clock}
          label="Last Shipped"
          value={summary?.last_feature_at ? formatRelativeTime(summary.last_feature_at) : 'Never'}
          sub={summary?.last_feature ?? undefined}
          accent="text-kpi-amber"
        />
      </TileGrid>

      <MrrTrendCard />

      <StatusBanner $positive={mrr > 0}>
        <span>{mrr > 0 ? '🟢' : '🟡'}</span>
        {mrr > 0
          ? `Revenue-generating. MRR ${formatCurrency(mrr)} · ARR ${formatCurrency(arr)}`
          : 'Pre-revenue. Keep shipping — first ₹ is the hardest.'}
      </StatusBanner>
    </Root>
  )
}
