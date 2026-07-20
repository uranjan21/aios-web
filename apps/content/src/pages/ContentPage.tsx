import { useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import dayjs, { Dayjs } from 'dayjs'
import { Button, PageHeader, AreaToolbar, ToolbarMeta, Input, Select, HeaderActionPortal } from '@ledgr/ui'
import {
  PenLine, LayoutDashboard, Columns3, CalendarDays, Library, Megaphone, BarChart3,
  Plus, Search, ChevronLeft, ChevronRight, Settings,
} from 'lucide-react'
import styled from 'styled-components'
import { contentApi } from '@aios/shared/api/areas'
import { ErrorState } from '@ledgr/ui'
import { AreaTabs } from '@aios/shared/components/ui/AreaTabs'
import { PageContainer, PageContent } from '@aios/shared/components/layout/PageLayout'
import type { ContentItem } from '@aios/shared/types'
import { OverviewTab } from '@aios/content/components/OverviewTab'
import { PipelineTab } from '@aios/content/components/PipelineTab'
import { CalendarTab } from '@aios/content/components/CalendarTab'
import { LibraryTab } from '@aios/content/components/LibraryTab'
import { CampaignsTab } from '@aios/content/components/CampaignsTab'
import { AnalyticsTab } from '@aios/content/components/AnalyticsTab'
import { ContentEditorDrawer } from '@aios/content/components/ContentEditorDrawer'
import { PLATFORM_META, STATUS_LABELS, PLATFORMS, CONTENT_TYPES } from '@aios/content/components/contentMeta'

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
  const navigate = useNavigate()
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
          <ErrorState title="Could not load content" onRetry={() => refetch()} />
        </PageContent>
      </PageContainer>
    )
  }

  // ── The one shared toolbar — its contents swap with the active tab ──────────
  const renderToolbarButton = () => (
    <Button variant="primary" size="sm" startIcon={<Plus size={14} />} onClick={openNew}>
      {tab === 'campaigns' ? 'New Campaign' : 'New Content'}
    </Button>
  )

  let toolbar: React.ReactNode = null
  if (tab === 'library') {
    toolbar = (
      <AreaToolbar
        title="Content Library"
        left={<ToolbarMeta>{libraryRows.length} of {allItems.length} pieces</ToolbarMeta>}
        style={{ marginBottom: 16 }}
      >
        <SearchWrap>
          <Search size={14} />
          <Input aria-label="Search content" placeholder="Search…" value={q} onChange={e => setQ(e.target.value)} size="sm" />
        </SearchWrap>
        <Select
          size="sm"
          aria-label="Platform filter"
          value={platform}
          onChange={v => setPlatform(String(v))}
          options={[
            { value: 'all', label: 'All platforms' },
            ...PLATFORMS.map(p => ({ value: p, label: PLATFORM_META[p].label })),
          ]}
        />
        <Select
          size="sm"
          aria-label="Status filter"
          value={status}
          onChange={v => setStatus(String(v))}
          options={[
            { value: 'all', label: 'All status' },
            ...(Object.keys(STATUS_LABELS) as ContentItem['status'][]).map(s => ({ value: s, label: STATUS_LABELS[s] })),
          ]}
        />
        <Select
          size="sm"
          aria-label="Type filter"
          value={type}
          onChange={v => setType(String(v))}
          options={[
            { value: 'all', label: 'All types' },
            ...CONTENT_TYPES.map(t => ({ value: t, label: t.charAt(0).toUpperCase() + t.slice(1) })),
          ]}
        />
        {renderToolbarButton()}
      </AreaToolbar>
    )
  } else if (tab === 'calendar') {
    toolbar = (
      <AreaToolbar title={cursor.format('MMMM YYYY')} style={{ marginBottom: 16 }}>
        <Button variant="outline" size="sm" aria-label="Previous month" onClick={() => setCursor(c => c.subtract(1, 'month'))}><ChevronLeft size={14} /></Button>
        <Button variant="ghost" size="sm" onClick={() => setCursor(dayjs())}>Today</Button>
        <Button variant="outline" size="sm" aria-label="Next month" onClick={() => setCursor(c => c.add(1, 'month'))}><ChevronRight size={14} /></Button>
        {renderToolbarButton()}
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
            <Button variant="outline" size="sm" onClick={() => navigate('/app/settings')}>
              <Settings size={14} style={{ marginRight: 6 }} /> Settings
            </Button>
          }
        />

        {['overview', 'pipeline', 'analytics'].includes(tab) && (
          <HeaderActionPortal>
            <Button variant="primary" size="sm" startIcon={<Plus size={14} />} onClick={openNew}>
              New Content
            </Button>
          </HeaderActionPortal>
        )}

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
              key: 'campaigns',
              label: <TabLabel><Megaphone size={14} /> Campaigns</TabLabel>,
              children: <CampaignsTab onRegisterNew={(fn) => { campaignNewRef.current = fn }} />,
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
