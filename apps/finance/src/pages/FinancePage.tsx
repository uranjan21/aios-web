import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import {
  LayoutDashboard, ArrowLeftRight,
  PiggyBank, BarChart2, Gem, Receipt
} from 'lucide-react'
import { PageHeader } from '@ledgr/ui'

import { HomeTab } from '@ct/finance/components/HomeTab'
import { TransactionsTab } from '@ct/finance/components/TransactionsTab'
import { InboxTab } from '@ct/finance/components/InboxTab'
import { RulesTab } from '@ct/finance/components/RulesTab'
import { BudgetTab } from '@ct/finance/components/BudgetTab'
import { PayablesTab } from '@ct/finance/components/PayablesTab'
import { InvestmentsTab } from '@ct/finance/components/InvestmentsTab'
import { LoansTab } from '@ct/finance/components/LoansTab'
import { AnalyticsTab } from '@ct/finance/components/AnalyticsTab'
import { AccountsTabModal } from '@ct/finance/components/QuickAddAccounts'
import { ModuleLayout } from '@ct/shared/components/layout/ModuleLayout'
import { ModuleSidebar } from '@ct/shared/components/layout/ModuleSidebar'
import { Inbox, Wand2, Landmark, IndianRupee } from 'lucide-react'

export function FinancePage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const activeKey = searchParams.get('tab') || 'overview'

  const setActiveKey = (key: string) => {
    setSearchParams(prev => {
      prev.set('tab', key)
      return prev
    })
  }

  const [accountModalOpen, setAccountModalOpen] = useState(false)

  useEffect(() => {
    const handler = () => setAccountModalOpen(true)
    window.addEventListener('open-new-account', handler)
    return () => window.removeEventListener('open-new-account', handler)
  }, [])

  const groups = [
    {
      label: 'Overview',
      items: [
        { key: 'overview',  label: 'Dashboard',  icon: <LayoutDashboard size={14} /> },
        { key: 'analytics', label: 'Analytics',  icon: <BarChart2 size={14} /> },
      ]
    },
    {
      label: 'Ledger',
      items: [
        { key: 'transactions', label: 'Transactions', icon: <ArrowLeftRight size={14} /> },
        { key: 'inbox',        label: 'Inbox',        icon: <Inbox size={14} /> },
      ]
    },
    {
      label: 'Automation',
      items: [
        { key: 'rules', label: 'Rules', icon: <Wand2 size={14} /> },
      ]
    },
    {
      label: 'Planning',
      items: [
        { key: 'budgets',  label: 'Budgets', icon: <PiggyBank size={14} /> },
        { key: 'payables', label: 'Bills',   icon: <Receipt size={14} /> },
      ]
    },
    {
      label: 'Wealth',
      items: [
        { key: 'investments', label: 'Investments', icon: <Gem size={14} /> },
        { key: 'loans',       label: 'Loans',       icon: <Landmark size={14} /> },
      ]
    }
  ]

  const renderContent = () => {
    switch (activeKey) {
      case 'overview':     return <HomeTab />
      case 'analytics':    return <AnalyticsTab />
      case 'transactions': return <TransactionsTab />
      case 'inbox':        return <InboxTab />
      case 'rules':        return <RulesTab />
      case 'budgets':      return <BudgetTab />
      case 'payables':     return <PayablesTab />
      case 'investments':  return <InvestmentsTab onAddClick={() => setAccountModalOpen(true)} />
      case 'loans':        return <LoansTab onAdd={() => setAccountModalOpen(true)} />
      default:             return <HomeTab />
    }
  }

  return (
    <ModuleLayout
      header={
        <PageHeader
          icon={<IndianRupee size={24} />}
          eyebrow="Finance"
          title="Finance Center"
          subtitle="Manage your transactions, budgets, investments, and financial health in one place."
        />
      }
      sidebar={
        <ModuleSidebar
          groups={groups}
          activeKey={activeKey}
          onChange={setActiveKey}
        />
      }
    >
      {renderContent()}
      <AccountsTabModal open={accountModalOpen} onClose={() => setAccountModalOpen(false)} defaultTab="Account" />
    </ModuleLayout>
  )
}
