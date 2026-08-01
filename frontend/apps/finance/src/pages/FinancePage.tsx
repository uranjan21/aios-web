import { useEffect, useState } from 'react'
import { PageHeader } from '@ledgr/ui'

import { HomeTab } from '@ct/finance/components/HomeTab'
import { TransactionsTab } from '@ct/finance/components/TransactionsTab'
import { InboxTab } from '@ct/finance/components/InboxTab'
import { BudgetTab } from '@ct/finance/components/BudgetTab'
import { PayablesTab } from '@ct/finance/components/PayablesTab'
import { InvestmentsTab } from '@ct/finance/components/InvestmentsTab'
import { LoansTab } from '@ct/finance/components/LoansTab'
import { GoalsTab } from '@ct/finance/components/GoalsTab'
import { AccountManager } from '@ct/finance/components/AccountManager'
import { AccountsTabModal } from '@ct/finance/components/QuickAddAccounts'
import { PageContainer, PageContent } from '@ct/shared/components/layout/PageLayout'
import { useAreaSection } from '@ct/shared/hooks/useAreaSection'
import { IndianRupee } from 'lucide-react'

/**
 * Sub-page routing, 2026-08-01: the per-area `ModuleSidebar` and its `?tab=`
 * param are gone — every section below is a route in the global nav tree
 * (`apps/shell/src/config/navigation.ts`).
 *
 * Two sections were retired here per the redesign's IA:
 *  - `analytics` — no slot in the new nav.
 *  - `rules`     — RELOCATED, not deleted: auto-categorization becomes a
 *                  `controls` module on the Inbox page in Phase 4.
 * Both still redirect to Overview rather than 404ing an old bookmark.
 */
const LEGACY_SECTIONS: Record<string, string> = {
  payables: 'bills',
  analytics: 'overview',
  rules: 'inbox',
}

export function FinancePage() {
  const section = useAreaSection('/app/finance', 'overview', LEGACY_SECTIONS)

  const [accountModalOpen, setAccountModalOpen] = useState(false)

  useEffect(() => {
    const handler = () => setAccountModalOpen(true)
    window.addEventListener('open-new-account', handler)
    return () => window.removeEventListener('open-new-account', handler)
  }, [])

  const renderContent = () => {
    switch (section) {
      case 'overview':     return <HomeTab />
      case 'transactions': return <TransactionsTab />
      case 'budgets':      return <BudgetTab />
      case 'bills':        return <PayablesTab />
      case 'goals':        return <GoalsTab />
      case 'investments':  return <InvestmentsTab onAddClick={() => setAccountModalOpen(true)} />
      case 'loans':        return <LoansTab onAdd={() => setAccountModalOpen(true)} />
      case 'inbox':        return <InboxTab />
      case 'accounts':     return <AccountManager />
      default:             return <HomeTab />
    }
  }

  return (
    <PageContainer>
      <PageContent>
        <PageHeader
          icon={<IndianRupee size={24} />}
          eyebrow="Money"
          title="Finance"
          subtitle="Manage your transactions, budgets, investments, and financial health in one place."
        />
        {renderContent()}
        <AccountsTabModal open={accountModalOpen} onClose={() => setAccountModalOpen(false)} defaultTab="Account" />
      </PageContent>
    </PageContainer>
  )
}
