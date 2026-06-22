import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Button, PageHeader } from '@ledgr/ui'
import { PenLine, LayoutDashboard, Columns3, CalendarDays, Library, Megaphone, BarChart3, Plus } from 'lucide-react'
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

const TabLabel = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 6px;
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

  const allItems = items ?? []
  const allCampaigns = campaigns ?? []

  if (isError) {
    return (
      <PageContainer>
        <PageContent>
          <ErrorCard message="Could not load content" onRetry={() => refetch()} />
        </PageContent>
      </PageContainer>
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
          defaultActiveKey="overview"
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
              children: <CalendarTab items={allItems} onEdit={openEdit} />,
            },
            {
              key: 'library',
              label: <TabLabel><Library size={14} /> Library</TabLabel>,
              children: <LibraryTab items={allItems} campaigns={allCampaigns} onEdit={openEdit} />,
            },
            {
              key: 'campaigns',
              label: <TabLabel><Megaphone size={14} /> Campaigns</TabLabel>,
              children: <CampaignsTab />,
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
