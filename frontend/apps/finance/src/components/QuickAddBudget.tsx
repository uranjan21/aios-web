import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { SWATCH_COLORS_REQUIRED } from '@ct/shared/config/swatches'
import { Button, Input, Select, Dialog, SegmentedControl } from '@ledgr/ui'
import { financeApi } from '@ct/shared/api/areas'
import { FieldError, useFieldErrors } from '@ct/shared/components/forms/fieldErrors'
import styled from 'styled-components'

const FormStack = styled.form`
  margin-top: 0.75rem;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
`

const LabelText = styled.div`
  font-size: ${({ theme }) => theme.typography.fontSize.sm};
  font-weight: 500;
  margin-bottom: 0.25rem;
  color: ${({ theme }) => theme.color.foreground};
`

const LabelMuted = styled.div`
  font-size: ${({ theme }) => theme.typography.fontSize.xs};
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
  font-size: ${({ theme }) => theme.typography.fontSize.sm};
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
const COLORS = SWATCH_COLORS_REQUIRED

function AddBudgetForm({ onSuccess }: { onSuccess?: () => void }) {
  const queryClient = useQueryClient()
  const { data: budgets } = useQuery({ queryKey: ['finance', 'budgets'], queryFn: financeApi.budgets })
  const { data: allCategories } = useQuery({
    queryKey: ['finance', 'categories'],
    queryFn: () => financeApi.categories('expense'),
    staleTime: 60_000,
  })

  const [values, setValues] = useState({ category: '', monthly_limit: '' })
  const f = useFieldErrors<'category' | 'monthly_limit'>('add-budget')

  const { mutate, isPending } = useMutation({
    mutationFn: (v: { category: string; monthly_limit: string }) =>
      financeApi.upsertBudget({ category: v.category, monthly_limit: parseFloat(v.monthly_limit) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['finance', 'budgets'] })
      toast.success('Budget added')
      setValues({ category: '', monthly_limit: '' })
      f.reset()
      onSuccess?.()
    },
    onError: () => toast.error('Failed to save budget'),
  })

  const topLevelCategories = (allCategories ?? []).filter(c => c.parent_id === null).map(c => c.name)
  const available = topLevelCategories.filter(c => !budgets?.some(b => b.category === c))

  /* `monthly_limit` is `Field(gt=0)` server-side; an empty select posts an
     empty category. Both are field problems, so neither is a toast. */
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const limit = Number(values.monthly_limit)
    const ok = f.submit({
      category: values.category ? undefined : 'Pick the category to cap.',
      monthly_limit: values.monthly_limit.trim() === '' || !Number.isFinite(limit)
        ? 'Enter a monthly limit.'
        : limit <= 0
          ? 'The limit must be more than zero.'
          : undefined,
    })
    if (ok) mutate(values)
  }

  return (
    <FormStack noValidate onSubmit={handleSubmit}>
      <div>
        <LabelText>Category</LabelText>
        <Select value={values.category} onChange={v => { f.clearField('category'); setValues({ ...values, category: String(v) }) }} options={[{label: 'Select category', value: ''}, ...available.map(c => ({ label: c, value: c }))]} />
        <FieldError id={f.errorId('category')}>{f.errors.category}</FieldError>
      </div>
      <div>
        <LabelText>Monthly Limit (₹)</LabelText>
        <Input type="number" min="1" step="0.01" value={values.monthly_limit} {...f.fieldProps('monthly_limit')} onChange={e => { f.clearField('monthly_limit'); setValues({ ...values, monthly_limit: e.target.value }) }} />
        <FieldError id={f.errorId('monthly_limit')}>{f.errors.monthly_limit}</FieldError>
      </div>
      <SubmitButton type="submit" variant="primary" loading={isPending}>Add Budget</SubmitButton>
    </FormStack>
  )
}

function AddGoalForm({ onSuccess }: { onSuccess?: () => void }) {
  const queryClient = useQueryClient()
  const [icon, setIcon] = useState('🎯')
  const [color, setColor] = useState(SWATCH_COLORS_REQUIRED[0].value)
  
  const [values, setValues] = useState({ name: '', category: 'savings', target_amount: '', current_amount: '', deadline: '' })
  const f = useFieldErrors<'name' | 'target_amount' | 'current_amount'>('add-goal')

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
      setColor(SWATCH_COLORS_REQUIRED[0].value)
      f.reset()
      onSuccess?.()
    },
    onError: () => toast.error('Failed to create goal'),
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const target = Number(values.target_amount)
    const saved = values.current_amount.trim() === '' ? 0 : Number(values.current_amount)
    const ok = f.submit({
      name: values.name.trim() ? undefined : 'Give the goal a name.',
      target_amount: values.target_amount.trim() === '' || !Number.isFinite(target)
        ? 'Enter the amount you are saving towards.'
        : target <= 0
          ? 'The target must be more than zero.'
          : undefined,
      current_amount: !Number.isFinite(saved)
        ? 'Enter a number, or leave this blank.'
        : saved < 0
          ? 'You cannot have saved a negative amount.'
          : undefined,
    })
    if (ok) mutate({ ...values, name: values.name.trim() })
  }

  return (
    <FormStack noValidate onSubmit={handleSubmit}>
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
        <Input placeholder="e.g. Europe Trip" value={values.name} {...f.fieldProps('name')} onChange={e => { f.clearField('name'); setValues({ ...values, name: e.target.value }) }} />
        <FieldError id={f.errorId('name')}>{f.errors.name}</FieldError>
      </div>
      <div>
        <LabelText>Category</LabelText>
        <Select value={values.category} onChange={v => setValues({ ...values, category: String(v) })} options={GOAL_CATEGORIES.map(c => ({ label: c, value: c }))} />
      </div>
      <Grid2Col>
        <div>
          <LabelText>Target (₹)</LabelText>
          <Input type="number" min="1" step="0.01" value={values.target_amount} {...f.fieldProps('target_amount')} onChange={e => { f.clearField('target_amount'); setValues({ ...values, target_amount: e.target.value }) }} />
          <FieldError id={f.errorId('target_amount')}>{f.errors.target_amount}</FieldError>
        </div>
        <div>
          <LabelText>Saved (₹)</LabelText>
          <Input type="number" min="0" step="0.01" value={values.current_amount} {...f.fieldProps('current_amount')} onChange={e => { f.clearField('current_amount'); setValues({ ...values, current_amount: e.target.value }) }} />
          <FieldError id={f.errorId('current_amount')}>{f.errors.current_amount}</FieldError>
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
  const f = useFieldErrors<'name' | 'amount' | 'due_day'>('add-bill')

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
      f.reset()
      onSuccess?.()
    },
    onError: () => toast.error('Failed to add bill'),
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const amount = Number(values.amount)
    const day = Number(values.due_day)
    const ok = f.submit({
      name: values.name.trim() ? undefined : 'Give the bill a name.',
      amount: values.amount.trim() === '' || !Number.isFinite(amount)
        ? 'Enter the amount.'
        : amount <= 0
          ? 'Must be more than zero.'
          : undefined,
      // `BillCreate.due_day` is a bare `int` server-side — nothing rejects 45
      // there, and `noValidate` turns off the input's own max. This is the
      // only bound that exists, so it is checked rather than assumed.
      due_day: values.due_day.trim() === '' || !Number.isInteger(day)
        ? 'Enter the day of the month it is due.'
        : day < 1 || day > 31
          ? 'Pick a day between 1 and 31.'
          : undefined,
    })
    if (ok) mutate({ ...values, name: values.name.trim() })
  }

  return (
    <FormStack noValidate onSubmit={handleSubmit}>
      <div>
        <LabelText>Bill Name</LabelText>
        <Input placeholder="Netflix, Electricity…" value={values.name} {...f.fieldProps('name')} onChange={e => { f.clearField('name'); setValues({ ...values, name: e.target.value }) }} />
        <FieldError id={f.errorId('name')}>{f.errors.name}</FieldError>
      </div>
      <Grid2Col>
        <div>
          <LabelText>Amount (₹)</LabelText>
          <Input type="number" min="0" step="0.01" value={values.amount} {...f.fieldProps('amount')} onChange={e => { f.clearField('amount'); setValues({ ...values, amount: e.target.value }) }} />
          <FieldError id={f.errorId('amount')}>{f.errors.amount}</FieldError>
        </div>
        <div>
          <LabelText>Due Day (1-31)</LabelText>
          <Input type="number" min="1" max="31" step="1" value={values.due_day} {...f.fieldProps('due_day')} onChange={e => { f.clearField('due_day'); setValues({ ...values, due_day: e.target.value }) }} />
          <FieldError id={f.errorId('due_day')}>{f.errors.due_day}</FieldError>
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
