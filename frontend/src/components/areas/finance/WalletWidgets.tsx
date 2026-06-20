import { formatCurrency } from '@/lib/utils'
import { Card as GlassCard, SegmentedControl } from '@ledgr/ui';
import { Wallet } from 'lucide-react'
import Highcharts from 'highcharts'
import HighchartsReact from 'highcharts-react-official'
import styled, { useTheme } from 'styled-components'

Highcharts.setOptions({ accessibility: { enabled: false } })



const BalanceText = styled.h1`
  font-size: 28px;
  font-weight: 800;
  color: ${({ theme }) => theme.color.foreground};
  font-variant-numeric: tabular-nums;
  letter-spacing: -0.02em;
  margin-bottom: 0.5rem;
`

const ContentWrapper = styled.div`
  flex: 1;
  display: flex;
  flex-direction: column;
  justify-content: flex-end;
  position: relative;
  z-index: 10;
`

const ChartContainer = styled.div`
  height: 8rem;
  width: 100%;
  margin-top: auto;
`

const AmbientGlow = styled.div`
  display: none;
`

export function BalanceWidget({ balance = 0, chartData = [], activeTab = 'General', onTabChange }: { balance?: number, chartData?: any[], activeTab?: string, onTabChange?: (tab: string) => void }) {
  const theme = useTheme()
  const tabs = ['General', 'Expenses', 'Income']

  return (
    <GlassCard
      title="Net Worth Trend"
      subtitle="Balance over time, broken down by cashflow type"
      icon={<Wallet size={16} />}
      action={
        <SegmentedControl
          size="sm"
          aria-label="Cashflow view"
          value={activeTab}
          onChange={(v) => onTabChange?.(v)}
          options={tabs.map((tab) => ({ label: tab, value: tab }))}
        />
      }
      style={{ position: 'relative', overflow: 'hidden' }}
      hoverable
      fadeIn="up"
    >
      {/* Decorative ambient glow */}
      <AmbientGlow />

      <ContentWrapper>
        <BalanceText>{formatCurrency(balance)}</BalanceText>

        <ChartContainer>
          <HighchartsReact
            highcharts={Highcharts}
            options={{
              chart: { type: 'spline', backgroundColor: 'transparent', margin: [0, 0, 0, 0], height: 100 },
              title: { text: null },
              xAxis: {
                categories: chartData.map(d => d.name),
                visible: true,
                labels: { style: { color: theme.color.mutedForeground, fontSize: '10px' } },
                lineWidth: 0,
                tickWidth: 0,
              },
              yAxis: {
                title: { text: null },
                visible: true,
                labels: { 
                  style: { color: theme.color.mutedForeground, fontSize: '10px' },
                  formatter: function(this: any) { return '₹' + this.value }
                },
                gridLineColor: theme.color.border,
                gridLineDashStyle: 'Dash',
              },
              legend: {
                enabled: false,
              },
              credits: { enabled: false },
              tooltip: {
                backgroundColor: theme.color.popover,
                style: { color: theme.color.popoverForeground, fontSize: '11px' },
                borderWidth: 0,
                shadow: false,
                formatter: function(this: any) {
                  return `<b>${this.point.name || ''}</b><br/>${formatCurrency(this.y as number)}`;
                }
              },
              plotOptions: {
                spline: {
                  color: theme.color.accent, // Use accent color
                  lineWidth: 3,
                  marker: {
                    radius: 3,
                    fillColor: theme.color.accent,
                    symbol: 'circle'
                  }
                }
              },
              series: [{
                data: chartData.map(d => ({ name: d.name, y: d.value }))
              }]
            }}
          />
        </ChartContainer>
      </ContentWrapper>
    </GlassCard>
  )
}
