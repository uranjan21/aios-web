import { useState } from 'react'
import { Plus } from 'lucide-react'
import { Button } from 'antd'
import { WorkspaceLayout } from '@/components/layout/WorkspaceLayout'
import { AccountManager } from './AccountManager'
import { CategoryManager } from './CategoryManager'
import { InvestmentsTab } from './InvestmentsTab'
import { LoansTab } from './LoansTab'
import { AccountsTabModal } from './QuickAddAccounts'

export function AccountsTab() {
  const [modalOpen, setModalOpen] = useState(false)
  const [activeTab, setActiveTab] = useState<'Account' | 'Category' | 'Investment' | 'Loan'>('Account')

  const openModal = (tab: 'Account' | 'Category' | 'Investment' | 'Loan') => {
    setActiveTab(tab)
    setModalOpen(true)
  }

  const toolbar = (
    <div className="sticky top-0 z-20 bg-card/75 backdrop-blur-md px-4 py-3 mb-4 rounded-2xl flex items-center justify-between gap-3 shadow-premium-sm border-0">
      <div className="text-[13px] font-semibold text-foreground">Accounts & Assets</div>
      <div className="flex items-center gap-1.5 ml-auto">
        <Button 
          size="small" 
          type="primary"
          onClick={() => openModal('Account')} 
          className="text-[12px] font-medium flex items-center gap-1"
        >
          <Plus size={12} />
          <span>Add Financial Item</span>
        </Button>
      </div>
    </div>
  )

  return (
    <>
      <WorkspaceLayout rail={undefined}>
        {toolbar}
        <div className="grid grid-cols-12 gap-4">
          {/* Row 1: Accounts and Categories */}
          <div className="col-span-12">
            <AccountManager />
          </div>
          <div className="col-span-12">
            <CategoryManager />
          </div>

          {/* Row 2: Investments */}
          <div className="col-span-12">
            <InvestmentsTab />
          </div>

          {/* Row 3: Loans & EMIs */}
          <div className="col-span-12">
            <LoansTab />
          </div>
        </div>
      </WorkspaceLayout>

      <AccountsTabModal open={modalOpen} onClose={() => setModalOpen(false)} defaultTab={activeTab} />
    </>
  )
}
