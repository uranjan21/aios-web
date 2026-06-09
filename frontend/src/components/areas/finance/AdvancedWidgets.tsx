import React from 'react';
import styled from 'styled-components';
import { Card, Progress, List, Button, Tag, Avatar, Typography } from 'antd';
import { Sparkles, TrendingUp, AlertCircle, CheckCircle } from 'lucide-react';
import Highcharts from 'highcharts';
import HighchartsReact from 'highcharts-react-official';
import { formatCurrency } from '@/lib/utils';

const { Title, Text } = Typography;

const PremiumCard = styled(Card)`
  background: linear-gradient(145deg, #1e1e1e, #2a2a2a);
  border: 1px solid #333;
  border-radius: 16px;
  overflow: hidden;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.2);

  .ant-card-head {
    border-bottom: 1px solid #333;
    color: #fff;
    font-weight: 600;
  }
  
  .ant-card-body {
    padding: 20px;
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

export const AIInsightsEngine = () => {
  const insights = [
    {
      id: 1,
      type: 'warning',
      icon: <AlertCircle className="text-orange-400" />,
      text: "You're spending 20% more on dining out this month compared to last month.",
    },
    {
      id: 2,
      type: 'success',
      icon: <CheckCircle className="text-green-400" />,
      text: "Great job! You saved $300 on groceries by following your budget.",
    },
    {
      id: 3,
      type: 'tip',
      icon: <Sparkles className="text-purple-400" />,
      text: "Investing $500 now could grow to $650 in 5 years at 5% APY.",
    }
  ];

  return (
    <PremiumCard title={<div className="flex items-center gap-2"><Sparkles className="w-5 h-5 text-purple-400" /> AI Financial Insights</div>}>
      {insights.map(insight => (
        <AIInsightWrapper key={insight.id}>
          <div className="mt-0.5">{insight.icon}</div>
          <div>
            <Text style={{ color: '#e5e7eb', fontSize: '14px', lineHeight: '1.5' }}>{insight.text}</Text>
          </div>
        </AIInsightWrapper>
      ))}
    </PremiumCard>
  );
};

export const CashflowForecasting = () => {
  const options = {
    chart: {
      type: 'areaspline',
      backgroundColor: 'transparent',
      height: 250,
      margin: [20, 0, 20, 0],
    },
    title: { text: null },
    xAxis: {
      categories: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul'],
      labels: { style: { color: '#888' } },
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
      name: 'Cashflow',
      data: [3500, 4200, 3800, 5100, 4800, 6000, 7500],
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
    <PremiumCard title={<div className="flex items-center gap-2"><TrendingUp className="w-5 h-5 text-emerald-400" /> Cashflow Forecast</div>}>
      <HighchartsReact highcharts={Highcharts} options={options} />
    </PremiumCard>
  );
};

export const GoalTrackingRings = () => {
  const goals = [
    { name: 'Emergency Fund', current: 5000, target: 10000, color: '#3B82F6' },
    { name: 'Vacation', current: 1200, target: 3000, color: '#EC4899' },
    { name: 'New Car', current: 8000, target: 40000, color: '#8B5CF6' }
  ];

  return (
    <PremiumCard title="Goal Tracking">
      <div className="flex justify-around items-center h-full py-4">
        {goals.map(goal => (
          <div key={goal.name} className="flex flex-col items-center gap-3">
            <Progress 
              type="dashboard" 
              percent={Math.round((goal.current / goal.target) * 100)} 
              strokeColor={goal.color}
              trailColor="rgba(255,255,255,0.1)"
              size={90}
              format={percent => <span style={{ color: '#fff', fontSize: '16px' }}>{percent}%</span>}
            />
            <div className="text-center">
              <div className="text-[12px] font-medium text-gray-300">{goal.name}</div>
              <div className="text-[10px] text-gray-500">{formatCurrency(goal.current)} / {formatCurrency(goal.target)}</div>
            </div>
          </div>
        ))}
      </div>
    </PremiumCard>
  );
};

const SubItem = styled(List.Item)`
  border-bottom: 1px solid #333 !important;
  padding: 16px 0 !important;
  
  &:last-child {
    border-bottom: none !important;
  }
`;

export const SubscriptionManagement = () => {
  const subs = [
    { id: 1, name: 'Netflix', price: 15.99, status: 'Active', logo: 'https://logo.clearbit.com/netflix.com' },
    { id: 2, name: 'Spotify', price: 9.99, status: 'Active', logo: 'https://logo.clearbit.com/spotify.com' },
    { id: 3, name: 'Gym Membership', price: 45.00, status: 'Active', logo: 'https://logo.clearbit.com/planetfitness.com' },
    { id: 4, name: 'Adobe Creative Cloud', price: 54.99, status: 'Review', logo: 'https://logo.clearbit.com/adobe.com' },
  ];

  return (
    <PremiumCard title="Subscriptions">
      <List
        itemLayout="horizontal"
        dataSource={subs}
        renderItem={item => (
          <SubItem
            actions={[
              <Button type="text" danger size="small" style={{ fontSize: '12px' }}>Cancel</Button>
            ]}
          >
            <List.Item.Meta
              avatar={<Avatar src={item.logo} shape="square" size={40} style={{ background: '#333' }} />}
              title={<span style={{ color: '#fff', fontSize: '14px', fontWeight: 500 }}>{item.name}</span>}
              description={<span style={{ color: '#888', fontSize: '12px' }}>{formatCurrency(item.price)} / month</span>}
            />
            <div>
              <Tag color={item.status === 'Active' ? 'green' : 'orange'} bordered={false}>
                {item.status}
              </Tag>
            </div>
          </SubItem>
        )}
      />
    </PremiumCard>
  );
};
