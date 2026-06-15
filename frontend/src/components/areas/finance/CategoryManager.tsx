import React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Tree, Popconfirm, message } from 'antd';
import { DeleteOutlined } from '@ant-design/icons';
import styled from 'styled-components';
import { financeApi } from '@/api/areas';

const Container = styled.div`
  background: hsl(var(--card));
  border-radius: 24px;
  padding: 16px;
  border: none;
  box-shadow: var(--shadow-premium-sm);
  width: 100%;
  height: 100%;
  
  .ant-tree {
    background: transparent;
    color: hsl(var(--foreground));
  }
  .ant-tree-node-content-wrapper {
    color: hsl(var(--foreground));
    font-size: 11px;
  }
  .ant-tree-node-content-wrapper:hover {
    background-color: hsl(var(--muted) / 0.3);
  }
  .ant-tree-node-selected {
    background-color: hsl(var(--muted)) !important;
  }
`;

const Header = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 6px;
  padding: 0 4px;
  h3 { 
    margin: 0; 
    color: hsl(var(--muted-foreground)); 
    font-size: 11px; 
    font-weight: 500; 
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }
`;

export const CategoryManager: React.FC = () => {
  const queryClient = useQueryClient();

  const { data: categories = [], isLoading } = useQuery({
    queryKey: ['finance_categories'],
    queryFn: financeApi.categories
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
      </Header>

      {isLoading ? <p>Loading...</p> : (
        <Tree
          treeData={treeData}
          defaultExpandAll
          selectable={false}
          blockNode
        />
      )}
    </Container>
  );
};
