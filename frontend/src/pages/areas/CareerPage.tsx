import React, { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { BookOpen, History, Plus, Briefcase, ExternalLink } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { toast } from 'sonner'
import styled from 'styled-components'
import { Button, Tag, Timeline, Select, Input, Form, Skeleton, Space } from 'antd'
import { AreaTabs } from '@/components/ui/AreaTabs'
import { RoadmapTab } from '@/components/areas/career/RoadmapTab'
import { OpportunitiesTab } from '@/components/areas/career/OpportunitiesTab'
import { careerApi } from '@/api/areas'
import { ErrorCard } from '@/components/ErrorCard'
import { EmptyState } from '@/components/EmptyState'
import { CareerRadar } from '@/components/CareerRadar'
import { GlassCard } from '@/components/lumina'
import { WorkspaceLayout, RailHeading } from '@/components/layout/WorkspaceLayout'
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
      <Form form={form} layout="vertical" onFinish={mutate} className="p-4 bg-muted/50 rounded-2xl mb-4 border-0 shadow-premium-sm">
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
      <Form form={form} layout="vertical" onFinish={mutate} className="p-4 bg-muted/50 rounded-2xl mb-4 border-0 shadow-premium-sm">
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

function SkillForm({ onClose }: { onClose: () => void }) {
  const queryClient = useQueryClient()
  const [form] = Form.useForm()

  const { mutate, isPending } = useMutation({
    mutationFn: (values: any) => careerApi.upsertSkill({
      skill_name: values.skill_name.trim(),
      category: values.category.trim(),
      level: values.level,
      notes: values.notes?.trim() || undefined,
    }),
    onSuccess: () => {
      toast.success('Skill saved')
      queryClient.invalidateQueries({ queryKey: ['career', 'skills'] })
      queryClient.invalidateQueries({ queryKey: ['career', 'summary'] })
      onClose()
      form.resetFields()
    },
    onError: () => toast.error('Failed to save skill'),
  })

  return (
    <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}>
      <Form form={form} layout="vertical" onFinish={mutate} className="p-4 bg-muted/50 rounded-2xl mb-4 border-0 shadow-premium-sm">
        <div className="grid grid-cols-12 gap-4">
          <div className="col-span-12 md:col-span-6">
            <Form.Item name="skill_name" rules={[{ required: true, message: 'Skill name is required' }]}>
              <Input placeholder="Skill name" />
            </Form.Item>
          </div>
          <div className="col-span-12 md:col-span-6">
            <Form.Item name="category" rules={[{ required: true, message: 'Category is required' }]}>
              <Input placeholder="Category (e.g. technical, soft skill)" />
            </Form.Item>
          </div>
        </div>
        <div className="grid grid-cols-12 gap-4">
          <div className="col-span-12 md:col-span-4">
            <Form.Item name="level" initialValue="beginner" rules={[{ required: true }]}>
              <Select>
                {(Object.keys(LEVEL_LABELS) as SkillInventory['level'][]).map(l => (
                  <Select.Option key={l} value={l}>{LEVEL_LABELS[l]}</Select.Option>
                ))}
              </Select>
            </Form.Item>
          </div>
          <div className="col-span-12 md:col-span-8">
            <Form.Item name="notes">
              <Input placeholder="Notes (optional)" />
            </Form.Item>
          </div>
        </div>
        <Space className="w-full justify-end">
          <Button type="text" onClick={onClose}>Cancel</Button>
          <Button type="primary" htmlType="submit" loading={isPending}>
            Save Skill
          </Button>
        </Space>
      </Form>
    </motion.div>
  )
}

function SkillRow({ skill }: { skill: SkillInventory }) {
  const queryClient = useQueryClient()
  const { mutate: patch } = useMutation({
    mutationFn: (level: SkillInventory['level']) => careerApi.updateSkill(skill.id, { level }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['career', 'skills'] })
      queryClient.invalidateQueries({ queryKey: ['career', 'summary'] })
    },
    onError: () => toast.error('Failed to update skill'),
  })

  return (
    <div className="flex items-center justify-between p-2.5 rounded-xl bg-muted/30 border-0">
      <div>
        <div className="text-[12px] font-semibold text-foreground">{skill.skill_name}</div>
        <div className="text-[11px] text-muted-foreground">{skill.category}</div>
      </div>
      <Select value={skill.level} onChange={(level) => patch(level)} bordered={false} size="small" className="min-w-[110px]">
        {(Object.keys(LEVEL_LABELS) as SkillInventory['level'][]).map(l => (
          <Select.Option key={l} value={l}>
            <Tag color={LEVEL_COLORS[l]}>{LEVEL_LABELS[l]}</Tag>
          </Select.Option>
        ))}
      </Select>
    </div>
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
      className="flex items-center justify-between p-3 mb-2 rounded-xl bg-muted/30 border-0 hover:bg-muted/50 transition-all">
      <div>
        <div className="text-[13px] font-semibold text-foreground">{opp.company}</div>
        <div className="text-[11px] text-muted-foreground">{opp.role}</div>
      </div>
      <Space>
        {opp.url && <a href={opp.url} target="_blank" rel="noreferrer"><ExternalLink size={14} className="text-muted-foreground hover:text-foreground" /></a>}
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

function CareerStat({ label, value, sub, accent }: { label: string; value: string; sub?: string; accent?: string }) {
  return (
    <div className="bg-card border-0 rounded-2xl shadow-premium-sm p-4 flex flex-col gap-1">
      <span className="text-[10.5px] font-medium text-muted-foreground uppercase tracking-widest">{label}</span>
      <span className={`stat-hero text-[26px] leading-[30px] ${accent ?? 'text-foreground'}`}>{value}</span>
      {sub && <span className="text-[11px] text-muted-foreground">{sub}</span>}
    </div>
  )
}

export function CareerPage() {
  const [showMilestoneForm, setShowMilestoneForm] = useState(false)
  const [showOpportunityForm, setShowOpportunityForm] = useState(false)
  const [showSkillForm, setShowSkillForm] = useState(false)

  const { data: skills, isLoading: loadingSkills } = useQuery({ queryKey: ['career', 'skills'], queryFn: careerApi.skills })
  const { data: events, isLoading: loadingEvents } = useQuery({ queryKey: ['career', 'events'], queryFn: careerApi.events })
  const { data: opportunities, isLoading: loadingOpps } = useQuery({ queryKey: ['career', 'opportunities'], queryFn: careerApi.opportunities })

  const activeOpps = opportunities?.filter(o => !['rejected', 'closed'].includes(o.status)) ?? []
  const inPlay = opportunities?.filter(o => ['interview', 'offer'].includes(o.status)).length ?? 0

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
              <WorkspaceLayout rail={
                <>
                  <RailHeading>Quick Add</RailHeading>
                  <GlassCard title="Add to Career">
                    <div className="flex flex-col gap-2">
                      {([
                        { label: 'Add Opportunity', icon: Briefcase, active: showOpportunityForm, on: () => { setShowOpportunityForm(v => !v); setShowMilestoneForm(false); setShowSkillForm(false) } },
                        { label: 'Log Milestone', icon: History, active: showMilestoneForm, on: () => { setShowMilestoneForm(v => !v); setShowOpportunityForm(false); setShowSkillForm(false) } },
                        { label: 'Add Skill', icon: BookOpen, active: showSkillForm, on: () => { setShowSkillForm(v => !v); setShowOpportunityForm(false); setShowMilestoneForm(false) } },
                      ] as const).map(a => (
                        <button
                          key={a.label}
                          onClick={a.on}
                          className={`flex items-center gap-3 w-full px-3.5 py-2.5 rounded-xl border text-left text-[13px] font-medium transition-all ${a.active ? 'border-primary/40 bg-primary/10 text-primary' : 'border-border/60 bg-muted/40 text-foreground hover:bg-muted/70 hover:border-primary/40'}`}
                        >
                          <a.icon size={16} className="shrink-0" />
                          <span className="flex-1">{a.label}</span>
                          <Plus size={14} className="text-muted-foreground" />
                        </button>
                      ))}
                    </div>
                  </GlassCard>
                  <AnimatePresence>
                    {showOpportunityForm && <OpportunityForm onClose={() => setShowOpportunityForm(false)} />}
                    {showMilestoneForm && <MilestoneForm onClose={() => setShowMilestoneForm(false)} />}
                    {showSkillForm && <SkillForm onClose={() => setShowSkillForm(false)} />}
                  </AnimatePresence>
                </>
              }>
                {/* KPI lead row */}
                <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
                  <CareerStat label="Skills Tracked" value={String(skills?.length ?? 0)} sub="across categories" />
                  <CareerStat label="Active Pipeline" value={String(activeOpps.length)} sub="open opportunities" accent="text-primary" />
                  <CareerStat label="In Play" value={String(inPlay)} sub="interview or offer" accent={inPlay > 0 ? 'text-kpi-emerald' : 'text-foreground'} />
                  <CareerStat label="Milestones" value={String(events?.length ?? 0)} sub="logged on timeline" />
                </div>

                <GlassCard title="Opportunities Pipeline" icon={<Briefcase size={16} className="text-muted-foreground" />} hoverable fadeIn="up">
                  {loadingOpps ? <Skeleton active /> : activeOpps.length ? activeOpps.map(opp => <OpportunityRow key={opp.id} opp={opp} />) : <EmptyState icon={Briefcase} title="No opportunities" description="Add one from the rail →" />}
                </GlassCard>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  <GlassCard title="Career Timeline" icon={<History size={16} className="text-muted-foreground" />} hoverable fadeIn="up" delay={100}>
                    {loadingEvents ? <Skeleton active /> : events?.length ? (
                      <Timeline className="mt-4"
                        items={events.slice(0, 20).map((e: CareerEvent, i: number) => ({
                          color: EVENT_TYPE_COLORS[e.event_type] || 'blue',
                          content: (
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
                  </GlassCard>

                  <GlassCard title="Skills Radar" icon={<BookOpen size={16} className="text-muted-foreground" />} hoverable fadeIn="up" delay={200}>
                    {loadingSkills ? <Skeleton active /> : skills?.length ? (
                      <>
                        <CareerRadar skills={skills} />
                        <div className="mt-4 space-y-2">
                          {skills.map(skill => <SkillRow key={skill.id} skill={skill} />)}
                        </div>
                      </>
                    ) : <EmptyState icon={BookOpen} title="No skills" description="Add a skill to see your radar." />}
                  </GlassCard>
                </div>
              </WorkspaceLayout>
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
