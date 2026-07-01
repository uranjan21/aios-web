import { useState } from 'react'
import { Plus } from 'lucide-react'
import { Button, HeaderActionPortal } from '@ledgr/ui'
import { WorkspaceLayout } from '@/components/layout/WorkspaceLayout'
import { InvestmentsTab } from './InvestmentsTab'
import { AccountsTabModal } from './QuickAddAccounts'

export function WealthTab() {
  const [modalOpen, setModalOpen] = useState(false)

  return (
    <>
      <WorkspaceLayout rail={undefined}>
        <HeaderActionPortal>
          <Button size="sm" variant="primary" onClick={() => setModalOpen(true)}>
            <Plus size={12} style={{ marginRight: 4 }} /> Add Investment
          </Button>
        </HeaderActionPortal>
        <InvestmentsTab />
      </WorkspaceLayout>

      <AccountsTabModal open={modalOpen} onClose={() => setModalOpen(false)} defaultTab="Investment" />
    </>
  )
}
