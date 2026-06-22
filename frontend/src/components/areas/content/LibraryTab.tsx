import { useMemo, useState } from 'react'
import { Input, Select, SelectItem, AreaToolbar, ToolbarMeta } from '@ledgr/ui'
import { Library, Search } from 'lucide-react'
import styled from 'styled-components'
import { Table } from '@/components/ui/Table'
import { StatusPill } from '@/components/lumina'
import type { ContentItem, ContentCampaign } from '@/types'
import { PLATFORM_META, STATUS_LABELS, STATUS_TONE, PLATFORMS, CONTENT_TYPES, platformLabel } from './contentMeta'

const SearchWrap = styled.div`
  position: relative;
  min-width: 180px;
  svg { position: absolute; left: 10px; top: 50%; transform: translateY(-50%); color: ${({ theme }) => theme.color.mutedForeground}; pointer-events: none; }
  input { padding-left: 30px; }
`
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

export function LibraryTab({ items, campaigns, onEdit }: {
  items: ContentItem[]
  campaigns: ContentCampaign[]
  onEdit: (item: ContentItem) => void
}) {
  const [q, setQ] = useState('')
  const [platform, setPlatform] = useState('all')
  const [status, setStatus] = useState('all')
  const [type, setType] = useState('all')

  const campaignName = useMemo(() => {
    const m: Record<string, string> = {}
    for (const c of campaigns) m[c.id] = c.name
    return m
  }, [campaigns])

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase()
    return items.filter(i => {
      if (platform !== 'all' && i.platform !== platform) return false
      if (status !== 'all' && i.status !== status) return false
      if (type !== 'all' && i.content_type !== type) return false
      if (term && !(`${i.title} ${i.body ?? ''} ${i.tags ?? ''}`.toLowerCase().includes(term))) return false
      return true
    })
  }, [items, q, platform, status, type])

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
      <AreaToolbar
        title="Content Library"
        left={<ToolbarMeta>{filtered.length} of {items.length} pieces</ToolbarMeta>}
      >
        <SearchWrap>
          <Search size={14} />
          <Input aria-label="Search content" placeholder="Search…" value={q} onChange={e => setQ(e.target.value)} size="sm" />
        </SearchWrap>
        <Select size="sm" aria-label="Platform filter" value={platform} onChange={v => setPlatform(v as string)}>
          <SelectItem value="all">All platforms</SelectItem>
          {PLATFORMS.map(p => <SelectItem key={p} value={p}>{PLATFORM_META[p].label}</SelectItem>)}
        </Select>
        <Select size="sm" aria-label="Status filter" value={status} onChange={v => setStatus(v as string)}>
          <SelectItem value="all">All status</SelectItem>
          {(Object.keys(STATUS_LABELS) as ContentItem['status'][]).map(s => <SelectItem key={s} value={s}>{STATUS_LABELS[s]}</SelectItem>)}
        </Select>
        <Select size="sm" aria-label="Type filter" value={type} onChange={v => setType(v as string)}>
          <SelectItem value="all">All types</SelectItem>
          {CONTENT_TYPES.map(t => <SelectItem key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</SelectItem>)}
        </Select>
      </AreaToolbar>
      <Table
        rows={filtered}
        columns={columns}
        getRowKey={(row: ContentItem) => row.id}
        onRowClick={(row: ContentItem) => onEdit(row)}
        empty={{ icon: <Library size={20} />, title: 'No content matches', description: 'Try adjusting your filters or create new content.' }}
      />
    </>
  )
}
