import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { toast } from 'sonner'
import { Plus, LayoutGrid, Edit2, Calendar, Trash2 } from 'lucide-react'
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
import { EmptyState } from '@/components/EmptyState'
import type { ContentItem } from '@/types'

const STATUS_COLS: ContentItem['status'][] = ['idea', 'in_progress', 'scheduled', 'published']

const STATUS_LABELS: Record<ContentItem['status'], string> = {
  idea:        'Ideas',
  in_progress: 'In Progress',
  scheduled:   'Scheduled',
  published:   'Published',
  archived:    'Archived',
}

const STATUS_STYLES: Record<ContentItem['status'], string> = {
  idea:        'border-border bg-card',
  in_progress: 'border-blue-500/30 bg-blue-500/5',
  scheduled:   'border-amber-500/30 bg-amber-500/5',
  published:   'border-emerald-500/30 bg-emerald-500/5',
  archived:    'border-border bg-muted/20',
}

const STATUS_ACCENT: Record<ContentItem['status'], string> = {
  idea:        'bg-zinc-500/20 text-zinc-400',
  in_progress: 'bg-blue-500/20 text-blue-400',
  scheduled:   'bg-amber-500/20 text-amber-400',
  published:   'bg-emerald-500/20 text-emerald-400',
  archived:    'bg-muted text-muted-foreground',
}

const PLATFORM_BADGE: Record<string, string> = {
  linkedin:  'bg-blue-600/20 text-blue-400',
  twitter:   'bg-sky-500/20 text-sky-400',
  instagram: 'bg-pink-500/20 text-pink-400',
  youtube:   'bg-red-500/20 text-red-400',
  blog:      'bg-amber-500/20 text-amber-400',
}

// ─── Card ──────────────────────────────────────────────────────────────────────

function ItemCard({ item, isDragging, onEdit, onSchedule, onDelete }: { 
  item: ContentItem; 
  isDragging?: boolean;
  onEdit: (id: string, current: string) => void;
  onSchedule: (id: string, current: string | null) => void;
  onDelete: (id: string) => void;
}) {
  const { attributes, listeners, setNodeRef, transform } = useDraggable({ id: item.id })

  const style = transform
    ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)` }
    : undefined

  return (
    <motion.div
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
          'bg-background border border-border rounded-lg p-3 space-y-2 group relative',
          'cursor-grab active:cursor-grabbing touch-none select-none',
          'hover:border-border/80 hover:shadow-sm transition-shadow',
          isDragging && 'opacity-50 ring-2 ring-primary shadow-lg',
        )}
        aria-roledescription="Draggable content card"
      >
        <p className="text-sm font-medium text-foreground leading-tight pr-14">{item.title}</p>
        
        <div className="absolute top-2 right-2 hidden group-hover:flex items-center gap-0.5 bg-background/90 backdrop-blur rounded border border-border shadow-sm p-0.5 z-10">
           <button onClick={(e) => { e.stopPropagation(); onEdit(item.id, item.title) }} className="p-1 hover:text-foreground text-muted-foreground transition" title="Edit title"><Edit2 className="w-3 h-3" /></button>
           <button onClick={(e) => { e.stopPropagation(); onSchedule(item.id, item.publish_date ?? null) }} className="p-1 hover:text-amber-500 text-muted-foreground transition" title="Schedule"><Calendar className="w-3 h-3" /></button>
           <button onClick={(e) => { e.stopPropagation(); onDelete(item.id) }} className="p-1 hover:text-destructive text-muted-foreground transition" title="Delete"><Trash2 className="w-3 h-3" /></button>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <span className={cn('text-[10px] font-semibold px-1.5 py-0.5 rounded', PLATFORM_BADGE[item.platform] ?? 'bg-muted text-muted-foreground')}>
            {item.platform}
          </span>
          {item.publish_date && (
            <span className="text-[10px] text-muted-foreground">
              {new Date(item.publish_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
            </span>
          )}
        </div>
      </div>
    </motion.div>
  )
}

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
        'rounded-3xl border p-4 min-h-[180px] transition-colors',
        STATUS_STYLES[status],
        isOver && 'ring-2 ring-primary/50 bg-primary/5',
      )}
      role="region"
      aria-label={`${STATUS_LABELS[status]} column`}
    >
      {/* Column header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            {STATUS_LABELS[status]}
          </h3>
          <span className={cn(
            'text-[10px] font-semibold px-1.5 py-0.5 rounded-full min-w-[1.2rem] text-center',
            STATUS_ACCENT[status]
          )}>
            {isLoading ? '·' : items.length}
          </span>
        </div>
      </div>

      {/* Cards with AnimatePresence */}
      <div className="space-y-2">
        {isLoading ? (
          <>
            <Skeleton className="h-16 rounded-lg" />
            <Skeleton className="h-14 rounded-lg" />
          </>
        ) : items.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-6 text-center">
            <LayoutGrid className="w-5 h-5 text-muted-foreground/30 mb-2" aria-hidden="true" />
            <p className="text-xs text-muted-foreground/50">Drop cards here</p>
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
    const title = window.prompt('Edit task title:', current)
    if (title !== null && title.trim()) {
      patchMutation.mutate({ id, data: { title: title.trim() } })
    }
  }

  const handleSchedule = (id: string, current: string | null) => {
    const date = window.prompt('Set publish date (YYYY-MM-DD):', current || new Date().toISOString().split('T')[0])
    if (date !== null) {
      if (!date.trim()) {
        patchMutation.mutate({ id, data: { publish_date: null } })
      } else {
        patchMutation.mutate({ id, data: { publish_date: date.trim() } })
      }
    }
  }

  const handleDelete = (id: string) => {
    if (window.confirm('Delete this task?')) {
      deleteMutation.mutate(id)
    }
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

  const byStatus = STATUS_COLS.reduce<Record<string, ContentItem[]>>((acc, s) => {
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

  return (
    <div className="p-4 sm:p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-foreground">Content</h1>
        {total > 0 && (
          <div className="text-xs text-muted-foreground">
            <span className="font-semibold text-emerald-500">{published}</span> published · {total} total
          </div>
        )}
      </div>

      {/* Add idea form */}
      <div className="bg-card premium-shadow rounded-3xl p-6">
        <h2 className="text-sm font-semibold mb-3">New Idea</h2>
        <div className="flex gap-2 flex-wrap items-start">
          <div className="flex flex-col gap-1 flex-1 min-w-[140px]">
            <input
              placeholder="Content idea…"
              value={form.title}
              onChange={e => { setForm(f => ({ ...f, title: e.target.value })); setTitleError('') }}
              aria-label="Content idea title"
              aria-invalid={!!titleError}
              onKeyDown={e => { if (e.key === 'Enter') handleAdd() }}
              className="px-3 py-2 text-sm rounded-lg bg-muted border border-border text-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 aria-invalid:border-destructive"
            />
            {titleError && <span className="text-xs text-destructive">{titleError}</span>}
          </div>
          <select
            value={form.platform}
            onChange={e => setForm(f => ({ ...f, platform: e.target.value }))}
            aria-label="Platform"
            className="px-3 py-2 text-sm rounded-lg bg-muted border border-border text-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
          >
            {['linkedin', 'twitter', 'instagram', 'youtube', 'blog'].map(p => (
              <option key={p} value={p}>{p}</option>
            ))}
          </select>
          <button
            onClick={handleAdd}
            disabled={addItem.isPending}
            className="flex items-center gap-1.5 px-3 py-2 text-sm rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          >
            <Plus className="w-4 h-4" aria-hidden="true" /> Add
          </button>
        </div>
      </div>

      {/* Kanban board */}
      {isError ? (
        <ErrorCard message="Could not load content pipeline" onRetry={() => refetch()} />
      ) : (
        <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {STATUS_COLS.map(status => (
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

          <DragOverlay>
            {activeItem && (
              <div className="bg-background border-2 border-primary rounded-lg p-3 shadow-2xl rotate-1 opacity-95 scale-105">
                <p className="text-sm font-medium text-foreground">{activeItem.title}</p>
                <span className={cn('text-[10px] font-semibold px-1.5 py-0.5 rounded mt-1 inline-block', PLATFORM_BADGE[activeItem.platform] ?? 'bg-muted text-muted-foreground')}>
                  {activeItem.platform}
                </span>
              </div>
            )}
          </DragOverlay>
        </DndContext>
      )}
    </div>
  )
}
