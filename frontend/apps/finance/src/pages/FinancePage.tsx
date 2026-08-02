import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button, HeaderActionPortal } from '@ledgr/ui'

import { HomeTab } from '@ct/finance/components/HomeTab'
import { TransactionsTab } from '@ct/finance/components/TransactionsTab'
import { InboxTab } from '@ct/finance/components/InboxTab'
import { BudgetTab } from '@ct/finance/components/BudgetTab'
import { PayablesTab } from '@ct/finance/components/PayablesTab'
import { InvestmentsTab } from '@ct/finance/components/InvestmentsTab'
import { LoansTab } from '@ct/finance/components/LoansTab'
import { AccountManager } from '@ct/finance/components/AccountManager'
import { AccountsTabModal } from '@ct/finance/components/QuickAddAccounts'
import { PageContainer, PageContent } from '@ct/shared/components/layout/PageLayout'
import { useAreaSection } from '@ct/shared/hooks/useAreaSection'
import { Settings } from 'lucide-react'

/**
 * Sub-page routing, 2026-08-01: the per-area `ModuleSidebar` and its `?tab=`
 * param are gone — every section below is a route in the global nav tree
 * (`apps/shell/src/config/navigation.ts`).
 *
 * Three sections were retired here:
 *  - `analytics` — no slot in the new nav.
 *  - `rules`     — RELOCATED, not deleted: auto-categorization becomes a
 *                  `controls` module on the Inbox page in Phase 4.
 *  - `goals`     — RELOCATED (2026-08-02). Goals and milestones are set in
 *                  Workspace for every domain, so no area owns a goal editor.
 *                  The savings-pot tracker still renders at
 *                  /app/workspace/goals?domain=finance; Overview keeps a
 *                  read-only progress module.
 * All three redirect to Overview rather than 404ing an old bookmark.
 */
const LEGACY_SECTIONS: Record<string, string> = {
  payables: 'bills',
  analytics: 'overview',
  rules: 'inbox',
  goals: 'overview',
}

export function FinancePage() {
  const navigate = useNavigate()
  const section = useAreaSection('/app/finance', 'overview', LEGACY_SECTIONS)

  const [accountModalOpen, setAccountModalOpen] = useState(false)
  /* One shared add-modal serves several sections, so it opens on the tab the
   * caller actually asked for — "Add loan" landing on Account was wrong. */
  const [accountModalTab, setAccountModalTab] = useState<'Account' | 'Investment' | 'Loan'>('Account')

  const openAddModal = (tab: 'Account' | 'Investment' | 'Loan') => {
    setAccountModalTab(tab)
    setAccountModalOpen(true)
  }

  useEffect(() => {
    const handler = () => openAddModal('Account')
    window.addEventListener('open-new-account', handler)
    return () => window.removeEventListener('open-new-account', handler)
  }, [])

  const renderContent = () => {
    switch (section) {
      case 'overview':     return <HomeTab />
      case 'transactions': return <TransactionsTab />
      case 'budgets':      return <BudgetTab />
      case 'bills':        return <PayablesTab />
      case 'investments':  return <InvestmentsTab onAddClick={() => openAddModal('Investment')} />
      case 'loans':        return <LoansTab onAdd={() => openAddModal('Loan')} />
      case 'inbox':        return <InboxTab />
      case 'accounts':     return <AccountManager />
      default:             return <HomeTab />
    }
  }

  return (
    <PageContainer>
      <PageContent>
        {/* Page-level actions portal into this page's own header block, which
            `PageContent` renders when — and only when — something is portalled.
            They used to land in the global TopBar. */}
        <HeaderActionPortal>
          <Button variant="outline" size="sm" onClick={() => navigate('/app/finance/settings')}>
            <Settings size={14} style={{ marginRight: 6 }} /> Settings
          </Button>
        </HeaderActionPortal>
        {renderContent()}
        <AccountsTabModal open={accountModalOpen} onClose={() => setAccountModalOpen(false)} defaultTab={accountModalTab} />
      </PageContent>
    </PageContainer>
  )
}
