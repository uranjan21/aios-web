import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { EmptyState, Select } from '@ledgr/ui'
import { Twitter } from 'lucide-react'
import { contentApi } from '@aios/shared/api/areas'
import { Skeleton } from '@aios/shared/components/ui/skeleton'
import { Card } from '@ledgr/ui'
import styled from 'styled-components'
const StyledTwitter = styled(Twitter)`
  color: ${({ theme }) => theme.color.primary};
`
const CountLabel = styled.span`
  font-size: 11px;
  color: ${({ theme }) => theme.color.mutedForeground};
  white-space: nowrap;
`

const List = styled.div`
  max-height: 300px;
  overflow-y: auto;
  padding-right: 4px;
`

const EntryRow = styled.div`
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 10px 8px;
  border-bottom: 1px solid ${({ theme }) => theme.color.border}4d;
  border-radius: 0;
  transition: background 120ms;
  &:last-child { border-bottom: none; }
  &:hover {
    background: ${({ theme }) => theme.color.muted}33;
    border-radius: 8px;
  }
`

const Num = styled.span`
  font-size: 11px;
  color: ${({ theme }) => theme.color.mutedForeground};
  flex-shrink: 0;
  margin-top: 1px;
`

const EntryText = styled.span`
  font-size: 12px;
  color: ${({ theme }) => theme.color.foreground};
  line-height: 1.4;
  flex: 1;
`

const SkeletonStack = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
`

const QueueSkeleton = styled(Skeleton)`
  height: 32px;
  width: 100%;
`

/** Renders the vault's twitter-queue.md — list items become queue entries. */
export function TwitterQueueCard() {
  const [filter, setFilter] = useState('all')
  const { data, isLoading } = useQuery({
    queryKey: ['content', 'twitter-queue'],
    queryFn: contentApi.twitterQueue,
  })

  const raw: string = data?.raw_content ?? ''
  const entries = raw
    .split('\n')
    .map(l => l.trim())
    .filter(l => /^[-*]\s+|^\d+\.\s+/.test(l))
    .map(l => l.replace(/^[-*]\s+|^\d+\.\s+/, '').replace(/^\[[ x]\]\s*/i, ''))
    .filter(Boolean)

  return (
    <Card
      title="Twitter Queue"
      subtitle="Drafts staged to publish on X"
      size="md"
      icon={<StyledTwitter size={14} />}
      action={
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }} onClick={(e) => e.stopPropagation()}>
          <div style={{ width: '90px' }}>
            <Select
              size="sm"
              aria-label="Filter queue entries"
              value={filter}
              onChange={(val: any) => setFilter(val)}
              options={[
                { value: 'all', label: 'All Drafts' },
                { value: 'ready', label: 'Ready' },
                { value: 'ideas', label: 'Ideas' },
              ]}
            />
          </div>
          <CountLabel>{entries.length} items</CountLabel>
        </div>
      }
    >
      {isLoading ? (
        <SkeletonStack>
          <QueueSkeleton />
          <QueueSkeleton />
        </SkeletonStack>
      ) : entries.length === 0 ? (
        <EmptyState title="Queue empty" description="Add items to twitter-queue.md in the vault" />
      ) : (
        <List>
          {entries.map((e, i) => (
            <EntryRow key={i}>
              <Num>{i + 1}.</Num>
              <EntryText>{e}</EntryText>
            </EntryRow>
          ))}
        </List>
      )}
    </Card>
  )
}
