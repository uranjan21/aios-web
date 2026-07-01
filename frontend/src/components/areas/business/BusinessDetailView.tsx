import React, { useState } from 'react'
import { ArrowLeft, Rocket, Calendar, BarChart3, Settings as SettingsIcon } from 'lucide-react'
import { PageContainer, PageContent } from '@/components/layout/PageLayout'
import { PageHeader, Button } from '@ledgr/ui'
import { AreaTabs } from '@/components/ui/AreaTabs'
import { Business } from '@/types'
import { EventsTab } from './EventsTab'
import { SummaryTab } from './SummaryTab'
import { SaasTabs } from './SaasTabs'
import { AgencyTabs } from './AgencyTabs'
import { EcommerceTabs } from './EcommerceTabs'
import { ContentTabs } from './ContentTabs'
import { FreelanceTabs } from './FreelanceTabs'
import { BusinessSettingsTab } from './BusinessSettingsTab'

interface BusinessDetailViewProps {
  business: Business
  onBack: () => void
}

export function BusinessDetailView({ business, onBack }: BusinessDetailViewProps) {
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
            <Button variant="ghost" size="sm" onClick={onBack}>
              <ArrowLeft size={14} style={{ marginRight: 6 }} /> Back to Portfolio
            </Button>
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
            {
              key: 'settings',
              label: <><SettingsIcon size={14} /> Settings</>,
              children: <BusinessSettingsTab business={business} onDeleted={onBack} />,
            },
          ]}
        />
      </PageContent>
    </PageContainer>
  )
}
