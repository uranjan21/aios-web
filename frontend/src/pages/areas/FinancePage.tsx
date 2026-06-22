import { useState } from 'react'
import {
  IndianRupee, LayoutDashboard, ArrowLeftRight, Wallet, PiggyBank,
  TrendingUp, Landmark, Target, Receipt,
} from 'lucide-react'
import { AreaTabs } from '@/components/ui/AreaTabs'
import { PageHeader } from '@ledgr/ui'
import { HomeTab } from '@/components/areas/finance/HomeTab'
import { TransactionsTab } from '@/components/areas/finance/TransactionsTab'
import { AccountsTab } from '@/components/areas/finance/AccountsTab'
import { BudgetTab } from '@/components/areas/finance/BudgetTab'
import { GoalsTab } from '@/components/areas/finance/GoalsTab'
import { LoansTab } from '@/components/areas/finance/LoansTab'
import { InvestmentsTab } from '@/components/areas/finance/InvestmentsTab'
import { BillsTab } from '@/components/areas/finance/BillsTab'
import { PageContainer, PageContent } from '@/components/layout/PageLayout'

export function FinancePage() {
  const [activeKey, setActiveKey] = useState('1')

  const items = [
    { key: '1', label: <><LayoutDashboard size={14} /> Home</>, children: <HomeTab onNavigateTab={setActiveKey} /> },
    { key: '2', label: <><ArrowLeftRight size={14} /> Transactions</>, children: <TransactionsTab /> },
    { key: '3', label: <><Wallet size={14} /> Accounts</>, children: <AccountsTab /> },
    { key: '4', label: <><PiggyBank size={14} /> Budget</>, children: <BudgetTab /> },
    { key: '5', label: <><Target size={14} /> Goals</>, children: <GoalsTab /> },
    { key: '6', label: <><Landmark size={14} /> Loans</>, children: <LoansTab /> },
    { key: '7', label: <><TrendingUp size={14} /> Investments</>, children: <InvestmentsTab /> },
    { key: '8', label: <><Receipt size={14} /> Bills</>, children: <BillsTab /> },
  ]

  return (
    <PageContainer>
      <PageContent>
        <PageHeader
          icon={<IndianRupee />}
          eyebrow="Money"
          title="Finance"
          subtitle="Transactions, accounts, budgets, goals, loans, investments and bills — all your money in one place."
        />
        <AreaTabs
          activeKey={activeKey}
          onChange={setActiveKey}
          items={items}
        />
      </PageContent>
    </PageContainer>
  )
}
