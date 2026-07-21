import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Button, Input, Select, Dialog, SegmentedControl } from '@ledgr/ui'
import { financeApi } from '@aios/shared/api/areas'
import styled from 'styled-components'

const FormStack = styled.form`
  margin-top: 0.75rem;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
`

const LabelText = styled.div`
  font-size: 12px;
  font-weight: 500;
  margin-bottom: 0.25rem;
  color: ${({ theme }) => theme.color.foreground};
`

const LabelMuted = styled.div`
  font-size: 11px;
  color: ${({ theme }) => theme.color.mutedForeground};
  margin-bottom: 0.25rem;
`

const Grid2Col = styled.div`
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0.5rem;
`

const SubmitButton = styled(Button)`
  width: 100%;
  margin-top: 0.5rem;
`

const OptionsContainer = styled.div`
  display: flex;
  gap: 0.375rem;
  flex-wrap: wrap;
  margin-bottom: 0.5rem;
`

const IconButton = styled.button<{ $active: boolean }>`
  width: 1.75rem;
  height: 1.75rem;
  border-radius: 0.5rem;
  font-size: 1rem;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 1px solid ${({ $active, theme }) => $active ? theme.color.primary : theme.color.border};
  background-color: ${({ $active, theme }) => $active ? `${theme.color.primary}1a` : 'transparent'};
  transition: all 0.2s;
  cursor: pointer;

  &:hover {
    border-color: ${({ $active, theme }) => $active ? theme.color.primary : `${theme.color.primary}80`};
  }
`

const ColorButton = styled.button<{ $active: boolean, $color: string }>`
  width: 1.5rem;
  height: 1.5rem;
  border-radius: ${({ theme }) => theme.radii.full}; /* true circle */
  border: 2px solid ${({ $active, theme }) => $active ? theme.color.foreground : 'transparent'};
  background-color: ${({ $color }) => $color};
  transition: all 0.2s;
  cursor: pointer;
  transform: ${({ $active }) => $active ? 'scale(1.1)' : 'scale(1)'};
`

const CheckboxGroup = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
`

const CheckboxInput = styled.input`
  width: 1rem;
  height: 1rem;
`

const CheckboxLabel = styled.label`
  font-size: 12px;
  font-weight: 500;
  cursor: pointer;
  color: ${({ theme }) => theme.color.foreground};
`

const DialogTitle = styled.span`
  color: ${({ theme }) => theme.color.foreground};
`

const GOAL_CATEGORIES = ['Savings', 'Travel', 'Emergency', 'Investment', 'Purchase', 'Other']
const BILL_CATEGORIES = ['utilities', 'rent', 'subscriptions', 'insurance', 'emi', 'other']

const ICONS = ['🎯', '🏖️', '🚗', '📚', '🏠', '💍', '🏋️', '💰']
const COLORS = [
  { label: 'Teal', value: '#0D9488' },
  { label: 'Orange', value: '#f97316' },
  { label: 'Emerald', value: '#10b981' },
  { label: 'Purple', value: '#8b5cf6' },
  { label: 'Blue', value: '#3b82f6' },
  { label: 'Rose', value: '#f43f5e' },
]

function AddBudgetForm({ onSuccess }: { onSuccess?: () => void }) {
  const queryClient = useQueryClient()
  const { data: budgets } = useQuery({ queryKey: ['finance', 'budgets'], queryFn: financeApi.budgets })
  const { data: allCategories } = useQuery({
    queryKey: ['finance', 'categories'],
    queryFn: () => financeApi.categories('expense'),
    staleTime: 60_000,
  })

  const [values, setValues] = useState({ category: '', monthly_limit: '' })

  const { mutate, isPending } = useMutation({
    mutationFn: (v: { category: string; monthly_limit: string }) =>
      financeApi.upsertBudget({ category: v.category, monthly_limit: parseFloat(v.monthly_limit) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['finance', 'budgets'] })
      toast.success('Budget added')
      setValues({ category: '', monthly_limit: '' })
      onSuccess?.()
    },
    onError: () => toast.error('Failed to save budget'),
  })

  const topLevelCategories = (allCategories ?? []).filter(c => c.parent_id === null).map(c => c.name)
  const available = topLevelCategories.filter(c => !budgets?.some(b => b.category === c))

  return (
    <FormStack onSubmit={e => { e.preventDefault(); mutate(values) }}>
      <div>
        <LabelText>Category</LabelText>
        <Select value={values.category} onChange={v => setValues({ ...values, category: String(v) })} options={[{label: 'Select category', value: ''}, ...available.map(c => ({ label: c, value: c }))]} />
      </div>
      <div>
        <LabelText>Monthly Limit (₹)</LabelText>
        <Input required type="number" min="1" value={values.monthly_limit} onChange={e => setValues({ ...values, monthly_limit: e.target.value })} />
      </div>
      <SubmitButton type="submit" variant="primary" loading={isPending}>Add Budget</SubmitButton>
    </FormStack>
  )
}

function AddGoalForm({ onSuccess }: { onSuccess?: () => void }) {
  const queryClient = useQueryClient()
  const [icon, setIcon] = useState('🎯')
  const [color, setColor] = useState('#0D9488')
  
  const [values, setValues] = useState({ name: '', category: 'savings', target_amount: '', current_amount: '', deadline: '' })

  const { mutate, isPending } = useMutation({
    mutationFn: (v: Record<string, string>) =>
      financeApi.createGoal({
        name: v.name,
        icon,
        target_amount: parseFloat(v.target_amount),
        current_amount: v.current_amount ? parseFloat(v.current_amount) : 0,
        deadline: v.deadline || null,
        category: v.category || 'savings',
        color,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['finance', 'goals'] })
      toast.success('Goal created')
      setValues({ name: '', category: 'savings', target_amount: '', current_amount: '', deadline: '' })
      setIcon('🎯')
      setColor('#0D9488')
      onSuccess?.()
    },
    onError: () => toast.error('Failed to create goal'),
  })

  return (
    <FormStack onSubmit={e => { e.preventDefault(); mutate(values) }}>
      <div>
        <LabelMuted>Icon</LabelMuted>
        <OptionsContainer>
          {ICONS.map(ic => (
            <IconButton
              key={ic}
              type="button"
              onClick={() => setIcon(ic)}
              $active={icon === ic}
            >
              {ic}
            </IconButton>
          ))}
        </OptionsContainer>
      </div>
      <div>
        <LabelMuted>Color</LabelMuted>
        <OptionsContainer style={{ gap: '0.375rem' }}>
          {COLORS.map(c => (
            <ColorButton
              key={c.value}
              type="button"
              onClick={() => setColor(c.value)}
              $active={color === c.value}
              $color={c.value}
              title={c.label}
            />
          ))}
        </OptionsContainer>
      </div>
      <div>
        <LabelText>Goal Name</LabelText>
        <Input required placeholder="e.g. Europe Trip" value={values.name} onChange={e => setValues({ ...values, name: e.target.value })} />
      </div>
      <div>
        <LabelText>Category</LabelText>
        <Select value={values.category} onChange={v => setValues({ ...values, category: String(v) })} options={GOAL_CATEGORIES.map(c => ({ label: c, value: c }))} />
      </div>
      <Grid2Col>
        <div>
          <LabelText>Target (₹)</LabelText>
          <Input required type="number" min="1" value={values.target_amount} onChange={e => setValues({ ...values, target_amount: e.target.value })} />
        </div>
        <div>
          <LabelText>Saved (₹)</LabelText>
          <Input type="number" min="0" value={values.current_amount} onChange={e => setValues({ ...values, current_amount: e.target.value })} />
        </div>
      </Grid2Col>
      <div>
        <LabelText>Deadline</LabelText>
        <Input type="date" value={values.deadline} onChange={e => setValues({ ...values, deadline: e.target.value })} />
      </div>
      <SubmitButton type="submit" variant="primary" loading={isPending}>Create Goal</SubmitButton>
    </FormStack>
  )
}

function AddBillForm({ onSuccess }: { onSuccess?: () => void }) {
  const queryClient = useQueryClient()
  const { data: accounts } = useQuery({ queryKey: ['finance', 'accounts'], queryFn: financeApi.accounts })
  
  const [values, setValues] = useState({ name: '', amount: '', due_day: '', category: 'other', account_id: '', notes: '' })
  const [isAutoDebit, setIsAutoDebit] = useState(false)

  const { mutate, isPending } = useMutation({
    mutationFn: (v: Record<string, any>) =>
      financeApi.createBill({
        name: String(v.name),
        amount: parseFloat(String(v.amount)),
        due_day: parseInt(String(v.due_day), 10),
        category: v.category ? String(v.category) : undefined,
        is_auto_debit: Boolean(isAutoDebit),
        notes: v.notes ? String(v.notes) : undefined,
        account_id: v.account_id ? String(v.account_id) : undefined,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['finance', 'bills'] })
      toast.success('Bill added')
      setValues({ name: '', amount: '', due_day: '', category: 'other', account_id: '', notes: '' })
      setIsAutoDebit(false)
      onSuccess?.()
    },
    onError: () => toast.error('Failed to add bill'),
  })

  return (
    <FormStack onSubmit={e => { e.preventDefault(); mutate(values) }}>
      <div>
        <LabelText>Bill Name</LabelText>
        <Input required placeholder="Netflix, Electricity…" value={values.name} onChange={e => setValues({ ...values, name: e.target.value })} />
      </div>
      <Grid2Col>
        <div>
          <LabelText>Amount (₹)</LabelText>
          <Input required type="number" min="0" value={values.amount} onChange={e => setValues({ ...values, amount: e.target.value })} />
        </div>
        <div>
          <LabelText>Due Day (1-31)</LabelText>
          <Input required type="number" min="1" max="31" value={values.due_day} onChange={e => setValues({ ...values, due_day: e.target.value })} />
        </div>
      </Grid2Col>
      <div>
        <LabelText>Category</LabelText>
        <Select value={values.category} onChange={v => setValues({ ...values, category: String(v) })} options={BILL_CATEGORIES.map(c => ({ label: c.charAt(0).toUpperCase() + c.slice(1), value: c }))} />
      </div>
      <div>
        <LabelText>Pay From Account</LabelText>
        <Select value={values.account_id} onChange={v => setValues({ ...values, account_id: String(v) })} options={[{label: 'Select account (optional)', value: ''}, ...(accounts ?? []).map((a: any) => ({ label: a.name, value: a.id }))]} />
      </div>
      <CheckboxGroup>
        <CheckboxInput type="checkbox" id="auto_debit" checked={isAutoDebit} onChange={e => setIsAutoDebit(e.target.checked)} />
        <CheckboxLabel htmlFor="auto_debit">Auto-debit</CheckboxLabel>
      </CheckboxGroup>
      <div>
        <LabelText>Notes</LabelText>
        <Input placeholder="Optional note" value={values.notes} onChange={e => setValues({ ...values, notes: e.target.value })} />
      </div>
      <SubmitButton type="submit" variant="primary" loading={isPending}>Add Bill</SubmitButton>
    </FormStack>
  )
}

export function BudgetTabModal({ open, onClose, defaultTab = 'Budget' }: { open: boolean; onClose: () => void; defaultTab?: 'Budget' | 'Goal' | 'Bill' | 'Subscription' }) {
  const [activeTab, setActiveTab] = useState<'Budget' | 'Goal' | 'Bill' | 'Subscription'>(defaultTab || 'Budget')

  useEffect(() => { if (open) setActiveTab(defaultTab || 'Budget') }, [open, defaultTab])

  return (
    <Dialog
      title={<DialogTitle>Add Budget / Saving Item</DialogTitle>}
      open={open}
      onOpenChange={(v) => { if (!v) onClose() }}
      size="sm"
    >
      <SegmentedControl
        options={[
          { label: 'Budget Limit', value: 'Budget' },
          { label: 'Savings Goal', value: 'Goal' },
          { label: 'Recurring Bill', value: 'Bill' }
        ]}
        value={activeTab}
        onChange={v => setActiveTab(v as any)}
        style={{ marginBottom: '0.75rem' }}
      />
      {activeTab === 'Budget' && <AddBudgetForm onSuccess={onClose} />}
      {activeTab === 'Goal' && <AddGoalForm onSuccess={onClose} />}
      {activeTab === 'Bill' && <AddBillForm onSuccess={onClose} />}
    </Dialog>
  )
}
