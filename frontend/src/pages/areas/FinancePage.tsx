import { useState } from 'react'
import { AreaTabs } from '@/components/ui/AreaTabs'
import { HomeTab } from '@/components/areas/finance/HomeTab'
import { TransactionsTab } from '@/components/areas/finance/TransactionsTab'
import { StatsTab } from '@/components/areas/finance/StatsTab'
import { AccountsTab } from '@/components/areas/finance/AccountsTab'
import { BudgetTab } from '@/components/areas/finance/BudgetTab'

export function FinancePage() {
  const [activeKey, setActiveKey] = useState('1')

  const items = [
    { key: '1', label: 'Home', children: <HomeTab onNavigateTab={setActiveKey} /> },
    { key: '2', label: 'Transactions', children: <TransactionsTab /> },
    { key: '3', label: 'Stats', children: <StatsTab /> },
    { key: '4', label: 'Accounts', children: <AccountsTab /> },
    { key: '5', label: 'Budget', children: <BudgetTab /> },
  ]

  return (
    <div className="min-h-screen bg-[hsl(var(--page-bg))] p-4 md:p-6">
      <div className="mx-auto max-w-[1200px]">
        <AreaTabs activeKey={activeKey} onChange={setActiveKey} items={items} />
      </div>
    </div>
  )
}
