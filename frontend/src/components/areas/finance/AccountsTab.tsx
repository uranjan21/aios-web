import { useState, useEffect } from 'react'
import { Plus, Wallet, Tags, TrendingUp, Briefcase } from 'lucide-react'
import { Button } from '@ledgr/ui'
import { WorkspaceLayout } from '@/components/layout/WorkspaceLayout'
import { AccountManager } from './AccountManager'
import { CategoryManager } from './CategoryManager'
import { InvestmentsTab } from './InvestmentsTab'
import { LoansTab } from './LoansTab'
import { AreaToolbar, HeaderActionPortal } from '@ledgr/ui'
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
        <AreaToolbar
          left={
            <TextTabs
              options={[
                { label: <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}><Wallet size={14} /> Account</div>, value: 'Account' },
                { label: <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}><Tags size={14} /> Category</div>, value: 'Category' },
                { label: <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}><TrendingUp size={14} /> Investment</div>, value: 'Investment' },
                { label: <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}><Briefcase size={14} /> Loan</div>, value: 'Loan' }
              ]}
              value={activeTab}
              onChange={(val) => setActiveTab(val as any)}
            />
          }
        >
        </AreaToolbar>
        <HeaderActionPortal>
          <Button size="sm" variant="primary" onClick={() => setModalOpen(true)}>
            <Plus size={12} style={{ marginRight: 4 }} /> Add {activeTab}
          </Button>
        </HeaderActionPortal>
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
