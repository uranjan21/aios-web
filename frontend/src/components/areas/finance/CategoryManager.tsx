import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Tree, Button, Modal, Form, Input, Select, Popconfirm, message } from 'antd';
import { PlusOutlined, DeleteOutlined } from '@ant-design/icons';
import styled from 'styled-components';
import { financeApi } from '@/api/areas';

const Container = styled.div`
  background: var(--card-bg, #1a1a1a);
  border-radius: 8px;
  padding: 24px;
  border: 1px solid var(--border-color, #333);
  margin-bottom: 24px;
  
  .ant-tree {
    background: transparent;
    color: #fff;
  }
  .ant-tree-node-content-wrapper {
    color: #fff;
  }
  .ant-tree-node-content-wrapper:hover {
    background-color: #2a2a2a;
  }
  .ant-tree-node-selected {
    background-color: #333 !important;
  }
`;

const Header = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
  h3 { margin: 0; color: #fff; font-size: 1.1rem; font-weight: 500; }
`;

export const CategoryManager: React.FC = () => {
  const queryClient = useQueryClient();
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [form] = Form.useForm();

  const { data: categories = [], isLoading } = useQuery({
    queryKey: ['finance_categories'],
    queryFn: financeApi.categories
  });

  const createMutation = useMutation({
    mutationFn: financeApi.createCategory,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['finance_categories'] });
      message.success('Category created');
      setIsModalVisible(false);
      form.resetFields();
    },
    onError: (err: any) => {
      message.error(err?.response?.data?.detail || 'Failed to create category');
    }
  });

  const deleteMutation = useMutation({
    mutationFn: financeApi.deleteCategory,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['finance_categories'] });
      message.success('Category deleted');
    }
  });

  // Build tree data
  const buildTree = (cats: any[], parentId: string | null = null): any[] => {
    return cats
      .filter(c => c.parent_id === parentId)
      .map(c => ({
        title: (
          <div style={{ display: 'flex', justifyContent: 'space-between', width: '250px' }}>
            <span>{c.icon && <span style={{marginRight: 8}}>{c.icon}</span>}{c.name}</span>
            <Popconfirm title="Delete category?" onConfirm={(e) => { e?.stopPropagation(); deleteMutation.mutate(c.id); }}>
              <DeleteOutlined style={{ color: '#ff4d4f' }} />
            </Popconfirm>
          </div>
        ),
        key: c.id,
        children: buildTree(cats, c.id)
      }));
  };

  const treeData = buildTree(categories);

  return (
    <Container>
      <Header>
        <h3>Categories</h3>
        <Button type="primary" icon={<PlusOutlined />} onClick={() => setIsModalVisible(true)}>
          Add Category
        </Button>
      </Header>

      {isLoading ? <p>Loading...</p> : (
        <Tree
          treeData={treeData}
          defaultExpandAll
          selectable={false}
          blockNode
        />
      )}

      <Modal
        title="Add New Category"
        open={isModalVisible}
        onOk={() => form.submit()}
        onCancel={() => setIsModalVisible(false)}
        confirmLoading={createMutation.isPending}
      >
        <Form form={form} layout="vertical" onFinish={v => createMutation.mutate(v)}>
          <Form.Item name="name" label="Category Name" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name="parent_id" label="Parent Category">
            <Select allowClear placeholder="None (Top Level)">
              {categories.map((c: any) => (
                <Select.Option key={c.id} value={c.id}>{c.name}</Select.Option>
              ))}
            </Select>
          </Form.Item>
          <Form.Item name="icon" label="Emoji Icon">
            <Input placeholder="🛒" />
          </Form.Item>
        </Form>
      </Modal>
    </Container>
  );
};
