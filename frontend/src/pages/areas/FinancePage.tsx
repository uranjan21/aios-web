import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  IndianRupee, LayoutDashboard, ArrowLeftRight,
  PiggyBank, BarChart2, Gem, Settings, FlaskConical,
} from 'lucide-react'
import { AreaTabs } from '@/components/ui/AreaTabs'
import { PageHeader, Button } from '@ledgr/ui'
import { HomeTab } from '@/components/areas/finance/HomeTab'
import { TransactionsTab } from '@/components/areas/finance/TransactionsTab'
import { BudgetTab } from '@/components/areas/finance/BudgetTab'
import { WealthTab } from '@/components/areas/finance/WealthTab'
import { AnalyticsTab } from '@/components/areas/finance/AnalyticsTab'
import { SimulatorTab } from '@/components/areas/finance/SimulatorTab'
import { InboxTab } from '@/components/areas/finance/InboxTab'
import { AccountsTabModal } from '@/components/areas/finance/QuickAddAccounts'
import { PageContainer, PageContent } from '@/components/layout/PageLayout'

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
            <Button variant="outline" size="sm" onClick={() => navigate('/app/areas/finance/settings')}>
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
