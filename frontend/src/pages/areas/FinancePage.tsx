import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  IndianRupee, LayoutDashboard, ArrowLeftRight, Wallet, PiggyBank,
} from 'lucide-react'
import { AreaTabs } from '@/components/ui/AreaTabs'
import { PageHeader } from '@ledgr/ui'
import { HomeTab } from '@/components/areas/finance/HomeTab'
import { TransactionsTab } from '@/components/areas/finance/TransactionsTab'
import { AccountsTab } from '@/components/areas/finance/AccountsTab'
import { BudgetTab } from '@/components/areas/finance/BudgetTab'

import styled from 'styled-components'
import { PageContainer, PageContent } from '@/components/layout/PageLayout'



export function FinancePage() {
  const [activeKey, setActiveKey] = useState('1')
  const navigate = useNavigate()

  const items = [
    { key: '1', label: <><LayoutDashboard size={14} /> Home</>, children: <HomeTab onNavigateTab={setActiveKey} /> },
    { key: '2', label: <><ArrowLeftRight size={14} /> Transactions</>, children: <TransactionsTab /> },
    { key: '3', label: <><Wallet size={14} /> Accounts</>, children: <AccountsTab /> },
    { key: '4', label: <><PiggyBank size={14} /> Budget</>, children: <BudgetTab /> },
  ]

  return (
    <PageContainer>
      <PageContent>
        <PageHeader
          icon={<IndianRupee />}
          eyebrow="Money"
          title="Finance"
          subtitle="Transactions, accounts, budgets and goals — all your money in one place."
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

