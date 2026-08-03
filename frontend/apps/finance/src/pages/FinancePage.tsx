import { useEffect, useState } from 'react'

import { HomeTab } from '@ct/finance/components/HomeTab'
import { TransactionsTab } from '@ct/finance/components/TransactionsTab'
import { InboxTab } from '@ct/finance/components/InboxTab'
import { BudgetTab } from '@ct/finance/components/BudgetTab'
import { PayablesTab } from '@ct/finance/components/PayablesTab'
import { InvestmentsTab } from '@ct/finance/components/InvestmentsTab'
import { AccountsTabModal } from '@ct/finance/components/QuickAddAccounts'
import { PageContainer, PageContent } from '@ct/shared/components/layout/PageLayout'
import { useAreaSection } from '@ct/shared/hooks/useAreaSection'

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
      case 'inbox':        return <InboxTab />
      /* No 'loans' or 'accounts' case (2026-08-03): both now live only in
       * Finance Setup, and `finance/accounts` / `finance/loans` redirect there
       * from router.tsx before this switch is ever reached. */
      default:             return <HomeTab />
    }
  }

  return (
    <PageContainer>
      <PageContent>
        {/* No page header and no page-scoped controls. Finance Setup is a nav
            destination now (2026-08-03) — it used to be reachable only through
            a Settings button portalled up here, which is what kept a header
            block on all nine Finance pages. */}
        {renderContent()}
        <AccountsTabModal open={accountModalOpen} onClose={() => setAccountModalOpen(false)} defaultTab={accountModalTab} />
      </PageContent>
    </PageContainer>
  )
}
