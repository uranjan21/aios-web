import React, { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { BookOpen, History, Plus, Briefcase, ExternalLink } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { toast } from 'sonner'
import styled from 'styled-components'
import { Button, Tag, Timeline, Select, Input, Form, Skeleton, Card, Space, Tabs } from 'antd'
import { AreaTabs } from '@/components/ui/AreaTabs'
import { RoadmapTab } from '@/components/areas/career/RoadmapTab'
import { OpportunitiesTab } from '@/components/areas/career/OpportunitiesTab'
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

const FlatCard = ({ className, ...props }: any) => (
  <Card
    className={`bg-card border border-border shadow-sm rounded-xl h-full overflow-hidden [&>.ant-card-head]:border-border [&>.ant-card-head]:min-h-[40px] [&>.ant-card-head]:px-4 [&>.ant-card-body]:p-4 ${className || ''}`}
    bordered={false}
    {...props}
  />
)

const AnimatedTimelineItem = styled(motion.div)`
  padding: 0.625rem 0.75rem;
  border-radius: 8px;
  background: hsl(var(--muted) / 0.5);
  border: 1px solid hsl(var(--border));
  margin-bottom: 0.5rem;
  transition: all 0.2s ease;
  &:hover {
    background: hsl(var(--muted) / 0.5);
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
      <Form form={form} layout="vertical" onFinish={mutate} className="p-3 bg-muted/40 rounded-xl mb-4 border border-border">
        <div className="grid grid-cols-12 gap-4">
          <div className="col-span-12 md:col-span-4">
            <Form.Item name="eventType" initialValue="milestone" rules={[{ required: true }]}>
              <Select>
                {Object.entries(EVENT_TYPE_LABELS).map(([v, l]) => <Select.Option key={v} value={v}>{l}</Select.Option>)}
              </Select>
            </Form.Item>
          </div>
          <div className="col-span-12 md:col-span-8">
            <Form.Item name="title" rules={[{ required: true, message: 'Title is required' }]}>
              <Input placeholder="What did you achieve?" />
            </Form.Item>
          </div>
        </div>
        <Form.Item name="description">
          <Input.TextArea placeholder="Details (optional)" autoSize={{ minRows: 2, maxRows: 4 }} />
        </Form.Item>
        <Space className="w-full justify-end">
          <Button type="text" onClick={onClose}>Cancel</Button>
          <Button type="primary" htmlType="submit" loading={isPending}>
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
      <Form form={form} layout="vertical" onFinish={mutate} className="p-3 bg-muted/40 rounded-xl mb-4 border border-border">
        <div className="grid grid-cols-12 gap-4">
          <div className="col-span-12 md:col-span-6">
            <Form.Item name="company" rules={[{ required: true }]}>
              <Input placeholder="Company" />
            </Form.Item>
          </div>
          <div className="col-span-12 md:col-span-6">
            <Form.Item name="role" rules={[{ required: true }]}>
              <Input placeholder="Role" />
            </Form.Item>
          </div>
        </div>
        <div className="grid grid-cols-12 gap-4">
          <div className="col-span-12 md:col-span-4">
            <Form.Item name="status" initialValue="prospect" rules={[{ required: true }]}>
              <Select>
                {Object.keys(OPP_STATUS_COLORS).map(s => <Select.Option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</Select.Option>)}
              </Select>
            </Form.Item>
          </div>
          <div className="col-span-12 md:col-span-8">
            <Form.Item name="url">
              <Input placeholder="Job posting URL (optional)" />
            </Form.Item>
          </div>
        </div>
        <Space className="w-full justify-end">
          <Button type="text" onClick={onClose}>Cancel</Button>
          <Button type="primary" htmlType="submit" loading={isPending}>
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
      className="flex items-center justify-between p-3 mb-2 rounded-lg bg-muted/40 border border-border hover:bg-muted/70 transition-all">
      <div>
        <div className="text-[13px] font-semibold text-foreground">{opp.company}</div>
        <div className="text-[11px] text-muted-foreground">{opp.role}</div>
      </div>
      <Space>
        {opp.url && <a href={opp.url} target="_blank" rel="noreferrer"><ExternalLink size={14} className="text-gray-500 hover:text-gray-800" /></a>}
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
    <div className="min-h-screen bg-[hsl(var(--page-bg))] p-4 md:p-6">
      <div className="mx-auto max-w-[1200px]">
      <AreaTabs
        defaultActiveKey="1"
        items={[
          {
            key: '1',
            label: 'Dashboard',
            children: (
              <div className="grid grid-cols-12 gap-4 w-full">
                {/* Left Column: Opportunities & Timeline */}
                <div className="col-span-12 xl:col-span-8 flex flex-col gap-4">
                  <FlatCard 
                    title={<Space className="text-xs font-medium text-muted-foreground"><Briefcase size={16} /><span>Opportunities Pipeline</span></Space>}
                    extra={
                      <Space>
                        <Button type="primary" icon={<Plus size={14} />} onClick={() => setShowOpportunityForm(!showOpportunityForm)}>Add</Button>
                        <button className="text-xs font-medium px-2.5 py-1 bg-muted/50 hover:bg-muted text-muted-foreground rounded-md transition-colors">Details</button>
                      </Space>
                    }
                  >
                    <AnimatePresence>{showOpportunityForm && <OpportunityForm onClose={() => setShowOpportunityForm(false)} />}</AnimatePresence>
                    {loadingOpps ? <Skeleton active /> : activeOpps.length ? activeOpps.map(opp => <OpportunityRow key={opp.id} opp={opp} />) : <EmptyState icon={Briefcase} title="No opportunities" description="Start tracking your next big move." />}
                  </FlatCard>

                  <FlatCard 
                    title={<Space className="text-xs font-medium text-muted-foreground"><History size={16} /><span>Career Timeline</span></Space>}
                    extra={
                      <Space>
                        <Button type="primary" icon={<Plus size={14} />} onClick={() => setShowMilestoneForm(!showMilestoneForm)}>Log</Button>
                        <button className="text-xs font-medium px-2.5 py-1 bg-muted/50 hover:bg-muted text-muted-foreground rounded-md transition-colors">Details</button>
                      </Space>
                    }
                  >
                    <AnimatePresence>{showMilestoneForm && <MilestoneForm onClose={() => setShowMilestoneForm(false)} />}</AnimatePresence>
                    {loadingEvents ? <Skeleton active /> : events?.length ? (
                      <Timeline className="mt-4"
                        items={events.slice(0, 20).map((e: CareerEvent, i: number) => ({
                          color: EVENT_TYPE_COLORS[e.event_type] || 'blue',
                          children: (
                            <AnimatedTimelineItem initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.05 }}>
                              <div className="flex justify-between items-start">
                                <div>
                                  <Space>
                                    <Tag color={EVENT_TYPE_COLORS[e.event_type] || 'default'}>{EVENT_TYPE_LABELS[e.event_type] || e.event_type}</Tag>
                                    <span className="text-[11px] font-semibold text-foreground">{e.title}</span>
                                  </Space>
                                  {e.description && <div className="text-[11px] text-muted-foreground mt-2">{e.description}</div>}
                                </div>
                                <div className="text-[11px] text-muted-foreground">{new Date(e.occurred_at).toLocaleDateString()}</div>
                              </div>
                            </AnimatedTimelineItem>
                          )
                        }))}
                      />
                    ) : <EmptyState icon={History} title="No history" description="Log your first milestone." />}
                  </FlatCard>
                </div>

                {/* Right Column: Skills Radar */}
                <div className="col-span-12 xl:col-span-4">
                  <FlatCard 
                    title={<Space className="text-sm font-medium text-muted-foreground"><BookOpen size={16} /><span>Skills Radar</span></Space>}
                    extra={<button className="text-xs font-medium px-2.5 py-1 bg-muted/50 hover:bg-muted text-muted-foreground rounded-md transition-colors">Details</button>}
                  >
                    {loadingSkills ? <Skeleton active /> : skills?.length ? <CareerRadar skills={skills} /> : <EmptyState icon={BookOpen} title="No skills" description="Add skills to see your radar." />}
                  </FlatCard>
                </div>
              </div>
            ),
          },
          {
            key: '2',
            label: 'Roadmap',
            children: <RoadmapTab />,
          },
          {
            key: '3',
            label: 'Opportunities',
            children: <OpportunitiesTab />,
          },
        ]}
      />
      </div>
    </div>
  )
}
