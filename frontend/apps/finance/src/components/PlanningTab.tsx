import { useState } from 'react'
import { BudgetTab } from './BudgetTab'
import { PayablesTab } from './PayablesTab'
import { SimulatorTab } from './SimulatorTab'
import { PiggyBank, ListChecks, TrendingUp } from 'lucide-react'
import { SideMenu } from '@ct/shared/components/ui/SideMenu'

export function PlanningTab() {
  const [activeKey, setActiveKey] = useState('budgets')

  const menu = (
    <SideMenu
      activeKey={activeKey}
      onChange={setActiveKey}
      items={[
        { key: 'budgets', label: 'Budgets', icon: <PiggyBank size={14} /> },
        { key: 'payables', label: 'Payables', icon: <ListChecks size={14} /> },
        { key: 'projections', label: 'Projections', icon: <TrendingUp size={14} /> },
      ]}
    />
  )

  return (
    <>
      {activeKey === 'budgets' && <BudgetTab navMenu={menu} />}
      {activeKey === 'payables' && <PayablesTab navMenu={menu} />}
      {activeKey === 'projections' && <SimulatorTab navMenu={menu} />}
    </>
  )
}
