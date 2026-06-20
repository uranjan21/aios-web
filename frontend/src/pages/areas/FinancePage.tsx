import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  IndianRupee, LayoutDashboard, ArrowLeftRight, Wallet, PiggyBank, Plus,
  Bot, Search, Bell, PlusCircle,
} from 'lucide-react'
import { Button } from '@ledgr/ui'
import { AreaTabs } from '@/components/ui/AreaTabs'
import { FilterBar, PeriodSelect } from '@/components/ui/FilterBar'
import { PageHeader, ActionChip } from '@/components/layout/PageLayout'
import { useUIStore } from '@/stores/uiStore'
import { HomeTab } from '@/components/areas/finance/HomeTab'
import { TransactionsTab } from '@/components/areas/finance/TransactionsTab'
import { AccountsTab } from '@/components/areas/finance/AccountsTab'
import { BudgetTab } from '@/components/areas/finance/BudgetTab'

import styled from 'styled-components'

const PageContainer = styled.div`
  min-height: 100vh;
  background-color: ${({ theme }) => theme.color.background};
  padding: 1rem;

  @media (min-width: 768px) {
    padding: 1.5rem;
  }
`

const ContentWrapper = styled.div`
  margin: 0 auto;
  max-width: 1200px;
`

const ButtonContent = styled.div`
  display: flex;
  align-items: center;
  gap: 0.25rem;
  font-size: 12px;
  font-weight: 500;
`

export function FinancePage() {
  const [activeKey, setActiveKey] = useState('1')
  const [query, setQuery] = useState('')
  const [status, setStatus] = useState('all')
  const [type, setType] = useState('all')
  const [period, setPeriod] = useState('2026-06')
  const navigate = useNavigate()
  const { setCmdPaletteOpen, setCaptureModalOpen } = useUIStore()

  const items = [
    { key: '1', label: <><LayoutDashboard size={14} /> Home</>, children: <HomeTab onNavigateTab={setActiveKey} /> },
    { key: '2', label: <><ArrowLeftRight size={14} /> Transactions</>, children: <TransactionsTab /> },
    { key: '3', label: <><Wallet size={14} /> Accounts</>, children: <AccountsTab /> },
    { key: '4', label: <><PiggyBank size={14} /> Budget</>, children: <BudgetTab /> },
  ]

  const primary = activeKey === '3' ? (
    <Button size="sm" variant="primary" onClick={() => window.dispatchEvent(new CustomEvent('open-new-account'))}>
      <ButtonContent><Plus size={12} /><span>Add Financial Item</span></ButtonContent>
    </Button>
  ) : activeKey === '4' ? (
    <Button size="sm" variant="primary" onClick={() => window.dispatchEvent(new CustomEvent('open-new-budget'))}>
      <ButtonContent><Plus size={12} /><span>Add Budget Item</span></ButtonContent>
    </Button>
  ) : (
    <Button size="sm" variant="primary" onClick={() => window.dispatchEvent(new CustomEvent('open-new-transaction'))}>
      <ButtonContent><Plus size={12} /><span>Add Transaction</span></ButtonContent>
    </Button>
  )

  return (
    <PageContainer>
      <ContentWrapper>
        <PageHeader
          icon={IndianRupee}
          category="Money"
          title="Finance"
          description="Transactions, accounts, budgets and goals — all your money in one place."
          actions={
            <>
              <ActionChip onClick={() => navigate('/chat')}><Bot /> Ask AI</ActionChip>
              <ActionChip onClick={() => setCaptureModalOpen(true)}><PlusCircle /> Capture</ActionChip>
              <ActionChip onClick={() => setCmdPaletteOpen(true)}><Search /> Search</ActionChip>
              <ActionChip onClick={() => navigate('/agents')}><Bell /> Reminders</ActionChip>
            </>
          }
        />
        <AreaTabs
          activeKey={activeKey}
          onChange={setActiveKey}
          items={items}
          toolbar={
            <FilterBar
              search={{ value: query, onChange: setQuery, placeholder: 'Search client by name, account…' }}
              filters={[
                { id: 'status', label: 'Status', value: status, onChange: setStatus, options: [
                  { value: 'all', label: 'All statuses' },
                  { value: 'cleared', label: 'Cleared' },
                  { value: 'pending', label: 'Pending' },
                ] },
                { id: 'type', label: 'Type', value: type, onChange: setType, options: [
                  { value: 'all', label: 'All types' },
                  { value: 'income', label: 'Income' },
                  { value: 'expense', label: 'Expense' },
                ] },
              ]}
              period={<PeriodSelect value={period} onChange={setPeriod} />}
              actions={primary}
            />
          }
        />
      </ContentWrapper>
    </PageContainer>
  )
}
