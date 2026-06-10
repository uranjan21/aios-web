import { useQuery } from '@tanstack/react-query'
import { Tag, Timeline } from 'antd'
import { History, MapPin } from 'lucide-react'
import { careerApi } from '@/api/areas'
import { Skeleton } from '@/components/ui/skeleton'
import { EmptyState } from '@/components/EmptyState'
import { format } from 'date-fns'
import type { CareerEvent } from '@/types'

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

function EventCard({ event }: { event: CareerEvent }) {
  return (
    <div className="pb-1">
      <div className="flex items-center gap-2 flex-wrap mb-1">
        <Tag color={EVENT_TYPE_COLORS[event.event_type] || 'default'} className="text-[10px] m-0">
          {EVENT_TYPE_LABELS[event.event_type] || event.event_type}
        </Tag>
        <span className="text-[10px] text-muted-foreground">
          {format(new Date(event.occurred_at), 'MMM d, yyyy')}
        </span>
      </div>
      <p className="text-[12px] font-medium text-foreground leading-snug">{event.title}</p>
      {event.description && (
        <p className="text-[11px] text-muted-foreground mt-0.5 leading-snug">{event.description}</p>
      )}
      {event.skill && (
        <p className="text-[10px] text-muted-foreground mt-1">
          Skill: <span className="font-medium text-foreground">{event.skill}</span>
          {event.skill_level && <span className="ml-1 text-primary">→ {event.skill_level}</span>}
        </p>
      )}
    </div>
  )
}

export function RoadmapTab() {
  const { data: events, isLoading } = useQuery({
    queryKey: ['career', 'events'],
    queryFn: careerApi.events,
  })

  if (isLoading) {
    return (
      <div className="space-y-3 max-w-2xl">
        {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-16 w-full rounded-xl" />)}
      </div>
    )
  }

  if (!events?.length) {
    return <EmptyState icon={History} title="No events yet" description="Log career milestones, learning, and projects from the Career tab." />
  }

  const timelineItems = events.map(event => ({
    key: event.id,
    dot: (
      <div className="w-2.5 h-2.5 rounded-full bg-primary/80 border-2 border-background mt-0.5" />
    ),
    children: <EventCard event={event} />,
  }))

  return (
    <div className="max-w-2xl space-y-3">
      <div className="flex items-center gap-2">
        <MapPin className="w-4 h-4 text-muted-foreground" />
        <span className="text-[11px] text-muted-foreground font-medium">{events.length} events on your career timeline</span>
      </div>

      <div className="bg-card border border-border/60 shadow-sm rounded-xl p-4">
        <Timeline items={timelineItems} className="mt-2" />
      </div>
    </div>
  )
}
