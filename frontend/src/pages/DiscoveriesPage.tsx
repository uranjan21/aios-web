import styled from 'styled-components'
import { useQuery } from '@tanstack/react-query'
import { PageHeader, EmptyState } from '@ledgr/ui'
import { Sparkles } from 'lucide-react'
import { insightsApi } from '@/api/insights'
import { DiscoveriesFeed } from '@/components/dashboard/DiscoveriesFeed'
import { PageContainer, PageContent } from '@/components/layout/PageLayout'
import { PageDivider } from '@/components/layout/PageDivider'

export function DiscoveriesPage() {
  const { data: insights = [], isLoading } = useQuery({
    queryKey: ['insights', 'discoveries'],
    queryFn: insightsApi.discoveries,
    staleTime: 5 * 60_000,
  })

  return (
    <PageContainer>
      <PageContent>
      <PageHeader
        icon={<Sparkles />}
        eyebrow="Insights"
        title="Discoveries"
        subtitle="Cross-domain patterns the Synergy Engine found in your data"
      />
      <PageDivider />
      {!isLoading && insights.length === 0 ? (
        <EmptyState
          icon={<Sparkles size={24} />}
          title="No discoveries yet"
          description="Keep logging across domains — the nightly Synergy Engine needs about three weeks of overlapping data to find real patterns."
        />
      ) : (
        <DiscoveriesFeed limit={10} showSeeAll={false} />
      )}
      </PageContent>
    </PageContainer>
  )
}
