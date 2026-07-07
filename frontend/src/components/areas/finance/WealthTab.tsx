import { useState } from 'react'
import { WorkspaceLayout } from '@/components/layout/WorkspaceLayout'
import { InvestmentsTab } from './InvestmentsTab'
import { AccountsTabModal } from './QuickAddAccounts'

export function WealthTab() {
  const [modalOpen, setModalOpen] = useState(false)

  return (
    <>
      <WorkspaceLayout rail={undefined}>
        <InvestmentsTab onAddClick={() => setModalOpen(true)} />
      </WorkspaceLayout>

      <AccountsTabModal open={modalOpen} onClose={() => setModalOpen(false)} defaultTab="Investment" />
    </>
  )
}

