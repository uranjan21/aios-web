
import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { businessApi } from '@aios/shared/api/areas'
import { formatCurrency, formatRelativeTime } from '@aios/shared/lib/utils'
import { Skeleton } from '@aios/shared/components/ui/skeleton'
import { TrendingUp, Package, Clock, IndianRupee, LineChart, AlertCircle } from 'lucide-react'
import Highcharts from 'highcharts'
Highcharts.setOptions({ accessibility: { enabled: false } })
import HighchartsReact from 'highcharts-react-official'
import styled, { useTheme } from 'styled-components'
import { Card, Select, Badge, KpiCard } from '@ledgr/ui'
import { WorkspaceLayout } from '@aios/shared/components/layout/WorkspaceLayout'
import type React from 'react'



function MrrTrendCard({ businessId }: { businessId?: string }) {
  const theme = useTheme()
  const [mrrPeriod, setMrrPeriod] = useState('6m')
  const { data: history } = useQuery({
    queryKey: ['business', 'mrr-history', businessId],
    queryFn: () => businessApi.mrrHistory(businessId),
  })

  if (!history || history.length < 2) return null

  return (
    <Card
      title="MRR Trend"
      subtitle="Monthly recurring revenue over recent snapshots"
      size="md"
      icon={<LineChart size={14} style={{ color: theme.color.mutedForeground }} />}
      action={
        <Select
          size="sm"
          fullWidth={false}
          aria-label="MRR period filter"
          options={[
            { label: '6 Months', value: '6m' },
            { label: '12 Months', value: '12m' },
            { label: 'All Time', value: 'all' },
          ]}
          value={mrrPeriod}
          onChange={(val) => setMrrPeriod(val as string)}
        />
      }
    >
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


// ── Main ──────────────────────────────────────────────────────────────────────



const KpiGrid = styled.div`
  display: flex;
  overflow-x: auto;
  gap: 8px;
  padding-bottom: 4px;
  
  scrollbar-width: none;
  -ms-overflow-style: none;
  &::-webkit-scrollbar { display: none; }
  
  > * {
    flex: 0 0 auto;
    min-width: 140px;
  }

  @media (min-width: 640px) {
    display: grid;
    grid-template-columns: repeat(4, minmax(0, 1fr));
    gap: 12px;
    padding-bottom: 0;
    
    > * { min-width: 0; }
  }
`

  const SkeletonGrid = styled(KpiGrid)``

const StyledSummarySkeleton = styled(Skeleton)`
  height: 80px;
  border-radius: 10px;
`

const StatusBanner = styled.div<{ $positive: boolean }>`
  border-radius: 10px;
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

export function SummaryTab({ businessId }: { businessId?: string }) {
  const { data: summary, isLoading } = useQuery({
    queryKey: ['business', 'summary', businessId],
    queryFn: () => businessApi.summary(businessId),
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
    <WorkspaceLayout rail={undefined}>
      <KpiGrid>
        <KpiCard
          icon={IndianRupee}
          label="MRR"
          value={formatCurrency(mrr)}
          color="emerald"
        />
        <KpiCard
          icon={TrendingUp}
          label="Product"
          value={summary?.product ?? 'Ledgr'}
          color="purple"
        />
        <KpiCard
          icon={Package}
          label="Last Feature"
          value={summary?.last_feature ?? '—'}
          color="primary"
        />
        <KpiCard
          icon={Clock}
          label="Last Shipped"
          value={summary?.last_feature_at ? formatRelativeTime(summary.last_feature_at) : 'Never'}
          color="amber"
        />
      </KpiGrid>

      <MrrTrendCard businessId={businessId} />

      <StatusBanner $positive={mrr > 0}>
        <Badge tone={mrr > 0 ? "success" : "warning"} size="sm">
          {mrr > 0 ? "Revenue" : "Idea"}
        </Badge>
        <span>
          {mrr > 0
            ? `Revenue-generating. MRR ${formatCurrency(mrr)} · ARR ${formatCurrency(arr)}`
            : 'Pre-revenue. Keep shipping — first ₹ is the hardest.'}
        </span>
      </StatusBanner>
    </WorkspaceLayout>
  )
}
