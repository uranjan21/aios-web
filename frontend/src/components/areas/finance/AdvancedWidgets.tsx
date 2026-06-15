import React from 'react';
import styled from 'styled-components';
import { Card, List, Button, Tag, Avatar, Typography, Empty, Popconfirm } from 'antd';
import { Sparkles, TrendingUp, AlertCircle, CheckCircle } from 'lucide-react';
import Highcharts from 'highcharts';
Highcharts.setOptions({ accessibility: { enabled: false } });
import HighchartsReact from 'highcharts-react-official';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { financeApi } from '@/api/areas';
import { formatCurrency } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';
import { GlassCard } from '@/components/lumina';

const { Text } = Typography;

const PremiumCard = styled(Card)`
  background: hsl(var(--card));
  border: 1px solid hsl(var(--border-subtle) / 0.06);
  border-radius: 12px;
  overflow: hidden;
  box-shadow: var(--shadow-premium-sm);

  .ant-card-head {
    border-bottom: none;
    padding: 16px 16px 0;
    color: hsl(var(--muted-foreground));
    font-size: 14px;
    font-weight: 500;
  }

  .ant-card-body {
    padding: 16px;
  }
`;

const AIInsightWrapper = styled.div`
  display: flex;
  gap: 16px;
  margin-bottom: 16px;
  padding: 16px;
  background: rgba(139, 92, 246, 0.1);
  border-radius: 12px;
  border: 1px solid rgba(139, 92, 246, 0.2);
  transition: transform 0.2s;

  &:hover {
    transform: translateY(-2px);
    background: rgba(139, 92, 246, 0.15);
  }
`;

// Returns days from today until the given day-of-month next occurs (same logic as BillsTab).
function getDaysUntilDue(dueDay: number): number {
  const today = new Date();
  const currentDay = today.getDate();
  const daysInMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();
  if (dueDay >= currentDay) {
    return dueDay - currentDay;
  }
  return daysInMonth - currentDay + dueDay;
}

export const AIInsightsEngine = () => {
  const { data: cashflow, isLoading: loadingCashflow } = useQuery({
    queryKey: ['finance', 'cashflow'],
    queryFn: () => financeApi.cashflow(),
  });
  const { data: goals, isLoading: loadingGoals } = useQuery({
    queryKey: ['finance', 'goals'],
    queryFn: financeApi.goals,
  });
  const { data: bills, isLoading: loadingBills } = useQuery({
    queryKey: ['finance', 'bills'],
    queryFn: financeApi.bills,
  });

  const isLoading = loadingCashflow || loadingGoals || loadingBills;
  const insights: { id: string; icon: React.ReactNode; text: string }[] = [];

  if (cashflow) {
    const rate = cashflow.savings_rate ?? 0;
    if (rate < 0) {
      insights.push({
        id: 'savings',
        icon: <AlertCircle className="text-orange-400" />,
        text: `You spent more than you earned this month — savings rate is ${rate.toFixed(0)}%. Worth a closer look at expenses.`,
      });
    } else if (rate < 10) {
      insights.push({
        id: 'savings',
        icon: <AlertCircle className="text-orange-400" />,
        text: `Your savings rate is ${rate.toFixed(0)}% this month. Aim for 20% or more.`,
      });
    } else if (rate >= 20) {
      insights.push({
        id: 'savings',
        icon: <CheckCircle className="text-green-400" />,
        text: `Great job! You're saving ${rate.toFixed(0)}% of your income this month.`,
      });
    } else {
      insights.push({
        id: 'savings',
        icon: <Sparkles className="text-purple-400" />,
        text: `You're saving ${rate.toFixed(0)}% of your income this month — getting close to the 20% target.`,
      });
    }
  }

  const upcomingBill = (bills ?? [])
    .filter(b => b.is_active)
    .map(b => ({ ...b, days: getDaysUntilDue(b.due_day) }))
    .sort((a, b) => a.days - b.days)[0];
  if (upcomingBill && upcomingBill.days <= 5) {
    const when = upcomingBill.days === 0 ? 'today' : upcomingBill.days === 1 ? 'tomorrow' : `in ${upcomingBill.days} days`;
    insights.push({
      id: 'bill',
      icon: <AlertCircle className="text-orange-400" />,
      text: `${upcomingBill.name} (${formatCurrency(upcomingBill.amount)}) is due ${when}.`,
    });
  }

  const topGoal = (goals ?? [])
    .map(g => ({ ...g, pct: g.target_amount > 0 ? (g.current_amount / g.target_amount) * 100 : 0 }))
    .filter(g => g.pct < 100)
    .sort((a, b) => b.pct - a.pct)[0];
  if (topGoal) {
    insights.push({
      id: 'goal',
      icon: <CheckCircle className="text-green-400" />,
      text: `You're ${topGoal.pct.toFixed(0)}% of the way to your "${topGoal.name}" goal (${formatCurrency(topGoal.current_amount)} of ${formatCurrency(topGoal.target_amount)}).`,
    });
  }

  if (!isLoading && insights.length === 0) {
    insights.push({
      id: 'empty',
      icon: <Sparkles className="text-purple-400" />,
      text: 'Log income, expenses, goals and bills to start getting personalized insights here.',
    });
  }

  return (
    <PremiumCard title={<div className="flex items-center gap-2"><Sparkles className="w-4 h-4 text-purple-400" /> AI Financial Insights</div>}>
      {isLoading ? (
        <div className="space-y-3">
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-16 w-full" />
        </div>
      ) : (
        insights.map(insight => (
          <AIInsightWrapper key={insight.id}>
            <div className="mt-0.5">{insight.icon}</div>
            <div>
              <Text className="text-foreground text-sm leading-relaxed">{insight.text}</Text>
            </div>
          </AIInsightWrapper>
        ))
      )}
    </PremiumCard>
  );
};

export const CashflowForecasting = () => {
  const { data: cashflow, isLoading } = useQuery({
    queryKey: ['finance', 'cashflow'],
    queryFn: () => financeApi.cashflow(),
  });

  const byDay = cashflow?.by_day ?? [];

  const options = {
    chart: {
      type: 'areaspline',
      backgroundColor: 'transparent',
      height: 250,
      margin: [20, 0, 20, 0],
    },
    title: { text: null },
    xAxis: {
      categories: byDay.map(d => format(new Date(d.date), 'MMM d')),
      labels: { style: { color: 'hsl(var(--muted-foreground))' } },
      lineWidth: 0,
      tickWidth: 0,
    },
    yAxis: {
      visible: false,
    },
    legend: { enabled: false },
    credits: { enabled: false },
    tooltip: {
      backgroundColor: 'rgba(0,0,0,0.8)',
      style: { color: '#fff' },
      borderWidth: 0,
      formatter: function(this: any) {
        return `<b>${this.x}</b><br/>${formatCurrency(this.y as number)}`;
      }
    },
    plotOptions: {
      areaspline: {
        fillOpacity: 0.2,
        lineWidth: 3,
        marker: { enabled: false, symbol: 'circle', radius: 4, states: { hover: { enabled: true } } }
      }
    },
    series: [{
      name: 'Net Cashflow',
      data: byDay.map(d => Math.round(d.income - d.expense)),
      color: '#10B981',
      fillColor: {
        linearGradient: { x1: 0, y1: 0, x2: 0, y2: 1 },
        stops: [
          [0, 'rgba(16, 185, 129, 0.5)'],
          [1, 'rgba(16, 185, 129, 0.0)']
        ]
      }
    }]
  };

  return (
    <PremiumCard title={<div className="flex items-center gap-2"><TrendingUp className="w-4 h-4 text-emerald-400" /> Cashflow Trend</div>} extra={<button className="text-xs font-medium px-2.5 py-1 bg-muted/50 hover:bg-muted text-muted-foreground rounded-md transition-colors">Report</button>}>
      {isLoading ? (
        <Skeleton className="h-[250px] w-full" />
      ) : byDay.length === 0 ? (
        <Empty description="No cashflow data yet" image={Empty.PRESENTED_IMAGE_SIMPLE} />
      ) : (
        <HighchartsReact highcharts={Highcharts} options={options} />
      )}
    </PremiumCard>
  );
};

const SubItem = styled(List.Item)`
  border-bottom: 1px solid hsl(var(--border) / 0.6) !important;
  padding: 16px 0 !important;

  &:last-child {
    border-bottom: none !important;
  }
`;

export const SubscriptionManagement = () => {
  const queryClient = useQueryClient();

  const { data: bills, isLoading } = useQuery({
    queryKey: ['finance', 'bills'],
    queryFn: financeApi.bills,
  });

  const togglePauseMutation = useMutation({
    mutationFn: ({ id, is_active }: { id: string; is_active: boolean }) => financeApi.patchBill(id, { is_active }),
    onSuccess: (_data, vars) => {
      queryClient.invalidateQueries({ queryKey: ['finance', 'bills'] });
      toast.success(vars.is_active ? 'Subscription resumed' : 'Subscription paused');
    },
    onError: () => toast.error('Failed to update subscription'),
  });

  const subs = (bills ?? []).filter(b => b.category === 'subscriptions');

  return (
    <GlassCard
      title="Subscriptions"
      action={<button className="text-xs font-medium px-2.5 py-1 bg-muted/50 hover:bg-muted text-muted-foreground rounded-md transition-colors">Manage</button>}
      hoverable
      fadeIn="up"
    >
      {isLoading ? (
        <div className="space-y-3">
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
        </div>
      ) : subs.length === 0 ? (
        <Empty description="No subscriptions tracked — add a bill with category 'Subscriptions' in the Bills tab" image={Empty.PRESENTED_IMAGE_SIMPLE} />
      ) : (
        <List
          itemLayout="horizontal"
          dataSource={subs}
          renderItem={item => (
            <SubItem
              actions={[
                <Popconfirm
                  key="toggle"
                  title={item.is_active ? 'Pause this subscription?' : 'Resume this subscription?'}
                  onConfirm={() => togglePauseMutation.mutate({ id: item.id, is_active: !item.is_active })}
                  okText="Yes"
                  cancelText="No"
                >
                  <Button type="text" danger={item.is_active} size="small" style={{ fontSize: '12px' }}>
                    {item.is_active ? 'Pause' : 'Resume'}
                  </Button>
                </Popconfirm>
              ]}
            >
              <List.Item.Meta
                avatar={<Avatar shape="square" size={40} style={{ background: 'hsl(var(--muted))', color: 'hsl(var(--foreground))' }}>{item.name.charAt(0).toUpperCase()}</Avatar>}
                title={<span className="text-foreground text-sm font-medium">{item.name}</span>}
                description={<span className="text-muted-foreground text-xs">{formatCurrency(item.amount)} / month{item.is_auto_debit ? ' · auto-debit' : ''}</span>}
              />
              <div>
                <Tag color={item.is_active ? 'green' : 'orange'} bordered={false}>
                  {item.is_active ? 'Active' : 'Paused'}
                </Tag>
              </div>
            </SubItem>
          )}
        />
      )}
    </GlassCard>
  );
};
