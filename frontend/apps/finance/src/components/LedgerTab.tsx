import { useState } from 'react'
import { TransactionsTab } from './TransactionsTab'
import { InboxTab } from './InboxTab'
import { RulesTab } from './RulesTab'
import { ArrowLeftRight, Inbox, Wand2 } from 'lucide-react'
import { SideMenu } from '@ct/shared/components/ui/SideMenu'

export function LedgerTab() {
  const [activeKey, setActiveKey] = useState('transactions')

  const menu = (
    <SideMenu
      activeKey={activeKey}
      onChange={setActiveKey}
      items={[
        { key: 'transactions', label: 'Transactions', icon: <ArrowLeftRight size={14} /> },
        { key: 'inbox', label: 'Inbox', icon: <Inbox size={14} /> },
        { key: 'rules', label: 'Rules', icon: <Wand2 size={14} /> },
      ]}
    />
  )

  return (
    <>
      {activeKey === 'transactions' && <TransactionsTab navMenu={menu} />}
      {activeKey === 'inbox' && <InboxTab navMenu={menu} />}
      {activeKey === 'rules' && <RulesTab navMenu={menu} />}
    </>
  )
}
