import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Table, Button, Modal, Form, Input, Select, Popconfirm, message, Drawer, Empty, Tag } from 'antd';
import { PlusOutlined, DeleteOutlined } from '@ant-design/icons';
import styled from 'styled-components';
import dayjs from 'dayjs';
import { financeApi } from '@/api/areas';
import { formatCurrency } from '@/lib/utils';

const Container = styled.div`
  background: hsl(var(--card));
  border-radius: 16px;
  padding: 16px;
  border: 1px solid hsl(var(--border) / 0.6);
  margin-bottom: 24px;
  box-shadow: 0 1px 2px 0 rgb(0 0 0 / 0.05);

  /* Theme-aware Antd table overrides for this container */
  .ant-table {
    background: transparent;
    color: hsl(var(--foreground));
  }
  .ant-table-thead > tr > th {
    background: hsl(var(--muted));
    color: hsl(var(--muted-foreground));
    border-bottom: 1px solid hsl(var(--border));
  }
  .ant-table-tbody > tr > td {
    border-bottom: 1px solid hsl(var(--border));
  }
  .ant-table-tbody > tr {
    cursor: pointer;
  }
  .ant-table-tbody > tr:hover > td {
    background: hsl(var(--muted) / 0.5);
  }
  .ant-empty-description {
    color: hsl(var(--muted-foreground));
  }
`;

const Header = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
  h3 { margin: 0; color: hsl(var(--muted-foreground)); font-size: 14px; font-weight: 500; }
`;

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
              <span className={`text-xs font-semibold shrink-0 ml-2 ${e.amount >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
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
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [ledgerAccount, setLedgerAccount] = useState<any | null>(null);
  const [form] = Form.useForm();

  const { data: accounts = [], isLoading } = useQuery({
    queryKey: ['finance', 'accounts'],
    queryFn: financeApi.accounts
  });

  const createMutation = useMutation({
    mutationFn: financeApi.createAccount,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['finance', 'accounts'] });
      message.success('Account created');
      setIsModalVisible(false);
      form.resetFields();
    }
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
    <Container>
      <Header>
        <h3>Accounts</h3>
        <Button type="primary" icon={<PlusOutlined />} onClick={() => setIsModalVisible(true)}>
          Add Account
        </Button>
      </Header>

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

      <Modal
        title="Add New Account"
        open={isModalVisible}
        onOk={() => form.submit()}
        onCancel={() => setIsModalVisible(false)}
        confirmLoading={createMutation.isPending}
      >
        <Form form={form} layout="vertical" onFinish={v => createMutation.mutate({ ...v, balance: Number(v.balance) })}>
          <Form.Item name="name" label="Account Name" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name="type" label="Account Type" rules={[{ required: true }]}>
            <Select>
              <Select.Option value="checking">Checking</Select.Option>
              <Select.Option value="savings">Savings</Select.Option>
              <Select.Option value="credit_card">Credit Card</Select.Option>
              <Select.Option value="investment">Investment</Select.Option>
              <Select.Option value="loan">Loan</Select.Option>
            </Select>
          </Form.Item>
          <Form.Item name="balance" label="Initial Balance" initialValue={0}>
            <Input type="number" step="0.01" />
          </Form.Item>
          <Form.Item name="currency" label="Currency" initialValue="INR">
            <Input />
          </Form.Item>
        </Form>
      </Modal>
    </Container>
  );
};
