import { useEffect, useState } from 'react'
import { WorkspaceLayout } from '@aios/shared/components/layout/WorkspaceLayout'
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
        <BudgetsTab onAddClick={() => setModalOpen(true)} />
      </WorkspaceLayout>

      <BudgetTabModal open={modalOpen} onClose={() => setModalOpen(false)} defaultTab="Budget" />
    </>
  )
}
