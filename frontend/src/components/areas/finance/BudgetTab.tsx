import { useState } from 'react'
import { Plus } from 'lucide-react'
import { Button } from 'antd'
import { WorkspaceLayout } from '@/components/layout/WorkspaceLayout'
import { BudgetsTab } from './BudgetsTab'
import { GoalsTab } from './GoalsTab'
import { BillsTab } from './BillsTab'
import { SubscriptionManagement } from './AdvancedWidgets'
import { BudgetTabModal } from './QuickAddBudget'

export function BudgetTab() {
  const [modalOpen, setModalOpen] = useState(false)
  const [activeTab, setActiveTab] = useState<'Budget' | 'Goal' | 'Bill'>('Budget')

  const openModal = (tab: 'Budget' | 'Goal' | 'Bill') => {
    setActiveTab(tab)
    setModalOpen(true)
  }

  const toolbar = (
    <div className="sticky top-0 z-20 bg-card/75 backdrop-blur-md px-4 py-3 mb-4 rounded-2xl flex items-center justify-between gap-3 shadow-premium-sm border-0">
      <div className="text-[13px] font-semibold text-foreground">Budgets & Planning</div>
      <div className="flex items-center gap-1.5 ml-auto">
        <Button 
          size="small" 
          type="primary"
          onClick={() => openModal('Budget')} 
          className="text-[12px] font-medium flex items-center gap-1"
        >
          <Plus size={12} />
          <span>Add Budget Item</span>
        </Button>
      </div>
    </div>
  )

  return (
    <>
      <WorkspaceLayout rail={undefined}>
        {toolbar}
        <div className="grid grid-cols-12 gap-4">
          {/* Row 1: Budgets & Active Bills */}
          <div className="col-span-12">
            <BudgetsTab />
          </div>
          <div className="col-span-12">
            <BillsTab />
          </div>

          {/* Row 2: Savings Goals & Subscriptions */}
          <div className="col-span-12">
            <GoalsTab />
          </div>
          <div className="col-span-12">
            <SubscriptionManagement />
          </div>
        </div>
      </WorkspaceLayout>

      <BudgetTabModal open={modalOpen} onClose={() => setModalOpen(false)} defaultTab={activeTab} />
    </>
  )
}
