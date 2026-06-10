import { cn, formatCurrency } from '@/lib/utils'
import { MoreHorizontal, Plus, Home, Heart, CreditCard, ShoppingBag, Shirt } from 'lucide-react'
import Highcharts from 'highcharts'
import HighchartsReact from 'highcharts-react-official'
import { useNavigate } from 'react-router-dom'

export function BalanceWidget({ balance = 5318, chartData = [], activeTab = 'General', onTabChange }: { balance?: number, chartData?: any[], activeTab?: string, onTabChange?: (tab: string) => void }) {
  const tabs = ['General', 'Expenses', 'Income']
  
  return (
    <div className="bg-card border border-border/40 shadow-sm rounded-2xl p-4 flex flex-col h-full relative overflow-hidden">
      {/* 3D abstract shape placeholder - using a CSS gradient mesh */}
      <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-teal-300 via-emerald-300 to-cyan-200 rounded-full blur-2xl opacity-20 -mr-6 -mt-6 dark:opacity-10" />
      
      <div className="flex items-center justify-between z-10 mb-4">
        <h2 className="text-xs font-medium text-muted-foreground">Total Balance</h2>
        <button className="text-[11px] px-3 py-1 rounded-full bg-muted/50 text-foreground border border-border flex items-center gap-1.5 hover:bg-muted/80 transition font-medium">
          All Accounts <span className="text-[8px]">▼</span>
        </button>
      </div>

      <div className="flex items-center gap-1 p-0.5 bg-muted/60 rounded-full w-fit mb-6 z-10 border border-border/50">
        {tabs.map((tab) => (
          <button 
            key={tab}
            onClick={() => onTabChange?.(tab)}
            className={cn(
              "px-3 py-1 rounded-full text-[11px] font-medium transition-all",
              activeTab === tab ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"
            )}
          >
            {tab}
          </button>
        ))}
      </div>

      <div className="flex-1 flex flex-col justify-end z-10">
        <h1 className="text-xs font-medium text-foreground mb-2 tracking-tight">{formatCurrency(balance)}</h1>
        
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
    </div>
  )
}

export function VisaCardWidget({ balance = 3540 }: { balance?: number }) {
  return (
    <div className="relative h-40 w-full group cursor-pointer">
      {/* Main card */}
      <div className="absolute inset-0 rounded-xl p-4 flex flex-col justify-between text-white overflow-hidden shadow-sm border border-white/10"
           style={{ background: 'linear-gradient(135deg, #1E1B4B 0%, #4C1D95 50%, #7C3AED 100%)' }}>
        <div className="absolute -right-8 -top-8 w-32 h-32 bg-white/10 rounded-full blur-2xl" />
        <div className="absolute -left-8 -bottom-8 w-32 h-32 bg-pink-500/20 rounded-full blur-2xl" />
        
        <div className="flex justify-between items-start z-10">
          <p className="text-white/80 text-xs font-medium">Credit</p>
          <div className="text-lg font-bold italic tracking-wider opacity-90">VISA</div>
        </div>
        <div className="z-10 mt-auto">
          <h2 className="text-sm font-semibold mb-1 tracking-tight">{formatCurrency(balance)}</h2>
          <p className="text-[11px] tracking-widest opacity-70">**** **** **** 4242</p>
        </div>
      </div>
    </div>
  )
}

export function MonthlyBudgetWidget({ spent = 2100, total = 4000 }: { spent?: number, total?: number }) {
  const navigate = useNavigate()
  const pct = Math.min((spent / total) * 100, 100)
  
  return (
    <div className="bg-card border border-border/40 shadow-sm rounded-2xl p-4">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-sm font-semibold text-foreground">Monthly Budget</h3>
        <button 
          onClick={() => navigate('/areas/finance/budget')}
          className="w-6 h-6 rounded-md bg-muted/50 flex items-center justify-center hover:bg-muted transition text-muted-foreground hover:text-foreground">
          <MoreHorizontal className="w-3.5 h-3.5" />
        </button>
      </div>
      <p className="text-[11px] text-muted-foreground mb-4 max-w-[80%] leading-relaxed">
        We advise you to reduce your expenses to save.
      </p>
      
      <div className="flex items-baseline gap-1.5 mb-2.5">
        <span className="text-xs font-medium text-foreground tracking-tight">{formatCurrency(spent)}</span>
        <span className="text-[11px] text-muted-foreground font-medium">/ {formatCurrency(total)}</span>
      </div>
      
      <div className="h-2 bg-muted/60 rounded-full overflow-hidden mb-2">
        <div 
          className="h-full rounded-full transition-all duration-500 ease-out"
          style={{ width: `${pct}%`, background: 'linear-gradient(90deg, #8B5CF6 0%, #EC4899 100%)' }}
        />
      </div>
      <p className="text-[10px] font-semibold text-pink-500 text-right uppercase tracking-wider">{formatCurrency(total - spent)} left</p>
    </div>
  )
}

export function ExpensesDonutWidget({ total = 2540, data = [], activeTab = 'Month', onTabChange }: { total?: number, data?: any[], activeTab?: string, onTabChange?: (tab: string) => void }) {
  const tabs = ['Day', 'Week', 'Month']
  
  const COLORS = ['#10B981', '#3B82F6', '#F59E0B', '#EF4444', '#8B5CF6']

  return (
    <div className="bg-card border border-border/40 shadow-sm rounded-2xl p-4 h-full flex flex-col">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-sm font-semibold text-foreground">Expenses</h2>
        <div className="flex gap-2 items-center">
          <div className="flex gap-0.5 p-0.5 bg-muted/60 border border-border/50 rounded-md">
          {tabs.map((tab) => (
            <button 
              key={tab}
              onClick={() => onTabChange?.(tab)}
              className={cn(
                "px-2.5 py-1 rounded-sm text-[10px] font-medium transition-all",
                activeTab === tab ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"
              )}
            >
              {tab}
            </button>
          ))}
          </div>
          <button className="text-xs font-medium px-2.5 py-1 bg-muted/50 hover:bg-muted text-muted-foreground rounded-md transition-colors">Report</button>
        </div>
      </div>
      
      <div className="flex-1 flex items-center justify-center relative mb-6">
        <div className="h-32 w-32 relative">
          <HighchartsReact
            highcharts={Highcharts}
            options={{
              chart: { type: 'pie', backgroundColor: 'transparent', margin: [0, 0, 0, 0], height: 128, width: 128 },
              title: { text: null },
              credits: { enabled: false },
              tooltip: {
                backgroundColor: 'rgba(0, 0, 0, 0.85)',
                style: { color: '#fff', fontSize: '11px' },
                borderWidth: 0,
                shadow: false,
                pointFormatter: function(this: Highcharts.Point) {
                  return `${this.name}: <b>${formatCurrency(this.y as number)}</b>`;
                }
              },
              plotOptions: {
                pie: {
                  innerSize: '75%',
                  borderWidth: 0,
                  colors: COLORS,
                  dataLabels: { enabled: false }
                }
              },
              series: [{
                data: data.map(d => ({ name: d.name, y: d.value }))
              }]
            }}
          />
          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
            <span className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">Total</span>
            <span className="text-base font-bold tracking-tight">{formatCurrency(total)}</span>
          </div>
        </div>
      </div>
      
      <div className="space-y-2.5">
        {data.map((item, i) => {
          return (
            <div key={item.name} className="flex items-center justify-between group">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                <span className="font-medium text-[11px] text-muted-foreground group-hover:text-foreground transition-colors">{item.name}</span>
              </div>
              <span className="font-semibold text-[11px]">{formatCurrency(item.value)}</span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

export function QuickTransactionsWidget() {
  const navigate = useNavigate()
  const avatars = [
    { seed: "Felix", name: "Felix" },
    { seed: "Aneka", name: "Aneka" },
    { seed: "John", name: "John" },
    { seed: "Sarah", name: "Sarah" },
    { seed: "Mike", name: "Mike" }
  ]
  
  return (
    <div className="bg-card border border-border/40 shadow-sm rounded-2xl p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-foreground">Quick Pay</h3>
      </div>
      
      <div className="flex items-center gap-2.5 overflow-x-auto pb-1 scrollbar-none">
        <button 
          onClick={() => navigate('/areas/finance/log')}
          className="min-w-[36px] h-9 rounded-full border border-dashed border-border flex items-center justify-center hover:border-primary transition text-muted-foreground hover:text-primary shrink-0 hover:bg-primary/5">
          <Plus className="w-4 h-4" />
        </button>
        
        <div className="flex -space-x-2 shrink-0">
          {avatars.map((avatar, i) => (
            <div 
              key={i} 
              onClick={() => navigate(`/areas/finance/log?description=Transfer to ${avatar.name}`)}
              className="w-9 h-9 rounded-full border-2 border-background overflow-hidden bg-muted shadow-sm hover:-translate-y-1 transition-transform cursor-pointer"
              title={`Transfer to ${avatar.name}`}
            >
              <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${avatar.seed}`} alt={avatar.name} className="w-full h-full object-cover" />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

export function LastTransactionsWidget({ transactions = [] }: { transactions?: any[] }) {
  const navigate = useNavigate()
  return (
    <div className="bg-card border border-border/40 shadow-sm rounded-2xl p-4 h-full flex flex-col">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-foreground">Recent</h3>
        <button 
          onClick={() => navigate('/areas/finance/log')}
          className="text-[11px] font-medium text-primary hover:underline">See all</button>
      </div>
      
      <div className="space-y-1.5 flex-1 overflow-y-auto pr-1">
        {transactions.map((t, i) => (
          <div key={t.id || `${t.merchant}-${i}`} className="flex items-center justify-between p-2 hover:bg-muted/40 rounded-xl transition cursor-pointer group">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-[10px] bg-background flex items-center justify-center shadow-sm border border-border/50 group-hover:scale-105 transition-transform">
                {t.icon}
              </div>
              <div>
                <h4 className="font-medium text-[11px] leading-tight">{t.merchant}</h4>
                <p className="text-[10px] text-muted-foreground mt-0.5">{t.category} • {t.date}</p>
              </div>
            </div>
            <span className="font-semibold text-[11px] text-foreground">
              {formatCurrency(t.amount)}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}
