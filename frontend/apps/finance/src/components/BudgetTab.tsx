import { useEffect, useState } from 'react'
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
      <BudgetsTab onAddClick={() => setModalOpen(true)} />
      <BudgetTabModal open={modalOpen} onClose={() => setModalOpen(false)} defaultTab="Budget" />
    </>
  )
}
