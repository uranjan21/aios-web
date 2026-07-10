import React, { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Rocket, Plus, Briefcase } from 'lucide-react'
import { PageContainer, PageContent } from '@/components/layout/PageLayout'
import { PageDivider } from '@/components/layout/PageDivider'
import { PageHeader, Button, Card as GlassCard, Badge } from '@ledgr/ui'
import { EmptyState } from '@/components/EmptyState'
import styled from 'styled-components'

import { businessApi } from '@/api/areas'
import { Business } from '@/types'
import { BusinessDetailView } from '@/components/areas/business/BusinessDetailView'
import { CreateBusinessModal } from '@/components/areas/business/CreateBusinessModal'
import { WorkspaceStatsWidget } from '@/components/workspace/WorkspaceStatsWidget'
import { Skeleton } from '@/components/ui/skeleton'
import { motion } from 'framer-motion'

const Grid = styled.div`
  display: grid;
  grid-template-columns: repeat(1, minmax(0, 1fr));
  row-gap: 1rem;
  column-gap: 1.5rem;
  @media (min-width: 640px) {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
  @media (min-width: 1024px) {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }
`

const BusinessCardContent = styled.div`
  display: flex;
  flex-direction: column;
  gap: 12px;
`

const BusinessDescription = styled.div`
  font-size: 14px;
  color: var(--muted-foreground);
  line-height: 1.5;
  min-height: 42px;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
`

export function BusinessPage() {
  const [selectedBusiness, setSelectedBusiness] = useState<Business | null>(null)
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)

  const { data: businesses, isLoading } = useQuery({
    queryKey: ['business', 'list'],
    queryFn: businessApi.list,
  })

  if (selectedBusiness) {
    return <BusinessDetailView business={selectedBusiness} onBack={() => setSelectedBusiness(null)} />
  }

  return (
    <PageContainer>
      <PageContent>
          <PageHeader
            icon={<Briefcase />}
            eyebrow="Portfolio"
            title="Your Businesses"
            subtitle="Manage all your ventures, side-hustles, and projects from a single hub."
            actions={
              <Button variant="primary" size="sm" onClick={() => setIsCreateModalOpen(true)}>
                <Plus size={14} style={{ marginRight: 6 }} /> New Business
              </Button>
            }
          />
        <PageDivider />
        <WorkspaceStatsWidget domain="business" />
        {isLoading ? (
          <Grid>
            <Skeleton style={{ height: 200, borderRadius: 12 }} />
            <Skeleton style={{ height: 200, borderRadius: 12 }} />
            <Skeleton style={{ height: 200, borderRadius: 12 }} />
          </Grid>
        ) : businesses && businesses.length > 0 ? (
          <Grid>
            {businesses.map((business, i) => (
              <motion.div
                key={business.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 }}
                onClick={() => setSelectedBusiness(business)}
                style={{ cursor: 'pointer', height: '100%' }}
              >
                <GlassCard
                  title={business.name}
                  icon={<Rocket color={business.color || "var(--primary)"} size={20} />}
                  hoverable
                  style={{ height: '100%' }}
                  action={<Badge tone="neutral" style={{ textTransform: 'capitalize' }}>{business.business_type}</Badge>}
                >
                  <BusinessCardContent>
                    <BusinessDescription>
                      {business.description || 'No description provided.'}
                    </BusinessDescription>
                  </BusinessCardContent>
                </GlassCard>
              </motion.div>
            ))}
          </Grid>
        ) : (
          <div style={{ marginTop: '3rem' }}>
            <EmptyState
              icon={Briefcase}
              title="No businesses yet"
              description="Start tracking your first venture or side hustle."
              action={{ label: "Create Business", onClick: () => setIsCreateModalOpen(true) }}
            />
          </div>
        )}
      </PageContent>
      <CreateBusinessModal open={isCreateModalOpen} onClose={() => setIsCreateModalOpen(false)} />
    </PageContainer>
  )
}
