// @ts-nocheck
import React, { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Rocket, History, Plus, Activity, TrendingUp, LayoutDashboard, Calendar, BarChart3, Bot, Search, Bell, PlusCircle } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useUIStore } from '@/stores/uiStore'
import { motion } from 'framer-motion'
import styled from 'styled-components'
import { Timeline } from 'antd'
import { Skeleton } from '@/components/ui/skeleton'
import { Button, Badge, Select } from '@ledgr/ui'
import { AreaTabs } from '@/components/ui/AreaTabs'
import { EventsTab } from '@/components/areas/business/EventsTab'
import { SummaryTab } from '@/components/areas/business/SummaryTab'
import { BusinessLogModal } from '@/components/areas/business/BusinessLogModal'

import { businessApi } from '@/api/areas'
import { formatDate } from '@/lib/utils'
import { EmptyState } from '@/components/EmptyState'
import { PageHeader } from '@ledgr/ui'
import { IconBadge } from '@/components/lumina';
import { Card as GlassCard } from '@ledgr/ui';

const EVENT_TYPE_COLORS: Record<string, string> = {
  feature_shipped: 'success',
  decision: 'info',
  revenue: 'warning',
  blocker: 'destructive',
  milestone: 'accent',
  note: 'neutral',
}

const PageWrapper = styled.div`
  min-height: 100vh;
  background-color: var(--page-bg);
  padding: 1rem;
  @media (min-width: 768px) {
    padding: 1.5rem;
  }
`

const PageContainer = styled.div`
  margin: 0 auto;
  max-width: 1200px;
`

const ActionButtonContent = styled.div`
  font-size: 12px;
  font-weight: 500;
  display: flex;
  align-items: center;
  gap: 0.25rem;
`

const DashboardLayout = styled.div`
  display: flex;
  flex-direction: column;
  gap: 1rem;
  width: 100%;
`

const DashboardContent = styled.div`
  display: flex;
  flex-direction: column;
  gap: 1rem;
`

const MetricsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(12, minmax(0, 1fr));
  gap: 1rem;
`

const MetricCard = styled.div`
  grid-column: span 12 / span 12;
  @media (min-width: 768px) {
    grid-column: span 4 / span 4;
  }
`

const MetricLabel = styled.div`
  font-size: 14px;
  color: ${({ theme }) => theme.color?.mutedForeground || 'var(--muted-foreground)'};
  margin-bottom: 0.25rem;
`

const MetricValuePrimary = styled.div`
  font-size: 24px;
  color: ${({ theme }) => theme.color?.foreground || 'inherit'};
  font-weight: 500;
  display: flex;
  align-items: center;
  gap: 0.25rem;
`

const MetricValueSecondary = styled.div<{ $truncate?: boolean }>`
  color: ${({ theme }) => theme.color?.foreground || 'inherit'};
  font-weight: 500;
  ${({ $truncate }) => $truncate && `
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  `}
`

const TimelineWrapper = styled.div`
  margin-top: 0.5rem;
`

const TimelineItemHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 0.5rem;
`

const TimelineContentCol = styled.div`
  display: flex;
  flex-direction: column;
`

const TimelineTitleRow = styled.div`
  display: flex;
  gap: 0.5rem;
  align-items: center;
`

const TimelineBadgeContainer = styled.div`
  margin: 0;
  font-size: 10px;
  line-height: 1.25;
  padding: 0 0.25rem;
  border-color: transparent;
  background-color: color-mix(in srgb, var(--muted) 50%, transparent);
  border-radius: 9999px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
`

const TimelineTitle = styled.span`
  font-size: 11px;
  font-weight: 500;
  color: ${({ theme }) => theme.color?.foreground || 'inherit'};
`

const TimelineDescription = styled.div`
  font-size: 11px;
  color: ${({ theme }) => theme.color?.mutedForeground || 'var(--muted-foreground)'};
  margin-top: 0.25rem;
  line-height: 1.375;
`

const TimelineDate = styled.div`
  font-size: 11px;
  color: ${({ theme }) => theme.color?.mutedForeground || 'var(--muted-foreground)'};
  white-space: nowrap;
  margin-top: 0.125rem;
`

const AnimatedTimelineItem = styled(motion.div)`
  padding: 0.375rem 0.5rem;
  border-radius: 6px;
  margin-bottom: 0.25rem;
  transition: all 0.2s ease;
  &:hover {
    background: color-mix(in srgb, var(--muted) 30%, transparent);
  }
`

const RunwayHeader = styled.div`
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
`

const RunwayLabel = styled.div`
  font-size: 10px;
  color: ${({ theme }) => theme.color?.mutedForeground || 'var(--muted-foreground)'};
  text-transform: uppercase;
  letter-spacing: 0.05em;
  margin-bottom: 0.25rem;
`

const RunwayValue = styled.div`
  font-size: 14px;
  font-weight: 500;
  display: flex;
  align-items: center;
  gap: 0.25rem;
`

const RunwayStatusContainer = styled.div<{ $isHealthy: boolean }>`
  margin-top: 0.75rem;
  padding: 0.5rem;
  border-radius: 0.5rem;
  border: 1px solid;
  display: flex;
  align-items: center;
  justify-content: space-between;
  
  background-color: ${({ $isHealthy }) => $isHealthy ? 'color-mix(in srgb, var(--kpi-emerald) 10%, transparent)' : 'color-mix(in srgb, var(--kpi-red) 10%, transparent)'};
  border-color: ${({ $isHealthy }) => $isHealthy ? 'color-mix(in srgb, var(--kpi-emerald) 20%, transparent)' : 'color-mix(in srgb, var(--kpi-red) 20%, transparent)'};
`

const RunwayStatusLabel = styled.div`
  font-size: 10px;
  color: ${({ theme }) => theme.color?.mutedForeground || 'var(--muted-foreground)'};
  margin-bottom: 0.125rem;
`

const RunwayStatusValue = styled.div<{ $isHealthy: boolean }>`
  font-size: 0.75rem;
  font-weight: 600;
  color: ${({ $isHealthy }) => $isHealthy ? 'var(--kpi-emerald)' : 'var(--kpi-red)'};
`

const RunwayStatusUnit = styled.span`
  font-size: 10px;
  font-weight: 400;
  opacity: 0.7;
`

const RunwayMessageWrapper = styled.div`
  text-align: right;
  max-width: 120px;
`

const RunwayMessage = styled.span`
  font-size: 10px;
  color: ${({ theme }) => theme.color?.mutedForeground || 'var(--muted-foreground)'};
  line-height: 1.25;
  display: block;
`

function RunwayCalculator() {
  const [cash, setCash] = useState(50000)
  const [burnRate, setBurnRate] = useState(5000)
  const [runwayPeriod, setRunwayPeriod] = useState('monthly')

  const runwayMonths = burnRate > 0 ? (cash / burnRate).toFixed(1) : '∞'
  const isHealthy = burnRate === 0 || cash / burnRate > 6

  return (
    <GlassCard
      title="Runway Calculator"
      subtitle="Calculate cash runway based on burn rate"
      icon={<TrendingUp size={16} color="var(--muted-foreground)" />}
      action={
        <Select
          size="sm"
          fullWidth={false}
          options={[
            { label: 'Monthly Scope', value: 'monthly' },
            { label: 'Quarterly Scope', value: 'quarterly' },
          ]}
          value={runwayPeriod}
          onChange={(val) => setRunwayPeriod(val as string)}
        />
      }
      hoverable
      fadeIn="up"
    >
      <RunwayHeader>
        <div>
          <RunwayLabel>Current Cash</RunwayLabel>
          <RunwayValue>
            <span>₹</span>
            <span>{cash.toLocaleString()}</span>
          </RunwayValue>
        </div>
        <div>
          <RunwayLabel>Monthly Burn</RunwayLabel>
          <RunwayValue>
            <Activity size={14} />
            <span>{burnRate.toLocaleString()}</span>
          </RunwayValue>
        </div>
      </RunwayHeader>
      <RunwayStatusContainer $isHealthy={isHealthy}>
        <div>
          <RunwayStatusLabel>Estimated Runway</RunwayStatusLabel>
          <RunwayStatusValue $isHealthy={isHealthy}>
            {runwayMonths} <RunwayStatusUnit>months</RunwayStatusUnit>
          </RunwayStatusValue>
        </div>
        <RunwayMessageWrapper>
          <RunwayMessage>
            {isHealthy ? 'Looking solid!' : 'Warning: Low runway.'}
          </RunwayMessage>
        </RunwayMessageWrapper>
      </RunwayStatusContainer>
    </GlassCard>
  )
}

export function BusinessPage() {
  const [isLogModalOpen, setIsLogModalOpen] = useState(false)
  const [eventTypeFilter, setEventTypeFilter] = useState('all')
  const navigate = useNavigate()
  const { setCmdPaletteOpen, setCaptureModalOpen } = useUIStore()
  const { data: events, isLoading: loadingEvents } = useQuery({ queryKey: ['business', 'events'], queryFn: businessApi.events })
  const { data: summary, isLoading: loadingSummary } = useQuery({ queryKey: ['business', 'summary'], queryFn: businessApi.summary })

  return (
    <PageWrapper>
      <PageContainer>
      <PageHeader
        icon={<Rocket />}
        eyebrow="Ventures"
        title="Business"
        subtitle="Metrics, milestones and the event timeline — track your venture in one place."
      />
      <AreaTabs
        defaultActiveKey="1"
        items={[
          {
            key: '1',
            label: <><LayoutDashboard size={14} /> Dashboard</>,
            children: (
              <DashboardLayout>

                {/* Main content */}
                <DashboardContent>
                  <GlassCard
                    title="Ledgr"
                    subtitle="SaaS accounting for Indian freelancers"
                    icon={<Rocket size={16} />}
                    action={<Badge tone="info">Building</Badge>}
                    hoverable
                    fadeIn="up"
                  >
                    <MetricsGrid>
                      <MetricCard>
                        <div>
                          <MetricLabel>MRR</MetricLabel>
                          {loadingSummary ? <Skeleton style={{ height: '28px', width: '96px' }} /> : (
                            <MetricValuePrimary>
                              <span>₹</span>
                              <span>{(summary?.mrr ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                            </MetricValuePrimary>
                          )}
                        </div>
                      </MetricCard>
                      <MetricCard>
                        <MetricLabel>Last Feature</MetricLabel>
                        {loadingSummary ? <Skeleton style={{ height: '24px', width: '128px' }} /> : <MetricValueSecondary $truncate>{summary?.last_feature ?? '—'}</MetricValueSecondary>}
                      </MetricCard>
                      <MetricCard>
                        <MetricLabel>Shipped At</MetricLabel>
                        {loadingSummary ? <Skeleton style={{ height: '24px', width: '128px' }} /> : <MetricValueSecondary>{formatDate(summary?.last_feature_at)}</MetricValueSecondary>}
                      </MetricCard>
                    </MetricsGrid>
                  </GlassCard>

                  <GlassCard
                    title="Event Timeline"
                    subtitle="Recent venture milestones and decisions"
                    icon={<History size={16} color="var(--muted-foreground)" />}
                    action={
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <Select
                          size="sm"
                          fullWidth={false}
                          options={[
                            { label: 'All Events', value: 'all' },
                            { label: 'Feature Shipped', value: 'feature_shipped' },
                            { label: 'Decision', value: 'decision' },
                            { label: 'Revenue', value: 'revenue' },
                            { label: 'Blocker', value: 'blocker' },
                            { label: 'Milestone', value: 'milestone' },
                            { label: 'Note', value: 'note' },
                          ]}
                          value={eventTypeFilter}
                          onChange={(val) => setEventTypeFilter(val as string)}
                        />
                        <Button size="sm" onClick={() => setIsLogModalOpen(true)}>
                          <ActionButtonContent>
                            <Plus size={12} />
                            <span>Log Event</span>
                          </ActionButtonContent>
                        </Button>
                      </div>
                    }
                    hoverable
                    fadeIn="up"
                    delay={100}
                  >
                    {loadingEvents ? <Skeleton active /> : events?.length ? (
                      <TimelineWrapper>
                        <Timeline
                          items={events
                            .filter(e => eventTypeFilter === 'all' || e.event_type === eventTypeFilter)
                            .map((e: any, i: number) => ({
                              color: EVENT_TYPE_COLORS[e.event_type] || 'blue',
                              children: (
                                <AnimatedTimelineItem initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.05 }}>
                                  <TimelineItemHeader>
                                    <TimelineContentCol>
                                      <TimelineTitleRow>
                                        <TimelineBadgeContainer>
                                          <Badge tone={(EVENT_TYPE_COLORS[e.event_type] || 'neutral') as any}>{e.event_type.replace('_', ' ')}</Badge>
                                        </TimelineBadgeContainer>
                                        <TimelineTitle>{e.title}</TimelineTitle>
                                      </TimelineTitleRow>
                                      {e.description && <TimelineDescription>{e.description}</TimelineDescription>}
                                    </TimelineContentCol>
                                    <TimelineDate>{formatDate(e.occurred_at)}</TimelineDate>
                                  </TimelineItemHeader>
                                </AnimatedTimelineItem>
                              )
                            }))}
                        />
                      </TimelineWrapper>
                    ) : (
                      <EmptyState
                        icon={History}
                        title="No events"
                        description="Log your business milestones."
                        action={{ label: "Add Entry", onClick: () => setIsLogModalOpen(true) }}
                      />
                    )}
                  </GlassCard>
                </DashboardContent>

                <RunwayCalculator />
              </DashboardLayout>
            ),
          },
          {
            key: '2',
            label: <><Calendar size={14} /> Events</>,
            children: <EventsTab />,
          },
          {
            key: '3',
            label: <><BarChart3 size={14} /> Summary</>,
            children: <SummaryTab />,
          },
        ]}
      />
      <BusinessLogModal open={isLogModalOpen} onClose={() => setIsLogModalOpen(false)} />
      </PageContainer>
    </PageWrapper>
  )
}
