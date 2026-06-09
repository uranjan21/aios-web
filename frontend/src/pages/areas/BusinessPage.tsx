import React, { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Rocket, History, Plus, DollarSign, Activity, TrendingUp } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { toast } from 'sonner'
import styled from 'styled-components'
import { Card, Button, Timeline, Tag, Select, Input, Form, Skeleton, Row, Col, Space, Statistic, Slider } from 'antd'
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

const PageContainer = styled(motion.div)`
  padding: 1.5rem;
  max-width: 1200px;
  margin: 0 auto;
  color: var(--foreground);
`

const HeaderTitle = styled.h1`
  font-size: 2rem;
  font-weight: 700;
  background: linear-gradient(90deg, #10b981, #3b82f6);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  margin-bottom: 2rem;
`

const PremiumCard = styled(Card)`
  border-radius: 24px;
  background: rgba(24, 24, 27, 0.6);
  backdrop-filter: blur(20px);
  border: 1px solid rgba(255, 255, 255, 0.08);
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.2);
  margin-bottom: 2rem;
  overflow: hidden;

  .ant-card-head {
    border-bottom: 1px solid rgba(255, 255, 255, 0.08);
    color: #f4f4f5;
  }
  .ant-card-body {
    color: #a1a1aa;
  }
  .ant-statistic-title {
    color: #a1a1aa;
  }
  .ant-statistic-content {
    color: #f4f4f5;
  }
`

const AnimatedTimelineItem = styled(motion.div)`
  padding: 1rem;
  border-radius: 12px;
  background: rgba(255,255,255,0.03);
  margin-bottom: 1rem;
  border: 1px solid rgba(255,255,255,0.05);
  transition: all 0.3s ease;
  &:hover {
    background: rgba(255,255,255,0.06);
    transform: translateY(-2px);
  }
`

function RunwayCalculator() {
  const [cash, setCash] = useState(50000)
  const [burnRate, setBurnRate] = useState(5000)

  const runwayMonths = burnRate > 0 ? (cash / burnRate).toFixed(1) : '∞'
  const isHealthy = burnRate === 0 || cash / burnRate > 6

  return (
    <PremiumCard title={<Space><TrendingUp size={18} /><span>Runway Calculator</span></Space>}>
      <Row gutter={[16, 16]}>
        <Col span={12}>
          <Statistic title="Current Cash" value={cash} prefix={<DollarSign size={16} />} precision={0} />
          <Slider min={0} max={200000} step={1000} value={cash} onChange={setCash} tooltip={{ formatter: v => `$${v}` }} />
        </Col>
        <Col span={12}>
          <Statistic title="Monthly Burn" value={burnRate} prefix={<Activity size={16} />} precision={0} />
          <Slider min={0} max={20000} step={500} value={burnRate} onChange={setBurnRate} tooltip={{ formatter: v => `$${v}` }} />
        </Col>
      </Row>
      <div className={`mt-6 p-4 rounded-xl border flex items-center justify-between ${isHealthy ? 'bg-green-500/10 border-green-500/20' : 'bg-red-500/10 border-red-500/20'}`}>
        <div>
          <div className="text-xs text-gray-400 mb-1">Estimated Runway</div>
          <div className={`text-3xl font-bold ${isHealthy ? 'text-green-400' : 'text-red-400'}`}>{runwayMonths} <span className="text-lg font-normal opacity-70">months</span></div>
        </div>
        <div className="text-right max-w-[120px]">
          <span className="text-xs text-gray-400 leading-tight block">
            {isHealthy ? 'Looking solid! Keep focusing on growth.' : 'Warning: Runway is critically low.'}
          </span>
        </div>
      </div>
    </PremiumCard>
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
      <Form form={form} layout="vertical" onFinish={mutate} className="p-4 bg-black/20 rounded-xl mb-4 border border-white/5">
        <Row gutter={16}>
          <Col span={8}>
            <Form.Item name="eventType" initialValue="feature_shipped" rules={[{ required: true }]}>
              <Select>
                {Object.keys(EVENT_TYPE_COLORS).map(t => (
                  <Select.Option key={t} value={t}>{t.replace('_', ' ')}</Select.Option>
                ))}
              </Select>
            </Form.Item>
          </Col>
          <Col span={16}>
            <Form.Item name="title" rules={[{ required: true, message: 'Title is required' }]}>
              <Input placeholder="Event Title" />
            </Form.Item>
          </Col>
        </Row>
        <Form.Item name="description">
          <Input.TextArea placeholder="Description (optional)" autoSize={{ minRows: 2, maxRows: 4 }} />
        </Form.Item>
        <Space className="w-full justify-end">
          <Button type="text" onClick={onClose} style={{ color: '#a1a1aa' }}>Cancel</Button>
          <Button type="primary" htmlType="submit" loading={isPending} style={{ background: '#10b981', borderColor: '#10b981' }}>
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
    <PageContainer initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
      <HeaderTitle>Business HQ</HeaderTitle>

      <Row gutter={[24, 24]}>
        {/* Left Column: Metrics & Timeline */}
        <Col xs={24} lg={14}>
          <PremiumCard>
            <div className="flex items-center gap-3 mb-6">
              <div className="p-3 rounded-xl bg-gradient-to-br from-blue-500/20 to-purple-500/20 border border-white/10">
                <Rocket className="w-6 h-6 text-blue-400" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-white m-0">Ledgr</h2>
                <p className="text-sm text-gray-400 m-0">SaaS accounting for Indian freelancers</p>
              </div>
              <Tag color="blue" className="ml-auto">Building</Tag>
            </div>

            <Row gutter={[16, 16]}>
              <Col span={8}>
                <Statistic title="MRR" value={summary?.mrr ?? 0} prefix="$" precision={2} loading={loadingSummary} />
              </Col>
              <Col span={8}>
                <div className="ant-statistic-title mb-1">Last Feature</div>
                {loadingSummary ? <Skeleton.Input size="small" active /> : <div className="text-white font-medium truncate">{summary?.last_feature ?? '—'}</div>}
              </Col>
              <Col span={8}>
                <div className="ant-statistic-title mb-1">Shipped At</div>
                {loadingSummary ? <Skeleton.Input size="small" active /> : <div className="text-white font-medium">{formatDate(summary?.last_feature_at)}</div>}
              </Col>
            </Row>
          </PremiumCard>

          <PremiumCard 
            title={<Space><History size={18} /><span>Event Timeline</span></Space>}
            extra={<Button type="primary" icon={<Plus size={14} />} onClick={() => setShowEventForm(!showEventForm)} style={{ background: 'rgba(255,255,255,0.1)', border: 'none' }}>Log</Button>}
          >
            <AnimatePresence>{showEventForm && <EventForm onClose={() => setShowEventForm(false)} />}</AnimatePresence>
            
            {loadingEvents ? <Skeleton active /> : events?.length ? (
              <Timeline className="mt-4 text-gray-300"
                items={events.map((e: any, i: number) => ({
                  color: EVENT_TYPE_COLORS[e.event_type] || 'blue',
                  children: (
                    <AnimatedTimelineItem initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.05 }}>
                      <div className="flex justify-between items-start">
                        <div>
                          <Space>
                            <Tag color={EVENT_TYPE_COLORS[e.event_type] || 'default'}>{e.event_type.replace('_', ' ')}</Tag>
                            <span className="font-semibold text-white">{e.title}</span>
                          </Space>
                          {e.description && <div className="text-xs text-gray-400 mt-2">{e.description}</div>}
                        </div>
                        <div className="text-xs text-gray-500">{formatDate(e.occurred_at)}</div>
                      </div>
                    </AnimatedTimelineItem>
                  )
                }))}
              />
            ) : <EmptyState icon={History} title="No events" description="Log your business milestones." />}
          </PremiumCard>
        </Col>

        {/* Right Column: Runway */}
        <Col xs={24} lg={10}>
          <RunwayCalculator />
        </Col>
      </Row>
    </PageContainer>
  )
}
