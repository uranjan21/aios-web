// @ts-nocheck
import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Timeline } from 'antd'
import { Button, Input, Select, SelectItem, Textarea, Badge, Card } from '@ledgr/ui'
import { Plus, History, ListChecks } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import styled from 'styled-components'
import { businessApi } from '@/api/areas'
import { Skeleton } from '@/components/ui/skeleton'
import { EmptyState } from '@/components/EmptyState'
import { format } from 'date-fns'

const EVENT_TYPE_COLORS: Record<string, string> = {
  feature_shipped: 'success',
  decision: 'info',
  revenue: 'warning',
  blocker: 'destructive',
  milestone: 'accent',
  note: 'neutral',
}

const EVENT_TYPE_LABELS: Record<string, string> = {
  feature_shipped: 'Feature Shipped',
  decision: 'Decision',
  revenue: 'Revenue',
  blocker: 'Blocker',
  milestone: 'Milestone',
  note: 'Note',
}

const FormContainer = styled(motion.form)`
  padding: 0.75rem;
  background-color: color-mix(in srgb, var(--muted) 40%, transparent);
  border-radius: 0.75rem;
  margin-bottom: 0.75rem;
  border: 1px solid color-mix(in srgb, var(--border) 60%, transparent);
`

const FormGrid = styled.div`
  display: grid;
  grid-template-columns: 1fr;
  gap: 0.75rem;
  margin-bottom: 0.75rem;

  @media (min-width: 640px) {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
`

const FormGroup = styled.div`
  margin-bottom: 0.75rem;
`

const FormLabel = styled.label`
  font-size: 11px;
  color: ${({ theme }) => theme.color?.mutedForeground || 'var(--muted-foreground)'};
  display: block;
  margin-bottom: 0.25rem;
`

const FormActions = styled.div`
  display: flex;
  gap: 0.5rem;
  width: 100%;
  justify-content: flex-end;
`

function NewEventForm({ onClose, businessId }: { onClose: () => void, businessId?: string }) {
  const [eventType, setEventType] = useState('feature_shipped')
  const [mrr, setMrr] = useState('')
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const queryClient = useQueryClient()

  const { mutate, isPending } = useMutation({
    mutationFn: () =>
      businessApi.createEvent({
        event_type: eventType,
        title: title.trim(),
        description: description?.trim() || undefined,
        mrr: mrr ? parseFloat(mrr) : undefined,
        business_id: businessId,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['business'] })
      toast.success('Event logged')
      setEventType('feature_shipped')
      setMrr('')
      setTitle('')
      setDescription('')
      onClose()
    },
    onError: () => toast.error('Failed to log event'),
  })

  return (
    <FormContainer 
      onSubmit={(e: React.FormEvent) => { e.preventDefault(); mutate() }}
      initial={{ opacity: 0, height: 0 }} 
      animate={{ opacity: 1, height: 'auto' }} 
      exit={{ opacity: 0, height: 0 }}
    >
      <FormGrid>
        <div>
          <FormLabel htmlFor="evt-type">Type</FormLabel>
          <Select id="evt-type" value={eventType} onValueChange={setEventType} required aria-label="Event type">
            {Object.entries(EVENT_TYPE_LABELS).map(([v, l]) => (
              <SelectItem key={v} value={v}>{l}</SelectItem>
            ))}
          </Select>
        </div>
        <div>
          <FormLabel htmlFor="evt-mrr">MRR (optional)</FormLabel>
          <Input id="evt-mrr" type="number" startAdornment="₹" placeholder="0" min={0} value={mrr} onChange={(e: any) => setMrr(e.target.value)} />
        </div>
      </FormGrid>
      <FormGroup>
        <FormLabel htmlFor="evt-title">Title</FormLabel>
        <Input id="evt-title" placeholder="What happened?" maxLength={200} value={title} onChange={(e: any) => setTitle(e.target.value)} required />
      </FormGroup>
      <FormGroup>
        <FormLabel htmlFor="evt-description">Description</FormLabel>
        <Textarea id="evt-description" placeholder="More context (optional)" rows={3} value={description} onChange={(e: any) => setDescription(e.target.value)} />
      </FormGroup>
      <FormActions>
        <Button variant="ghost" type="button" onClick={onClose} size="sm">Cancel</Button>
        <Button variant="primary" type="submit" loading={isPending} size="sm">Log Event</Button>
      </FormActions>
    </FormContainer>
  )
}

const TabContainer = styled.div`
  max-width: 42rem;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
`

const TimelineDot = styled.div`
  width: 0.625rem;
  height: 0.625rem;
  border-radius: 9999px;
  background-color: color-mix(in srgb, var(--primary) 80%, transparent);
  border: 2px solid var(--background);
  margin-top: 0.125rem;
`

const TimelineItemContent = styled.div`
  padding-bottom: 0.25rem;
`

const TimelineItemMeta = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  flex-wrap: wrap;
  margin-bottom: 0.25rem;
`

const TimelineBadgeWrapper = styled.div`
  margin: 0;
  .ledgr-badge {
    font-size: 10px;
    margin: 0;
  }
`

const TimelineItemDate = styled.span`
  font-size: 10px;
  color: ${({ theme }) => theme.color?.mutedForeground || 'var(--muted-foreground)'};
`

const TimelineItemTitle = styled.p`
  font-size: 12px;
  font-weight: 500;
  color: ${({ theme }) => theme.color?.foreground || 'inherit'};
  margin: 0;
`

const TimelineItemDescription = styled.p`
  font-size: 11px;
  color: ${({ theme }) => theme.color?.mutedForeground || 'var(--muted-foreground)'};
  margin: 0.125rem 0 0 0;
`



const LogEventButton = styled.button`
  display: flex;
  align-items: center;
  gap: 0.25rem;
  font-size: 11px;
  color: var(--primary);
  font-weight: 500;
  transition: color 0.15s ease;
  background: none;
  border: none;
  cursor: pointer;
  padding: 0;
  
  &:hover {
    color: color-mix(in srgb, var(--primary) 80%, transparent);
  }
`



const SkeletonList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
`

const StyledEventSkeleton = styled(Skeleton)`
  height: 48px;
  width: 100%;
`

export function EventsTab({ businessId }: { businessId?: string }) {
  const [showForm, setShowForm] = useState(false)
  const [eventTypeFilter, setEventTypeFilter] = useState('all')

  const { data: events, isLoading } = useQuery({
    queryKey: ['business', 'events', businessId],
    queryFn: () => businessApi.events(businessId),
  })

  const filteredEvents = events?.filter(event => eventTypeFilter === 'all' || event.event_type === eventTypeFilter)

  const timelineItems = filteredEvents?.map(event => ({
    key: event.id,
    dot: <TimelineDot />,
    children: (
      <TimelineItemContent>
        <TimelineItemMeta>
          <TimelineBadgeWrapper>
            <Badge tone={(EVENT_TYPE_COLORS[event.event_type] || 'neutral') as any}>
              {EVENT_TYPE_LABELS[event.event_type] || event.event_type}
            </Badge>
          </TimelineBadgeWrapper>
          <TimelineItemDate>
            {format(new Date(event.occurred_at), 'MMM d, yyyy')}
          </TimelineItemDate>
          {event.mrr != null && event.mrr > 0 && (
            <TimelineBadgeWrapper>
              <Badge tone="warning">MRR ₹{event.mrr}</Badge>
            </TimelineBadgeWrapper>
          )}
        </TimelineItemMeta>
        <TimelineItemTitle>{event.title}</TimelineItemTitle>
        {event.description && (
          <TimelineItemDescription>{event.description}</TimelineItemDescription>
        )}
      </TimelineItemContent>
    ),
  })) ?? []

  return (
    <TabContainer>
      <AnimatePresence>
        {showForm && <NewEventForm onClose={() => setShowForm(false)} businessId={businessId} />}
      </AnimatePresence>

      <Card
        title="Event Log"
        subtitle="Recent milestones, feature ships, and notable changes"
        icon={<ListChecks size={16} />}
        size="md"
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
              aria-label="Filter events by type"
            />
            {!showForm && (
              <LogEventButton onClick={() => setShowForm(true)}>
                <Plus size={12} /> Log Event
              </LogEventButton>
            )}
          </div>
        }
      >
        {isLoading ? (
          <SkeletonList>
            <StyledEventSkeleton />
            <StyledEventSkeleton />
            <StyledEventSkeleton />
          </SkeletonList>
        ) : timelineItems.length === 0 ? (
          <EmptyState
            title="No events yet"
            description="Start logging milestones, feature ships, and blockers."
            icon={History}
            action={{ label: "Add Entry", onClick: () => setShowForm(true) }}
          />
        ) : (
          <Timeline items={timelineItems} />
        )}
      </Card>
    </TabContainer>
  )
}
