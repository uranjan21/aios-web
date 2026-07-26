import { useState } from 'react'
import { InvestmentsTab } from './InvestmentsTab'
import { LoansTab } from './LoansTab'
import { AccountsTabModal } from './QuickAddAccounts'
import { Gem, Landmark } from 'lucide-react'
import { SideMenu } from '@ct/shared/components/ui/SideMenu'

export function WealthTab() {
  const [modalOpen, setModalOpen] = useState(false)
  const [activeKey, setActiveKey] = useState('investments')

  const menu = (
    <SideMenu
      activeKey={activeKey}
      onChange={setActiveKey}
      items={[
        { key: 'investments', label: 'Investments', icon: <Gem size={14} /> },
        { key: 'loans', label: 'Loans', icon: <Landmark size={14} /> },
      ]}
    />
  )

  return (
    <>
      {activeKey === 'investments' && <InvestmentsTab navMenu={menu} onAddClick={() => setModalOpen(true)} />}
      {activeKey === 'loans' && <LoansTab navMenu={menu} onAdd={() => setModalOpen(true)} />}
      <AccountsTabModal open={modalOpen} onClose={() => setModalOpen(false)} defaultTab={activeKey === 'loans' ? 'Loan' : 'Investment'} />
    </>
  )
}

