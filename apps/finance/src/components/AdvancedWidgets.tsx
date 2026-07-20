import React from 'react';
import styled, { useTheme } from 'styled-components';
import { Popconfirm } from '@aios/shared/components/ui/Popconfirm';
import { useState } from 'react';
import { Button, Badge, EmptyState, DataTable, SegmentedControl, Select } from '@ledgr/ui';
import { Sparkles, TrendingUp, AlertCircle, CheckCircle, Repeat } from 'lucide-react';
import { AreaChart, Area, XAxis, Tooltip as ReTooltip, ResponsiveContainer } from 'recharts';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ChartTooltip } from '@aios/shared/components/ui/ChartTooltip';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { financeApi } from '@aios/shared/api/areas';
import { formatCurrency } from '@aios/shared/lib/utils';
import { Skeleton } from '@aios/shared/components/ui/skeleton';
import { Card as GlassCard } from '@ledgr/ui';;
import { TableFooter } from '@aios/shared/components/ui/Table';

const AIInsightWrapper = styled.div`
  display: flex;
  gap: 16px;
  margin-bottom: 12px;
  padding: 12px 16px;
  background: transparent;
  border-radius: 16px;
  border-bottom: 1px dashed color-mix(in srgb, var(--border) 40%, transparent);
  transition: background-color 0.2s;

  &:last-child {
    border-bottom: none;
    margin-bottom: 0;
  }

  &:hover {
    background: color-mix(in srgb, var(--muted) 30%, transparent);
  }
`;

const InsightIconWrapper = styled.div`
  margin-top: 0.125rem;
`;

const InsightText = styled.span`
  color: ${({ theme }) => theme.color.foreground};
  font-size: 0.875rem;
  line-height: 1.625;
`;

const SubRowCell = styled.div`
  display: flex;
  align-items: center;
  gap: 0.75rem;
`;

const SubAvatar = styled.div`
  width: 2rem;
  height: 2rem;
  border-radius: 0.25rem;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: ${({ theme }) => theme.color.muted};
  color: ${({ theme }) => theme.color.foreground};
  font-size: 0.875rem;
  font-weight: 500;
`;

const SubName = styled.div`
  font-weight: 500;
  color: ${({ theme }) => theme.color.foreground};
`;

const SubMeta = styled.div`
  font-size: 10px;
  color: ${({ theme }) => theme.color.mutedForeground};
`;

const SubAmount = styled.span`
  font-weight: 500;
`;


const LoadingContainer = styled.div`
  display: flex;
  flex-direction: column;
  gap: 1rem;
`;

const LoadingHeader = styled(Skeleton)`
  height: 40px;
`;

const LoadingBody = styled(Skeleton)`
  height: 200px;
`;

const InsightsLoadingContainer = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
`;

const InsightsLoadingSkeleton = styled(Skeleton)`
  height: 4rem;
  width: 100%;
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

export const FinancialInsights = () => {
  const theme = useTheme();
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
        icon: <AlertCircle color={theme.color.accent} />,
        text: `You spent more than you earned this month — savings rate is ${rate.toFixed(0)}%. Worth a closer look at expenses.`,
      });
    } else if (rate < 10) {
      insights.push({
        id: 'savings',
        icon: <AlertCircle color={theme.color.accent} />,
        text: `Your savings rate is ${rate.toFixed(0)}% this month. Aim for 20% or more.`,
      });
    } else if (rate >= 20) {
      insights.push({
        id: 'savings',
        icon: <CheckCircle color={theme.color.primary} />,
        text: `Great job! You're saving ${rate.toFixed(0)}% of your income this month.`,
      });
    } else {
      insights.push({
        id: 'savings',
        icon: <Sparkles color={theme.color.accent} />,
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
      icon: <AlertCircle color={theme.color.accent} />,
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
      icon: <CheckCircle color={theme.color.primary} />,
      text: `You're ${topGoal.pct.toFixed(0)}% of the way to your "${topGoal.name}" goal (${formatCurrency(topGoal.current_amount)} of ${formatCurrency(topGoal.target_amount)}).`,
    });
  }

  if (!isLoading && insights.length === 0) {
    insights.push({
      id: 'empty',
      icon: <Sparkles color={theme.color.accent} />,
      text: 'Log income, expenses, goals and bills to start getting personalized insights here.',
    });
  }

  return (
    <GlassCard
      title="Financial Insights"
      subtitle="Patterns and tips inferred from your recent activity"
      icon={<Sparkles size={16} color={theme.color.accent} />}
    >
      {isLoading ? (
        <InsightsLoadingContainer>
          <InsightsLoadingSkeleton />
          <InsightsLoadingSkeleton />
        </InsightsLoadingContainer>
      ) : (
        insights.map(insight => (
          <AIInsightWrapper key={insight.id}>
            <InsightIconWrapper>{insight.icon}</InsightIconWrapper>
            <div>
              <InsightText>{insight.text}</InsightText>
            </div>
          </AIInsightWrapper>
        ))
      )}
    </GlassCard>
  );
};

export const CashflowForecasting = () => {
  const theme = useTheme();
  const { data: cashflow, isLoading } = useQuery({
    queryKey: ['finance', 'cashflow'],
    queryFn: () => financeApi.cashflow(),
  });

  const byDay = cashflow?.by_day ?? [];
  const chartData = byDay.map(d => ({
    date: format(new Date(d.date), 'MMM d'),
    net: Math.round(d.income - d.expense),
  }));

  return (
    <GlassCard
      title="Cashflow Trend"
      subtitle="Daily net inflow minus outflow over the period"
      icon={<TrendingUp size={16} color={theme.color.primary} />}
    >
      {isLoading ? (
        <Skeleton style={{ height: '250px', width: '100%' }} />
      ) : byDay.length === 0 ? (
        <EmptyState title="No cashflow data yet" />
      ) : (
        <ResponsiveContainer width="100%" height={250}>
          <AreaChart data={chartData} margin={{ top: 10, right: 0, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="cashflowGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="var(--accent)" stopOpacity={0.3} />
                <stop offset="95%" stopColor="var(--accent)" stopOpacity={0} />
              </linearGradient>
            </defs>
            <XAxis dataKey="date" tick={{ fontSize: 11, fill: theme.color.mutedForeground }} axisLine={false} tickLine={false} />
            <ReTooltip content={<ChartTooltip valueFormatter={(value: any) => formatCurrency(value)} />} />
            <Area
              type="monotone"
              dataKey="net"
              stroke="var(--accent)"
              strokeWidth={2}
              fill="url(#cashflowGradient)"
              isAnimationActive={false}
            />
          </AreaChart>
        </ResponsiveContainer>
      )}
    </GlassCard>
  );
};

export const SubscriptionManagement = () => {
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'paused'>('all');

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

  const subs = (bills ?? []).filter(b => b.category?.toLowerCase() === 'subscriptions');
  const activeCount = subs.filter(s => s.is_active).length;
  const activeTotal = subs.filter(s => s.is_active).reduce((s, b) => s + Number(b.amount), 0);
  const visibleSubs = subs.filter(s =>
    statusFilter === 'all' ? true : statusFilter === 'active' ? s.is_active : !s.is_active
  );

  const columns = [
    {
      id: 'name',
      header: 'Subscription',
      cell: (row: any) => (
        <SubRowCell>
          <SubAvatar>
            {row.name.charAt(0).toUpperCase()}
          </SubAvatar>
          <div>
            <SubName>{row.name}</SubName>
            <SubMeta>{row.is_auto_debit ? 'Auto-debit' : 'Manual'}</SubMeta>
          </div>
        </SubRowCell>
      ),
    },
    {
      id: 'amount',
      header: 'Amount',
      cell: (row: any) => <SubAmount>{formatCurrency(Number(row.amount))} / mo</SubAmount>
    },
    {
      id: 'status',
      header: 'Status',
      cell: (row: any) => (
        <Badge tone={row.is_active ? 'success' : 'warning'}>
          {row.is_active ? 'Active' : 'Paused'}
        </Badge>
      )
    },
    {
      id: 'action',
      header: 'Action',
      cell: (row: any) => (
        <Popconfirm
          title={row.is_active ? 'Pause this subscription?' : 'Resume this subscription?'}
          onConfirm={() => togglePauseMutation.mutate({ id: row.id, is_active: !row.is_active })}
          okText="Yes"
          cancelText="No"
        >
          <Button variant={row.is_active ? 'destructive' : 'ghost'} size="sm" style={{ fontSize: '12px' }}>
            {row.is_active ? 'Pause' : 'Resume'}
          </Button>
        </Popconfirm>
      )
    }
  ];

  if (isLoading) return <LoadingContainer><LoadingHeader /><LoadingBody /></LoadingContainer>;

  return (
    <GlassCard
      title="Subscriptions"
      subtitle="Recurring service charges and their state"
      icon={<Repeat size={16} />}
      action={
        <Select
          size="sm"
          fullWidth={false}
          aria-label="Filter subscriptions by status"
          value={statusFilter}
          onChange={(v: any) => setStatusFilter(v as typeof statusFilter)}
          options={[
            { value: 'all', label: 'All Subscriptions' },
            { value: 'active', label: 'Active' },
            { value: 'paused', label: 'Paused' },
          ]}
        />
      }
    >
      <DataTable
        rows={visibleSubs}
        columns={columns}
        getRowKey={row => row.id}
        empty={{ title: 'No subscriptions', description: 'Bills in the Subscriptions category appear here.' }}
      />
      <TableFooter>
        <span>Active Total ({activeCount})</span>
        <span>{formatCurrency(activeTotal)} / mo</span>
      </TableFooter>
    </GlassCard>
  );
};
