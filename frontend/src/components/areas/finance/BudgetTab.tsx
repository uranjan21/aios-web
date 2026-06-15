import { Collapse, type CollapseProps } from 'antd'
import { Wallet, Target, Receipt } from 'lucide-react'
import { WorkspaceLayout } from '@/components/layout/WorkspaceLayout'
import { BudgetsTab } from './BudgetsTab'
import { GoalsTab } from './GoalsTab'
import { BillsTab } from './BillsTab'
import { SubscriptionManagement } from './AdvancedWidgets'
import { QuickAddBudget } from './QuickAddBudget'

function PanelHeader({ icon: Icon, title }: { icon: React.ComponentType<{ size?: number | string }>; title: string }) {
  return (
    <div className="flex items-center gap-2">
      <Icon size={14} />
      <span className="text-[12px] font-semibold uppercase tracking-wide text-muted-foreground">{title}</span>
    </div>
  )
}

export function BudgetTab() {
  const items: CollapseProps['items'] = [
    {
      key: '1',
      label: <PanelHeader icon={Wallet} title="Budget Limits & Subscriptions" />,
      children: (
        <div className="grid grid-cols-12 gap-4">
          <div className="col-span-12 xl:col-span-6"><BudgetsTab /></div>
          <div className="col-span-12 xl:col-span-6"><SubscriptionManagement /></div>
        </div>
      ),
    },
    {
      key: '2',
      label: <PanelHeader icon={Target} title="Goals" />,
      children: <GoalsTab />,
    },
    {
      key: '3',
      label: <PanelHeader icon={Receipt} title="Bills" />,
      children: <BillsTab />,
    },
  ]

  return (
    <WorkspaceLayout rail={<QuickAddBudget />}>
      <Collapse
        items={items}
        defaultActiveKey={['1', '2', '3']}
        ghost
        expandIconPosition="end"
        className="space-y-4 [&>.ant-collapse-item]:bg-card [&>.ant-collapse-item]:border [&>.ant-collapse-item]:border-border [&>.ant-collapse-item]:rounded-xl [&>.ant-collapse-item]:overflow-hidden [&>.ant-collapse-item]:shadow-sm"
      />
    </WorkspaceLayout>
  )
}
