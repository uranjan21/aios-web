// @ts-nocheck
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useState, forwardRef, useMemo } from 'react'
import dayjs from 'dayjs'
import { Input, Dialog, ConfirmDialog, Button, Select } from '@ledgr/ui'
import { Card as AppCard } from '@ledgr/ui'
import { toast } from 'sonner'
import { Plus, LayoutGrid, Edit2, Calendar, Trash2, TrendingUp, Eye, MousePointerClick, WandSparkles, PenLine, Columns3, Bot, Search, Bell, PlusCircle } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useUIStore } from '@/stores/uiStore'
import { motion, AnimatePresence } from 'framer-motion'
import {
  DndContext, DragOverlay, PointerSensor,
  useSensor, useSensors, type DragEndEvent, type DragStartEvent,
} from '@dnd-kit/core'
import { useDroppable, useDraggable } from '@dnd-kit/core'
import { contentApi } from '@/api/areas'
import { Skeleton } from '@/components/ui/skeleton'
import { ErrorCard } from '@/components/ErrorCard'
import { TwitterQueueCard } from '@/components/areas/content/TwitterQueueCard'
import { ColumnDropZone } from '@/components/areas/content/ColumnDropZone'
import { ContentCaptureModal } from '@/components/areas/content/ContentCaptureModal'
import { StatusPill, type StatusPillTone } from '@/components/lumina'
import { PageToolbar } from '@/components/layout/PageLayout'
import { PageHeader } from '@ledgr/ui'
import { AreaTabs } from '@/components/ui/AreaTabs'
import type { ContentItem } from '@/types'
import styled from 'styled-components'
import { PageContainer, PageContent } from '@/components/layout/PageLayout'

const PIPELINE_COLS: ContentItem['status'][] = ['idea', 'in_progress', 'scheduled']

const STATUS_LABELS: Record<ContentItem['status'], string> = {
  idea: 'Ideas', in_progress: 'In Progress', scheduled: 'Scheduled',
  published: 'Published', archived: 'Archived',
}

const STATUS_TONE: Record<ContentItem['status'], StatusPillTone> = {
  idea: 'neutral', in_progress: 'blue', scheduled: 'amber',
  published: 'emerald', archived: 'neutral',
}

// Platform badge style objects (hex, no Tailwind)
const PLATFORM_STYLE: Record<string, React.CSSProperties> = {
  linkedin:  { background: 'rgba(10,102,194,0.1)',  color: '#0A66C2' },
  twitter:   { background: 'rgba(2,132,199,0.1)',   color: '#0284c7' },
  instagram: { background: 'rgba(124,58,237,0.1)',  color: '#7c3aed' },
  youtube:   { background: 'rgba(220,38,38,0.1)',   color: '#dc2626' },
  blog:      { background: 'rgba(217,119,6,0.1)',   color: '#d97706' },
}

// ── Layout ─────────────────────────────────────────────────────────────────────

const PageRoot = styled.div`
  min-height: 100vh;
  background: ${({ theme }) => theme.color.background};
  padding: 16px;
  @media (min-width: 768px) { padding: 24px; }
`

const PipelineGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(12, minmax(0, 1fr));
  gap: 16px;
  width: 100%;
`

const PipelineCols = styled.div`
  grid-column: span 12;
  display: grid;
  grid-template-columns: 1fr;
  gap: 16px;
  @media (min-width: 768px) { grid-template-columns: repeat(3, minmax(0, 1fr)); }
  @media (min-width: 1024px) { grid-column: span 9; }
`

const Sidebar = styled.div`
  grid-column: span 12;
  display: flex;
  flex-direction: column;
  gap: 16px;
  @media (min-width: 1024px) { grid-column: span 3; }
`

const FullRow = styled.div`
  grid-column: span 12;
`

// ── Toolbar stats ─────────────────────────────────────────────────────────────

const StatsChip = styled.div`
  display: flex;
  align-items: center;
  gap: 16px;
  background: ${({ theme }) => `${theme.color.muted}66`};
  padding: 6px 16px;
  border-radius: 12px;
  border: 1px solid ${({ theme }) => `${theme.color.border}80`};
  box-shadow: ${({ theme }) => theme.shadow.xs};
  white-space: nowrap;
`

const StatBlock = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
`

const StatChipLabel = styled.span`
  font-size: 10px;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  font-weight: 700;
  color: ${({ theme }) => theme.color.mutedForeground};
`

const StatChipValue = styled.span<{ $color?: string }>`
  font-size: 13px;
  font-weight: 700;
  color: ${({ $color, theme }) => $color ?? theme.color.foreground};
  font-variant-numeric: tabular-nums;
`

const StatDivider = styled.div`
  width: 1px;
  height: 24px;
  background: ${({ theme }) => `${theme.color.border}99`};
`

// ── Item card ─────────────────────────────────────────────────────────────────

const PlatformBadge = styled.span`
  font-size: 10px;
  font-weight: 700;
  padding: 2px 8px;
  border-radius: 6px;
  text-transform: uppercase;
  letter-spacing: 0.06em;
`

const CardActions = styled.div`
  position: absolute;
  top: 8px;
  right: 8px;
  display: none;
  align-items: center;
  gap: 4px;
  background: ${({ theme }) => theme.color.card};
  border-radius: 12px;
  box-shadow: ${({ theme }) => theme.shadow.sm};
  padding: 4px;
  z-index: 10;
`

const CardActionBtn = styled.button<{ $danger?: boolean }>`
  padding: 6px;
  border-radius: 6px;
  border: none;
  background: none;
  cursor: pointer;
  color: ${({ theme }) => theme.color.mutedForeground};
  transition: background 120ms, color 120ms;
  &:hover {
    background: ${({ theme, $danger }) => $danger ? 'rgba(220,38,38,0.1)' : theme.color.muted};
    color: ${({ $danger }) => $danger ? '#dc2626' : 'inherit'};
  }
`

const ItemCardRoot = styled.div`
  position: relative;
  &:hover .card-actions { display: flex; }
`

const CardRow = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
  padding-top: 4px;
`

const DateLabel = styled.span`
  font-size: 12px;
  font-weight: 500;
  color: ${({ theme }) => theme.color.mutedForeground};
  display: flex;
  align-items: center;
  gap: 4px;
`

const ItemTitle = styled.p`
  font-size: 14px;
  font-weight: 500;
  color: ${({ theme }) => theme.color.foreground};
  line-height: 1.4;
  padding-right: 56px;
  margin: 0;
`

export const ItemCard = forwardRef<HTMLDivElement, {
  item: ContentItem;
  isDragging?: boolean;
  onEdit: (id: string, current: string) => void;
  onSchedule: (id: string, current: string | null) => void;
  onDelete: (id: string) => void;
}>(function ItemCard({ item, isDragging, onEdit, onSchedule, onDelete }, ref) {
  const { attributes, listeners, setNodeRef, transform } = useDraggable({ id: item.id })
  const style = transform ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)` } : undefined

  return (
    <motion.div
      ref={ref}
      layout
      initial={{ opacity: 0, scale: 0.96, y: 8 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.94, y: -4 }}
      transition={{ duration: 0.18, ease: 'easeOut' }}
    >
      <ItemCardRoot>
        <AppCard
          ref={setNodeRef}
          style={{
            ...style,
            padding: '12px',
            opacity: isDragging ? 0.5 : 1,
            cursor: 'grab',
            userSelect: 'none',
            touchAction: 'none',
          }}
          hoverable
          {...listeners}
          {...attributes}
          noPadding
        >
          <ItemTitle>{item.title}</ItemTitle>
          <CardRow>
            <PlatformBadge style={PLATFORM_STYLE[item.platform] ?? { background: 'var(--muted)', color: 'var(--muted-foreground)' }}>
              {item.platform}
            </PlatformBadge>
            {item.publish_date && (
              <DateLabel>
                <Calendar size={12} />
                {new Date(item.publish_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
              </DateLabel>
            )}
          </CardRow>
        </AppCard>
        <CardActions className="card-actions">
          <CardActionBtn onClick={e => { e.stopPropagation(); onEdit(item.id, item.title) }} aria-label="Edit">
            <Edit2 size={14} />
          </CardActionBtn>
          <CardActionBtn onClick={e => { e.stopPropagation(); onSchedule(item.id, item.publish_date ?? null) }} aria-label="Schedule">
            <Calendar size={14} />
          </CardActionBtn>
          <CardActionBtn $danger onClick={e => { e.stopPropagation(); onDelete(item.id) }} aria-label="Delete">
            <Trash2 size={14} />
          </CardActionBtn>
        </CardActions>
      </ItemCardRoot>
    </motion.div>
  )
})

// ── Engagement widget ─────────────────────────────────────────────────────────

const StatItemRoot = styled.div`
  background: ${({ theme }) => `${theme.color.background}4d`};
  border-radius: 12px;
  padding: 12px;
`

const StatItemLabel = styled.div`
  display: flex;
  align-items: center;
  gap: 6px;
  color: ${({ theme }) => theme.color.mutedForeground};
  font-size: 12px;
  font-weight: 500;
  margin-bottom: 4px;
`

const StatItemValue = styled.div`
  font-size: 14px;
  font-weight: 500;
  color: ${({ theme }) => theme.color.foreground};
  font-variant-numeric: tabular-nums;
`

const StatItemNote = styled.p`
  font-size: 11px;
  color: ${({ theme }) => `${theme.color.mutedForeground}99`};
  margin: 0;
`

const EngagHeader = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 16px;
`

const EngagTitle = styled.h2`
  font-size: 12px;
  font-weight: 500;
  color: ${({ theme }) => theme.color.mutedForeground};
  margin: 0;
`

const EngagStats = styled.div`
  display: flex;
  flex-direction: column;
  gap: 12px;
  flex: 1;
`

function EngagementWidget({ publishedItems }: { publishedItems: ContentItem[] }) {
  const [period, setPeriod] = useState('30d')
  
  const filteredCount = useMemo(() => {
    const now = dayjs()
    const daysLimit = period === '7d' ? 7 : period === '90d' ? 90 : 30
    const limitDate = now.subtract(daysLimit, 'day')
    return publishedItems.filter(item => {
      if (!item.publish_date) return false
      return dayjs(item.publish_date).isAfter(limitDate)
    }).length
  }, [publishedItems, period])

  return (
    <AppCard
      title="Content Summary"
      subtitle="Snapshot of what you've shipped and engagement signal"
      icon={<TrendingUp size={16} style={{ color: '#1e50d0' }} />}
      action={
        <div onClick={(e) => e.stopPropagation()}>
          <Select
            size="sm"
            aria-label="Period filter"
            value={period}
            onChange={(val: any) => setPeriod(val)}
            options={[
              { value: '7d', label: '7 Days' },
              { value: '30d', label: '30 Days' },
              { value: '90d', label: '90 Days' },
            ]}
          />
        </div>
      }
      noPadding={false}
      size="md"
      style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}
    >
      <EngagStats>
        <StatItemRoot>
          <StatItemLabel><Eye size={14} /> Published</StatItemLabel>
          <StatItemValue>{filteredCount} piece{filteredCount !== 1 ? 's' : ''}</StatItemValue>
        </StatItemRoot>
        <StatItemRoot>
          <StatItemLabel><MousePointerClick size={14} /> Analytics</StatItemLabel>
          <StatItemNote>Connect YouTube or Twitter in Integrations to see real engagement data</StatItemNote>
        </StatItemRoot>
      </EngagStats>
    </AppCard>
  )
}

// ── Published drop zone ───────────────────────────────────────────────────────

const StyledPublishedCard = styled(AppCard)<{ $over: boolean }>`
  background: ${({ $over }) => $over ? 'rgba(22,163,74,0.1)' : 'rgba(22,163,74,0.05)'} !important;
  transition: all 300ms cubic-bezier(0.4, 0, 0.2, 1);
  border-color: ${({ $over }) => $over ? 'rgba(22,163,74,0.6)' : 'rgba(22,163,74,0.15)'} !important;
  transform: scale(${({ $over }) => $over ? 1.02 : 1});
  box-shadow: ${({ $over }) => $over ? '0 0 20px rgba(22,163,74,0.2)' : 'none'} !important;
  z-index: ${({ $over }) => $over ? 10 : 1};
`

const PublishedDot = styled.div`
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #16a34a;
  animation: pulse 2s ease-in-out infinite;
  @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.5} }
`

const PublishedCount = styled.span`
  font-size: 12px;
  font-weight: 700;
  color: #16a34a;
  background: rgba(22,163,74,0.1);
  padding: 4px 12px;
  border-radius: 999px;
  font-variant-numeric: tabular-nums;
`

const PublishedGrid = styled.div`
  display: grid;
  grid-template-columns: 1fr;
  gap: 16px;
  @media (min-width: 640px) { grid-template-columns: repeat(2, 1fr); }
  @media (min-width: 1024px) { grid-template-columns: repeat(4, 1fr); }
  @media (min-width: 1280px) { grid-template-columns: repeat(5, 1fr); }
`

const PublishedEmptyZone = styled.div`
  grid-column: 1 / -1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 24px;
  text-align: center;
  border: 2px dashed rgba(22,163,74,0.2);
  border-radius: 18px;
`

const PublishedSkeleton = styled(Skeleton)`
  height: 112px;
  border-radius: 12px;
  width: 100%;
`

function PublishedDropZone({ items, isLoading, activeId, onEdit, onSchedule, onDelete }) {
  const { setNodeRef, isOver } = useDroppable({ id: 'published' })
  return (
    <StyledPublishedCard
      ref={setNodeRef}
      $over={isOver}
      title="Published Content"
      subtitle="Catalog of successfully published posts and articles"
      icon={<div style={{ display: 'flex', alignItems: 'center' }}><PublishedDot /></div>}
      action={<PublishedCount>{isLoading ? '·' : items.length} live</PublishedCount>}
      size="md"
    >
      <PublishedGrid>
        {isLoading ? (
          <>
            {[1,2,3,4].map(i => <PublishedSkeleton key={i} />)}
          </>
        ) : items.length === 0 ? (
          <PublishedEmptyZone>
            <LayoutGrid size={24} style={{ color: 'rgba(22,163,74,0.4)', marginBottom: 8 }} />
            <p style={{ fontSize: 14, color: 'rgba(22,163,74,0.6)', fontWeight: 500, margin: 0 }}>
              Drag items here to publish them
            </p>
          </PublishedEmptyZone>
        ) : (
          <AnimatePresence initial={false} mode="popLayout">
            {items.map(item => (
              <ItemCard
                key={item.id}
                item={item}
                isDragging={item.id === activeId}
                onEdit={onEdit}
                onSchedule={onSchedule}
                onDelete={onDelete}
              />
            ))}
          </AnimatePresence>
        )}
      </PublishedGrid>
    </StyledPublishedCard>
  )
}

// ── Main ──────────────────────────────────────────────────────────────────────

export function ContentPage() {
  const { data: items, isLoading, isError, refetch } = useQuery({
    queryKey: ['content', 'items'],
    queryFn: () => contentApi.items(),
  })
  const queryClient = useQueryClient()
  const [isLogModalOpen, setIsLogModalOpen] = useState(false)
  const [activeId, setActiveId] = useState<string | null>(null)
  const navigate = useNavigate()
  const { setCmdPaletteOpen, setCaptureModalOpen } = useUIStore()

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }))

  const advanceMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: ContentItem['status'] }) => contentApi.patchItem(id, { status }),
    onSuccess: (_, { status }) => {
      queryClient.invalidateQueries({ queryKey: ['content', 'items'] })
      toast.success(`Moved to ${STATUS_LABELS[status]}`)
    },
    onError: () => toast.error('Failed to update status'),
  })

  const patchMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => contentApi.patchItem(id, data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['content', 'items'] }); toast.success('Updated') },
    onError: () => toast.error('Failed to update'),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => contentApi.deleteItem(id),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['content', 'items'] }); toast.success('Deleted') },
    onError: () => toast.error('Failed to delete'),
  })

  const [editDialog, setEditDialog] = useState({ open: false, id: '', title: '' })
  const [scheduleDialog, setScheduleDialog] = useState({ open: false, id: '', date: '' })
  const [deleteDialog, setDeleteDialog] = useState({ open: false, id: '' })

  const byStatus = ['idea', 'in_progress', 'scheduled', 'published'].reduce<Record<string, ContentItem[]>>((acc, s) => {
    acc[s] = items?.filter(i => i.status === s) ?? []
    return acc
  }, {})

  const handleDragStart = (e: DragStartEvent) => setActiveId(String(e.active.id))
  const handleDragEnd = (e: DragEndEvent) => {
    setActiveId(null)
    const { active, over } = e
    if (!over) return
    const targetStatus = over.id as ContentItem['status']
    const draggedItem = items?.find(i => i.id === active.id)
    if (!draggedItem || draggedItem.status === targetStatus) return
    advanceMutation.mutate({ id: String(active.id), status: targetStatus })
  }

  const activeItem = activeId ? items?.find(i => i.id === activeId) : null
  const total = items?.length ?? 0
  const published = items?.filter(i => i.status === 'published').length ?? 0

  if (isError) {
    return (
      <PageRoot>
        <PageContent>
          <ErrorCard message="Could not load content pipeline" onRetry={() => refetch()} />
        </PageContent>
      </PageRoot>
    )
  }

  return (
    <PageContainer>
      <PageContent>
        <PageHeader
          icon={<PenLine />}
          eyebrow="Creator"
          title="Content"
          subtitle="Ideas, pipeline and publishing — manage your content engine in one place."
        />
        <AreaTabs
          defaultActiveKey="pipeline"
          items={[
          {
            key: 'pipeline',
            label: <><Columns3 size={14} /> Pipeline</>,
            children: (
              <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
                <PipelineGrid>
                  <FullRow>
                    <PageToolbar title="Content Pipeline">
                      {total > 0 && (
                        <StatsChip>
                          <StatBlock>
                            <StatChipLabel>Published</StatChipLabel>
                            <StatChipValue $color="#16a34a">{published}</StatChipValue>
                          </StatBlock>
                          <StatDivider />
                          <StatBlock>
                            <StatChipLabel>Total</StatChipLabel>
                            <StatChipValue>{total}</StatChipValue>
                          </StatBlock>
                        </StatsChip>
                      )}
                      <Button variant="primary" size="sm" onClick={() => setIsLogModalOpen(true)} startIcon={<Plus size={12} />}>
                        Capture Idea
                      </Button>
                    </PageToolbar>
                  </FullRow>

                  <PipelineCols>
                    {PIPELINE_COLS.map(status => (
                      <ColumnDropZone
                        key={status}
                        status={status}
                        items={byStatus[status] ?? []}
                        isLoading={isLoading}
                        activeId={activeId}
                        onEdit={(id, cur) => setEditDialog({ open: true, id, title: cur })}
                        onSchedule={(id, cur) => setScheduleDialog({ open: true, id, date: cur || new Date().toISOString().split('T')[0] })}
                        onDelete={(id) => setDeleteDialog({ open: true, id })}
                      />
                    ))}
                  </PipelineCols>

                  <Sidebar>
                    <EngagementWidget publishedItems={byStatus['published'] ?? []} />
                    <TwitterQueueCard />
                  </Sidebar>

                  <FullRow>
                    <PublishedDropZone
                      items={byStatus['published'] ?? []}
                      isLoading={isLoading}
                      activeId={activeId}
                      onEdit={(id, cur) => setEditDialog({ open: true, id, title: cur })}
                      onSchedule={(id, cur) => setScheduleDialog({ open: true, id, date: cur || new Date().toISOString().split('T')[0] })}
                      onDelete={(id) => setDeleteDialog({ open: true, id })}
                    />
                  </FullRow>
                </PipelineGrid>

                <DragOverlay>
                  {activeItem && (
                    <AppCard size="md" style={{ transform: 'rotate(2deg)', opacity: 0.95, width: 280 }}>
                      <p style={{ fontSize: 14, fontWeight: 500, margin: '0 0 8px' }}>{activeItem.title}</p>
                      <PlatformBadge style={PLATFORM_STYLE[activeItem.platform] ?? {}}>
                        {activeItem.platform}
                      </PlatformBadge>
                    </AppCard>
                  )}
                </DragOverlay>
              </DndContext>
            ),
          },
        ]} />

        <ContentCaptureModal open={isLogModalOpen} onClose={() => setIsLogModalOpen(false)} />

        <Dialog open={editDialog.open} onOpenChange={(open) => setEditDialog(d => ({ ...d, open }))} title="Edit task title">
          <div style={{ marginTop: 16 }}>
            <Input
              aria-label="New task title"
              value={editDialog.title}
              onChange={e => setEditDialog(d => ({ ...d, title: e.target.value }))}
            />
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 16 }}>
              <Button variant="ghost" onClick={() => setEditDialog(d => ({ ...d, open: false }))}>Cancel</Button>
              <Button variant="primary" onClick={() => {
                if (editDialog.title.trim()) patchMutation.mutate({ id: editDialog.id, data: { title: editDialog.title.trim() } })
                setEditDialog(d => ({ ...d, open: false }))
              }}>Save</Button>
            </div>
          </div>
        </Dialog>

        <Dialog open={scheduleDialog.open} onOpenChange={(open) => setScheduleDialog(d => ({ ...d, open }))} title="Set publish date">
          <div style={{ marginTop: 16 }}>
            <p style={{ fontSize: 14, color: 'var(--muted-foreground)', marginBottom: 8 }}>Format: YYYY-MM-DD</p>
            <Input
              aria-label="Publish date"
              value={scheduleDialog.date}
              onChange={e => setScheduleDialog(d => ({ ...d, date: e.target.value }))}
              placeholder="YYYY-MM-DD"
            />
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 16 }}>
              <Button variant="ghost" onClick={() => setScheduleDialog(d => ({ ...d, open: false }))}>Cancel</Button>
              <Button variant="primary" onClick={() => {
                const val = scheduleDialog.date.trim()
                patchMutation.mutate({ id: scheduleDialog.id, data: { publish_date: val || null } })
                setScheduleDialog(d => ({ ...d, open: false }))
              }}>Save</Button>
            </div>
          </div>
        </Dialog>

        <ConfirmDialog
          open={deleteDialog.open}
          onOpenChange={(open) => setDeleteDialog(d => ({ ...d, open }))}
          title="Delete this task?"
          description="Are you sure you want to permanently delete this content task?"
          destructive
          confirmLabel="Delete"
          onConfirm={() => {
            deleteMutation.mutate(deleteDialog.id)
            setDeleteDialog(d => ({ ...d, open: false }))
          }}
        />
      </PageContent>
    </PageContainer>
  )
}
