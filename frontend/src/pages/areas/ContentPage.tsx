import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useState, forwardRef } from 'react'
import { Modal, Input } from 'antd'
import { toast } from 'sonner'
import { Plus, LayoutGrid, Edit2, Calendar, Trash2, TrendingUp, Eye, MousePointerClick, WandSparkles } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from '@dnd-kit/core'
import { useDroppable, useDraggable } from '@dnd-kit/core'
import { contentApi } from '@/api/areas'
import { cn } from '@/lib/utils'
import { Skeleton } from '@/components/ui/skeleton'
import { ErrorCard } from '@/components/ErrorCard'
import { TwitterQueueCard } from '@/components/areas/content/TwitterQueueCard'
import { DraftModal } from '@/components/areas/content/DraftModal'
import { StatusPill, type StatusPillTone } from '@/components/lumina'
import type { ContentItem } from '@/types'

const PIPELINE_COLS: ContentItem['status'][] = ['idea', 'in_progress', 'scheduled']

const STATUS_LABELS: Record<ContentItem['status'], string> = {
  idea:        'Ideas',
  in_progress: 'In Progress',
  scheduled:   'Scheduled',
  published:   'Published',
  archived:    'Archived',
}

const STATUS_STYLES: Record<ContentItem['status'], string> = {
  idea:        'border-border bg-card/40',
  in_progress: 'border-kpi-blue/20 bg-kpi-blue/5',
  scheduled:   'border-kpi-amber/20 bg-kpi-amber/5',
  published:   'border-kpi-emerald/20 bg-kpi-emerald/5',
  archived:    'border-border bg-muted/20',
}

const STATUS_TONE: Record<ContentItem['status'], StatusPillTone> = {
  idea:        'neutral',
  in_progress: 'blue',
  scheduled:   'amber',
  published:   'emerald',
  archived:    'neutral',
}

const PLATFORM_BADGE: Record<string, string> = {
  linkedin:  'bg-[#0A66C2]/10 text-[#0A66C2]',
  twitter:   'bg-sky-500/10 text-sky-600',
  instagram: 'bg-pink-500/10 text-pink-600',
  youtube:   'bg-red-500/10 text-red-600',
  blog:      'bg-amber-500/10 text-amber-600',
}

// ─── Card ──────────────────────────────────────────────────────────────────────

const ItemCard = forwardRef<HTMLDivElement, {
  item: ContentItem;
  isDragging?: boolean;
  onEdit: (id: string, current: string) => void;
  onSchedule: (id: string, current: string | null) => void;
  onDelete: (id: string) => void;
}>(function ItemCard({ item, isDragging, onEdit, onSchedule, onDelete }, ref) {
  const { attributes, listeners, setNodeRef, transform } = useDraggable({ id: item.id })

  const style = transform
    ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)` }
    : undefined

  return (
    <motion.div
      ref={ref}
      layout
      initial={{ opacity: 0, scale: 0.96, y: 8 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.94, y: -4 }}
      transition={{ duration: 0.18, ease: 'easeOut' }}
    >
      <div
        ref={setNodeRef}
        style={style}
        {...listeners}
        {...attributes}
        className={cn(
          'bg-card border border-subtle rounded-xl p-3 space-y-3 group relative shadow-premium-sm',
          'cursor-grab active:cursor-grabbing touch-none select-none',
          'hover:border-primary/30 hover:shadow-premium-hover transition-all duration-200',
          isDragging && 'opacity-50 ring-2 ring-primary shadow-xl scale-105 z-50',
        )}
        aria-roledescription="Draggable content card"
      >
        <p className="text-sm font-medium text-foreground leading-snug pr-14">{item.title}</p>
        
        <div className="absolute top-2 right-2 hidden group-hover:flex items-center gap-0.5 bg-background/95 backdrop-blur-md rounded-md border border-border/50 shadow-sm p-0.5 z-10">
           <button onClick={(e) => { e.stopPropagation(); onEdit(item.id, item.title) }} className="p-1.5 hover:bg-muted rounded hover:text-foreground text-muted-foreground transition" title="Edit title"><Edit2 className="w-3.5 h-3.5" /></button>
           <button onClick={(e) => { e.stopPropagation(); onSchedule(item.id, item.publish_date ?? null) }} className="p-1.5 hover:bg-amber-500/10 rounded hover:text-amber-600 text-muted-foreground transition" title="Schedule"><Calendar className="w-3.5 h-3.5" /></button>
           <button onClick={(e) => { e.stopPropagation(); onDelete(item.id) }} className="p-1.5 hover:bg-destructive/10 rounded hover:text-destructive text-muted-foreground transition" title="Delete"><Trash2 className="w-3.5 h-3.5" /></button>
        </div>

        <div className="flex items-center gap-2 flex-wrap pt-1">
          <span className={cn('text-[10px] font-bold px-2 py-0.5 rounded-md uppercase tracking-wider', PLATFORM_BADGE[item.platform] ?? 'bg-muted text-muted-foreground')}>
            {item.platform}
          </span>
          {item.publish_date && (
            <span className="text-xs font-medium text-muted-foreground flex items-center gap-1">
              <Calendar className="w-3 h-3" />
              {new Date(item.publish_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
            </span>
          )}
        </div>
      </div>
    </motion.div>
  )
})

// ─── Column ────────────────────────────────────────────────────────────────────

function ColumnDropZone({
  status, items, isLoading, activeId, onEdit, onSchedule, onDelete
}: {
  status: ContentItem['status']
  items: ContentItem[]
  isLoading: boolean
  activeId: string | null
  onEdit: (id: string, current: string) => void;
  onSchedule: (id: string, current: string | null) => void;
  onDelete: (id: string) => void;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: status })

  return (
    <div
      ref={setNodeRef}
      className={cn(
        'rounded-xl border p-3 min-h-[200px] transition-all duration-200',
        STATUS_STYLES[status],
        isOver && 'ring-2 ring-primary/50 bg-primary/5',
      )}
      role="region"
      aria-label={`${STATUS_LABELS[status]} column`}
    >
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-2">
          <h3 className="text-xs font-medium text-muted-foreground">
            {STATUS_LABELS[status]}
          </h3>
          <StatusPill
            label={isLoading ? '·' : String(items.length)}
            tone={STATUS_TONE[status]}
            className="min-w-[1.5rem] text-center"
          />
        </div>
      </div>

      <div className="space-y-3">
        {isLoading ? (
          <>
            <Skeleton className="h-24 rounded-xl" />
            <Skeleton className="h-24 rounded-xl" />
          </>
        ) : items.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-6 text-center border-2 border-dashed border-border/50 rounded-xl">
            <LayoutGrid className="w-5 h-5 text-muted-foreground/30 mb-2" aria-hidden="true" />
            <p className="text-xs text-muted-foreground/50 font-medium">Drop cards here</p>
          </div>
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
      </div>
    </div>
  )
}

// ─── Engagement Widget ─────────────────────────────────────────────────────────

function EngagementWidget({ publishedCount }: { publishedCount: number }) {
  return (
    <div className="bg-card border border-border shadow-sm rounded-xl p-4 flex flex-col justify-between h-full relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute -top-10 -right-10 w-32 h-32 bg-primary/5 rounded-full blur-2xl" />
      <div className="absolute -bottom-10 -left-10 w-32 h-32 bg-kpi-blue/5 rounded-full blur-2xl" />

      <div className="flex items-center justify-between mb-4 relative z-10">
        <div className="flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-primary" />
          <h2 className="text-xs font-medium text-muted-foreground">Engagement Over Time</h2>
        </div>
        <button className="text-xs font-medium px-2.5 py-1 bg-muted/50 hover:bg-muted text-muted-foreground rounded-md transition-colors">Details</button>
      </div>
      
      <div className="space-y-4 flex-1 relative z-10 flex flex-col justify-center">
        <div className="bg-background/50 rounded-xl p-4 border border-border hover:border-border transition-colors">
          <div className="flex justify-between items-center mb-1">
            <div className="flex items-center gap-1.5 text-muted-foreground">
              <Eye className="w-3.5 h-3.5" />
              <span className="text-xs font-medium">Total Views</span>
            </div>
            <span className="text-[10px] font-bold text-kpi-emerald bg-kpi-emerald/10 px-1.5 py-0.5 rounded">+12%</span>
          </div>
          <div className="text-xs font-medium text-foreground">
            {(publishedCount * 1240 + 8400).toLocaleString()}
          </div>
        </div>

        <div className="bg-background/50 rounded-xl p-4 border border-border hover:border-border transition-colors">
          <div className="flex justify-between items-center mb-1">
            <div className="flex items-center gap-1.5 text-muted-foreground">
              <MousePointerClick className="w-3.5 h-3.5" />
              <span className="text-xs font-medium">Avg. CTR</span>
            </div>
            <span className="text-[10px] font-bold text-kpi-blue bg-kpi-blue/10 px-1.5 py-0.5 rounded">Top 10%</span>
          </div>
          <div className="text-xs font-medium text-foreground">
            4.8%
          </div>
        </div>
        
        <div className="bg-background/50 rounded-xl p-4 border border-border hover:border-border transition-colors">
          <div className="flex justify-between items-baseline mb-3">
            <span className="text-xs font-medium text-muted-foreground">Top Platform</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="bg-[#0A66C2]/10 text-[#0A66C2] text-xs font-bold px-2 py-1 rounded-md uppercase tracking-wide">LinkedIn</span>
            <span className="text-xs font-semibold text-foreground">68% traffic</span>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Published Drop Zone ───────────────────────────────────────────────────────

function PublishedDropZone({
  items, isLoading, activeId, onEdit, onSchedule, onDelete
}: {
  items: ContentItem[]
  isLoading: boolean
  activeId: string | null
  onEdit: (id: string, current: string) => void;
  onSchedule: (id: string, current: string | null) => void;
  onDelete: (id: string) => void;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: 'published' })

  return (
    <div
      ref={setNodeRef}
      className={cn(
        "bg-kpi-emerald/5 border border-kpi-emerald/20 rounded-xl p-4 transition-all duration-300 min-h-[150px]",
        isOver && "ring-2 ring-kpi-emerald/50 bg-kpi-emerald/10 shadow-lg"
      )}
    >
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-kpi-emerald animate-pulse" />
          <h3 className="text-sm font-medium text-kpi-emerald">Published Content</h3>
        </div>
        <span className="text-xs font-bold text-kpi-emerald bg-kpi-emerald/10 px-3 py-1 rounded-full tabular-nums">
          {isLoading ? '·' : items.length} live
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 gap-4">
        {isLoading ? (
          <>
            <Skeleton className="h-28 rounded-xl" />
            <Skeleton className="h-28 rounded-xl" />
            <Skeleton className="h-28 rounded-xl" />
            <Skeleton className="h-28 rounded-xl" />
          </>
        ) : items.length === 0 ? (
          <div className="col-span-full flex flex-col items-center justify-center py-6 text-center border-2 border-dashed border-kpi-emerald/20 rounded-xl">
            <LayoutGrid className="w-6 h-6 text-kpi-emerald/40 mb-2" />
            <p className="text-sm text-kpi-emerald/60 font-medium">Drag items here to publish them</p>
          </div>
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
      </div>
    </div>
  )
}

// ─── Main page ────────────────────────────────────────────────────────────────

export function ContentPage() {
  const { data: items, isLoading, isError, refetch } = useQuery({
    queryKey: ['content', 'items'],
    queryFn: () => contentApi.items(),
  })
  const queryClient = useQueryClient()

  const [form, setForm] = useState({ title: '', platform: 'linkedin' })
  const [titleError, setTitleError] = useState('')
  const [draftOpen, setDraftOpen] = useState(false)
  const [activeId, setActiveId] = useState<string | null>(null)

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
  )

  const advanceMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: ContentItem['status'] }) =>
      contentApi.patchItem(id, { status }),
    onSuccess: (_, { status }) => {
      queryClient.invalidateQueries({ queryKey: ['content', 'items'] })
      toast.success(`Moved to ${STATUS_LABELS[status]}`)
    },
    onError: () => toast.error('Failed to update status'),
  })

  const patchMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => contentApi.patchItem(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['content', 'items'] })
      toast.success('Updated task')
    }
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => contentApi.deleteItem(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['content', 'items'] })
      toast.success('Deleted task')
    }
  })

  const handleEdit = (id: string, current: string) => {
    let inputValue = current
    Modal.confirm({
      title: 'Edit task title',
      content: (
        <Input 
          defaultValue={current} 
          onChange={e => inputValue = e.target.value} 
          className="mt-4"
        />
      ),
      onOk: () => {
        if (inputValue && inputValue.trim()) {
          patchMutation.mutate({ id, data: { title: inputValue.trim() } })
        }
      }
    })
  }

  const handleSchedule = (id: string, current: string | null) => {
    let inputValue = current || new Date().toISOString().split('T')[0]
    Modal.confirm({
      title: 'Set publish date',
      content: (
        <div className="mt-4">
          <p className="text-sm text-muted-foreground mb-2">Format: YYYY-MM-DD</p>
          <Input 
            defaultValue={inputValue} 
            onChange={e => inputValue = e.target.value} 
            placeholder="YYYY-MM-DD"
          />
        </div>
      ),
      onOk: () => {
        if (!inputValue.trim()) {
          patchMutation.mutate({ id, data: { publish_date: null } })
        } else {
          patchMutation.mutate({ id, data: { publish_date: inputValue.trim() } })
        }
      }
    })
  }

  const handleDelete = (id: string) => {
    Modal.confirm({
      title: 'Delete this task?',
      content: 'Are you sure you want to permanently delete this content task?',
      okText: 'Delete',
      okType: 'danger',
      onOk: () => {
        deleteMutation.mutate(id)
      }
    })
  }

  const addItem = useMutation({
    mutationFn: () => contentApi.createItem({ title: form.title, platform: form.platform }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['content', 'items'] })
      setForm(f => ({ ...f, title: '' }))
      setTitleError('')
      toast.success('Idea added to pipeline')
    },
    onError: () => toast.error('Failed to add idea'),
  })

  const handleAdd = () => {
    if (!form.title.trim()) { setTitleError('Title is required'); return }
    setTitleError('')
    addItem.mutate()
  }

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

  // Total counts for summary bar
  const total = items?.length ?? 0
  const published = items?.filter(i => i.status === 'published').length ?? 0

  if (isError) {
    return (
      <div className="min-h-screen bg-[hsl(var(--page-bg))] p-4 md:p-6">
        <div className="mx-auto max-w-[1200px]">
          <ErrorCard message="Could not load content pipeline" onRetry={() => refetch()} />
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[hsl(var(--page-bg))] p-4 md:p-6">
      <div className="mx-auto max-w-[1200px]">
      <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
        <div className="w-full grid grid-cols-12 gap-4">
          
          {/* Quick Capture Form & Stats */}
          <div className="col-span-12 bg-card border border-subtle rounded-xl p-4 flex flex-col lg:flex-row lg:items-center justify-between gap-4 shadow-premium-sm">
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 w-full lg:w-auto">
              <h2 className="text-sm font-medium text-muted-foreground whitespace-nowrap">Quick Capture</h2>
              <div className="flex gap-3 w-full sm:w-auto">
                <div className="flex flex-col gap-1 flex-1 min-w-[200px]">
                  <input
                    placeholder="What's your next big idea?"
                    value={form.title}
                    onChange={e => { setForm(f => ({ ...f, title: e.target.value })); setTitleError('') }}
                    aria-label="Content idea title"
                    aria-invalid={!!titleError}
                    onKeyDown={e => { if (e.key === 'Enter') handleAdd() }}
                    className="px-4 py-2 text-sm font-medium rounded-xl bg-muted/50 border border-border/50 text-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 aria-invalid:border-destructive transition-all"
                  />
                  {titleError && <span className="text-[10px] font-bold text-destructive absolute -bottom-4">{titleError}</span>}
                </div>
                <select
                  value={form.platform}
                  onChange={e => setForm(f => ({ ...f, platform: e.target.value }))}
                  aria-label="Platform"
                  className="px-4 py-2 text-sm font-medium rounded-xl bg-muted/50 border border-border/50 text-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 transition-all cursor-pointer"
                >
                  {['linkedin', 'twitter', 'instagram', 'youtube', 'blog'].map(p => (
                    <option key={p} value={p}>{p.charAt(0).toUpperCase() + p.slice(1)}</option>
                  ))}
                </select>
                <button
                  onClick={handleAdd}
                  disabled={addItem.isPending}
                  className="flex items-center gap-1.5 px-5 py-2 text-sm font-bold rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary shadow-sm hover:shadow-md"
                >
                  <Plus className="w-4 h-4" aria-hidden="true" /> Add
                </button>
                <button
                  onClick={() => form.title.trim() ? setDraftOpen(true) : setTitleError('Type an idea first')}
                  className="flex items-center gap-1.5 px-4 py-2 text-sm font-bold rounded-xl border border-violet-500/40 text-violet-400 hover:bg-violet-500/10 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500"
                  title="Generate an AI draft for this idea"
                >
                  <WandSparkles className="w-4 h-4" aria-hidden="true" /> Draft
                </button>
              </div>
            </div>

            {total > 0 && (
              <div className="flex items-center gap-4 bg-muted/30 px-4 py-2 rounded-xl border border-border whitespace-nowrap">
                <div className="flex flex-col items-center">
                  <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold">Published</span>
                  <span className="text-base font-bold text-kpi-emerald tabular-nums">{published}</span>
                </div>
                <div className="w-px h-8 bg-border/60" />
                <div className="flex flex-col items-center">
                  <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold">Pipeline</span>
                  <span className="text-base font-bold text-foreground tabular-nums">{total - published}</span>
                </div>
                <div className="w-px h-8 bg-border/60" />
                <div className="flex flex-col items-center">
                  <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold">Total</span>
                  <span className="text-base font-bold text-foreground tabular-nums">{total}</span>
                </div>
              </div>
            )}
          </div>

          {/* Pipeline Lists */}
          <div className="col-span-12 lg:col-span-9 grid grid-cols-1 md:grid-cols-3 gap-4">
            {PIPELINE_COLS.map(status => (
              <ColumnDropZone
                key={status}
                status={status}
                items={byStatus[status] ?? []}
                isLoading={isLoading}
                activeId={activeId}
                onEdit={handleEdit}
                onSchedule={handleSchedule}
                onDelete={handleDelete}
              />
            ))}
          </div>

          {/* Engagement Widget + Twitter Queue */}
          <div className="col-span-12 lg:col-span-3 space-y-4">
             <EngagementWidget publishedCount={published} />
             <TwitterQueueCard />
          </div>

          {/* Published Grid */}
          <div className="col-span-12">
            <PublishedDropZone
              items={byStatus['published'] ?? []}
              isLoading={isLoading}
              activeId={activeId}
              onEdit={handleEdit}
              onSchedule={handleSchedule}
              onDelete={handleDelete}
            />
          </div>

        </div>

        <DragOverlay>
          {activeItem && (
            <div className="bg-card border-2 border-primary rounded-xl p-4 shadow-2xl rotate-2 opacity-95 scale-105 z-[100] w-[280px]">
              <p className="text-sm font-medium text-foreground leading-snug">{activeItem.title}</p>
              <span className={cn('text-[10px] font-bold px-2 py-0.5 rounded-md uppercase tracking-wider mt-3 inline-block', PLATFORM_BADGE[activeItem.platform] ?? 'bg-muted text-muted-foreground')}>
                {activeItem.platform}
              </span>
            </div>
          )}
        </DragOverlay>
      </DndContext>
      <DraftModal open={draftOpen} onClose={() => setDraftOpen(false)} title={form.title} platform={form.platform} />
      </div>
    </div>
  )
}
