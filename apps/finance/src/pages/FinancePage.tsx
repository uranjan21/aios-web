import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  IndianRupee, LayoutDashboard, ArrowLeftRight,
  PiggyBank, BarChart2, Gem, Settings, FlaskConical,
} from 'lucide-react'
import { AreaTabs } from '@aios/shared/components/ui/AreaTabs'
import { PageHeader, Button } from '@ledgr/ui'
import { HomeTab } from '@aios/finance/components/HomeTab'
import { TransactionsTab } from '@aios/finance/components/TransactionsTab'
import { BudgetTab } from '@aios/finance/components/BudgetTab'
import { WealthTab } from '@aios/finance/components/WealthTab'
import { AnalyticsTab } from '@aios/finance/components/AnalyticsTab'
import { SimulatorTab } from '@aios/finance/components/SimulatorTab'
import { InboxTab } from '@aios/finance/components/InboxTab'
import { AccountsTabModal } from '@aios/finance/components/QuickAddAccounts'
import { PageContainer, PageContent } from '@aios/shared/components/layout/PageLayout'

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
      label: <><FlaskConical size={14} /> Simulator</>,
      children: <SimulatorTab />,
    },
    {
      key: '7',
      label: <><IndianRupee size={14} /> Inbox</>,
      children: <InboxTab />,
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
