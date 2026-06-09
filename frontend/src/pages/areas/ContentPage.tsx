import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { toast } from 'sonner'
import { Plus, LayoutGrid } from 'lucide-react'
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from '@dnd-kit/core'
import { useDroppable } from '@dnd-kit/core'
import { useDraggable } from '@dnd-kit/core'
import { contentApi } from '@/api/areas'
import { cn } from '@/lib/utils'
import { Skeleton } from '@/components/ui/skeleton'
import { ErrorCard } from '@/components/ErrorCard'
import { EmptyState } from '@/components/EmptyState'
import type { ContentItem } from '@/types'

const STATUS_COLS: ContentItem['status'][] = ['idea', 'in_progress', 'scheduled', 'published']

const STATUS_STYLES: Record<ContentItem['status'], string> = {
  idea: 'border-border bg-card',
  in_progress: 'border-blue-500/30 bg-blue-500/5',
  scheduled: 'border-amber-500/30 bg-amber-500/5',
  published: 'border-emerald-500/30 bg-emerald-500/5',
  archived: 'border-border bg-muted/20',
}

const PLATFORM_BADGE: Record<string, string> = {
  linkedin: 'bg-blue-600/20 text-blue-400',
  twitter: 'bg-sky-500/20 text-sky-400',
  instagram: 'bg-pink-500/20 text-pink-400',
  youtube: 'bg-red-500/20 text-red-400',
  blog: 'bg-amber-500/20 text-amber-400',
}

function ItemCard({ item, isDragging }: { item: ContentItem; isDragging?: boolean }) {
  const { attributes, listeners, setNodeRef, transform } = useDraggable({ id: item.id })

  const style = transform
    ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)` }
    : undefined

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      className={cn(
        'bg-background border border-border rounded-lg p-3 space-y-2 cursor-grab active:cursor-grabbing touch-none',
        isDragging && 'opacity-50 ring-2 ring-primary',
      )}
      aria-roledescription="Draggable content card"
    >
      <p className="text-sm font-medium text-foreground leading-tight">{item.title}</p>
      <span className={cn('text-[10px] font-semibold px-1.5 py-0.5 rounded', PLATFORM_BADGE[item.platform] ?? 'bg-muted text-muted-foreground')}>
        {item.platform}
      </span>
    </div>
  )
}

function ColumnDropZone({
  status,
  items,
  isLoading,
  activeId,
}: {
  status: ContentItem['status']
  items: ContentItem[]
  isLoading: boolean
  activeId: string | null
}) {
  const { setNodeRef, isOver } = useDroppable({ id: status })

  return (
    <div
      ref={setNodeRef}
      className={cn(
        'rounded-xl border p-3 space-y-2 min-h-[120px] transition-colors',
        STATUS_STYLES[status],
        isOver && 'ring-2 ring-primary/50 bg-primary/5',
      )}
      role="region"
      aria-label={`${status.replace('_', ' ')} column`}
    >
      <div className="flex items-center justify-between mb-1">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground capitalize">
          {status.replace('_', ' ')}
        </h3>
        <span className="text-xs text-muted-foreground" aria-label={`${items.length} items`}>
          {isLoading ? '…' : items.length}
        </span>
      </div>

      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 2 }).map((_, i) => <Skeleton key={i} className="h-16" />)}
        </div>
      ) : items.length === 0 ? (
        <EmptyState icon={LayoutGrid} title="Empty" description="Drag cards here" />
      ) : (
        items.map(item => (
          <ItemCard key={item.id} item={item} isDragging={item.id === activeId} />
        ))
      )}
    </div>
  )
}

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
      toast.success(`Moved to ${status.replace('_', ' ')}`)
    },
    onError: () => toast.error('Failed to update status'),
  })

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

  const handleDragStart = (e: DragStartEvent) => {
    setActiveId(String(e.active.id))
  }

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

  return (
    <div className="p-4 sm:p-6 space-y-6">
      <h1 className="text-2xl font-semibold text-foreground">Content</h1>

      {/* Add idea */}
      <div className="bg-card border border-border rounded-xl p-4">
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

      {/* Kanban */}
      {isError ? (
        <ErrorCard message="Could not load content pipeline" onRetry={() => refetch()} />
      ) : (
        <DndContext
          sensors={sensors}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {STATUS_COLS.map(status => (
              <ColumnDropZone
                key={status}
                status={status}
                items={byStatus[status] ?? []}
                isLoading={isLoading}
                activeId={activeId}
              />
            ))}
          </div>

          <DragOverlay>
            {activeItem && (
              <div className="bg-background border-2 border-primary rounded-lg p-3 shadow-xl rotate-1 opacity-95">
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
