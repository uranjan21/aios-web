import { useState, useEffect } from 'react'
import { WorkspaceLayout } from '@/components/layout/WorkspaceLayout'
import { BudgetsTab } from './BudgetsTab'
import { GoalsTab } from './GoalsTab'
import { BillsTab } from './BillsTab'
import { SubscriptionManagement } from './AdvancedWidgets'
import { BudgetTabModal } from './QuickAddBudget'
import { TextTabs } from '@/components/ui/TextTabs'
import styled from 'styled-components'

const GridContainer = styled.div`
  display: grid;
  grid-template-columns: repeat(12, minmax(0, 1fr));
  gap: 1rem;
`

const GridItem = styled.div`
  grid-column: span 12 / span 12;
`

export function BudgetTab() {
  const [modalOpen, setModalOpen] = useState(false)
  const [activeTab, setActiveTab] = useState<'Budget' | 'Goal' | 'Bill' | 'Subscription'>('Budget')

  const openModal = (tab: 'Budget' | 'Goal' | 'Bill' | 'Subscription') => {
    setActiveTab(tab)
    setModalOpen(true)
  }

  useEffect(() => {
    const handleOpenModal = () => openModal('Budget')
    window.addEventListener('open-new-budget', handleOpenModal)
    return () => window.removeEventListener('open-new-budget', handleOpenModal)
  }, [])

  return (
    <>
      <WorkspaceLayout rail={undefined}>
        <div style={{ paddingBottom: '16px' }}>
          <TextTabs
            options={['Budget', 'Goal', 'Bill', 'Subscription']}
            value={activeTab}
            onChange={(val) => setActiveTab(val as any)}
          />
        </div>
        <GridContainer>
          {activeTab === 'Budget' && (
            <GridItem>
              <BudgetsTab />
            </GridItem>
          )}
          {activeTab === 'Bill' && (
            <GridItem>
              <BillsTab />
            </GridItem>
          )}
          {activeTab === 'Goal' && (
            <GridItem>
              <GoalsTab />
            </GridItem>
          )}
          {activeTab === 'Subscription' && (
            <GridItem>
              <SubscriptionManagement />
            </GridItem>
          )}
        </GridContainer>
      </WorkspaceLayout>

      <BudgetTabModal open={modalOpen} onClose={() => setModalOpen(false)} defaultTab={activeTab} />
    </>
  )
}
