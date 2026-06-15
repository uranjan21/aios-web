import { Collapse, type CollapseProps } from 'antd'
import { Wallet, TrendingUp, Landmark } from 'lucide-react'
import { WorkspaceLayout } from '@/components/layout/WorkspaceLayout'
import { AccountManager } from './AccountManager'
import { CategoryManager } from './CategoryManager'
import { InvestmentsTab } from './InvestmentsTab'
import { LoansTab } from './LoansTab'
import { QuickAddAccounts } from './QuickAddAccounts'

function PanelHeader({ icon: Icon, title }: { icon: React.ComponentType<{ size?: number | string }>; title: string }) {
  return (
    <div className="flex items-center gap-2">
      <Icon size={14} />
      <span className="text-[12px] font-semibold uppercase tracking-wide text-muted-foreground">{title}</span>
    </div>
  )
}

export function AccountsTab() {
  const items: CollapseProps['items'] = [
    {
      key: '1',
      label: <PanelHeader icon={Wallet} title="Accounts & Categories" />,
      children: (
        <div className="grid grid-cols-12 gap-4">
          <div className="col-span-12 xl:col-span-6"><AccountManager /></div>
          <div className="col-span-12 xl:col-span-6"><CategoryManager /></div>
        </div>
      ),
    },
    {
      key: '2',
      label: <PanelHeader icon={TrendingUp} title="Investments" />,
      children: <InvestmentsTab />,
    },
    {
      key: '3',
      label: <PanelHeader icon={Landmark} title="Loans & EMIs" />,
      children: <LoansTab />,
    },
  ]

  return (
    <WorkspaceLayout rail={<QuickAddAccounts />}>
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
