// @ts-nocheck
import React, { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { BookOpen, History, Plus, Briefcase, ExternalLink, LayoutDashboard, Map, Target, Bot, Search, Bell, PlusCircle, Activity } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useUIStore } from '@/stores/uiStore'
import { motion, AnimatePresence } from 'framer-motion'
import { toast } from 'sonner'
import styled from 'styled-components'
import { PageContainer, PageContent } from '@/components/layout/PageLayout'
import { Timeline } from 'antd'
import { Button, Badge, Select, SelectItem } from '@ledgr/ui'
import { Skeleton } from '@/components/ui/skeleton'
import { AreaTabs } from '@/components/ui/AreaTabs'
import { RoadmapTab } from '@/components/areas/career/RoadmapTab'
import { OpportunitiesTab } from '@/components/areas/career/OpportunitiesTab'
import { CareerLogModal } from '@/components/areas/career/CareerLogModal'
import { careerApi } from '@/api/areas'
import { ErrorCard } from '@/components/ErrorCard'
import { EmptyState } from '@/components/EmptyState'
import { PageHeader } from '@ledgr/ui'
import { CareerRadar } from '@/components/CareerRadar'
import { Card as GlassCard } from '@ledgr/ui';
import { Card as AppCard } from '@ledgr/ui'
import type { SkillInventory, JobOpportunity, OpportunityStatus, CareerEvent } from '@/types'

const LEVEL_COLORS: Record<SkillInventory['level'], any> = {
  day_0: 'neutral', beginner: 'destructive', practitioner: 'warning',
  competent: 'success', proficient: 'primary', expert: 'primary',
}
const LEVEL_LABELS: Record<SkillInventory['level'], string> = {
  day_0: 'Day 0', beginner: 'Beginner', practitioner: 'Practitioner',
  competent: 'Competent', proficient: 'Proficient', expert: 'Expert',
}
const OPP_STATUS_COLORS: Record<OpportunityStatus, any> = {
  prospect: 'neutral', applied: 'primary', screening: 'warning',
  interview: 'primary', offer: 'success', rejected: 'destructive', closed: 'neutral',
}
const EVENT_BADGE_TONES: Record<string, any> = {
  learning: 'primary', milestone: 'success', skill_update: 'primary',
  project: 'success', achievement: 'warning', feedback: 'warning',
}
const EVENT_TYPE_LABELS: Record<string, string> = {
  learning: 'Learning', milestone: 'Milestone', skill_update: 'Skill Update',
  project: 'Project', achievement: 'Achievement', feedback: 'Feedback',
}

// ── Layout ─────────────────────────────────────────────────────────────────────

const StyledSkeleton = styled(Skeleton)<{ $height: string }>`
  height: ${({ $height }) => $height};
  width: 100%;
`

const DashCol = styled.div`
  display: flex;
  flex-direction: column;
  gap: 16px;
`

const KpiGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 16px;
  @media (min-width: 1280px) { grid-template-columns: repeat(4, minmax(0, 1fr)); }
`

const TwoColGrid = styled.div`
  display: grid;
  grid-template-columns: 1fr;
  gap: 16px;
  @media (min-width: 1024px) { grid-template-columns: repeat(2, minmax(0, 1fr)); }
`

// ── Sub-components ─────────────────────────────────────────────────────────────

const AnimatedTimelineItem = styled(motion.div)`
  padding: 10px 12px;
  border-radius: 8px;
  background: ${({ theme }) => `${theme.color.muted}80`};
  border: 1px solid ${({ theme }) => theme.color.border};
  margin-bottom: 8px;
`

const SkillRowRoot = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px;
  border-radius: 12px;
  background: ${({ theme }) => `${theme.color.muted}4d`};
`

const SkillInfo = styled.div`
  display: flex;
  flex-direction: column;
  gap: 2px;
`

const SkillName = styled.div`
  font-size: 12px;
  font-weight: 600;
  color: ${({ theme }) => theme.color.foreground};
`

const SkillCat = styled.div`
  font-size: 11px;
  color: ${({ theme }) => theme.color.mutedForeground};
`

const OppRowRoot = styled(motion.div)`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px;
  margin-bottom: 8px;
  border-radius: 12px;
  background: ${({ theme }) => `${theme.color.muted}4d`};
  transition: background 150ms;
  &:hover { background: ${({ theme }) => `${theme.color.muted}80`}; }
`

const OppInfo = styled.div`
  display: flex;
  flex-direction: column;
  gap: 2px;
`

const OppCompany = styled.div`
  font-size: 13px;
  font-weight: 600;
  color: ${({ theme }) => theme.color.foreground};
`

const OppRole = styled.div`
  font-size: 11px;
  color: ${({ theme }) => theme.color.mutedForeground};
`

const OppActions = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
`

const StatLabel = styled.span`
  font-size: 10.5px;
  font-weight: 500;
  color: ${({ theme }) => theme.color.mutedForeground};
  text-transform: uppercase;
  letter-spacing: 0.08em;
`

const StatValue = styled.span<{ $accent?: string }>`
  font-size: 26px;
  line-height: 30px;
  font-family: ${({ theme }) => theme.typography.fontFamily.serif};
  font-weight: 700;
  color: ${({ theme, $accent }) => {
    if ($accent === 'text-primary') return theme.color.primary
    if ($accent === 'text-kpi-emerald') return '#16a34a'
    return theme.color.foreground
  }};
`

const StatSub = styled.span`
  font-size: 11px;
  color: ${({ theme }) => theme.color.mutedForeground};
`

const TimelineMeta = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
`

const TimelineTitle = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
`

const TimelineBody = styled.div`
  font-size: 11px;
  font-weight: 600;
  color: ${({ theme }) => theme.color.foreground};
`

const TimelineDesc = styled.div`
  font-size: 11px;
  color: ${({ theme }) => theme.color.mutedForeground};
  margin-top: 8px;
`

const TimelineDate = styled.div`
  font-size: 11px;
  color: ${({ theme }) => theme.color.mutedForeground};
`

const SkillListWrap = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-top: 16px;
`

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
    <SkillRowRoot>
      <SkillInfo>
        <SkillName>{skill.skill_name}</SkillName>
        <SkillCat>{skill.category}</SkillCat>
      </SkillInfo>
      <Select value={skill.level} onValueChange={(level: any) => patch(level)} size="sm" style={{ minWidth: 110 }} aria-label="Skill level">
        {(Object.keys(LEVEL_LABELS) as SkillInventory['level'][]).map(l => (
          <SelectItem key={l} value={l}>
            <Badge tone={LEVEL_COLORS[l]}>{LEVEL_LABELS[l]}</Badge>
          </SelectItem>
        ))}
      </Select>
    </SkillRowRoot>
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
    <OppRowRoot layout initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
      <OppInfo>
        <OppCompany>{opp.company}</OppCompany>
        <OppRole>{opp.role}</OppRole>
      </OppInfo>
      <OppActions>
        {opp.url && (
          <a href={opp.url} target="_blank" rel="noreferrer" style={{ color: 'var(--muted-foreground)' }}>
            <ExternalLink size={14} />
          </a>
        )}
        <Select value={opp.status} onValueChange={(val: any) => patch(val)} style={{ minWidth: 120 }} aria-label="Opportunity status">
          {Object.keys(OPP_STATUS_COLORS).map(s => (
            <SelectItem key={s} value={s}>
              <Badge tone={OPP_STATUS_COLORS[s as OpportunityStatus]}>{s.charAt(0).toUpperCase() + s.slice(1)}</Badge>
            </SelectItem>
          ))}
        </Select>
      </OppActions>
    </OppRowRoot>
  )
}

function CareerStat({ title, value, subtitle, accent, icon }: { title: string; value: string; subtitle?: string; accent?: string; icon: React.ReactNode }) {
  return (
    <AppCard
      title={title}
      subtitle={subtitle}
      icon={icon}
      size="sm"
      style={{ display: 'flex', flexDirection: 'column', gap: 4, height: '100%' }}
    >
      <StatValue $accent={accent} style={{ marginTop: 'auto' }}>{value}</StatValue>
    </AppCard>
  )
}

export function CareerPage() {
  const [isLogModalOpen, setIsLogModalOpen] = useState(false)
  const [oppStatusFilter, setOppStatusFilter] = useState('all')
  const [timelineFilter, setTimelineFilter] = useState('all')
  const [radarFilter, setRadarFilter] = useState('all')
  const navigate = useNavigate()
  const { setCmdPaletteOpen, setCaptureModalOpen } = useUIStore()

  const { data: skills, isLoading: loadingSkills } = useQuery({ queryKey: ['career', 'skills'], queryFn: careerApi.skills })
  const { data: events, isLoading: loadingEvents } = useQuery({ queryKey: ['career', 'events'], queryFn: careerApi.events })
  const { data: opportunities, isLoading: loadingOpps } = useQuery({ queryKey: ['career', 'opportunities'], queryFn: careerApi.opportunities })

  const activeOpps = opportunities?.filter(o => !['rejected', 'closed'].includes(o.status)) ?? []
  const filteredActiveOpps = activeOpps.filter(o => oppStatusFilter === 'all' || o.status === oppStatusFilter)
  const filteredEvents = events?.filter(e => timelineFilter === 'all' || e.event_type === timelineFilter)
  const filteredSkills = skills?.filter(s => {
    if (radarFilter === 'all') return true
    if (radarFilter === 'technical') return s.category?.toLowerCase() === 'technical' || s.category?.toLowerCase() === 'hard'
    if (radarFilter === 'soft') return s.category?.toLowerCase() === 'soft' || s.category?.toLowerCase() === 'interpersonal'
    return true
  })
  const inPlay = opportunities?.filter(o => ['interview', 'offer'].includes(o.status)).length ?? 0

  return (
    <PageContainer>
      <PageContent>
        <PageHeader
          icon={<Briefcase />}
          eyebrow="Growth"
          title="Career"
          subtitle="Skills, roadmap and opportunities — manage your career in one place."
        />
        <AreaTabs
          defaultActiveKey="1"
          items={[
            {
              key: '1',
              label: <><LayoutDashboard size={14} /> Dashboard</>,
              children: (
                <DashCol>
                  <KpiGrid>
                    <CareerStat title="Skills Tracked" value={String(skills?.length ?? 0)} subtitle="total skills tracked" icon={<BookOpen size={16} />} />
                    <CareerStat title="Active Pipeline" value={String(activeOpps.length)} subtitle="open opportunities" accent="text-primary" icon={<Briefcase size={16} />} />
                    <CareerStat title="In Play" value={String(inPlay)} subtitle="interview or offer stages" accent={inPlay > 0 ? 'text-kpi-emerald' : undefined} icon={<Activity size={16} />} />
                    <CareerStat title="Milestones" value={String(events?.length ?? 0)} subtitle="timeline logs" icon={<History size={16} />} />
                  </KpiGrid>

                  <GlassCard
                    title="Opportunities Pipeline"
                    subtitle="Active job postings and project pipelines"
                    icon={<Briefcase size={16} />}
                    action={
                      <Select
                        size="sm"
                        fullWidth={false}
                        options={[
                          { label: 'All Active', value: 'all' },
                          { label: 'Applied', value: 'applied' },
                          { label: 'Interview', value: 'interview' },
                          { label: 'Offer', value: 'offer' },
                        ]}
                        value={oppStatusFilter}
                        onChange={(val) => setOppStatusFilter(val as string)}
                        aria-label="Filter opportunities by status"
                      />
                    }
                    hoverable
                    fadeIn="up"
                  >
                    {loadingOpps ? <StyledSkeleton $height="40px" /> :
                      filteredActiveOpps.length ? filteredActiveOpps.map(opp => <OpportunityRow key={opp.id} opp={opp} />) :
                      <EmptyState
                        icon={Briefcase}
                        title="No opportunities"
                        description="Use the Add button above to add one."
                        action={{ label: "Add Entry", onClick: () => setIsLogModalOpen(true) }}
                      />}
                  </GlassCard>

                  <TwoColGrid>
                    <GlassCard
                      title="Career Timeline"
                      subtitle="Milestones and professional history timeline"
                      icon={<History size={16} />}
                      action={
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <Select
                            size="sm"
                            fullWidth={false}
                            options={[
                              { label: 'All Milestones', value: 'all' },
                              { label: 'Certification', value: 'certification' },
                              { label: 'Project', value: 'project' },
                              { label: 'Promotion', value: 'promotion' },
                              { label: 'Note', value: 'note' },
                            ]}
                            value={timelineFilter}
                            onChange={(val) => setTimelineFilter(val as string)}
                            aria-label="Filter timeline events by type"
                          />
                          <Button size="sm" onClick={() => setIsLogModalOpen(true)}>
                            <Plus size={12} style={{ marginRight: 4 }} /> Log Milestone
                          </Button>
                        </div>
                      }
                      hoverable
                      fadeIn="up"
                      delay={100}
                    >
                      {loadingEvents ? <StyledSkeleton $height="200px" /> : filteredEvents?.length ? (
                        <Timeline
                          style={{ marginTop: 16 }}
                          items={filteredEvents.slice(0, 20).map((e: CareerEvent, i: number) => ({
                            children: (
                              <AnimatedTimelineItem
                                initial={{ opacity: 0, x: -20 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: i * 0.05 }}
                              >
                                <TimelineMeta>
                                  <TimelineTitle>
                                    <Badge tone={EVENT_BADGE_TONES[e.event_type] || 'neutral'}>
                                      {EVENT_TYPE_LABELS[e.event_type] || e.event_type}
                                    </Badge>
                                    <TimelineBody>{e.title}</TimelineBody>
                                  </TimelineTitle>
                                  <TimelineDate>{new Date(e.occurred_at).toLocaleDateString()}</TimelineDate>
                                </TimelineMeta>
                                {e.description && <TimelineDesc>{e.description}</TimelineDesc>}
                              </AnimatedTimelineItem>
                            ),
                          }))}
                        />
                      ) : (
                        <EmptyState
                          icon={History}
                          title="No history"
                          description="Log your first milestone."
                          action={{ label: "Add Entry", onClick: () => setIsLogModalOpen(true) }}
                        />
                      )}
                    </GlassCard>

                    <GlassCard
                      title="Skills Radar"
                      subtitle="Visual mapping of core competencies"
                      icon={<BookOpen size={16} />}
                      action={
                        <Select
                          size="sm"
                          fullWidth={false}
                          options={[
                            { label: 'All Skills', value: 'all' },
                            { label: 'Technical', value: 'technical' },
                            { label: 'Soft Skills', value: 'soft' },
                          ]}
                          value={radarFilter}
                          onChange={(val) => setRadarFilter(val as string)}
                          aria-label="Filter skills radar by category"
                        />
                      }
                      hoverable
                      fadeIn="up"
                      delay={200}
                    >
                      {loadingSkills ? <StyledSkeleton $height="200px" /> : filteredSkills?.length ? (
                        <>
                          <CareerRadar skills={filteredSkills} />
                          <SkillListWrap>
                            {filteredSkills.map(skill => <SkillRow key={skill.id} skill={skill} />)}
                          </SkillListWrap>
                        </>
                      ) : (
                        <EmptyState
                          icon={BookOpen}
                          title="No skills"
                          description="Add a skill to see your radar."
                          action={{ label: "Add Entry", onClick: () => setIsLogModalOpen(true) }}
                        />
                      )}
                    </GlassCard>
                  </TwoColGrid>
                </DashCol>
              ),
            },
            {
              key: '2',
              label: <><Map size={14} /> Roadmap</>,
              children: <RoadmapTab onAddEvent={() => setIsLogModalOpen(true)} />,
            },
            {
              key: '3',
              label: <><Target size={14} /> Opportunities</>,
              children: <OpportunitiesTab />,
            },
          ]}
        />
        <CareerLogModal open={isLogModalOpen} onClose={() => setIsLogModalOpen(false)} />
      </PageContent>
    </PageContainer>
  )
}
