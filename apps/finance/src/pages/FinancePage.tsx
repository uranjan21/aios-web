import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  IndianRupee, LayoutDashboard, ArrowLeftRight,
  PiggyBank, BarChart2, Gem, Settings, TrendingUp, ListChecks, Wand2,
} from 'lucide-react'
import { AreaTabs } from '@ct/shared/components/ui/AreaTabs'
import { PageHeader, Button } from '@ledgr/ui'
import { HomeTab } from '@ct/finance/components/HomeTab'
import { TransactionsTab } from '@ct/finance/components/TransactionsTab'
import { BudgetTab } from '@ct/finance/components/BudgetTab'
import { WealthTab } from '@ct/finance/components/WealthTab'
import { AnalyticsTab } from '@ct/finance/components/AnalyticsTab'
import { SimulatorTab } from '@ct/finance/components/SimulatorTab'
import { InboxTab } from '@ct/finance/components/InboxTab'
import { PayablesTab } from '@ct/finance/components/PayablesTab'
import { RulesTab } from '@ct/finance/components/RulesTab'
import { AccountsTabModal } from '@ct/finance/components/QuickAddAccounts'
import { PageContainer, PageContent } from '@ct/shared/components/layout/PageLayout'

export function FinancePage() {
  const navigate = useNavigate()
  const [activeKey, setActiveKey] = useState('1')
  const [accountModalOpen, setAccountModalOpen] = useState(false)

  // TransactionsTab's "add an account first" prompt dispatches this regardless of active sub-tab
  useEffect(() => {
    const handler = () => setAccountModalOpen(true)
    window.addEventListener('open-new-account', handler)
    return () => window.removeEventListener('open-new-account', handler)
  }, [])

  const items = [
    {
      key: '1',
      label: <><LayoutDashboard size={14} /> Overview</>,
      children: <HomeTab />,
    },
    {
      key: '2',
      label: <><ArrowLeftRight size={14} /> Transactions</>,
      children: <TransactionsTab />,
    },
    {
      key: '3',
      label: <><PiggyBank size={14} /> Budgets</>,
      children: <BudgetTab />,
    },
    {
      key: '4',
      label: <><Gem size={14} /> Investments</>,
      children: <WealthTab />,
    },
    {
      key: '5',
      label: <><BarChart2 size={14} /> Analytics</>,
      children: <AnalyticsTab />,
    },
    {
      key: '6',
      label: <><TrendingUp size={14} /> Projections</>,
      children: <SimulatorTab />,
    },
    {
      key: '7',
      label: <><ListChecks size={14} /> Payables</>,
      children: <PayablesTab />,
    },
    {
      key: '8',
      label: <><IndianRupee size={14} /> Inbox</>,
      children: <InboxTab />,
    },
    {
      key: '9',
      label: <><Wand2 size={14} /> Rules</>,
      children: <RulesTab />,
    },
  ]

  return (
    <PageContainer>
      <PageContent>
        <PageHeader
          icon={<IndianRupee />}
          eyebrow="Money"
          title="Finance"
          subtitle="Transactions, budgets, investments, and analytics — all your money in one place."
          actions={
            <Button variant="outline" size="sm" onClick={() => navigate('/app/finance/settings')}>
              <Settings size={14} style={{ marginRight: 6 }} /> Settings
            </Button>
          }
        />
        <AreaTabs
          activeKey={activeKey}
          onChange={setActiveKey}
          items={items}
        />
      </PageContent>

      <AccountsTabModal open={accountModalOpen} onClose={() => setAccountModalOpen(false)} defaultTab="Account" />
    </PageContainer>
  )
}
