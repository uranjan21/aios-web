import { useState } from 'react'
import { Wallet, Tags, Briefcase, Receipt, IndianRupee, Inbox } from 'lucide-react'
import { AreaSettingsPage } from '@ct/shared/components/layout/AreaSettingsPage'
import { AccountManager } from '@ct/finance/components/AccountManager'
import { CategoryManager } from '@ct/finance/components/CategoryManager'
import { LoansTab } from '@ct/finance/components/LoansTab'
import { BillsTab } from '@ct/finance/components/BillsTab'
import { AccountsTabModal } from '@ct/finance/components/QuickAddAccounts'
import { BudgetTabModal } from '@ct/finance/components/QuickAddBudget'
import { InboxSettingsTab } from '@ct/finance/components/InboxSettingsTab'

export function FinanceSettingsPage() {
  const [accountsModal, setAccountsModal] = useState<{ open: boolean; tab: 'Account' | 'Loan' }>({ open: false, tab: 'Account' })
  const [budgetModal, setBudgetModal] = useState<{ open: boolean; tab: 'Bill' }>({ open: false, tab: 'Bill' })

  return (
    <>
      <AreaSettingsPage
        icon={<IndianRupee />}
        title="Finance Settings"
        subtitle="Manage accounts, categories, loans, and bills in one place."
        groups={[
          {
            label: 'Money',
            items: [
              {
                key: 'accounts', label: 'Accounts', icon: <Wallet size={15} />,
                content: <AccountManager onAdd={() => setAccountsModal({ open: true, tab: 'Account' })} />,
              },
              { key: 'categories', label: 'Categories', icon: <Tags size={15} />, content: <CategoryManager /> },
            ],
          },
          /* No "Planning" group and no Goals item (2026-08-02): planning is
             Workspace's job now. What is left here is the two recurring
             commitments Finance itself owns. */
          {
            label: 'Commitments',
            items: [
              {
                key: 'loans', label: 'Loans', icon: <Briefcase size={15} />,
                content: <LoansTab onAdd={() => setAccountsModal({ open: true, tab: 'Loan' })} />,
              },
              /* "Recurring bills", not "Bills" (2026-08-03). This is `BillsTab`
                 — the CRUD list of bill definitions — while `/app/finance/bills`
                 is `PayablesTab`, the month's due calendar. Different pages, but
                 the shared label made the two sidebars look duplicated. */
              {
                key: 'bills', label: 'Recurring bills', icon: <Receipt size={15} />,
                content: <BillsTab onAdd={() => setBudgetModal({ open: true, tab: 'Bill' })} />,
              },
            ],
          },
          {
            label: 'Automation',
            items: [
              { key: 'inbox', label: 'Inbox Review', icon: <Inbox size={15} />, content: <InboxSettingsTab /> },
            ],
          },
        ]}
      />

      <AccountsTabModal
        open={accountsModal.open}
        onClose={() => setAccountsModal(m => ({ ...m, open: false }))}
        defaultTab={accountsModal.tab}
      />
      <BudgetTabModal
        open={budgetModal.open}
        onClose={() => setBudgetModal(m => ({ ...m, open: false }))}
        defaultTab={budgetModal.tab}
      />
    </>
  )
}
