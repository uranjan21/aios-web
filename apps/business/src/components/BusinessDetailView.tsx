import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Rocket, Calendar, BarChart3, Settings as SettingsIcon } from 'lucide-react'
import { PageContainer, PageContent } from '@aios/shared/components/layout/PageLayout'
import { PageHeader, Button } from '@ledgr/ui'
import { AreaTabs } from '@aios/shared/components/ui/AreaTabs'
import { Business } from '@aios/shared/types'
import { EventsTab } from './EventsTab'
import { SummaryTab } from './SummaryTab'
import { SaasTabs } from './SaasTabs'
import { AgencyTabs } from './AgencyTabs'
import { EcommerceTabs } from './EcommerceTabs'
import { ContentTabs } from './ContentTabs'
import { FreelanceTabs } from './FreelanceTabs'

interface BusinessDetailViewProps {
  business: Business
  onBack: () => void
}

export function BusinessDetailView({ business, onBack }: BusinessDetailViewProps) {
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState('dashboard')

  const getDashboardTabContent = () => {
    switch (business.business_type) {
      case 'saas': return <SaasTabs />
      case 'agency': return <AgencyTabs />
      case 'ecommerce': return <EcommerceTabs />
      case 'content': return <ContentTabs />
      case 'freelance': return <FreelanceTabs />
      default: return <SummaryTab />
    }
  }

  return (
    <PageContainer>
      <PageContent>
        <PageHeader
          icon={<Rocket color={business.color} />}
          eyebrow={business.business_type.toUpperCase()}
          title={business.name}
          subtitle={business.description || "Manage your business operations."}
          actions={
            <div style={{ display: 'flex', gap: '8px' }}>
              <Button variant="outline" size="sm" onClick={() => navigate(`/app/areas/business/${business.id}/settings`)}>
                <SettingsIcon size={14} style={{ marginRight: 6 }} /> Settings
              </Button>
              <Button variant="ghost" size="sm" onClick={onBack}>
                <ArrowLeft size={14} style={{ marginRight: 6 }} /> Back to Portfolio
              </Button>
            </div>
          }
        />
        <AreaTabs
          activeKey={activeTab}
          onChange={setActiveTab}
          items={[
            {
              key: 'dashboard',
              label: <><Rocket size={14} /> Dashboard</>,
              children: getDashboardTabContent(),
            },
            {
              key: 'events',
              label: <><Calendar size={14} /> Events</>,
              children: <EventsTab businessId={business.id} />,
            },
            {
              key: 'summary',
              label: <><BarChart3 size={14} /> Summary</>,
              children: <SummaryTab businessId={business.id} />,
            },
          ]}
        />
      </PageContent>
    </PageContainer>
  )
}
