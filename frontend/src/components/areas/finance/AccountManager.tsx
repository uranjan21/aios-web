import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Table, Button, Modal, Form, Input, Select, Popconfirm, message } from 'antd';
import { PlusOutlined, DeleteOutlined } from '@ant-design/icons';
import styled from 'styled-components';
import { financeApi } from '@/api/areas';

const Container = styled.div`
  background: var(--card-bg, #1a1a1a);
  border-radius: 8px;
  padding: 24px;
  border: 1px solid var(--border-color, #333);
  margin-bottom: 24px;
  
  /* Quick Antd dark mode overrides for this container */
  .ant-table {
    background: transparent;
    color: #fff;
  }
  .ant-table-thead > tr > th {
    background: #222;
    color: #ccc;
    border-bottom: 1px solid #333;
  }
  .ant-table-tbody > tr > td {
    border-bottom: 1px solid #333;
  }
  .ant-table-tbody > tr:hover > td {
    background: #2a2a2a;
  }
  .ant-empty-description {
    color: #888;
  }
`;

const Header = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
  h3 { margin: 0; color: #fff; font-size: 1.1rem; font-weight: 500; }
`;

export const AccountManager: React.FC = () => {
  const queryClient = useQueryClient();
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [form] = Form.useForm();

  const { data: accounts = [], isLoading } = useQuery({
    queryKey: ['finance_accounts'],
    queryFn: financeApi.accounts
  });

  const createMutation = useMutation({
    mutationFn: financeApi.createAccount,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['finance_accounts'] });
      message.success('Account created');
      setIsModalVisible(false);
      form.resetFields();
    }
  });

  const deleteMutation = useMutation({
    mutationFn: financeApi.deleteAccount,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['finance_accounts'] });
      message.success('Account deleted');
    }
  });

  const columns = [
    { title: 'Name', dataIndex: 'name', key: 'name' },
    { title: 'Type', dataIndex: 'type', key: 'type', render: (text: string) => text.replace('_', ' ').toUpperCase() },
    { title: 'Balance', dataIndex: 'balance', key: 'balance', render: (val: number, record: any) => `${record.currency} ${val.toFixed(2)}` },
    {
      title: 'Action',
      key: 'action',
      render: (_: any, record: any) => (
        <Popconfirm title="Delete account?" onConfirm={() => deleteMutation.mutate(record.id)}>
          <Button type="text" danger icon={<DeleteOutlined />} />
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
      />

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
          <Form.Item name="currency" label="Currency" initialValue="USD">
            <Input />
          </Form.Item>
        </Form>
      </Modal>
    </Container>
  );
};
