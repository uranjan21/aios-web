// @ts-nocheck
import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Timeline } from 'antd'
import { Badge, Card, SegmentedControl } from '@ledgr/ui'
import { History, MapPin } from 'lucide-react'
import { careerApi } from '@/api/areas'
import { Skeleton } from '@/components/ui/skeleton'
import { EmptyState, Button } from '@ledgr/ui'
import { format } from 'date-fns'
import type { CareerEvent } from '@/types'
import { SkillGapCard } from './SkillGapCard'
import styled from 'styled-components'

const EVENT_BADGE_TONES: Record<string, any> = {
  learning: 'primary',
  milestone: 'success',
  skill_update: 'primary',
  project: 'success',
  achievement: 'warning',
  feedback: 'warning',
}

const EVENT_TYPE_LABELS: Record<string, string> = {
  learning: 'Learning',
  milestone: 'Milestone',
  skill_update: 'Skill Update',
  project: 'Project',
  achievement: 'Achievement',
  feedback: 'Feedback',
}

const Root = styled.div`
  max-width: 42rem;
  display: flex;
  flex-direction: column;
  gap: 12px;
`

const SkeletonStack = styled.div`
  max-width: 42rem;
  display: flex;
  flex-direction: column;
  gap: 12px;
`

const StyledRoadmapSkeleton = styled(Skeleton)`
  height: 64px;
  width: 100%;
  border-radius: 12px;
`

const CountRow = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
`

const CountText = styled.span`
  font-size: 11px;
  font-weight: 500;
  color: ${({ theme }) => theme.color.mutedForeground};
`



const TimelineDot = styled.div`
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: ${({ theme }) => `${theme.color.primary}cc`};
  border: 2px solid ${({ theme }) => theme.color.background};
  margin-top: 2px;
`

const EventWrap = styled.div`
  padding-bottom: 4px;
`

const EventMeta = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
  margin-bottom: 4px;
`

const EventDate = styled.span`
  font-size: 10px;
  color: ${({ theme }) => theme.color.mutedForeground};
`

const EventTitle = styled.p`
  font-size: 12px;
  font-weight: 500;
  color: ${({ theme }) => theme.color.foreground};
  line-height: 1.4;
  margin: 0;
`

const EventDesc = styled.p`
  font-size: 11px;
  color: ${({ theme }) => theme.color.mutedForeground};
  margin: 2px 0 0;
  line-height: 1.4;
`

const EventSkill = styled.p`
  font-size: 10px;
  color: ${({ theme }) => theme.color.mutedForeground};
  margin: 4px 0 0;
`

const LevelSpan = styled.span`
  margin-left: 4px;
  color: ${({ theme }) => theme.color.primary};
`

function EventCard({ event }: { event: CareerEvent }) {
  return (
    <EventWrap>
      <EventMeta>
        <Badge tone={EVENT_BADGE_TONES[event.event_type] || 'neutral'}>
          {EVENT_TYPE_LABELS[event.event_type] || event.event_type}
        </Badge>
        <EventDate>{format(new Date(event.occurred_at), 'MMM d, yyyy')}</EventDate>
      </EventMeta>
      <EventTitle>{event.title}</EventTitle>
      {event.description && <EventDesc>{event.description}</EventDesc>}
      {event.skill && (
        <EventSkill>
          Skill: <strong style={{ color: 'currentColor', fontWeight: 500 }}>{event.skill}</strong>
          {event.skill_level && (
            <LevelSpan>→ {event.skill_level}</LevelSpan>
          )}
        </EventSkill>
      )}
    </EventWrap>
  )
}

export function RoadmapTab({ onAddEvent }: { onAddEvent?: () => void }) {
  const [eventFilter, setEventFilter] = useState<'all' | 'milestone' | 'learning' | 'project'>('all')
  const { data: events, isLoading } = useQuery({
    queryKey: ['career', 'events'],
    queryFn: careerApi.events,
  })

  if (isLoading) {
    return (
      <SkeletonStack>
        {Array.from({ length: 4 }).map((_, i) => (
          <StyledRoadmapSkeleton key={i} />
        ))}
      </SkeletonStack>
    )
  }

  if (!events?.length) {
    return (
      <EmptyState
        icon={<History size={24} />}
        title="No events yet"
        description="Log career milestones, learning, and projects from the Career tab."
        action={<Button variant="secondary" size="sm" onClick={onAddEvent || (() => {})}>Add Entry</Button>}
      />
    )
  }

  const visibleEvents = events.filter(e =>
    eventFilter === 'all' ? true : (e.event_type || '').toLowerCase().includes(eventFilter)
  )
  const timelineItems = visibleEvents.map(event => ({
    key: event.id,
    dot: <TimelineDot />,
    children: <EventCard event={event} />,
  }))

  return (
    <Root>
      <SkillGapCard />
      <CountRow>
        <MapPin size={16} style={{ color: 'var(--muted-foreground)' }} />
        <CountText>{events.length} events on your career timeline</CountText>
      </CountRow>
      <Card
        title="Career Timeline"
        subtitle="Milestones, learning, and projects in chronological order"
        icon={<History size={16} />}
        action={
          <SegmentedControl
            size="sm"
            aria-label="Filter timeline by event type"
            value={eventFilter}
            onChange={(v) => setEventFilter(v as typeof eventFilter)}
            options={[
              { value: 'all', label: 'All' },
              { value: 'milestone', label: 'Milestones' },
              { value: 'learning', label: 'Learning' },
              { value: 'project', label: 'Projects' },
            ]}
          />
        }
        size="md"
      >
        <Timeline items={timelineItems} style={{ marginTop: 8 }} />
      </Card>
    </Root>
  )
}
