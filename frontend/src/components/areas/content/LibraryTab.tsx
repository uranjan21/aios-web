import { useMemo } from 'react'
import { Library } from 'lucide-react'
import styled from 'styled-components'
import { Table } from '@/components/ui/Table'
import { StatusPill } from '@/components/lumina'
import type { ContentItem, ContentCampaign } from '@/types'
import { PLATFORM_META, STATUS_LABELS, STATUS_TONE, platformLabel } from './contentMeta'

const TitleCell = styled.div`
  display: flex;
  flex-direction: column;
  gap: 2px;
`
const TitleText = styled.span`
  font-weight: 500;
  color: ${({ theme }) => theme.color.foreground};
`
const SubText = styled.span`
  font-size: 11px;
  color: ${({ theme }) => theme.color.mutedForeground};
  text-transform: capitalize;
`
const PlatformBadge = styled.span<{ $color: string; $bg: string }>`
  font-size: 10px;
  font-weight: 700;
  padding: 2px 8px;
  border-radius: 6px;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: ${({ $color }) => $color};
  background: ${({ $bg }) => $bg};
`
const Num = styled.span`
  font-variant-numeric: tabular-nums;
  color: ${({ theme }) => theme.color.foreground};
`

/**
 * Presentational Library table. Filtering + the shared toolbar live in
 * ContentPage (single page-level AreaToolbar); this tab only renders rows.
 */
export function LibraryTab({ rows, total, campaigns, onEdit }: {
  rows: ContentItem[]
  total: number
  campaigns: ContentCampaign[]
  onEdit: (item: ContentItem) => void
}) {
  const campaignName = useMemo(() => {
    const m: Record<string, string> = {}
    for (const c of campaigns) m[c.id] = c.name
    return m
  }, [campaigns])

  const columns = [
    {
      id: 'title', header: 'Title',
      cell: (row: ContentItem) => (
        <TitleCell>
          <TitleText>{row.title}</TitleText>
          <SubText>{row.content_type ?? '—'}{row.campaign_id ? ` · ${campaignName[row.campaign_id] ?? 'Campaign'}` : ''}</SubText>
        </TitleCell>
      ),
    },
    {
      id: 'platform', header: 'Platform',
      cell: (row: ContentItem) => {
        const p = PLATFORM_META[row.platform] ?? { color: 'var(--muted-foreground)', bg: 'var(--muted)' }
        return <PlatformBadge $color={p.color} $bg={p.bg}>{platformLabel(row.platform)}</PlatformBadge>
      },
    },
    {
      id: 'status', header: 'Status',
      cell: (row: ContentItem) => <StatusPill label={STATUS_LABELS[row.status]} tone={STATUS_TONE[row.status]} />,
    },
    {
      id: 'date', header: 'Date',
      cell: (row: ContentItem) => (
        <SubText>{row.publish_date ? new Date(row.publish_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: '2-digit' }) : '—'}</SubText>
      ),
    },
    {
      id: 'views', header: 'Views',
      cell: (row: ContentItem) => <Num>{row.status === 'published' ? row.views.toLocaleString('en-IN') : '—'}</Num>,
    },
    {
      id: 'likes', header: 'Likes',
      cell: (row: ContentItem) => <Num>{row.status === 'published' ? row.likes.toLocaleString('en-IN') : '—'}</Num>,
    },
  ]

  return (
    <>
      <Table
        rows={rows}
        columns={columns}
        getRowKey={(row: ContentItem) => row.id}
        onRowClick={(row: ContentItem) => onEdit(row)}
        empty={{
        icon: <Library size={20} />,
        title: total === 0 ? 'No content yet' : 'No content matches',
        description: total === 0 ? 'Create your first piece to fill the library.' : 'Try adjusting your filters above.',
      }}
      />
    </>
  )
}
