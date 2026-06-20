// @ts-nocheck
import { useDroppable } from '@dnd-kit/core'
import type { ContentItem } from '@/types'
import styled from 'styled-components'
import { ItemCard } from '@/pages/areas/ContentPage'

const Column = styled.div<{ $over: boolean }>`
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 12px;
  border-radius: 12px;
  background: ${({ theme, $over }) => $over ? 'rgba(248, 209, 104, 0.05)' : `${theme.color.muted}4d`};
  border: 1px solid ${({ theme, $over }) => $over ? 'rgba(248, 209, 104, 0.2)' : 'transparent'};
  transition: background 150ms, border-color 150ms;
  min-height: 300px;
`

const ColHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 4px;
  margin-bottom: 4px;
`

const ColTitle = styled.h3`
  font-size: 14px;
  font-weight: 600;
  text-transform: capitalize;
  color: ${({ theme }) => theme.color.foreground};
  margin: 0;
`

const CountBadge = styled.span`
  font-size: 11px;
  font-weight: 500;
  color: ${({ theme }) => theme.color.mutedForeground};
  background: ${({ theme }) => theme.color.muted};
  padding: 1px 8px;
  border-radius: 999px;
`

const ItemList = styled.div`
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 12px;
`

const EmptyZone = styled.div`
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  color: ${({ theme }) => theme.color.mutedForeground};
  border: 2px dashed ${({ theme }) => theme.color.border};
  border-radius: 8px;
  padding: 16px;
`

const STATUS_LABELS: Record<string, string> = {
  idea: 'Ideas',
  in_progress: 'In Progress',
  scheduled: 'Scheduled',
  published: 'Published',
}

interface ColumnDropZoneProps {
  status: string
  items: ContentItem[]
  isLoading: boolean
  activeId: string | null
  onEdit: (id: string, current: string) => void
  onSchedule: (id: string, current: string | null) => void
  onDelete: (id: string) => void
}

export function ColumnDropZone({
  status,
  items,
  isLoading,
  activeId,
  onEdit,
  onSchedule,
  onDelete
}: ColumnDropZoneProps) {
  const { setNodeRef, isOver } = useDroppable({ id: status })
  return (
    <Column ref={setNodeRef} $over={isOver}>
      <ColHeader>
        <ColTitle>{STATUS_LABELS[status] || status}</ColTitle>
        <CountBadge>{items.length}</CountBadge>
      </ColHeader>
      <ItemList>
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
        {items.length === 0 && !isLoading && <EmptyZone>Drop here</EmptyZone>}
      </ItemList>
    </Column>
  )
}
