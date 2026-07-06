import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import {
  DndContext, DragOverlay, PointerSensor, useSensor, useSensors, useDroppable,
  type DragEndEvent, type DragStartEvent,
} from '@dnd-kit/core'
import { AnimatePresence } from 'framer-motion'
import { toast } from 'sonner'
import styled from 'styled-components'
import { Card as UiCard } from '@ledgr/ui'
import { contentApi } from '@/api/areas'
import { Skeleton } from '@/components/ui/skeleton'
import type { ContentItem, ContentStatus } from '@/types'
import { ContentCard } from './ContentCard'
import { PIPELINE_COLS, STATUS_LABELS } from './contentMeta'

const Board = styled.div`
  display: grid;
  grid-template-columns: 1fr;
  gap: 16px;
  @media (min-width: 768px) { grid-template-columns: repeat(2, 1fr); }
  @media (min-width: 1200px) { grid-template-columns: repeat(4, 1fr); }
`

const Column = styled(UiCard)<{ $over: boolean }>`
  display: flex;
  flex-direction: column;
  gap: 10px;
  min-height: 360px;
  overflow: visible;
  transition: background 150ms, border-color 150ms;
  && {
    padding: 12px;
    background: ${({ theme, $over }) => ($over ? `${theme.color.accent}14` : `${theme.color.muted}4d`)};
    border-color: ${({ theme, $over }) => ($over ? `${theme.color.accent}55` : 'transparent')};
  }
`

const ColHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 4px 4px;
`

const ColTitle = styled.h3`
  font-size: 13px;
  font-weight: 600;
  color: ${({ theme }) => theme.color.foreground};
  margin: 0;
`

const Count = styled.span`
  font-size: 11px;
  font-weight: 600;
  color: ${({ theme }) => theme.color.mutedForeground};
  background: ${({ theme }) => theme.color.muted};
  padding: 1px 8px;
  border-radius: ${({ theme }) => theme.radii.sm};
`

const Empty = styled.div`
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  color: ${({ theme }) => theme.color.mutedForeground};
  border: 2px dashed ${({ theme }) => theme.color.border};
  border-radius: 10px;
  padding: 16px;
  min-height: 80px;
`

function DropColumn({ status, items, isLoading, activeId, onClick }: {
  status: ContentStatus
  items: ContentItem[]
  isLoading: boolean
  activeId: string | null
  onClick: (item: ContentItem) => void
}) {
  const { setNodeRef, isOver } = useDroppable({ id: status })
  return (
    <Column ref={setNodeRef} size="none" $over={isOver}>
      <ColHeader>
        <ColTitle>{STATUS_LABELS[status]}</ColTitle>
        <Count>{items.length}</Count>
      </ColHeader>
      {isLoading ? (
        <>
          <Skeleton style={{ height: 84, borderRadius: 12 }} />
          <Skeleton style={{ height: 84, borderRadius: 12 }} />
        </>
      ) : (
        <AnimatePresence initial={false} mode="popLayout">
          {items.map(item => (
            <ContentCard key={item.id} item={item} isDragging={item.id === activeId} onClick={onClick} />
          ))}
        </AnimatePresence>
      )}
      {!isLoading && items.length === 0 && <Empty>Drop here</Empty>}
    </Column>
  )
}

export function PipelineTab({ items, isLoading, onEdit }: {
  items: ContentItem[]
  isLoading: boolean
  onEdit: (item: ContentItem) => void
}) {
  const queryClient = useQueryClient()
  const [activeId, setActiveId] = useState<string | null>(null)
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }))

  const advance = useMutation({
    mutationFn: ({ id, status }: { id: string; status: ContentStatus }) => contentApi.patchItem(id, { status }),
    onSuccess: (_, { status }) => {
      queryClient.invalidateQueries({ queryKey: ['content', 'items'] })
      queryClient.invalidateQueries({ queryKey: ['content', 'stats'] })
      toast.success(`Moved to ${STATUS_LABELS[status]}`)
    },
    onError: () => toast.error('Failed to move'),
  })

  const byStatus = PIPELINE_COLS.reduce<Record<string, ContentItem[]>>((acc, s) => {
    acc[s] = items.filter(i => i.status === s)
    return acc
  }, {})

  const handleDragEnd = (e: DragEndEvent) => {
    setActiveId(null)
    const { active, over } = e
    if (!over) return
    const target = over.id as ContentStatus
    const dragged = items.find(i => i.id === active.id)
    if (!dragged || dragged.status === target) return
    advance.mutate({ id: String(active.id), status: target })
  }

  const activeItem = activeId ? items.find(i => i.id === activeId) ?? null : null

  return (
    <DndContext
      sensors={sensors}
      onDragStart={(e: DragStartEvent) => setActiveId(String(e.active.id))}
      onDragEnd={handleDragEnd}
    >
      <Board>
        {PIPELINE_COLS.map(status => (
          <DropColumn
            key={status}
            status={status}
            items={byStatus[status] ?? []}
            isLoading={isLoading}
            activeId={activeId}
            onClick={onEdit}
          />
        ))}
      </Board>
      <DragOverlay>
        {activeItem && (
          <div style={{ transform: 'rotate(2deg)', width: 260 }}>
            <ContentCard item={activeItem} draggable={false} />
          </div>
        )}
      </DragOverlay>
    </DndContext>
  )
}
