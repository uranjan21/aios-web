import styled from 'styled-components'
import { useQuery } from '@tanstack/react-query'
import { History } from 'lucide-react'
import { Card, Stack } from '@ledgr/ui'
import { capturesApi } from '@/api/areas'
import { formatRelativeTime } from '@/lib/utils'
import { Skeleton } from '@/components/ui/skeleton'
import { Empty } from './shared'

/* ─────────────────── 5. RecentActivityCard ─────────────────── */

const ActivityList = styled.ul`
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
`

const ActivityItem = styled.li`
  display: flex;
  align-items: flex-start;
  gap: 10px;
  padding: 10px 0;
  &:not(:last-child) {
    border-bottom: 1px solid ${({ theme }) => theme.color.border};
  }
`

const ActivityDot = styled.span`
  flex-shrink: 0;
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: ${({ theme }) => theme.color.accent};
  margin-top: 7px;
`

const ActivityText = styled.span`
  flex: 1;
  font-size: 12.5px;
  color: ${({ theme }) => theme.color.foreground};
  line-height: 1.45;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`

const ActivityTime = styled.span`
  flex-shrink: 0;
  font-size: 11px;
  color: ${({ theme }) => theme.color.mutedForeground};
  font-variant-numeric: tabular-nums;
`

export function RecentActivityCard() {
  const { data: captures, isLoading } = useQuery({
    queryKey: ['captures', 'list'],
    queryFn: () => capturesApi.list(),
    staleTime: 60_000,
  })

  const items = Array.isArray(captures)
    ? (captures as Array<{ id: string; raw_text?: string; text?: string; created_at?: string }>)
        .slice()
        .sort((a, b) => (b.created_at ?? '').localeCompare(a.created_at ?? ''))
        .filter((c) => !!(c.raw_text || c.text))
        .slice(0, 6)
    : []

  return (
    <Card
      title="Recent Activity"
      subtitle="Latest captures across your inbox"
      icon={<History size={14} style={{ color: '#0891B2' }} />}
    >
      {isLoading ? (
        <Stack direction="column" gap={2}>
          <Skeleton style={{ height: 16, width: '100%' }} />
          <Skeleton style={{ height: 16, width: '85%' }} />
          <Skeleton style={{ height: 16, width: '70%' }} />
        </Stack>
      ) : items.length === 0 ? (
        <Empty>Nothing captured yet. Hit ⌘L or the Quick Capture button to log something.</Empty>
      ) : (
        <ActivityList>
          {items.map((c) => (
            <ActivityItem key={c.id}>
              <ActivityDot />
              <ActivityText title={c.raw_text || c.text || ''}>{c.raw_text || c.text || '—'}</ActivityText>
              <ActivityTime>{formatRelativeTime(c.created_at ?? null)}</ActivityTime>
            </ActivityItem>
          ))}
        </ActivityList>
      )}
    </Card>
  )
}
