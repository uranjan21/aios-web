import React, { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Rocket, History, Plus, DollarSign, Activity, TrendingUp } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { toast } from 'sonner'
import styled from 'styled-components'
import { Card, Button, Timeline, Tag, Select, Input, Form, Skeleton, Space, Statistic, Tabs } from 'antd'
import { AreaTabs } from '@/components/ui/AreaTabs'
import { businessApi } from '@/api/areas'
import { formatCurrency, formatDate } from '@/lib/utils'
import { ErrorCard } from '@/components/ErrorCard'
import { EmptyState } from '@/components/EmptyState'

const EVENT_TYPE_COLORS: Record<string, string> = {
  feature_shipped: 'green',
  decision: 'blue',
  revenue: 'gold',
  blocker: 'red',
  milestone: 'purple',
  note: 'default',
}

const FlatCard = ({ className, ...props }: any) => (
  <Card 
    className={`bg-card border border-border/60 shadow-sm rounded-xl overflow-hidden [&>.ant-card-head]:border-border/40 [&>.ant-card-head]:min-h-[40px] [&>.ant-card-head]:px-3 [&>.ant-card-body]:p-3 ${className || ''}`}
    bordered={false}
    {...props} 
  />
)

const AnimatedTimelineItem = styled(motion.div)`
  padding: 0.25rem 0.5rem;
  border-radius: 6px;
  margin-bottom: 0.25rem;
  transition: all 0.2s ease;
  &:hover {
    background: hsl(var(--muted) / 0.3);
  }
`

function RunwayCalculator() {
  const [cash, setCash] = useState(50000)
  const [burnRate, setBurnRate] = useState(5000)

  const runwayMonths = burnRate > 0 ? (cash / burnRate).toFixed(1) : '∞'
  const isHealthy = burnRate === 0 || cash / burnRate > 6

  return (
    <FlatCard 
      title={<Space className="text-xs font-medium text-muted-foreground"><TrendingUp size={14} /><span>Runway Calculator</span></Space>}
      extra={<button className="text-xs font-medium px-2 py-0.5 bg-muted/50 hover:bg-muted text-muted-foreground rounded transition-colors">Details</button>}
    >
      <div className="flex flex-row items-center justify-between gap-4">
        <Statistic 
          title={<span className="text-[10px] text-gray-500 uppercase tracking-wider">Current Cash</span>} 
          value={cash} 
          prefix={<DollarSign size={14} />} 
          precision={0} 
          valueStyle={{ fontSize: '16px', fontWeight: 600 }} 
        />
        <Statistic 
          title={<span className="text-[10px] text-gray-500 uppercase tracking-wider">Monthly Burn</span>} 
          value={burnRate} 
          prefix={<Activity size={14} />} 
          precision={0} 
          valueStyle={{ fontSize: '16px', fontWeight: 600 }} 
        />
      </div>
      <div className={`mt-3 p-2 rounded-lg border flex items-center justify-between ${isHealthy ? 'bg-green-500/10 border-green-500/20' : 'bg-red-500/10 border-red-500/20'}`}>
        <div>
          <div className="text-[10px] text-gray-400 mb-0.5">Estimated Runway</div>
          <div className={`text-xs font-semibold ${isHealthy ? 'text-green-500' : 'text-red-500'}`}>{runwayMonths} <span className="text-[10px] font-normal opacity-70">months</span></div>
        </div>
        <div className="text-right max-w-[120px]">
          <span className="text-[10px] text-gray-400 leading-tight block">
            {isHealthy ? 'Looking solid!' : 'Warning: Low runway.'}
          </span>
        </div>
      </div>
    </FlatCard>
  )
}

function EventForm({ onClose }: { onClose: () => void }) {
  const queryClient = useQueryClient()
  const [form] = Form.useForm()

  const { mutate, isPending } = useMutation({
    mutationFn: (values: any) => businessApi.createEvent({
      event_type: values.eventType,
      title: values.title.trim(),
      description: values.description?.trim() || undefined,
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['business'] })
      form.resetFields()
      toast.success('Event logged')
      onClose()
    },
    onError: () => toast.error('Failed to log event'),
  })

  return (
    <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}>
      <Form form={form} layout="vertical" onFinish={mutate} className="p-3 bg-black/5 rounded-xl mb-4 border border-black/5">
        <div className="grid grid-cols-12 gap-4">
          <div className="col-span-12 md:col-span-4">
            <Form.Item name="eventType" initialValue="feature_shipped" rules={[{ required: true }]}>
              <Select>
                {Object.keys(EVENT_TYPE_COLORS).map(t => (
                  <Select.Option key={t} value={t}>{t.replace('_', ' ')}</Select.Option>
                ))}
              </Select>
            </Form.Item>
          </div>
          <div className="col-span-12 md:col-span-8">
            <Form.Item name="title" rules={[{ required: true, message: 'Title is required' }]}>
              <Input placeholder="Event Title" />
            </Form.Item>
          </div>
        </div>
        <Form.Item name="description">
          <Input.TextArea placeholder="Description (optional)" autoSize={{ minRows: 2, maxRows: 4 }} />
        </Form.Item>
        <Space className="w-full justify-end">
          <Button type="text" onClick={onClose}>Cancel</Button>
          <Button type="primary" htmlType="submit" loading={isPending}>
            Log Event
          </Button>
        </Space>
      </Form>
    </motion.div>
  )
}

export function BusinessPage() {
  const [showEventForm, setShowEventForm] = useState(false)
  const { data: events, isLoading: loadingEvents } = useQuery({ queryKey: ['business', 'events'], queryFn: businessApi.events })
  const { data: summary, isLoading: loadingSummary } = useQuery({ queryKey: ['business', 'summary'], queryFn: businessApi.summary })

  return (
    <motion.div className="w-full p-3" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
      <AreaTabs
        defaultActiveKey="1"
        items={[
          {
            key: '1',
            label: 'Dashboard',
            children: (
              <div className="grid grid-cols-12 gap-4 w-full items-start">
                {/* Left Column: Metrics & Timeline */}
                <div className="col-span-12 xl:col-span-8 flex flex-col gap-4">
                  <FlatCard>
                    <div className="flex items-center gap-3 mb-3">
                      <div className="p-2 rounded-lg bg-blue-50 border border-blue-100">
                        <Rocket className="w-4 h-4 text-blue-500" />
                      </div>
                      <div>
                        <h2 className="text-xs font-medium text-gray-800 m-0">Ledgr</h2>
                        <p className="text-xs text-gray-500 m-0">SaaS accounting for Indian freelancers</p>
                      </div>
                      <Tag color="blue" className="ml-auto">Building</Tag>
                    </div>

                    <div className="grid grid-cols-12 gap-4">
                      <div className="col-span-12 md:col-span-4">
                        <Statistic title="MRR" value={summary?.mrr ?? 0} prefix="$" precision={2} loading={loadingSummary} />
                      </div>
                      <div className="col-span-12 md:col-span-4">
                        <div className="ant-statistic-title mb-1">Last Feature</div>
                        {loadingSummary ? <Skeleton.Input size="small" active /> : <div className="text-gray-800 font-medium truncate">{summary?.last_feature ?? '—'}</div>}
                      </div>
                      <div className="col-span-12 md:col-span-4">
                        <div className="ant-statistic-title mb-1">Shipped At</div>
                        {loadingSummary ? <Skeleton.Input size="small" active /> : <div className="text-gray-800 font-medium">{formatDate(summary?.last_feature_at)}</div>}
                      </div>
                    </div>
                  </FlatCard>

                  <FlatCard 
                    title={<Space className="text-sm font-medium text-muted-foreground"><History size={16} /><span>Event Timeline</span></Space>}
                    extra={
                      <Space>
                        <Button type="primary" icon={<Plus size={14} />} onClick={() => setShowEventForm(!showEventForm)}>Log</Button>
                        <button className="text-xs font-medium px-2.5 py-1 bg-muted/50 hover:bg-muted text-muted-foreground rounded-md transition-colors">Details</button>
                      </Space>
                    }
                  >
                    <AnimatePresence>{showEventForm && <EventForm onClose={() => setShowEventForm(false)} />}</AnimatePresence>
                    
                    {loadingEvents ? <Skeleton active /> : events?.length ? (
                      <Timeline className="mt-2 text-gray-300"
                        items={events.map((e: any, i: number) => ({
                          color: EVENT_TYPE_COLORS[e.event_type] || 'blue',
                          children: (
                            <AnimatedTimelineItem initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.05 }}>
                              <div className="flex justify-between items-start gap-2">
                                <div className="flex flex-col">
                                  <Space size="small">
                                    <Tag className="m-0 text-[10px] leading-tight px-1 py-0 border-transparent bg-muted/50" color={EVENT_TYPE_COLORS[e.event_type] || 'default'}>{e.event_type.replace('_', ' ')}</Tag>
                                    <span className="text-xs font-medium text-gray-800">{e.title}</span>
                                  </Space>
                                  {e.description && <div className="text-[10px] text-gray-400 mt-1 leading-snug">{e.description}</div>}
                                </div>
                                <div className="text-[10px] text-gray-400 whitespace-nowrap mt-0.5">{formatDate(e.occurred_at)}</div>
                              </div>
                            </AnimatedTimelineItem>
                          )
                        }))}
                      />
                    ) : <EmptyState icon={History} title="No events" description="Log your business milestones." />}
                  </FlatCard>
                </div>

                {/* Right Column: Runway */}
                <div className="col-span-12 xl:col-span-4">
                  <RunwayCalculator />
                </div>
              </div>
            ),
          },
          {
            key: '2',
            label: 'Events',
            children: <div></div>,
          },
          {
            key: '3',
            label: 'Summary',
            children: <div></div>,
          },
        ]}
      />
    </motion.div>
  )
}
