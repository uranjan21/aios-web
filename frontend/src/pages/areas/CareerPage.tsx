import React, { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { BookOpen, History, Plus, Briefcase, ExternalLink } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { toast } from 'sonner'
import styled from 'styled-components'
import { Button, Tag, Timeline, Select, Input, Form, Skeleton, Card, Row, Col, Space } from 'antd'
import { careerApi } from '@/api/areas'
import { ErrorCard } from '@/components/ErrorCard'
import { EmptyState } from '@/components/EmptyState'
import { CareerRadar } from '@/components/CareerRadar'
import type { SkillInventory, JobOpportunity, OpportunityStatus, CareerEvent } from '@/types'

const LEVEL_COLORS: Record<SkillInventory['level'], string> = {
  day_0: 'default',
  beginner: 'error',
  practitioner: 'warning',
  competent: 'success',
  proficient: 'processing',
  expert: 'purple',
}
const LEVEL_LABELS: Record<SkillInventory['level'], string> = {
  day_0: 'Day 0', beginner: 'Beginner', practitioner: 'Practitioner',
  competent: 'Competent', proficient: 'Proficient', expert: 'Expert',
}

const OPP_STATUS_COLORS: Record<OpportunityStatus, string> = {
  prospect: 'default',
  applied: 'processing',
  screening: 'warning',
  interview: 'purple',
  offer: 'success',
  rejected: 'error',
  closed: 'default',
}

const EVENT_TYPE_COLORS: Record<string, string> = {
  learning: 'cyan',
  milestone: 'purple',
  skill_update: 'blue',
  project: 'green',
  achievement: 'gold',
  feedback: 'orange',
}

const EVENT_TYPE_LABELS: Record<string, string> = {
  learning: 'Learning',
  milestone: 'Milestone',
  skill_update: 'Skill Update',
  project: 'Project',
  achievement: 'Achievement',
  feedback: 'Feedback',
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
  background: linear-gradient(90deg, #8b5cf6, #ec4899);
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

function MilestoneForm({ onClose }: { onClose: () => void }) {
  const queryClient = useQueryClient()
  const [form] = Form.useForm()

  const { mutate, isPending } = useMutation({
    mutationFn: (values: any) => careerApi.createEvent({ 
      event_type: values.eventType, 
      title: values.title.trim(), 
      description: values.description?.trim() || undefined 
    }),
    onSuccess: () => {
      toast.success('Milestone logged')
      queryClient.invalidateQueries({ queryKey: ['career', 'events'] })
      queryClient.invalidateQueries({ queryKey: ['career', 'summary'] })
      onClose()
      form.resetFields()
    },
    onError: () => toast.error('Failed to log milestone'),
  })

  return (
    <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}>
      <Form form={form} layout="vertical" onFinish={mutate} className="p-4 bg-black/20 rounded-xl mb-4 border border-white/5">
        <Row gutter={16}>
          <Col span={8}>
            <Form.Item name="eventType" initialValue="milestone" rules={[{ required: true }]}>
              <Select>
                {Object.entries(EVENT_TYPE_LABELS).map(([v, l]) => <Select.Option key={v} value={v}>{l}</Select.Option>)}
              </Select>
            </Form.Item>
          </Col>
          <Col span={16}>
            <Form.Item name="title" rules={[{ required: true, message: 'Title is required' }]}>
              <Input placeholder="What did you achieve?" />
            </Form.Item>
          </Col>
        </Row>
        <Form.Item name="description">
          <Input.TextArea placeholder="Details (optional)" autoSize={{ minRows: 2, maxRows: 4 }} />
        </Form.Item>
        <Space className="w-full justify-end">
          <Button type="text" onClick={onClose} style={{ color: '#a1a1aa' }}>Cancel</Button>
          <Button type="primary" htmlType="submit" loading={isPending} style={{ background: '#8b5cf6', borderColor: '#8b5cf6' }}>
            Log Milestone
          </Button>
        </Space>
      </Form>
    </motion.div>
  )
}

function OpportunityForm({ onClose }: { onClose: () => void }) {
  const queryClient = useQueryClient()
  const [form] = Form.useForm()

  const { mutate, isPending } = useMutation({
    mutationFn: (values: any) => careerApi.createOpportunity({
      company: values.company.trim(), role: values.role.trim(), status: values.status,
      url: values.url?.trim() || undefined,
    }),
    onSuccess: () => {
      toast.success('Opportunity added')
      queryClient.invalidateQueries({ queryKey: ['career', 'opportunities'] })
      onClose()
      form.resetFields()
    },
    onError: () => toast.error('Failed to add opportunity'),
  })

  return (
    <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}>
      <Form form={form} layout="vertical" onFinish={mutate} className="p-4 bg-black/20 rounded-xl mb-4 border border-white/5">
        <Row gutter={16}>
          <Col span={12}>
            <Form.Item name="company" rules={[{ required: true }]}>
              <Input placeholder="Company" />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item name="role" rules={[{ required: true }]}>
              <Input placeholder="Role" />
            </Form.Item>
          </Col>
        </Row>
        <Row gutter={16}>
          <Col span={8}>
            <Form.Item name="status" initialValue="prospect" rules={[{ required: true }]}>
              <Select>
                {Object.keys(OPP_STATUS_COLORS).map(s => <Select.Option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</Select.Option>)}
              </Select>
            </Form.Item>
          </Col>
          <Col span={16}>
            <Form.Item name="url">
              <Input placeholder="Job posting URL (optional)" />
            </Form.Item>
          </Col>
        </Row>
        <Space className="w-full justify-end">
          <Button type="text" onClick={onClose} style={{ color: '#a1a1aa' }}>Cancel</Button>
          <Button type="primary" htmlType="submit" loading={isPending} style={{ background: '#ec4899', borderColor: '#ec4899' }}>
            Add Opportunity
          </Button>
        </Space>
      </Form>
    </motion.div>
  )
}

function OpportunityRow({ opp }: { opp: JobOpportunity }) {
  const queryClient = useQueryClient()
  const { mutate: patch } = useMutation({
    mutationFn: (status: OpportunityStatus) => careerApi.patchOpportunity(opp.id, { status }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['career', 'opportunities'] }),
    onError: () => toast.error('Failed to update status'),
  })

  return (
    <motion.div layout initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} 
      className="flex items-center justify-between p-3 mb-2 rounded-lg bg-white/5 hover:bg-white/10 transition-all border border-white/5">
      <div>
        <div className="font-semibold text-gray-200">{opp.company}</div>
        <div className="text-xs text-gray-400">{opp.role}</div>
      </div>
      <Space>
        {opp.url && <a href={opp.url} target="_blank" rel="noreferrer"><ExternalLink size={14} className="text-gray-400 hover:text-white" /></a>}
        <Select value={opp.status} onChange={(val: OpportunityStatus) => patch(val)} bordered={false} className="min-w-[120px]">
          {Object.keys(OPP_STATUS_COLORS).map(s => (
            <Select.Option key={s} value={s}>
              <Tag color={OPP_STATUS_COLORS[s as OpportunityStatus]}>{s.charAt(0).toUpperCase() + s.slice(1)}</Tag>
            </Select.Option>
          ))}
        </Select>
      </Space>
    </motion.div>
  )
}

export function CareerPage() {
  const [showMilestoneForm, setShowMilestoneForm] = useState(false)
  const [showOpportunityForm, setShowOpportunityForm] = useState(false)

  const { data: skills, isLoading: loadingSkills } = useQuery({ queryKey: ['career', 'skills'], queryFn: careerApi.skills })
  const { data: events, isLoading: loadingEvents } = useQuery({ queryKey: ['career', 'events'], queryFn: careerApi.events })
  const { data: opportunities, isLoading: loadingOpps } = useQuery({ queryKey: ['career', 'opportunities'], queryFn: careerApi.opportunities })

  const activeOpps = opportunities?.filter(o => !['rejected', 'closed'].includes(o.status)) ?? []
  
  return (
    <PageContainer initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
      <HeaderTitle>Career Command Center</HeaderTitle>

      <Row gutter={[24, 24]}>
        {/* Left Column: Opportunities & Timeline */}
        <Col xs={24} lg={14}>
          <PremiumCard 
            title={<Space><Briefcase size={18} /><span>Opportunities Pipeline</span></Space>}
            extra={<Button type="primary" icon={<Plus size={14} />} onClick={() => setShowOpportunityForm(!showOpportunityForm)} style={{ background: 'rgba(255,255,255,0.1)', border: 'none' }}>Add</Button>}
          >
            <AnimatePresence>{showOpportunityForm && <OpportunityForm onClose={() => setShowOpportunityForm(false)} />}</AnimatePresence>
            {loadingOpps ? <Skeleton active /> : activeOpps.length ? activeOpps.map(opp => <OpportunityRow key={opp.id} opp={opp} />) : <EmptyState icon={Briefcase} title="No opportunities" description="Start tracking your next big move." />}
          </PremiumCard>

          <PremiumCard 
            title={<Space><History size={18} /><span>Career Timeline</span></Space>}
            extra={<Button type="primary" icon={<Plus size={14} />} onClick={() => setShowMilestoneForm(!showMilestoneForm)} style={{ background: 'rgba(255,255,255,0.1)', border: 'none' }}>Log</Button>}
          >
            <AnimatePresence>{showMilestoneForm && <MilestoneForm onClose={() => setShowMilestoneForm(false)} />}</AnimatePresence>
            {loadingEvents ? <Skeleton active /> : events?.length ? (
              <Timeline className="mt-4 text-gray-300"
                items={events.slice(0, 20).map((e: CareerEvent, i: number) => ({
                  color: EVENT_TYPE_COLORS[e.event_type] || 'blue',
                  children: (
                    <AnimatedTimelineItem initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.05 }}>
                      <div className="flex justify-between items-start">
                        <div>
                          <Space>
                            <Tag color={EVENT_TYPE_COLORS[e.event_type] || 'default'}>{EVENT_TYPE_LABELS[e.event_type] || e.event_type}</Tag>
                            <span className="font-semibold text-white">{e.title}</span>
                          </Space>
                          {e.description && <div className="text-xs text-gray-400 mt-2">{e.description}</div>}
                        </div>
                        <div className="text-xs text-gray-500">{new Date(e.occurred_at).toLocaleDateString()}</div>
                      </div>
                    </AnimatedTimelineItem>
                  )
                }))}
              />
            ) : <EmptyState icon={History} title="No history" description="Log your first milestone." />}
          </PremiumCard>
        </Col>

        {/* Right Column: Skills Radar */}
        <Col xs={24} lg={10}>
          <PremiumCard title={<Space><BookOpen size={18} /><span>Skills Radar</span></Space>}>
            {loadingSkills ? <Skeleton active /> : skills?.length ? <CareerRadar skills={skills} /> : <EmptyState icon={BookOpen} title="No skills" description="Add skills to see your radar." />}
          </PremiumCard>
        </Col>
      </Row>
    </PageContainer>
  )
}
