import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button, Dialog, Select, SelectItem, Input } from '@ledgr/ui';
import { Popconfirm } from '@/components/ui/Popconfirm';
import { Trash2, Edit, Plus, PlusCircle, ChevronRight, ChevronDown } from 'lucide-react';
import { toast } from 'sonner';
import styled from 'styled-components';
import { financeApi } from '@/api/areas';

const Container = styled.div`
  background: ${({ theme }) => theme.color.card};
  border-radius: 24px;
  padding: 16px;
  border: none;
  box-shadow: var(--shadow-premium-sm);
  width: 100%;
  height: 100%;
`;

const Header = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 6px;
  padding: 0 4px;
  h3 {
    margin: 0;
    color: ${({ theme }) => theme.color.mutedForeground};
    font-size: 11px;
    font-weight: 500;
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }
`;

const RowActions = styled.span`
  display: flex;
  align-items: center;
  gap: 10px;
  opacity: 0.6;
  transition: opacity 0.2s;
  &:hover { opacity: 1; }
`;

const TreeContainer = styled.div`
  margin-top: 0.5rem;
  margin-left: -1rem;
`;

const NodeWrapper = styled.div`
  padding-left: 1rem;
`;

const NodeRow = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.25rem 0.5rem;
  border-radius: 0.25rem;
  cursor: pointer;
  font-size: 11px;
  color: ${({ theme }) => theme.color.foreground};

  &:hover {
    background-color: ${({ theme }) => theme.color.muted}4d;
    ${RowActions} {
      opacity: 1;
    }
  }
`;

const NodeContent = styled.div`
  display: flex;
  align-items: center;
  gap: 0.25rem;
`;

const ExpandIcon = styled.span`
  color: ${({ theme }) => theme.color.mutedForeground};
  display: flex;
  align-items: center;
`;

const IconPlaceholder = styled.span`
  width: 14px;
`;

const NodeIcon = styled.span`
  margin-right: 0.5rem;
`;

const ActionIcon = styled.span`
  cursor: pointer;
  display: flex;
  align-items: center;
`;

const DeleteIcon = styled(Trash2)`
  color: ${({ theme }) => theme.color.destructive};
  cursor: pointer;
`;

const ChildrenContainer = styled.div`
  border-left: 1px solid ${({ theme }) => theme.color.border}80;
  margin-left: 0.5rem;
`;

const LoadingText = styled.p`
  font-size: 11px;
  color: ${({ theme }) => theme.color.mutedForeground};
  padding: 0.5rem;
`;

const ModalTitle = styled.span`
  color: ${({ theme }) => theme.color.foreground};
`;

const FormContainer = styled.form`
  margin-top: 1rem;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
`;

const FormGroup = styled.div``;

const Label = styled.div`
  font-size: 12px;
  font-weight: 500;
  margin-bottom: 0.25rem;
`;

const ActionsContainer = styled.div`
  display: flex;
  gap: 0.5rem;
  padding-top: 0.5rem;
  justify-content: flex-end;
`;

const ButtonContent = styled.div`
  display: flex;
  align-items: center;
  gap: 0.25rem;
`;

type ModalState =
  | { mode: 'create-top' }
  | { mode: 'create-sub'; parentId: string; parentName: string }
  | { mode: 'edit'; category: any };

// Standard recursive tree component
const CategoryNode = ({ category, allCategories, onAddSub, onEdit, onDelete }: any) => {
  const [expanded, setExpanded] = useState(true);
  const children = allCategories.filter((c: any) => c.parent_id === category.id);
  
  return (
    <NodeWrapper>
      <NodeRow onClick={() => setExpanded(!expanded)}>
        <NodeContent>
          {children.length > 0 ? (
            expanded ? <ExpandIcon><ChevronDown size={14} /></ExpandIcon> : <ExpandIcon><ChevronRight size={14} /></ExpandIcon>
          ) : (
            <IconPlaceholder />
          )}
          <span>{category.icon && <NodeIcon>{category.icon}</NodeIcon>}{category.name}</span>
        </NodeContent>
        <RowActions>
          {!category.parent_id && (
            <ActionIcon title="Add subcategory" onClick={(e) => { e.stopPropagation(); onAddSub(category); }}>
              <PlusCircle size={14} />
            </ActionIcon>
          )}
          <ActionIcon title="Edit" onClick={(e) => { e.stopPropagation(); onEdit(category); }}>
            <Edit size={14} />
          </ActionIcon>
          <Popconfirm title="Delete category?" onConfirm={(e) => { e?.stopPropagation(); onDelete(category.id); }}>
            <ActionIcon onClick={(e) => e.stopPropagation()}><DeleteIcon size={14} /></ActionIcon>
          </Popconfirm>
        </RowActions>
      </NodeRow>
      {expanded && children.length > 0 && (
        <ChildrenContainer>
          {children.map((child: any) => (
            <CategoryNode 
              key={child.id} 
              category={child} 
              allCategories={allCategories} 
              onAddSub={onAddSub} 
              onEdit={onEdit} 
              onDelete={onDelete} 
            />
          ))}
        </ChildrenContainer>
      )}
    </NodeWrapper>
  );
};

export const CategoryManager: React.FC = () => {
  const queryClient = useQueryClient();
  const [modal, setModal] = useState<ModalState | null>(null);
  
  const [values, setValues] = useState({ name: '', icon: '', parent_id: '' });

  const { data: categories = [], isLoading } = useQuery({
    queryKey: ['finance_categories'],
    queryFn: financeApi.categories
  });

  const deleteMutation = useMutation({
    mutationFn: financeApi.deleteCategory,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['finance_categories'] });
      toast.success('Category deleted');
    },
    onError: (e: any) => toast.error(e?.response?.data?.detail || 'Failed to delete category'),
  });

  const createMutation = useMutation({
    mutationFn: financeApi.createCategory,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['finance_categories'] });
      toast.success('Category added');
      setModal(null);
      setValues({ name: '', icon: '', parent_id: '' });
    },
    onError: (e: any) => toast.error(e?.response?.data?.detail || 'Failed to add category'),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => financeApi.updateCategory(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['finance_categories'] });
      toast.success('Category updated');
      setModal(null);
      setValues({ name: '', icon: '', parent_id: '' });
    },
    onError: (e: any) => toast.error(e?.response?.data?.detail || 'Failed to update category'),
  });

  const topLevelCategories = categories.filter((c: any) => !c.parent_id);

  const openCreateTop = () => {
    setValues({ name: '', icon: '', parent_id: '' });
    setModal({ mode: 'create-top' });
  };

  const openCreateSub = (parent: any) => {
    setValues({ name: '', icon: '', parent_id: '' });
    setModal({ mode: 'create-sub', parentId: parent.id, parentName: parent.name });
  };

  const openEdit = (category: any) => {
    setValues({ name: category.name, icon: category.icon ?? '', parent_id: category.parent_id ?? '' });
    setModal({ mode: 'edit', category });
  };

  const handleSubmit = () => {
    if (!modal) return;
    const icon = values.icon?.trim() || null;
    if (modal.mode === 'create-top') {
      createMutation.mutate({ name: values.name, icon, parent_id: null });
    } else if (modal.mode === 'create-sub') {
      createMutation.mutate({ name: values.name, icon, parent_id: modal.parentId });
    } else {
      updateMutation.mutate({
        id: modal.category.id,
        data: { name: values.name, icon, parent_id: values.parent_id || null },
      });
    }
  };

  const modalTitle = modal?.mode === 'create-top'
    ? 'Add Category'
    : modal?.mode === 'create-sub'
    ? `Add Subcategory to "${modal.parentName}"`
    : modal?.mode === 'edit'
    ? (modal.category.parent_id ? 'Edit Subcategory' : 'Edit Category')
    : '';

  const parentOptions = modal?.mode === 'edit'
    ? topLevelCategories.filter((c: any) => c.id !== modal.category.id)
    : [];

  return (
    <Container>
      <Header>
        <h3>Categories</h3>
        <Button variant="ghost" size="sm" onClick={openCreateTop}>
          <ButtonContent><Plus size={14} /> Add</ButtonContent>
        </Button>
      </Header>

      {isLoading ? <LoadingText>Loading...</LoadingText> : (
        <TreeContainer>
          {topLevelCategories.map((c: any) => (
            <CategoryNode 
              key={c.id} 
              category={c} 
              allCategories={categories}
              onAddSub={openCreateSub}
              onEdit={openEdit}
              onDelete={(id: string) => deleteMutation.mutate(id)}
            />
          ))}
        </TreeContainer>
      )}

      <Dialog
        title={<ModalTitle>{modalTitle}</ModalTitle>}
        open={!!modal}
        onOpenChange={(open) => { if (!open) setModal(null) }}
        size="sm"
      >
        <FormContainer onSubmit={e => { e.preventDefault(); handleSubmit(); }}>
          <FormGroup>
            <Label>Name</Label>
            <Input required placeholder="e.g. Groceries" value={values.name} onChange={e => setValues({ ...values, name: e.target.value })} />
          </FormGroup>
          <FormGroup>
            <Label>Emoji Icon</Label>
            <Input placeholder="🛒" maxLength={2} value={values.icon} onChange={e => setValues({ ...values, icon: e.target.value })} />
          </FormGroup>
          {modal?.mode === 'edit' && (
            <FormGroup>
              <Label>Parent Category</Label>
              <Select value={values.parent_id} onChange={v => setValues({ ...values, parent_id: String(v) })} options={[{label: 'None (top level)', value: ''}, ...parentOptions.map((c: any) => ({ label: `${c.icon ? `${c.icon} ` : ''}${c.name}`, value: c.id }))]}>
              </Select>
            </FormGroup>
          )}
          <ActionsContainer>
            <Button variant="ghost" onClick={() => setModal(null)} type="button">Cancel</Button>
            <Button variant="primary" type="submit" loading={createMutation.isPending || updateMutation.isPending}>
              {modal?.mode === 'edit' ? 'Save' : 'Add'}
            </Button>
          </ActionsContainer>
        </FormContainer>
      </Dialog>
    </Container>
  );
};
