import { forwardRef } from 'react'
import { useDraggable } from '@dnd-kit/core'
import { motion } from 'framer-motion'
import { Calendar, MessageCircle, Heart, Eye } from 'lucide-react'
import styled from 'styled-components'
import { Card as UiCard } from '@ledgr/ui'
import type { ContentItem } from '@aios/shared/types'
import { PLATFORM_META, PRIORITY_META, parseTags } from './contentMeta'

const Root = styled(motion.div)`
  position: relative;
`

const DragCard = styled(UiCard)<{ $dragging?: boolean }>`
  cursor: grab;
  user-select: none;
  touch-action: none;
  opacity: ${({ $dragging }) => ($dragging ? 0.4 : 1)};
  transition: border-color 120ms, box-shadow 120ms;
  && {
    padding: 12px;
  }
  &:hover {
    transform: none;
    border-color: ${({ theme }) => theme.color.accent};
    box-shadow: ${({ theme }) => theme.shadow.sm};
  }
`

const TopRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  margin-bottom: 8px;
`

const PlatformBadge = styled.span<{ $color: string; $bg: string }>`
  font-size: 10px;
  font-weight: 700;
  padding: 2px 8px;
  border-radius: 6px;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: ${({ $color }) => $color};
  background: ${({ $bg }) => $bg};
`

const PriorityDot = styled.span<{ $color: string }>`
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: ${({ $color }) => $color};
  flex-shrink: 0;
`

const Title = styled.p`
  font-size: 13.5px;
  font-weight: 500;
  color: ${({ theme }) => theme.color.foreground};
  line-height: 1.4;
  margin: 0 0 8px;
`

const Meta = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
  font-size: 11px;
  color: ${({ theme }) => theme.color.mutedForeground};
`

const MetaItem = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 3px;
  font-variant-numeric: tabular-nums;
`

const Tags = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  margin-top: 8px;
`

const Tag = styled.span`
  font-size: 10px;
  color: ${({ theme }) => theme.color.mutedForeground};
  background: ${({ theme }) => theme.color.muted};
  padding: 1px 6px;
  border-radius: 4px;
`

interface Props {
  item: ContentItem
  draggable?: boolean
  isDragging?: boolean
  onClick?: (item: ContentItem) => void
}

export const ContentCard = forwardRef<HTMLDivElement, Props>(function ContentCard(
  { item, draggable = true, isDragging, onClick }, _ref,
) {
  const dnd = draggable ? useDraggable({ id: item.id }) : null
  const style = dnd?.transform
    ? { transform: `translate3d(${dnd.transform.x}px, ${dnd.transform.y}px, 0)` }
    : undefined
  const platform = PLATFORM_META[item.platform] ?? { color: 'var(--muted-foreground)', bg: 'var(--muted)', label: item.platform }
  const priority = PRIORITY_META[item.priority] ?? PRIORITY_META.medium
  const tags = parseTags(item.tags)
  const showMetrics = item.status === 'published'

  return (
    <Root layout initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.96 }} transition={{ duration: 0.16 }}>
      <DragCard
        ref={dnd?.setNodeRef}
        size="none"
        style={style}
        $dragging={isDragging}
        onClick={() => onClick?.(item)}
        {...(dnd?.listeners ?? {})}
        {...(dnd?.attributes ?? {})}
      >
        <TopRow>
          <PlatformBadge $color={platform.color} $bg={platform.bg}>{platform.label}</PlatformBadge>
          <PriorityDot $color={priority.color} title={`${priority.label} priority`} />
        </TopRow>
        <Title>{item.title}</Title>
        <Meta>
          {item.publish_date && (
            <MetaItem><Calendar size={11} />{new Date(item.publish_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}</MetaItem>
          )}
          {showMetrics && <MetaItem><Eye size={11} />{item.views}</MetaItem>}
          {showMetrics && <MetaItem><Heart size={11} />{item.likes}</MetaItem>}
          {showMetrics && <MetaItem><MessageCircle size={11} />{item.comments}</MetaItem>}
          {item.content_type && !showMetrics && <MetaItem>{item.content_type}</MetaItem>}
        </Meta>
        {tags.length > 0 && (
          <Tags>{tags.slice(0, 3).map(t => <Tag key={t}>{t}</Tag>)}</Tags>
        )}
      </DragCard>
    </Root>
  )
})
