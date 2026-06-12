import { cn, formatCurrency } from '@/lib/utils'
import { GlassCard } from '@/components/lumina'
import Highcharts from 'highcharts'
Highcharts.setOptions({ accessibility: { enabled: false } })
import HighchartsReact from 'highcharts-react-official'

export function BalanceWidget({ balance = 0, chartData = [], activeTab = 'General', onTabChange }: { balance?: number, chartData?: any[], activeTab?: string, onTabChange?: (tab: string) => void }) {
  const tabs = ['General', 'Expenses', 'Income']

  return (
    <GlassCard title="Net Worth Trend" className="relative overflow-hidden" hoverable fadeIn="up">
      {/* Decorative ambient glow */}
      <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-primary/20 via-primary/10 to-transparent rounded-full blur-2xl opacity-60 -mr-6 -mt-6" />

      <div className="flex items-center gap-1 p-0.5 bg-muted/60 rounded-full w-fit mb-6 z-10 border border-subtle">
        {tabs.map((tab) => (
          <button
            key={tab}
            onClick={() => onTabChange?.(tab)}
            className={cn(
              "px-3 py-1 rounded-full text-[11px] font-medium transition-all",
              activeTab === tab ? "bg-background shadow-premium-sm text-foreground" : "text-muted-foreground hover:text-foreground"
            )}
          >
            {tab}
          </button>
        ))}
      </div>

      <div className="flex-1 flex flex-col justify-end z-10">
        <h1 className="text-xl font-semibold text-foreground font-mono tabular-nums tracking-tight mb-2">{formatCurrency(balance)}</h1>

        <div className="h-20 w-full mt-auto">
          <HighchartsReact
            highcharts={Highcharts}
            options={{
              chart: { type: 'column', backgroundColor: 'transparent', margin: [0, 0, 0, 0], height: 100 },
              title: { text: null },
              xAxis: { visible: false },
              yAxis: { visible: false },
              legend: { enabled: false },
              credits: { enabled: false },
              tooltip: {
                backgroundColor: 'rgba(0, 0, 0, 0.85)',
                style: { color: '#fff', fontSize: '11px' },
                borderWidth: 0,
                shadow: false,
                formatter: function(this: any) {
                  return `<b>${this.point.category || ''}</b><br/>${formatCurrency(this.y as number)}`;
                }
              },
              plotOptions: {
                column: {
                  borderRadius: 2,
                  borderWidth: 0,
                  colorByPoint: true,
                  colors: chartData.map((_, i) => i === chartData.length - 1 ? 'hsl(var(--primary))' : 'hsl(var(--muted))')
                }
              },
              series: [{
                data: chartData.map(d => ({ name: d.name, y: d.value }))
              }]
            }}
          />
        </div>
      </div>
    </GlassCard>
  )
}
