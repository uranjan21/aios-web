import React, { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Button, Dialog, Select, Input, Card, SkeletonList } from '@ledgr/ui'
import { Popconfirm } from '@ct/shared/components/ui/Popconfirm'
import { Trash2, Edit, Plus, PlusCircle, ChevronRight, ChevronDown, Tags } from 'lucide-react'
import { toast } from 'sonner'
import styled from 'styled-components'
import { financeApi } from '@ct/shared/api/areas'

// ── Styled ────────────────────────────────────────────────────────────────────

const RowActions = styled.span`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => `${theme.spacing[2.5]}`};
  opacity: 0.6;
  transition: opacity 0.2s;
  &:hover { opacity: 1; }
`

const TreeContainer = styled.div`
  margin-top: 0.5rem;
  margin-left: -1rem;
`

const NodeWrapper = styled.div`
  padding-left: 1rem;
`

const NodeRow = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.25rem 0.5rem;
  border-radius: 0.25rem;
  cursor: pointer;
  font-size: ${({ theme }) => theme.typography.fontSize.xs};
  color: ${({ theme }) => theme.color.foreground};
  &:hover {
    background-color: ${({ theme }) => theme.color.muted}4d;
    ${RowActions} { opacity: 1; }
  }
`

const NodeContent = styled.div`
  display: flex;
  align-items: center;
  gap: 0.25rem;
`

const ExpandIcon = styled.span`
  color: ${({ theme }) => theme.color.mutedForeground};
  display: flex;
  align-items: center;
`

const IconPlaceholder = styled.span`
  width: 14px;
`

const NodeIcon = styled.span`
  margin-right: 0.5rem;
`

const ActionIcon = styled.span`
  cursor: pointer;
  display: flex;
  align-items: center;
`

const DeleteIcon = styled(Trash2)`
  color: ${({ theme }) => theme.color.destructive};
  cursor: pointer;
`

const ChildrenContainer = styled.div`
  border-left: 1px solid ${({ theme }) => theme.color.border}80;
  margin-left: 0.5rem;
`

const FormContainer = styled.form`
  margin-top: 1rem;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
`

const FormGroup = styled.div``

const Label = styled.div`
  font-size: ${({ theme }) => theme.typography.fontSize.sm};
  font-weight: 500;
  margin-bottom: 0.25rem;
`

const ActionsContainer = styled.div`
  display: flex;
  gap: 0.5rem;
  padding-top: 0.5rem;
  justify-content: flex-end;
`


// ── Tree node ─────────────────────────────────────────────────────────────────

const CategoryNode = ({ category, allCategories, onAddSub, onEdit, onDelete }: any) => {
  const [expanded, setExpanded] = useState(true)
  const children = allCategories.filter((c: any) => c.parent_id === category.id)

  return (
    <NodeWrapper>
      <NodeRow onClick={() => setExpanded(!expanded)}>
        <NodeContent>
          {children.length > 0 ? (
            expanded
              ? <ExpandIcon><ChevronDown size={14} /></ExpandIcon>
              : <ExpandIcon><ChevronRight size={14} /></ExpandIcon>
          ) : (
            <IconPlaceholder />
          )}
          <span>
            {category.icon && <NodeIcon>{category.icon}</NodeIcon>}
            {category.name}
          </span>
          {!category.parent_id && children.length > 0 && (
            <span style={{ fontSize: 10, color: 'var(--muted-foreground)', marginLeft: 4 }}>
              {children.length}
            </span>
          )}
        </NodeContent>
        <RowActions>
          {!category.parent_id && (
            <ActionIcon title="Add subcategory" onClick={e => { e.stopPropagation(); onAddSub(category) }}>
              <PlusCircle size={14} />
            </ActionIcon>
          )}
          <ActionIcon title="Edit" onClick={e => { e.stopPropagation(); onEdit(category) }}>
            <Edit size={14} />
          </ActionIcon>
          <Popconfirm title="Delete category?" onConfirm={e => { e?.stopPropagation(); onDelete(category.id) }}>
            <ActionIcon onClick={e => e.stopPropagation()}>
              <DeleteIcon size={14} />
            </ActionIcon>
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
  )
}

// ── CategoryManager ───────────────────────────────────────────────────────────

type ModalState =
  | { mode: 'create-top'; kind: 'expense' | 'income' }
  | { mode: 'create-sub'; parentId: string; parentName: string; kind: 'expense' | 'income' }
  | { mode: 'edit'; category: any }

export const CategoryManager: React.FC = () => {
  const queryClient = useQueryClient()
  const [activeKind, setActiveKind] = useState<'expense' | 'income'>('expense')
  const [modal, setModal] = useState<ModalState | null>(null)
  const [values, setValues] = useState({ name: '', icon: '', parent_id: '' })

  const { data: categories = [], isLoading } = useQuery({
    queryKey: ['finance', 'categories'],
    queryFn: () => financeApi.categories(),
  })

  const deleteMutation = useMutation({
    mutationFn: financeApi.deleteCategory,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['finance', 'categories'] })
      toast.success('Category deleted')
    },
    onError: (e: any) => toast.error(e?.response?.data?.detail || 'Failed to delete category'),
  })

  const createMutation = useMutation({
    mutationFn: financeApi.createCategory,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['finance', 'categories'] })
      toast.success('Category added')
      setModal(null)
      setValues({ name: '', icon: '', parent_id: '' })
    },
    onError: (e: any) => toast.error(e?.response?.data?.detail || 'Failed to add category'),
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => financeApi.updateCategory(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['finance', 'categories'] })
      toast.success('Category updated')
      setModal(null)
      setValues({ name: '', icon: '', parent_id: '' })
    },
    onError: (e: any) => toast.error(e?.response?.data?.detail || 'Failed to update category'),
  })

  // Only top-level categories for the active kind
  const allKindCats = (categories as any[]).filter(
    c => (c.kind || 'expense') === activeKind,
  )
  const topLevelCategories = allKindCats.filter(c => !c.parent_id)

  const openCreateTop = () => {
    setValues({ name: '', icon: '', parent_id: '' })
    setModal({ mode: 'create-top', kind: activeKind })
  }

  const openCreateSub = (parent: any) => {
    setValues({ name: '', icon: '', parent_id: '' })
    setModal({ mode: 'create-sub', parentId: parent.id, parentName: parent.name, kind: parent.kind || activeKind })
  }

  const openEdit = (category: any) => {
    setValues({ name: category.name, icon: category.icon ?? '', parent_id: category.parent_id ?? '' })
    setModal({ mode: 'edit', category })
  }

  const handleSubmit = () => {
    if (!modal) return
    const icon = values.icon?.trim() || null
    if (modal.mode === 'create-top') {
      createMutation.mutate({ name: values.name, icon, parent_id: null, kind: modal.kind })
    } else if (modal.mode === 'create-sub') {
      createMutation.mutate({ name: values.name, icon, parent_id: modal.parentId, kind: modal.kind })
    } else {
      updateMutation.mutate({
        id: modal.category.id,
        data: { name: values.name, icon, parent_id: values.parent_id || null },
      })
    }
  }

  const modalTitle =
    modal?.mode === 'create-top'
      ? `Add ${modal.kind === 'income' ? 'Income' : 'Expense'} Category`
      : modal?.mode === 'create-sub'
      ? `Add Subcategory to "${modal.parentName}"`
      : modal?.mode === 'edit'
      ? (modal.category.parent_id ? 'Edit Subcategory' : 'Edit Category')
      : ''

  const editParentOptions =
    modal?.mode === 'edit'
      ? (categories as any[]).filter(
          c => !c.parent_id && c.id !== modal.category.id && (c.kind || 'expense') === (modal.category.kind || 'expense'),
        )
      : []

  return (
    <Card
      title="Categories"
      subtitle="Organize spending into a category tree"
      icon={<Tags size={16} />}
      action={
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Select
            size="sm"
            fullWidth={false}
            value={activeKind}
            onChange={v => setActiveKind(v as 'expense' | 'income')}
            options={[
              { label: 'Expense', value: 'expense' },
              { label: 'Income', value: 'income' },
            ]}
            aria-label="Category kind"
          />
          <Button variant="ghost" size="sm" onClick={openCreateTop}>
            <Plus size={14} style={{ marginRight: 4 }} /> Add
          </Button>
        </div>
      }
    >
      {isLoading ? (
        <TreeContainer>
          {/* A category row is a colour dot plus a name — SkeletonList with no
              trailing value draws exactly that. */}
          <SkeletonList rows={4} trailing={false} />
        </TreeContainer>
      ) : topLevelCategories.length === 0 ? (
        <div style={{ padding: '24px 0', textAlign: 'center', fontSize: 13, color: 'var(--muted-foreground)' }}>
          No {activeKind} categories yet.{' '}
          <button
            type="button"
            onClick={openCreateTop}
            style={{ color: 'var(--primary)', background: 'none', border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 500 }}
          >
            Add one
          </button>
        </div>
      ) : (
        <TreeContainer>
          {topLevelCategories.map((c: any) => (
            <CategoryNode
              key={c.id}
              category={c}
              allCategories={allKindCats}
              onAddSub={openCreateSub}
              onEdit={openEdit}
              onDelete={(id: string) => deleteMutation.mutate(id)}
            />
          ))}
        </TreeContainer>
      )}

      <Dialog
        title={modalTitle}
        open={!!modal}
        onOpenChange={open => { if (!open) setModal(null) }}
        size="sm"
      >
        <FormContainer onSubmit={e => { e.preventDefault(); handleSubmit() }}>
          <FormGroup>
            <Label>Name</Label>
            <Input
              required
              placeholder="e.g. Groceries"
              value={values.name}
              onChange={e => setValues({ ...values, name: e.target.value })}
            />
          </FormGroup>
          <FormGroup>
            <Label>Emoji Icon</Label>
            <Input
              placeholder="🛒"
              maxLength={2}
              value={values.icon}
              onChange={e => setValues({ ...values, icon: e.target.value })}
            />
          </FormGroup>
          {modal?.mode === 'edit' && (
            <FormGroup>
              <Label>Parent Category</Label>
              <Select
                fullWidth
                size="md"
                value={values.parent_id}
                onChange={v => setValues({ ...values, parent_id: String(v) })}
                options={[
                  { label: 'None (top level)', value: '' },
                  ...editParentOptions.map((c: any) => ({
                    label: `${c.icon ? `${c.icon} ` : ''}${c.name}`,
                    value: c.id,
                  })),
                ]}
              />
            </FormGroup>
          )}
          <ActionsContainer>
            <Button variant="ghost" onClick={() => setModal(null)} type="button">
              Cancel
            </Button>
            <Button
              variant="primary"
              type="submit"
              loading={createMutation.isPending || updateMutation.isPending}
            >
              {modal?.mode === 'edit' ? 'Save' : 'Add'}
            </Button>
          </ActionsContainer>
        </FormContainer>
      </Dialog>
    </Card>
  )
}
