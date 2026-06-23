import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Popconfirm } from '@/components/ui/Popconfirm'
import { Button, Select, Input, DataTable, SegmentedControl, Card } from '@ledgr/ui'
import { Trash2, PencilLine, Gauge } from 'lucide-react'
import { financeApi } from '@/api/areas'
import { formatCurrency } from '@/lib/utils'
import { Skeleton } from '@/components/ui/skeleton'
import type { BudgetLimit } from '@/types'
import { TableFooter } from '@/components/ui/Table'
import styled from 'styled-components'

const CategoryCell = styled.div`
  display: flex;
  align-items: center;
  gap: 0.625rem;
`

const CategoryDot = styled.div`
  width: 0.5rem;
  height: 0.5rem;
  border-radius: 9999px;
  background-color: ${({ theme }) => theme.color.primary}99;
  flex-shrink: 0;
`

const CategoryName = styled.span`
  font-weight: 500;
  color: ${({ theme }) => theme.color.foreground};
`

const AmountText = styled.span<{ $over?: boolean }>`
  font-weight: 500;
  color: ${({ $over, theme }) => $over ? theme.color.destructive : theme.color.foreground};
`

const UtilContainer = styled.div`
  width: 120px;
  @media (min-width: 1024px) {
    width: 150px;
  }
`

const ProgressBarBg = styled.div`
  height: 0.375rem;
  border-radius: 9999px;
  background-color: ${({ theme }) => theme.color.muted};
  overflow: hidden;
  margin-top: 0.25rem;
`

const ProgressBarFill = styled.div<{ $color: string, $width: number }>`
  height: 100%;
  border-radius: 9999px;
  transition: all 0.2s;
  background-color: ${({ $color }) => $color};
  width: ${({ $width }) => $width}%;
`

const ActionContainer = styled.div`
  display: flex;
  gap: 0.5rem;
  opacity: 1;
  transition: opacity 0.2s;

  @media (min-width: 768px) {
    opacity: 0;
    tr:hover & {
      opacity: 1;
    }
  }
`

const LoadingContainer = styled.div`
  display: flex;
  flex-direction: column;
  gap: 1rem;
`

const LoadingHeader = styled(Skeleton)`
  height: 40px;
`

const LoadingBody = styled(Skeleton)`
  height: 200px;
`

const FormContainer = styled.div`
  background-color: ${({ theme }) => theme.color.muted}66;
  border-radius: 1rem;
  padding: 0.75rem;
  margin-bottom: 1rem;
`

const FormLayout = styled.form`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.5rem;
`

const SelectWrapper = styled.div`
  flex: 1;
  min-width: 130px;
  margin-bottom: 0.5rem;
`

const InputWrapper = styled.div`
  width: 7rem;
  margin-bottom: 0.5rem;
`

const ButtonsWrapper = styled.div`
  display: flex;
  gap: 0.5rem;
  margin-bottom: 0.5rem;
`

const CATEGORIES = [
  'Food', 'Transport', 'Rent', 'Health', 'Subscriptions',
  'Clothes', 'Entertainment', 'Utilities', 'Education',
  'Groceries', 'Personal Care', 'Investments', 'Others',
]

export function BudgetsTab() {
  const queryClient = useQueryClient()
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState<BudgetLimit | null>(null)
  const [formCategory, setFormCategory] = useState<string>('')
  const [formLimit, setFormLimit] = useState<string>('')
  const [statusFilter, setStatusFilter] = useState<'all' | 'over' | 'near' | 'ok'>('all')

  const { data: budgets, isLoading } = useQuery({
    queryKey: ['finance', 'budgets'],
    queryFn: financeApi.budgets,
  })

  const { data: status } = useQuery({
    queryKey: ['finance', 'budgets', 'status'],
    queryFn: () => financeApi.budgetStatus(),
  })
  const spentByCategory = new Map((status?.items ?? []).map(i => [i.category, i.spent]))

  const upsertMutation = useMutation({
    mutationFn: (values: { category: string; monthly_limit: string }) =>
      financeApi.upsertBudget({ category: values.category, monthly_limit: parseFloat(values.monthly_limit) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['finance', 'budgets'] })
      toast.success(editing ? 'Budget updated' : 'Budget added')
      setFormCategory('')
      setFormLimit('')
      setShowForm(false)
      setEditing(null)
    },
    onError: () => toast.error('Failed to save budget'),
  })

  const deleteMutation = useMutation({
    mutationFn: (category: string) => financeApi.deleteBudget(category),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['finance', 'budgets'] })
      toast.success('Budget removed')
    },
    onError: () => toast.error('Failed to delete budget'),
  })

  const handleEdit = (budget: BudgetLimit) => {
    setEditing(budget)
    setFormCategory(budget.category)
    setFormLimit(String(budget.monthly_limit))
    setShowForm(true)
  }

  const totalBudget = budgets?.reduce((s, b) => s + Number(b.monthly_limit), 0) ?? 0

  const columns = [
    {
      id: 'category',
      header: 'Category',
      cell: (row: any) => (
        <CategoryCell>
          <CategoryDot />
          <CategoryName>{row.category}</CategoryName>
        </CategoryCell>
      )
    },
    {
      id: 'limit',
      header: 'Limit',
      cell: (row: any) => <AmountText>{formatCurrency(Number(row.monthly_limit))}</AmountText>
    },
    {
      id: 'spent',
      header: 'Spent',
      cell: (row: any) => {
        const record = row as BudgetLimit;
        const limit = Number(record.monthly_limit)
        const spent = spentByCategory.get(record.category) ?? 0
        const over = spent > limit
        return <AmountText $over={over}>{formatCurrency(spent)}</AmountText>
      }
    },
    {
      id: 'utilization',
      header: 'Utilization',
      cell: (row: any) => {
        const record = row as BudgetLimit;
        const limit = Number(record.monthly_limit)
        const spent = spentByCategory.get(record.category) ?? 0
        const pct = limit > 0 ? Math.min(100, Math.round((spent / limit) * 100)) : 0
        const over = spent > limit
        const barColor = over ? '#ef4444' : pct >= 80 ? '#f59e0b' : '#10b981'
        return (
          <UtilContainer>
            <ProgressBarBg>
              <ProgressBarFill $color={barColor} $width={pct} />
            </ProgressBarBg>
          </UtilContainer>
        )
      }
    },
    {
      id: 'action',
      header: 'Action',
      cell: (row: any) => {
        const record = row as BudgetLimit;
        return (
          <ActionContainer>
            <Button variant="ghost" size="icon" onClick={() => handleEdit(record)}>
              <PencilLine size={14} />
            </Button>
            <Popconfirm title="Delete this budget?" onConfirm={() => deleteMutation.mutate(record.category)} okText="Delete" cancelText="Cancel" okButtonProps={{ danger: true }}>
              <Button variant="destructive" size="icon">
                <Trash2 size={14} />
              </Button>
            </Popconfirm>
          </ActionContainer>
        )
      }
    }
  ]

  const visibleBudgets = (budgets ?? []).filter((b) => {
    if (statusFilter === 'all') return true
    const limit = Number(b.monthly_limit)
    const spent = spentByCategory.get(b.category) ?? 0
    const pct = limit > 0 ? (spent / limit) * 100 : 0
    if (statusFilter === 'over') return spent > limit
    if (statusFilter === 'near') return spent <= limit && pct >= 80
    return pct < 80
  })

  if (isLoading) return <LoadingContainer><LoadingHeader /><LoadingBody /></LoadingContainer>;

  return (
    <Card
      title="Limits by Category"
      subtitle="Monthly spending caps and how much you've used"
      icon={<Gauge size={16} />}
      action={
        <SegmentedControl
          size="sm"
          aria-label="Filter budgets by status"
          value={statusFilter}
          onChange={(v) => setStatusFilter(v as typeof statusFilter)}
          options={[
            { value: 'all', label: 'All' },
            { value: 'over', label: 'Over' },
            { value: 'near', label: 'Near' },
            { value: 'ok', label: 'On track' },
          ]}
        />
      }
    >
      {/* Add/Edit form */}
      {showForm && (
        <FormContainer>
          <FormLayout onSubmit={e => { e.preventDefault(); upsertMutation.mutate({ category: formCategory, monthly_limit: formLimit }) }}>
            <SelectWrapper>
              <Select
                placeholder="Category"
                disabled={!!editing}
                value={formCategory}
                onChange={(v) => setFormCategory(String(v))}
                options={CATEGORIES
                  .filter(c => !budgets?.some(b => b.category === c) || (editing && c === editing.category))
                  .map(c => ({ value: c, label: c }))}
              />
            </SelectWrapper>
            <InputWrapper>
              <Input type="number" startAdornment="₹" placeholder="Limit" min="1" value={formLimit} onChange={(e) => setFormLimit(e.target.value)} required aria-label="Budget limit" />
            </InputWrapper>
            <ButtonsWrapper>
              <Button variant="primary" type="submit" loading={upsertMutation.isPending} size="sm">
                {editing ? 'Update' : 'Add'}
              </Button>
              <Button variant="ghost" size="sm" onClick={() => { setShowForm(false); setEditing(null); setFormCategory(''); setFormLimit(''); }}>
                Cancel
              </Button>
            </ButtonsWrapper>
          </FormLayout>
        </FormContainer>
      )}

      <DataTable
        rows={visibleBudgets}
        columns={columns}
        getRowKey={row => row.category}
        empty={{ icon: <Gauge size={20} />, title: 'No budgets yet', description: 'Set a monthly limit per category to keep spending on track.' }}
      />
      <TableFooter>
        <span>Total Monthly Limit</span>
        <span>{formatCurrency(totalBudget)}</span>
      </TableFooter>
    </Card>
  )
}
