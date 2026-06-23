// @ts-nocheck
import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Dialog, Input, Select, Button, SegmentedControl, Textarea } from '@ledgr/ui'
import { toast } from 'sonner'
import { careerApi } from '@/api/areas'
import type { SkillInventory, OpportunityStatus } from '@/types'
import styled from 'styled-components'

const TwoColGrid = styled.div`
  display: grid;
  grid-template-columns: 1fr 2fr;
  gap: 16px;
  margin-top: 8px;
  margin-bottom: 16px;
  @media (max-width: 480px) {
    grid-template-columns: 1fr;
  }
`

const HalfGrid = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
  margin-bottom: 16px;
  @media (max-width: 480px) {
    grid-template-columns: 1fr;
  }
`

const FormFooter = styled.div`
  display: flex;
  gap: 8px;
  width: 100%;
  justify-content: flex-end;
`

const FormGroup = styled.div`
  margin-bottom: 16px;
`

const LEVEL_LABELS: Record<SkillInventory['level'], string> = {
  day_0: 'Day 0', beginner: 'Beginner', practitioner: 'Practitioner',
  competent: 'Competent', proficient: 'Proficient', expert: 'Expert',
}

const OPP_STATUS_COLORS: Record<OpportunityStatus, string> = {
  prospect: 'default', applied: 'processing', screening: 'warning',
  interview: 'purple', offer: 'success', rejected: 'error', closed: 'default',
}

const EVENT_TYPE_LABELS: Record<string, string> = {
  learning: 'Learning', milestone: 'Milestone', skill_update: 'Skill Update',
  project: 'Project', achievement: 'Achievement', feedback: 'Feedback',
}



function MilestoneForm({ onClose }: { onClose: () => void }) {
  const queryClient = useQueryClient()
  const [eventType, setEventType] = useState('milestone')
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')

  const { mutate, isPending } = useMutation({
    mutationFn: () => careerApi.createEvent({
      event_type: eventType,
      title: title.trim(),
      description: description?.trim() || undefined,
    }),
    onSuccess: () => {
      toast.success('Milestone logged')
      queryClient.invalidateQueries({ queryKey: ['career', 'events'] })
      queryClient.invalidateQueries({ queryKey: ['career', 'summary'] })
      setEventType('milestone')
      setTitle('')
      setDescription('')
      onClose()
    },
    onError: () => toast.error('Failed to log milestone'),
  })

  return (
    <form onSubmit={e => { e.preventDefault(); mutate() }}>
      <TwoColGrid>
        <Select
          value={eventType}
          onChange={(val) => setEventType(String(val))}
          options={Object.entries(EVENT_TYPE_LABELS).map(([v, l]) => ({ value: v, label: l }))}
          placeholder="Choose event type…"
          aria-label="Event type"
        />
        <Input placeholder="What did you achieve?" value={title} onChange={(e: any) => setTitle(e.target.value)} required aria-label="Milestone title" />
      </TwoColGrid>
      <FormGroup>
        <Textarea placeholder="Details (optional)" rows={3} value={description} onChange={(e: any) => setDescription(e.target.value)} aria-label="Milestone description" />
      </FormGroup>
      <FormFooter>
        <Button variant="outline" type="button" onClick={onClose}>Cancel</Button>
        <Button variant="primary" type="submit" loading={isPending}>Log Milestone</Button>
      </FormFooter>
    </form>
  )
}

function OpportunityForm({ onClose }: { onClose: () => void }) {
  const queryClient = useQueryClient()
  const [company, setCompany] = useState('')
  const [role, setRole] = useState('')
  const [status, setStatus] = useState('prospect')
  const [url, setUrl] = useState('')

  const { mutate, isPending } = useMutation({
    mutationFn: () => careerApi.createOpportunity({
      company: company.trim(), role: role.trim(), status,
      url: url?.trim() || undefined,
    }),
    onSuccess: () => {
      toast.success('Opportunity added')
      queryClient.invalidateQueries({ queryKey: ['career', 'opportunities'] })
      setCompany('')
      setRole('')
      setStatus('prospect')
      setUrl('')
      onClose()
    },
    onError: () => toast.error('Failed to add opportunity'),
  })

  return (
    <form onSubmit={e => { e.preventDefault(); mutate() }}>
      <HalfGrid>
        <Input placeholder="Company" value={company} onChange={(e: any) => setCompany(e.target.value)} required aria-label="Company name" />
        <Input placeholder="Role" value={role} onChange={(e: any) => setRole(e.target.value)} required aria-label="Role title" />
      </HalfGrid>
      <TwoColGrid>
        <Select
          value={status}
          onChange={(val) => setStatus(String(val))}
          options={Object.keys(OPP_STATUS_COLORS).map(s => ({ value: s, label: s.charAt(0).toUpperCase() + s.slice(1) }))}
          placeholder="Choose status…"
          aria-label="Opportunity status"
        />
        <Input placeholder="Job posting URL (optional)" value={url} onChange={(e: any) => setUrl(e.target.value)} aria-label="Job posting URL" />
      </TwoColGrid>
      <FormFooter>
        <Button variant="outline" type="button" onClick={onClose}>Cancel</Button>
        <Button variant="primary" type="submit" loading={isPending}>Add Opportunity</Button>
      </FormFooter>
    </form>
  )
}

function SkillForm({ onClose }: { onClose: () => void }) {
  const queryClient = useQueryClient()
  const [skillName, setSkillName] = useState('')
  const [category, setCategory] = useState('')
  const [level, setLevel] = useState('beginner')
  const [notes, setNotes] = useState('')

  const { mutate, isPending } = useMutation({
    mutationFn: () => careerApi.upsertSkill({
      skill_name: skillName.trim(),
      category: category.trim(),
      level,
      notes: notes?.trim() || undefined,
    }),
    onSuccess: () => {
      toast.success('Skill saved')
      queryClient.invalidateQueries({ queryKey: ['career', 'skills'] })
      queryClient.invalidateQueries({ queryKey: ['career', 'summary'] })
      setSkillName('')
      setCategory('')
      setLevel('beginner')
      setNotes('')
      onClose()
    },
    onError: () => toast.error('Failed to save skill'),
  })

  return (
    <form onSubmit={e => { e.preventDefault(); mutate() }}>
      <HalfGrid>
        <Input placeholder="Skill name" value={skillName} onChange={(e: any) => setSkillName(e.target.value)} required aria-label="Skill name" />
        <Input placeholder="Category (e.g. technical, soft skill)" value={category} onChange={(e: any) => setCategory(e.target.value)} required aria-label="Skill category" />
      </HalfGrid>
      <TwoColGrid>
        <Select
          value={level}
          onChange={(val) => setLevel(String(val))}
          options={(Object.keys(LEVEL_LABELS) as SkillInventory['level'][]).map(l => ({ value: l, label: LEVEL_LABELS[l] }))}
          placeholder="Choose proficiency level…"
          aria-label="Skill proficiency level"
        />
        <Input placeholder="Notes (optional)" value={notes} onChange={(e: any) => setNotes(e.target.value)} aria-label="Notes" />
      </TwoColGrid>
      <FormFooter>
        <Button variant="outline" type="button" onClick={onClose}>Cancel</Button>
        <Button variant="primary" type="submit" loading={isPending}>Save Skill</Button>
      </FormFooter>
    </form>
  )
}

export function CareerLogModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [activeTab, setActiveTab] = useState<'Milestone' | 'Opportunity' | 'Skill'>('Milestone')

  return (
    <Dialog
      title="Add Career Item"
      open={open}
      onOpenChange={(v: boolean) => {
        if (v) setActiveTab('Milestone')
        else onClose()
      }}
    >
      <FormGroup style={{ marginBottom: 12 }}>
        <SegmentedControl
          options={[
            { label: 'Milestone', value: 'Milestone' },
            { label: 'Opportunity', value: 'Opportunity' },
            { label: 'Skill', value: 'Skill' },
          ]}
          value={activeTab}
          onChange={v => setActiveTab(v as any)}
        />
      </FormGroup>
      {activeTab === 'Milestone' && <MilestoneForm onClose={onClose} />}
      {activeTab === 'Opportunity' && <OpportunityForm onClose={onClose} />}
      {activeTab === 'Skill' && <SkillForm onClose={onClose} />}
    </Dialog>
  )
}
