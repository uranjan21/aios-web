
import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Popconfirm } from '@aios/shared/components/ui/Popconfirm'
import { Select, Button, Badge, SegmentedControl, HeaderActionPortal, focusRing } from '@ledgr/ui'
import { Plus, ExternalLink, Trash2, Briefcase, XCircle } from 'lucide-react'
import {
  DndContext, DragOverlay, PointerSensor, KeyboardSensor,
  useSensor, useSensors, useDraggable, useDroppable,
  type DragStartEvent, type DragEndEvent,
} from '@dnd-kit/core'
import { careerApi } from '@aios/shared/api/areas'
import { Skeleton } from '@aios/shared/components/ui/skeleton'
import { EmptyState } from '@ledgr/ui'
import type { JobOpportunity, OpportunityStatus } from '@aios/shared/types'
import { format } from 'date-fns'
import { OpportunityForm } from './OpportunityForm'
import styled from 'styled-components'

const STATUS_COLORS: Record<OpportunityStatus, any> = {
  prospect: 'neutral', applied: 'primary', screening: 'warning',
  interview: 'primary', offer: 'success', rejected: 'destructive', closed: 'neutral',
}

const STATUS_ORDER: OpportunityStatus[] = ['prospect', 'applied', 'screening', 'interview', 'offer', 'rejected', 'closed']
const PIPELINE_STAGES: OpportunityStatus[] = ['prospect', 'applied', 'screening', 'interview', 'offer']

// ── Styled components ─────────────────────────────────────────────────────────

const Root = styled.div<{ $pipeline: boolean }>`
  display: flex;
  flex-direction: column;
  gap: 12px;
  max-width: ${({ $pipeline }) => $pipeline ? 'none' : '42rem'};
`



const AddBtn = styled.button`
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 11px;
  font-weight: 500;
  color: ${({ theme }) => theme.color.primary};
  background: none;
  border: none;
  cursor: pointer;
  padding: 0;
  transition: opacity 120ms;
  &:hover { opacity: 0.75; }
`

const AddFormRoot = styled.div`
  background: ${({ theme }) => `${theme.color.muted}66`};
  border-radius: 18px;
  padding: 12px;
`





// ── Pipeline ──────────────────────────────────────────────────────────────────

const PipelineGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
  margin-bottom: 12px;
  @media (min-width: 768px) { grid-template-columns: repeat(3, minmax(0, 1fr)); }
  @media (min-width: 1280px) { grid-template-columns: repeat(5, minmax(0, 1fr)); }
`

const PipelineCol = styled.div<{ $over: boolean }>`
  border-radius: 12px;
  border: 1px solid ${({ theme, $over }) => $over ? theme.color.primary : `${theme.color.border}99`};
  padding: 8px;
  min-height: 140px;
  background: ${({ theme, $over }) => $over ? 'rgba(248, 209, 104, 0.05)' : `${theme.color.muted}33`};
  transition: border-color 150ms, background 150ms;
`

const ColHead = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 8px;
  padding: 0 4px;
`

const ColCount = styled.span`
  font-size: 10px;
  color: ${({ theme }) => theme.color.mutedForeground};
`

const ColCards = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
`

const DragCard = styled.div<{ $dragging: boolean }>`
  background: ${({ theme }) => theme.color.card};
  border-radius: 12px;
  padding: 10px;
  cursor: grab;
  box-shadow: ${({ theme }) => theme.shadow.xs};
  opacity: ${({ $dragging }) => $dragging ? 0.4 : 1};
  &:active { cursor: grabbing; }

  ${focusRing}
`

const DragCardRole = styled.div`
  font-size: 12px;
  font-weight: 600;
  color: ${({ theme }) => theme.color.foreground};
  line-height: 1.3;
`

const DragCardCompany = styled.div`
  font-size: 11px;
  color: ${({ theme }) => theme.color.mutedForeground};
`

const DragCardNotes = styled.div`
  font-size: 10px;
  color: ${({ theme }) => theme.color.mutedForeground};
  margin-top: 4px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`

const OverlayCard = styled.div`
  background: ${({ theme }) => theme.color.card};
  border: 2px solid ${({ theme }) => theme.color.primary};
  border-radius: 8px;
  padding: 10px;
  box-shadow: ${({ theme }) => theme.shadow.xl};
  transform: rotate(2deg);
  width: 200px;
`

const RejectZoneRoot = styled.div<{ $over: boolean }>`
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  border-radius: 12px;
  border: 1px dashed ${({ theme, $over }) => $over ? theme.color.destructive : `${theme.color.border}99`};
  padding: 12px;
  background: ${({ theme, $over }) => $over ? `${theme.color.destructive}14` : 'transparent'};
  color: ${({ theme, $over }) => $over ? theme.color.destructive : theme.color.mutedForeground};
  transition: all 150ms;
  font-size: 11px;
  font-weight: 500;
`

// ── List view ─────────────────────────────────────────────────────────────────

import { Card } from '@ledgr/ui'



const ListPad = styled.div`
  padding: 6px;
`

const ListSkeletonPad = styled.div`
  padding: 12px;
  display: flex;
  flex-direction: column;
  gap: 8px;
`

const StyledListSkeleton = styled(Skeleton)`
  height: 48px;
  width: 100%;
`

const StyledPipelineSkeleton = styled(Skeleton)`
  height: 140px;
  border-radius: 12px;
`

const DelBtn = styled.button`
  padding: 4px;
  border-radius: 6px;
  border: none;
  background: none;
  cursor: pointer;
  color: ${({ theme }) => theme.color.mutedForeground};
  opacity: 0;
  flex-shrink: 0;
  transition: opacity 120ms, color 120ms, background 120ms;
  &:hover { background: ${({ theme }) => `${theme.color.destructive}1A`}; color: ${({ theme }) => theme.color.destructive}; }
  ${focusRing}
`

const OppRowRoot = styled.div`
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
  padding: 10px 12px;
  border-radius: 8px;
  transition: background 120ms;
  position: relative;
  &:hover { background: ${({ theme }) => `${theme.color.muted}33`}; }
  &:hover ${DelBtn} { opacity: 1; }
`

const OppRowLeft = styled.div`
  flex: 1;
  min-width: 0;
`

const OppRoleRow = styled.div`
  display: flex;
  align-items: baseline;
  gap: 8px;
  flex-wrap: wrap;
`

const OppRole = styled.span`
  font-size: 12px;
  font-weight: 600;
  color: ${({ theme }) => theme.color.foreground};
`

const OppCompany = styled.span`
  font-size: 11px;
  color: ${({ theme }) => theme.color.mutedForeground};
`

const OppLink = styled.a`
  color: ${({ theme }) => theme.color.primary};
  transition: opacity 120ms;
  &:hover { opacity: 0.7; }
`

const OppMeta = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 4px;
  flex-wrap: wrap;
`

const OppMetaText = styled.span`
  font-size: 10px;
  color: ${({ theme }) => theme.color.mutedForeground};
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  max-width: 160px;
`

// ── Sub-components ────────────────────────────────────────────────────────────

function OppRow({ opp }: { opp: JobOpportunity }) {
  const queryClient = useQueryClient()

  const patchMutation = useMutation({
    mutationFn: (status: OpportunityStatus) => careerApi.patchOpportunity(opp.id, { status }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['career', 'opportunities'] }); toast.success('Status updated') },
    onError: () => toast.error('Failed to update'),
  })

  const deleteMutation = useMutation({
    mutationFn: () => careerApi.deleteOpportunity(opp.id),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['career', 'opportunities'] }); toast.success('Removed') },
    onError: () => toast.error('Failed to delete'),
  })

  return (
    <OppRowRoot>
      <OppRowLeft>
        <OppRoleRow>
          <OppRole>{opp.role}</OppRole>
          <OppCompany>@ {opp.company}</OppCompany>
          {opp.url && (
            <OppLink href={opp.url} target="_blank" rel="noopener noreferrer" aria-label="Open job posting">
              <ExternalLink size={12} />
            </OppLink>
          )}
        </OppRoleRow>
        <OppMeta>
          <Select
            value={opp.status}
            size="sm"
            onChange={(v) => patchMutation.mutate(v as OpportunityStatus)}
            options={STATUS_ORDER.map(s => ({ value: s, label: s.charAt(0).toUpperCase() + s.slice(1) }))}
            placeholder="Status…"
            disabled={patchMutation.isPending}
            style={{ width: 110 }}
            aria-label="Opportunity status"
          />
          {opp.applied_date && (
            <OppMetaText>Applied {format(new Date(opp.applied_date), 'MMM d')}</OppMetaText>
          )}
          {opp.notes && <OppMetaText>{opp.notes}</OppMetaText>}
        </OppMeta>
      </OppRowLeft>
      <Popconfirm
        title="Remove this opportunity?"
        onConfirm={() => deleteMutation.mutate()}
        okText="Remove"
        cancelText="Cancel"
        okButtonProps={{ danger: true }}
      >
        <DelBtn aria-label="Delete opportunity">
          <Trash2 size={12} />
        </DelBtn>
      </Popconfirm>
    </OppRowRoot>
  )
}

function AddForm({ onClose }: { onClose: () => void }) {
  return (
    <AddFormRoot>
      <OpportunityForm onClose={onClose} />
    </AddFormRoot>
  )
}

function PipelineCard({ opp }: { opp: JobOpportunity }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id: opp.id })
  return (
    <DragCard
      ref={setNodeRef}
      $dragging={isDragging}
      {...attributes}
      {...listeners}
      style={transform ? { transform: `translate(${transform.x}px, ${transform.y}px)` } : undefined}
      aria-label={`${opp.role} at ${opp.company}. Press spacebar to drag.`}
    >
      <DragCardRole>{opp.role}</DragCardRole>
      <DragCardCompany>{opp.company}</DragCardCompany>
      {opp.notes && <DragCardNotes>{opp.notes}</DragCardNotes>}
    </DragCard>
  )
}

function PipelineColumn({ status, opps }: { status: OpportunityStatus; opps: JobOpportunity[] }) {
  const { setNodeRef, isOver } = useDroppable({ id: status })
  return (
    <PipelineCol ref={setNodeRef} $over={isOver}>
      <ColHead>
        <Badge tone={STATUS_COLORS[status]}>{status}</Badge>
        <ColCount>{opps.length}</ColCount>
      </ColHead>
      <ColCards>
        {opps.map(o => <PipelineCard key={o.id} opp={o} />)}
      </ColCards>
    </PipelineCol>
  )
}

function RejectZone() {
  const { setNodeRef, isOver } = useDroppable({ id: 'rejected' })
  return (
    <RejectZoneRoot ref={setNodeRef} $over={isOver}>
      <XCircle size={14} />
      <span>Drop here to mark rejected</span>
    </RejectZoneRoot>
  )
}

function PipelineBoard({ opps }: { opps: JobOpportunity[] }) {
  const queryClient = useQueryClient()
  const [activeId, setActiveId] = useState<string | null>(null)
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor)
  )

  const moveMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: OpportunityStatus }) =>
      careerApi.patchOpportunity(id, { status }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['career', 'opportunities'] }); toast.success('Stage updated') },
    onError: () => toast.error('Failed to update stage'),
  })

  const handleDragStart = (e: DragStartEvent) => setActiveId(String(e.active.id))
  const handleDragEnd = (e: DragEndEvent) => {
    setActiveId(null)
    const target = e.over?.id as OpportunityStatus | undefined
    if (!target) return
    const opp = opps.find(o => o.id === e.active.id)
    if (opp && opp.status !== target) moveMutation.mutate({ id: opp.id, status: target })
  }

  const activeOpp = opps.find(o => o.id === activeId)

  return (
    <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
      <PipelineGrid>
        {PIPELINE_STAGES.map(s => (
          <PipelineColumn key={s} status={s} opps={opps.filter(o => o.status === s)} />
        ))}
      </PipelineGrid>
      <RejectZone />
      <DragOverlay>
        {activeOpp && (
          <OverlayCard>
            <DragCardRole>{activeOpp.role}</DragCardRole>
            <DragCardCompany>{activeOpp.company}</DragCardCompany>
          </OverlayCard>
        )}
      </DragOverlay>
    </DndContext>
  )
}

function OppListSection({ label, opps, isLoading, onAdd }: { label: string; opps: JobOpportunity[]; isLoading: boolean; onAdd: () => void }) {
  const isClosed = /closed|rejected/i.test(label)
  const [listPeriod, setListPeriod] = useState('all')

  const filteredOpps = opps.filter(o => {
    if (listPeriod === 'all') return true
    if (!o.applied_date) return true
    const diff = (new Date().getTime() - new Date(o.applied_date).getTime()) / (1000 * 60 * 60 * 24)
    if (listPeriod === '30d') return diff <= 30
    if (listPeriod === '90d') return diff <= 90
    return true
  })

  return (
    <Card
      title={label}
      subtitle={isClosed ? 'Past applications that did not move forward' : 'Roles you are actively pursuing'}
      icon={isClosed ? <XCircle size={16} /> : <Briefcase size={16} />}
      size="none"
      action={
        <Select
          size="sm"
          fullWidth={false}
          options={[
            { label: 'All Time', value: 'all' },
            { label: 'Last 30 Days', value: '30d' },
            { label: 'Last 90 Days', value: '90d' },
          ]}
          value={listPeriod}
          onChange={(val) => setListPeriod(val as string)}
        />
      }
    >
      {isLoading ? (
        <ListSkeletonPad>
          {[1, 2, 3].map(i => <StyledListSkeleton key={i} />)}
        </ListSkeletonPad>
      ) : !filteredOpps.length ? (
        <EmptyState
          icon={<Briefcase size={24} />}
          title="No opportunities found"
          description="Try changing the period filter."
          action={<Button variant="secondary" size="sm" onClick={onAdd}>Add Entry</Button>}
        />
      ) : (
        <ListPad>
          {filteredOpps.map(o => <OppRow key={o.id} opp={o} />)}
        </ListPad>
      )}
    </Card>
  )
}

export function OpportunitiesTab() {
  const [showForm, setShowForm] = useState(false)
  const [view, setView] = useState<'Pipeline' | 'List'>('Pipeline')

  const { data: opps, isLoading } = useQuery({
    queryKey: ['career', 'opportunities'],
    queryFn: careerApi.opportunities,
  })

  const active = opps?.filter(o => !['rejected', 'closed'].includes(o.status)) ?? []
  const closed = opps?.filter(o => ['rejected', 'closed'].includes(o.status)) ?? []

  return (
    <Root $pipeline={view === 'Pipeline'}>
      <SegmentedControl
        options={[{ label: 'Pipeline', value: 'Pipeline' }, { label: 'List', value: 'List' }]}
        value={view}
        onChange={v => setView(v as typeof view)}
      />
      <HeaderActionPortal>
        <AddBtn onClick={() => setShowForm(s => !s)}>
          <Plus size={12} /> Add
        </AddBtn>
      </HeaderActionPortal>

      {showForm && <AddForm onClose={() => setShowForm(false)} />}

      {view === 'Pipeline' ? (
        isLoading ? (
          <PipelineGrid>
            {[1, 2, 3, 4, 5].map(i => <StyledPipelineSkeleton key={i} />)}
          </PipelineGrid>
        ) : !active.length ? (
          <EmptyState
            icon={<Briefcase size={24} />}
            title="No active opportunities"
            description="Track jobs you're applying to here."
            action={<Button variant="secondary" size="sm" onClick={() => setShowForm(true)}>Add Entry</Button>}
          />
        ) : (
          <PipelineBoard opps={active} />
        )
      ) : (
        <>
          <OppListSection label="Active" opps={active} isLoading={isLoading} onAdd={() => setShowForm(true)} />
          {closed.length > 0 && <OppListSection label="Closed / Rejected" opps={closed} isLoading={false} onAdd={() => setShowForm(true)} />}
        </>
      )}
    </Root>
  )
}
