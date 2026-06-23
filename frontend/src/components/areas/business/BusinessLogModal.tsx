// @ts-nocheck
import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Dialog, Input, Select, Button, Textarea } from '@ledgr/ui'
import { toast } from 'sonner'
import { businessApi } from '@/api/areas'
import styled from 'styled-components'

const Form = styled.form`
  margin-top: 8px;
`

const FormGrid = styled.div`
  display: grid;
  grid-template-columns: 1fr;
  gap: 16px;
  margin-bottom: 8px;

  @media (min-width: 480px) {
    grid-template-columns: 1fr 2fr;
  }
`

const FormGroup = styled.div`
  margin-bottom: 16px;
`

const FormActions = styled.div`
  display: flex;
  gap: 8px;
  width: 100%;
  justify-content: flex-end;
`

const EVENT_TYPE_COLORS: Record<string, string> = {
  feature_shipped: 'green',
  decision: 'blue',
  revenue: 'gold',
  blocker: 'red',
  milestone: 'purple',
  note: 'default',
}

export function BusinessLogModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const queryClient = useQueryClient()
  const [eventType, setEventType] = useState('feature_shipped')
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')

  const handleOpenChange = (visible: boolean) => {
    if (visible) {
      setEventType('feature_shipped')
      setTitle('')
      setDescription('')
    } else {
      onClose()
    }
  }

  const { mutate, isPending } = useMutation({
    mutationFn: () => businessApi.createEvent({
      event_type: eventType,
      title: title.trim(),
      description: description?.trim() || undefined,
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['business'] })
      setEventType('feature_shipped')
      setTitle('')
      setDescription('')
      toast.success('Event logged')
      onClose()
    },
    onError: () => toast.error('Failed to log event'),
  })

  return (
    <Dialog open={open} onOpenChange={handleOpenChange} title="Log Business Event">
      <Form onSubmit={e => { e.preventDefault(); mutate() }}>
        <FormGrid>
          <Select
            value={eventType}
            onChange={(val) => setEventType(String(val))}
            options={Object.keys(EVENT_TYPE_COLORS).map(t => ({ value: t, label: t.replace(/_/g, ' ') }))}
            placeholder="Choose event type…"
            aria-label="Event type"
          />
          <Input placeholder="Event Title" value={title} onChange={(e: any) => setTitle(e.target.value)} required aria-label="Event title" />
        </FormGrid>
        <FormGroup>
          <Textarea placeholder="Description (optional)" rows={3} value={description} onChange={(e: any) => setDescription(e.target.value)} aria-label="Description" />
        </FormGroup>
        <FormActions>
          <Button variant="outline" type="button" onClick={onClose}>Cancel</Button>
          <Button variant="primary" type="submit" loading={isPending}>Log Event</Button>
        </FormActions>
      </Form>
    </Dialog>
  )
}
