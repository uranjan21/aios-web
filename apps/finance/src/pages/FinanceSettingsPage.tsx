import { useEffect, useState } from 'react'
import { Wallet, Tags, Target, Briefcase, Receipt, IndianRupee } from 'lucide-react'
import { AreaSettingsPage } from '@aios/shared/components/layout/AreaSettingsPage'
import { AccountManager } from '@aios/finance/components/AccountManager'
import { CategoryManager } from '@aios/finance/components/CategoryManager'
import { GoalsTab } from '@aios/finance/components/GoalsTab'
import { LoansTab } from '@aios/finance/components/LoansTab'
import { BillsTab } from '@aios/finance/components/BillsTab'
import { AccountsTabModal } from '@aios/finance/components/QuickAddAccounts'
import { BudgetTabModal } from '@aios/finance/components/QuickAddBudget'

export function FinanceSettingsPage() {
  const [accountsModal, setAccountsModal] = useState<{ open: boolean; tab: 'Account' | 'Loan' }>({ open: false, tab: 'Account' })
  const [budgetModal, setBudgetModal] = useState<{ open: boolean; tab: 'Goal' | 'Bill' }>({ open: false, tab: 'Goal' })

  // GoalsTab's empty-state "Add Goal" button dispatches this event instead of taking a prop
  useEffect(() => {
    const handler = () => setBudgetModal({ open: true, tab: 'Goal' })
    window.addEventListener('open-new-goal', handler)
    return () => window.removeEventListener('open-new-goal', handler)
  }, [])

  return (
    <>
      <AreaSettingsPage
        icon={<IndianRupee />}
        title="Finance Settings"
        subtitle="Manage accounts, categories, goals, loans, and bills in one place."
        backTo="/app/areas/finance"
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
          {
            label: 'Planning',
            items: [
              {
                key: 'goals', label: 'Goals', icon: <Target size={15} />,
                content: <GoalsTab onAdd={() => setBudgetModal({ open: true, tab: 'Goal' })} />,
              },
              {
                key: 'loans', label: 'Loans', icon: <Briefcase size={15} />,
                content: <LoansTab onAdd={() => setAccountsModal({ open: true, tab: 'Loan' })} />,
              },
              {
                key: 'bills', label: 'Bills', icon: <Receipt size={15} />,
                content: <BillsTab onAdd={() => setBudgetModal({ open: true, tab: 'Bill' })} />,
              },
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
