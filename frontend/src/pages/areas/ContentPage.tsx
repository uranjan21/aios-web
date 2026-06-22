import { useMemo, useRef, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import dayjs, { Dayjs } from 'dayjs'
import { Button, PageHeader, AreaToolbar, ToolbarMeta, Input, Select, SelectItem } from '@ledgr/ui'
import {
  PenLine, LayoutDashboard, Columns3, CalendarDays, Library, Megaphone, BarChart3,
  Plus, Search, ChevronLeft, ChevronRight,
} from 'lucide-react'
import styled from 'styled-components'
import { contentApi } from '@/api/areas'
import { ErrorCard } from '@/components/ErrorCard'
import { AreaTabs } from '@/components/ui/AreaTabs'
import { PageContainer, PageContent } from '@/components/layout/PageLayout'
import type { ContentItem } from '@/types'
import { OverviewTab } from '@/components/areas/content/OverviewTab'
import { PipelineTab } from '@/components/areas/content/PipelineTab'
import { CalendarTab } from '@/components/areas/content/CalendarTab'
import { LibraryTab } from '@/components/areas/content/LibraryTab'
import { CampaignsTab } from '@/components/areas/content/CampaignsTab'
import { AnalyticsTab } from '@/components/areas/content/AnalyticsTab'
import { ContentEditorDrawer } from '@/components/areas/content/ContentEditorDrawer'
import { PLATFORM_META, STATUS_LABELS, PLATFORMS, CONTENT_TYPES } from '@/components/areas/content/contentMeta'

const TabLabel = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 6px;
`
const SearchWrap = styled.div`
  position: relative;
  min-width: 180px;
  svg { position: absolute; left: 10px; top: 50%; transform: translateY(-50%); color: ${({ theme }) => theme.color.mutedForeground}; pointer-events: none; }
  input { padding-left: 30px; }
`

export function ContentPage() {
  const { data: items, isLoading, isError, refetch } = useQuery({
    queryKey: ['content', 'items'],
    queryFn: () => contentApi.items(),
  })
  const { data: campaigns } = useQuery({
    queryKey: ['content', 'campaigns'],
    queryFn: contentApi.campaigns,
    staleTime: 30_000,
  })

  const [editor, setEditor] = useState<{ open: boolean; item: ContentItem | null }>({ open: false, item: null })
  const openNew = () => setEditor({ open: true, item: null })
  const openEdit = (item: ContentItem) => setEditor({ open: true, item })

  // ── Active tab + per-tab toolbar state (single page-level toolbar) ──────────
  const [tab, setTab] = useState('overview')

  // Library filters (lifted so the shared toolbar owns the controls)
  const [q, setQ] = useState('')
  const [platform, setPlatform] = useState('all')
  const [status, setStatus] = useState('all')
  const [type, setType] = useState('all')

  // Calendar cursor (lifted so the shared toolbar drives month nav)
  const [cursor, setCursor] = useState<Dayjs>(dayjs())

  // Campaigns "New Campaign" — CampaignsTab registers its opener here
  const campaignNewRef = useRef<() => void>(() => {})

  const allItems = items ?? []
  const allCampaigns = campaigns ?? []

  const libraryRows = useMemo(() => {
    const term = q.trim().toLowerCase()
    return allItems.filter(i => {
      if (platform !== 'all' && i.platform !== platform) return false
      if (status !== 'all' && i.status !== status) return false
      if (type !== 'all' && i.content_type !== type) return false
      if (term && !(`${i.title} ${i.body ?? ''} ${i.tags ?? ''}`.toLowerCase().includes(term))) return false
      return true
    })
  }, [allItems, q, platform, status, type])

  if (isError) {
    return (
      <PageContainer>
        <PageContent>
          <ErrorCard message="Could not load content" onRetry={() => refetch()} />
        </PageContent>
      </PageContainer>
    )
  }

  // ── The one shared toolbar — its contents swap with the active tab ──────────
  let toolbar: React.ReactNode = null
  if (tab === 'library') {
    toolbar = (
      <AreaToolbar
        title="Content Library"
        left={<ToolbarMeta>{libraryRows.length} of {allItems.length} pieces</ToolbarMeta>}
        style={{ marginTop: 8 }}
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
    )
  } else if (tab === 'calendar') {
    toolbar = (
      <AreaToolbar title={cursor.format('MMMM YYYY')} style={{ marginTop: 8 }}>
        <Button variant="outline" size="sm" aria-label="Previous month" onClick={() => setCursor(c => c.subtract(1, 'month'))}><ChevronLeft size={14} /></Button>
        <Button variant="ghost" size="sm" onClick={() => setCursor(dayjs())}>Today</Button>
        <Button variant="outline" size="sm" aria-label="Next month" onClick={() => setCursor(c => c.add(1, 'month'))}><ChevronRight size={14} /></Button>
      </AreaToolbar>
    )
  } else if (tab === 'campaigns') {
    toolbar = (
      <AreaToolbar title="Campaigns & Series" left={<ToolbarMeta>Group content into themed series</ToolbarMeta>} style={{ marginTop: 8 }}>
        <Button variant="primary" size="sm" startIcon={<Plus size={13} />} onClick={() => campaignNewRef.current()}>New Campaign</Button>
      </AreaToolbar>
    )
  }

  return (
    <PageContainer>
      <PageContent>
        <PageHeader
          icon={<PenLine />}
          eyebrow="Creator"
          title="Content"
          subtitle="Plan, draft, schedule and analyse your entire content engine in one place."
          actions={
            <Button variant="primary" size="sm" startIcon={<Plus size={14} />} onClick={openNew}>
              New Content
            </Button>
          }
        />

        <AreaTabs
          activeKey={tab}
          onChange={setTab}
          toolbar={toolbar}
          items={[
            {
              key: 'overview',
              label: <TabLabel><LayoutDashboard size={14} /> Overview</TabLabel>,
              children: <OverviewTab items={allItems} isLoading={isLoading} onEdit={openEdit} />,
            },
            {
              key: 'pipeline',
              label: <TabLabel><Columns3 size={14} /> Pipeline</TabLabel>,
              children: <PipelineTab items={allItems} isLoading={isLoading} onEdit={openEdit} />,
            },
            {
              key: 'calendar',
              label: <TabLabel><CalendarDays size={14} /> Calendar</TabLabel>,
              children: <CalendarTab items={allItems} cursor={cursor} onEdit={openEdit} />,
            },
            {
              key: 'library',
              label: <TabLabel><Library size={14} /> Library</TabLabel>,
              children: <LibraryTab rows={libraryRows} total={allItems.length} campaigns={allCampaigns} onEdit={openEdit} />,
            },
            {
              key: 'campaigns',
              label: <TabLabel><Megaphone size={14} /> Campaigns</TabLabel>,
              children: <CampaignsTab onRegisterNew={(fn) => { campaignNewRef.current = fn }} />,
            },
            {
              key: 'analytics',
              label: <TabLabel><BarChart3 size={14} /> Analytics</TabLabel>,
              children: <AnalyticsTab />,
            },
          ]}
        />

        <ContentEditorDrawer
          open={editor.open}
          item={editor.item}
          campaigns={allCampaigns}
          onClose={() => setEditor({ open: false, item: null })}
        />
      </PageContent>
    </PageContainer>
  )
}
