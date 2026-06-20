import { useState, useEffect } from 'react'
import { Plus } from 'lucide-react'
import { Button } from '@ledgr/ui'
import { WorkspaceLayout } from '@/components/layout/WorkspaceLayout'
import { AccountManager } from './AccountManager'
import { CategoryManager } from './CategoryManager'
import { InvestmentsTab } from './InvestmentsTab'
import { LoansTab } from './LoansTab'
import { PageToolbar } from '@/components/layout/PageLayout'
import { AccountsTabModal } from './QuickAddAccounts'
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

export function AccountsTab() {
  const [modalOpen, setModalOpen] = useState(false)
  const [activeTab, setActiveTab] = useState<'Account' | 'Category' | 'Investment' | 'Loan'>('Account')

  const openModal = (tab: 'Account' | 'Category' | 'Investment' | 'Loan') => {
    setActiveTab(tab)
    setModalOpen(true)
  }

  useEffect(() => {
    const handleOpenModal = () => openModal('Account')
    window.addEventListener('open-new-account', handleOpenModal)
    return () => window.removeEventListener('open-new-account', handleOpenModal)
  }, [])

  return (
    <>
      <WorkspaceLayout rail={undefined}>
        <div style={{ paddingBottom: '16px' }}>
          <TextTabs
            options={['Account', 'Category', 'Investment', 'Loan']}
            value={activeTab}
            onChange={(val) => setActiveTab(val as any)}
          />
        </div>
        <GridContainer>
          {activeTab === 'Account' && (
            <GridItem>
              <AccountManager />
            </GridItem>
          )}
          {activeTab === 'Category' && (
            <GridItem>
              <CategoryManager />
            </GridItem>
          )}
          {activeTab === 'Investment' && (
            <GridItem>
              <InvestmentsTab />
            </GridItem>
          )}
          {activeTab === 'Loan' && (
            <GridItem>
              <LoansTab />
            </GridItem>
          )}
        </GridContainer>
      </WorkspaceLayout>

      <AccountsTabModal open={modalOpen} onClose={() => setModalOpen(false)} defaultTab={activeTab} />
    </>
  )
}
