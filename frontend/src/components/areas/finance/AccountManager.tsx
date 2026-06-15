import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Table, Button, Popconfirm, message, Drawer, Empty, Tag } from 'antd';
import { DeleteOutlined } from '@ant-design/icons';
import styled from 'styled-components';
import dayjs from 'dayjs';
import { financeApi } from '@/api/areas';
import { formatCurrency } from '@/lib/utils';
import { TableContainer, TableHeader } from './TableStyles';

const KIND_COLOR: Record<string, string> = { expense: 'red', income: 'green', transfer: 'blue' };

function AccountLedgerDrawer({ account, onClose }: { account: any | null; onClose: () => void }) {
  const { data, isLoading } = useQuery({
    queryKey: ['finance', 'accounts', account?.id, 'ledger'],
    queryFn: () => financeApi.accountLedger(account!.id),
    enabled: !!account,
  });

  return (
    <Drawer
      title={account ? `${account.name} — ${formatCurrency(Number(account.balance))}` : ''}
      open={!!account}
      onClose={onClose}
      size="default"
    >
      {isLoading ? (
        <div className="text-xs text-muted-foreground">Loading…</div>
      ) : !data?.entries.length ? (
        <Empty description="No transactions linked to this account yet" image={Empty.PRESENTED_IMAGE_SIMPLE} />
      ) : (
        <div className="space-y-0.5">
          {data.entries.map(e => (
            <div key={`${e.kind}-${e.id}`} className="flex items-center justify-between py-2 border-b border-border/40 last:border-b-0">
              <div className="min-w-0">
                <div className="text-xs font-medium text-foreground truncate">{e.label}</div>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <Tag color={KIND_COLOR[e.kind]} bordered={false} className="text-[10px] leading-tight py-0 capitalize">{e.kind}</Tag>
                  <span className="text-[10px] text-muted-foreground">{dayjs(e.logged_at).format('MMM D, YYYY h:mm A')}</span>
                </div>
              </div>
              <span className={`text-xs font-medium shrink-0 ml-2 ${e.amount >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
                {e.amount >= 0 ? '+' : '-'}{formatCurrency(Math.abs(e.amount))}
              </span>
            </div>
          ))}
        </div>
      )}
    </Drawer>
  );
}

export const AccountManager: React.FC = () => {
  const queryClient = useQueryClient();
  const [ledgerAccount, setLedgerAccount] = useState<any | null>(null);

  const { data: accounts = [], isLoading } = useQuery({
    queryKey: ['finance', 'accounts'],
    queryFn: financeApi.accounts
  });

  const deleteMutation = useMutation({
    mutationFn: financeApi.deleteAccount,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['finance', 'accounts'] });
      message.success('Account deleted');
    }
  });

  const columns = [
    { title: 'Name', dataIndex: 'name', key: 'name' },
    { title: 'Type', dataIndex: 'type', key: 'type', render: (text: string) => text.replace('_', ' ').toUpperCase() },
    { title: 'Balance', dataIndex: 'balance', key: 'balance', render: (val: number | string, record: any) => `${record.currency} ${Number(val).toFixed(2)}` },
    {
      title: 'Action',
      key: 'action',
      render: (_: any, record: any) => (
        <Popconfirm title="Delete account?" onConfirm={() => deleteMutation.mutate(record.id)}>
          <Button type="text" danger icon={<DeleteOutlined />} onClick={e => e.stopPropagation()} />
        </Popconfirm>
      ),
    },
  ];

  return (
    <TableContainer>
      <TableHeader>
        <h3>Accounts</h3>
      </TableHeader>

      <Table
        dataSource={accounts}
        columns={columns}
        rowKey="id"
        loading={isLoading}
        pagination={false}
        size="middle"
        onRow={record => ({ onClick: () => setLedgerAccount(record) })}
      />

      <AccountLedgerDrawer account={ledgerAccount} onClose={() => setLedgerAccount(null)} />
    </TableContainer>
  );
};
