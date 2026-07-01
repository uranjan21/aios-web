import { useEffect, useState } from 'react'
import { Plus } from 'lucide-react'
import { Button, HeaderActionPortal } from '@ledgr/ui'
import { WorkspaceLayout } from '@/components/layout/WorkspaceLayout'
import { BudgetsTab } from './BudgetsTab'
import { BudgetTabModal } from './QuickAddBudget'

export function BudgetTab() {
  const [modalOpen, setModalOpen] = useState(false)

  useEffect(() => {
    const handleOpenBudget = () => setModalOpen(true)
    window.addEventListener('open-new-budget', handleOpenBudget)
    return () => window.removeEventListener('open-new-budget', handleOpenBudget)
  }, [])

  return (
    <>
      <WorkspaceLayout rail={undefined}>
        <HeaderActionPortal>
          <Button size="sm" variant="primary" onClick={() => setModalOpen(true)}>
            <Plus size={12} style={{ marginRight: 4 }} /> Add Budget
          </Button>
        </HeaderActionPortal>
        <BudgetsTab />
      </WorkspaceLayout>

      <BudgetTabModal open={modalOpen} onClose={() => setModalOpen(false)} defaultTab="Budget" />
    </>
  )
}
