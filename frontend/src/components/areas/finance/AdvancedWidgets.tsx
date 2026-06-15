import React from 'react';
import styled from 'styled-components';
import { Card, Button, Tag, Avatar, Typography, Empty, Popconfirm, Table } from 'antd';
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
  border: none;
  border-radius: 22px;
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
  margin-bottom: 12px;
  padding: 12px 16px;
  background: transparent;
  border-radius: 16px;
  border-bottom: 1px dashed hsl(var(--border) / 0.4);
  transition: background-color 0.2s;

  &:last-child {
    border-bottom: none;
    margin-bottom: 0;
  }

  &:hover {
    background: hsl(var(--muted) / 0.3);
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

import { TableContainer, TableHeader } from './TableStyles';

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
  const activeCount = subs.filter(s => s.is_active).length;
  const activeTotal = subs.filter(s => s.is_active).reduce((s, b) => s + Number(b.amount), 0);

  const columns = [
    {
      title: 'Subscription',
      key: 'name',
      render: (_: any, record: any) => (
        <div className="flex items-center gap-3">
          <Avatar shape="square" size={32} style={{ background: 'hsl(var(--muted))', color: 'hsl(var(--foreground))' }}>
            {record.name.charAt(0).toUpperCase()}
          </Avatar>
          <div>
            <div className="font-medium text-foreground">{record.name}</div>
            <div className="text-[10px] text-muted-foreground">{record.is_auto_debit ? 'Auto-debit' : 'Manual'}</div>
          </div>
        </div>
      )
    },
    {
      title: 'Amount',
      dataIndex: 'amount',
      key: 'amount',
      render: (amount: string | number) => <span className="font-medium">{formatCurrency(Number(amount))} / mo</span>
    },
    {
      title: 'Status',
      key: 'status',
      render: (_: any, record: any) => (
        <Tag color={record.is_active ? 'green' : 'orange'} bordered={false}>
          {record.is_active ? 'Active' : 'Paused'}
        </Tag>
      )
    },
    {
      title: 'Action',
      key: 'action',
      render: (_: any, record: any) => (
        <Popconfirm
          title={record.is_active ? 'Pause this subscription?' : 'Resume this subscription?'}
          onConfirm={() => togglePauseMutation.mutate({ id: record.id, is_active: !record.is_active })}
          okText="Yes"
          cancelText="No"
        >
          <Button type="text" danger={record.is_active} size="small" style={{ fontSize: '12px' }}>
            {record.is_active ? 'Pause' : 'Resume'}
          </Button>
        </Popconfirm>
      )
    }
  ];

  if (isLoading) return <div className="space-y-4"><Skeleton className="h-10" /><Skeleton className="h-[200px]" /></div>;

  return (
    <TableContainer>
      <TableHeader>
        <h3>Subscriptions</h3>
      </TableHeader>

      <Table
        dataSource={subs}
        columns={columns}
        rowKey="id"
        pagination={false}
        size="middle"
        summary={() => {
          return (
            <Table.Summary.Row>
              <Table.Summary.Cell index={0}>Active Total ({activeCount})</Table.Summary.Cell>
              <Table.Summary.Cell index={1} colSpan={3}>{formatCurrency(activeTotal)} / mo</Table.Summary.Cell>
            </Table.Summary.Row>
          );
        }}
      />
    </TableContainer>
  );
};
