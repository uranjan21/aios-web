import { useState } from 'react'
import { Plus } from 'lucide-react'
import { Button, AreaToolbar } from '@ledgr/ui'
import { WorkspaceLayout } from '@/components/layout/WorkspaceLayout'
import { InvestmentsTab } from './InvestmentsTab'
import { AccountsTabModal } from './QuickAddAccounts'

export function WealthTab() {
  const [modalOpen, setModalOpen] = useState(false)

  return (
    <>
      <WorkspaceLayout rail={undefined}>
        <AreaToolbar>
          <Button size="sm" variant="primary" onClick={() => setModalOpen(true)}>
            <Plus size={12} style={{ marginRight: 4 }} /> Add Investment
          </Button>
        </AreaToolbar>
        <InvestmentsTab />
      </WorkspaceLayout>

      <AccountsTabModal open={modalOpen} onClose={() => setModalOpen(false)} defaultTab="Investment" />
    </>
  )
}

