import { formatCurrency } from '@/lib/utils'
import { Card as GlassCard } from '@ledgr/ui';
import Highcharts from 'highcharts'
import HighchartsReact from 'highcharts-react-official'
import styled, { useTheme } from 'styled-components'

Highcharts.setOptions({ accessibility: { enabled: false } })

const TabContainer = styled.div`
  display: flex;
  align-items: center;
  gap: 0.25rem;
  padding: 0.125rem;
  background-color: ${({ theme }) => theme.color.muted}99;
  border-radius: 9999px;
  width: fit-content;
  margin-bottom: 1.5rem;
  position: relative;
  z-index: 10;
`

const TabButton = styled.button<{ $active: boolean }>`
  padding: 0.25rem 0.75rem;
  border-radius: 9999px;
  font-size: 11px;
  font-weight: 500;
  transition: all 0.2s;
  background-color: ${({ $active, theme }) => $active ? theme.color.background : 'transparent'};
  color: ${({ $active, theme }) => $active ? theme.color.foreground : theme.color.mutedForeground};
  box-shadow: ${({ $active }) => $active ? '0 1px 2px rgba(0, 0, 0, 0.05)' : 'none'};
  border: none;
  cursor: pointer;
 
  &:hover {
    color: ${({ theme }) => theme.color.foreground};
  }
`

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
    <GlassCard title="Net Worth Trend" style={{ position: 'relative', overflow: 'hidden' }} hoverable fadeIn="up">
      {/* Decorative ambient glow */}
      <AmbientGlow />

      <TabContainer>
        {tabs.map((tab) => (
          <TabButton
            key={tab}
            onClick={() => onTabChange?.(tab)}
            $active={activeTab === tab}
          >
            {tab}
          </TabButton>
        ))}
      </TabContainer>

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
