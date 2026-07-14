
import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Dialog, Input, Select, Button, SegmentedControl, Textarea } from '@ledgr/ui'
import { toast } from 'sonner'
import { careerApi } from '@/api/areas'
import { OpportunityForm } from './OpportunityForm'
import { SkillForm } from './SkillForm'
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

const FormFooter = styled.div`
  display: flex;
  gap: 8px;
  width: 100%;
  justify-content: flex-end;
`

const FormGroup = styled.div`
  margin-bottom: 16px;
`

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
