import React, { useState, useEffect, useRef } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Popconfirm } from '@ct/shared/components/ui/Popconfirm'
import { Button, Input, Select, Dialog, SegmentedControl } from '@ledgr/ui'
import { financeApi } from '@ct/shared/api/areas'
import styled from 'styled-components'
import { FieldError, useFieldErrors } from './forms/fieldErrors'

const FormStack = styled.form`
  margin-top: 0.75rem;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
`

const DivStack = styled.div`
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

const HelperText = styled.div`
  font-size: ${({ theme }) => theme.typography.fontSize.xs};
  color: ${({ theme }) => theme.color.mutedForeground};
  margin-bottom: 0.25rem;
`

const InfoText = styled.div`
  font-size: ${({ theme }) => theme.typography.fontSize.xs};
  color: ${({ theme }) => theme.color.mutedForeground};
  margin-top: -0.25rem;
`

const Grid2Col = styled.div`
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0.5rem;
`

const ColSpan2 = styled.div`
  grid-column: span 2 / span 2;
`

const FullInput = styled(Input)`
  width: 100%;
`

const SubmitButton = styled(Button)`
  width: 100%;
  margin-top: 0.5rem;
`

const TypePickerContainer = styled.div`
  display: flex;
  gap: 0.375rem;
  flex-wrap: wrap;
  margin-bottom: 0.5rem;
`

const TypeButton = styled.button<{ $active: boolean }>`
  padding: 0.25rem 0.5rem;
  border-radius: 0.5rem;
  font-size: ${({ theme }) => theme.typography.fontSize.xs};
  font-weight: 500;
  border: 1px solid ${({ $active, theme }) => $active ? theme.color.primary : theme.color.border};
  background-color: ${({ $active, theme }) => $active ? `${theme.color.primary}1a` : 'transparent'};
  color: ${({ $active, theme }) => $active ? theme.color.foreground : theme.color.mutedForeground};
  transition: all 0.2s;
  display: flex;
  align-items: center;
  gap: 0.25rem;
  cursor: pointer;

  &:hover {
    border-color: ${({ $active, theme }) => $active ? theme.color.primary : `${theme.color.primary}80`};
  }
`

const DialogTitle = styled.span`
  color: ${({ theme }) => theme.color.foreground};
`

const ActionsGroup = styled.div`
  display: flex;
  gap: 0.5rem;
`

const OptionalText = styled.span`
  color: ${({ theme }) => theme.color.mutedForeground};
  font-weight: 400;
`

const INVESTMENT_TYPE_META: Record<string, { label: string; icon: string }> = {
  stock: { label: 'Stocks', icon: '📈' },
  mutual_fund: { label: 'Mutual Funds', icon: '💼' },
  fd: { label: 'Fixed Deposit', icon: '🏦' },
  ppf: { label: 'PPF', icon: '🛡️' },
  nps: { label: 'NPS', icon: '👴' },
  crypto: { label: 'Crypto', icon: '₿' },
  gold: { label: 'Gold', icon: '🪙' },
  other: { label: 'Other', icon: '📦' },
}

const CURRENCY_OPTIONS = [
  { value: 'INR', label: 'INR — Indian Rupee' },
  { value: 'USD', label: 'USD — US Dollar' },
  { value: 'EUR', label: 'EUR — Euro' },
  { value: 'GBP', label: 'GBP — British Pound' },
  { value: 'AED', label: 'AED — UAE Dirham' },
  { value: 'SGD', label: 'SGD — Singapore Dollar' },
]

const LOAN_TYPE_META: Record<string, { label: string; icon: string }> = {
  home: { label: 'Home Loan', icon: '🏠' },
  personal: { label: 'Personal Loan', icon: '💵' },
  car: { label: 'Car Loan', icon: '🚗' },
  education: { label: 'Education Loan', icon: '🎓' },
  credit_card: { label: 'Credit Card', icon: '💳' },
  other: { label: 'Other', icon: '📄' },
}

function TypePicker({ meta, value, onChange }: { meta: Record<string, { label: string; icon: string }>; value: string; onChange: (v: string) => void }) {
  return (
    <TypePickerContainer>
      {Object.entries(meta).map(([k, m]) => (
        <TypeButton
          key={k}
          type="button"
          onClick={() => onChange(k)}
          $active={value === k}
        >
          <span>{m.icon}</span>{m.label}
        </TypeButton>
      ))}
    </TypePickerContainer>
  )
}

function AddAccountForm({ onSuccess }: { onSuccess?: () => void }) {
  const queryClient = useQueryClient()
  const [values, setValues] = useState({ name: '', type: 'checking', balance: '0', currency: 'INR' })
  const f = useFieldErrors<'name' | 'balance'>('add-account')

  const { mutate, isPending } = useMutation({
    mutationFn: (v: any) => financeApi.createAccount({ ...v, balance: Number(v.balance) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['finance', 'accounts'] })
      toast.success('Account created')
      setValues({ name: '', type: 'checking', balance: '0', currency: 'INR' })
      f.reset()
      onSuccess?.()
    },
    onError: () => toast.error('Failed to create account'),
  })

  /* Field problems are answered on the field; only transport failure toasts. */
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const ok = f.submit({
      name: values.name.trim() ? undefined : 'Give the account a name.',
      balance: Number.isFinite(Number(values.balance)) && values.balance.trim() !== ''
        ? undefined
        : 'Enter a number, or 0 if you are not sure yet.',
    })
    if (ok) mutate({ ...values, name: values.name.trim() })
  }

  return (
    <FormStack noValidate onSubmit={handleSubmit}>
      <div>
        <LabelText>Account Name</LabelText>
        <FullInput
          placeholder="e.g. HDFC Savings"
          value={values.name}
          {...f.fieldProps('name')}
          onChange={e => { f.clearField('name'); setValues({ ...values, name: e.target.value }) }}
        />
        <FieldError id={f.errorId('name')}>{f.errors.name}</FieldError>
      </div>
      <div>
        <LabelText>Type</LabelText>
        <Select value={values.type} onChange={v => setValues({ ...values, type: String(v) })} options={[
          { label: 'Checking', value: 'checking' },
          { label: 'Savings', value: 'savings' },
          { label: 'Credit Card', value: 'credit_card' },
          { label: 'Investment', value: 'investment' },
          { label: 'Loan', value: 'loan' }
        ]} />
      </div>
      <Grid2Col>
        <div>
          <LabelText>Initial Balance</LabelText>
          <FullInput
            type="number"
            step="0.01"
            value={values.balance}
            {...f.fieldProps('balance')}
            onChange={e => { f.clearField('balance'); setValues({ ...values, balance: e.target.value }) }}
          />
          <FieldError id={f.errorId('balance')}>{f.errors.balance}</FieldError>
        </div>
        <div>
          <LabelText>Currency</LabelText>
          <Select value={values.currency} onChange={v => setValues({ ...values, currency: String(v) })} options={CURRENCY_OPTIONS} aria-label="Currency" />
        </div>
      </Grid2Col>
      <SubmitButton type="submit" variant="primary" loading={isPending}>Add Account</SubmitButton>
    </FormStack>
  )
}

function AddCategoryForm({ onSuccess }: { onSuccess?: () => void }) {
  const queryClient = useQueryClient()
  const { data: categories } = useQuery({ queryKey: ['finance', 'categories'], queryFn: () => financeApi.categories() })

  const [categoryText, setCategoryText] = useState('')
  const [subcategoryText, setSubcategoryText] = useState('')
  const [icon, setIcon] = useState('')
  const syncedIdRef = useRef<string | null>(null)

  const topLevel = (categories ?? []).filter((c: any) => !c.parent_id)
  const categoryMatch = topLevel.find((c: any) => c.name.toLowerCase() === categoryText.trim().toLowerCase())
  const subOptions = categoryMatch ? (categories ?? []).filter((c: any) => c.parent_id === categoryMatch.id) : []
  const subMatch = subOptions.find((c: any) => c.name.toLowerCase() === subcategoryText.trim().toLowerCase())
  const activeMatch = subMatch ?? categoryMatch ?? null

  useEffect(() => {
    const id = activeMatch?.id ?? null
    if (id !== syncedIdRef.current) {
      setIcon(activeMatch?.icon ?? '')
      syncedIdRef.current = id
    }
  }, [activeMatch])

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['finance', 'categories'] })

  const resetForm = () => {
    setCategoryText('')
    setSubcategoryText('')
    setIcon('')
    syncedIdRef.current = null
  }

  const saveMutation = useMutation({
    mutationFn: async () => {
      const catName = categoryText.trim()
      const subName = subcategoryText.trim()
      const iconValue = icon.trim() || null
      if (!catName) throw new Error('Category name is required')

      let categoryId: string
      if (!categoryMatch) {
        const created = await financeApi.createCategory({ name: catName, parent_id: null, icon: subName ? null : iconValue })
        categoryId = created.id
      } else {
        categoryId = categoryMatch.id
        const patch: any = {}
        if (catName !== categoryMatch.name) patch.name = catName
        if (!subName && iconValue !== (categoryMatch.icon ?? null)) patch.icon = iconValue
        if (Object.keys(patch).length) await financeApi.updateCategory(categoryId, patch)
      }

      if (subName) {
        if (!subMatch) {
          await financeApi.createCategory({ name: subName, parent_id: categoryId, icon: iconValue })
        } else {
          const patch: any = {}
          if (subName !== subMatch.name) patch.name = subName
          if (iconValue !== (subMatch.icon ?? null)) patch.icon = iconValue
          if (subMatch.parent_id !== categoryId) patch.parent_id = categoryId
          if (Object.keys(patch).length) await financeApi.updateCategory(subMatch.id, patch)
        }
      }
    },
    onSuccess: () => {
      invalidate()
      toast.success('Saved')
      resetForm()
      onSuccess?.()
    },
    onError: (e: any) => toast.error(e?.response?.data?.detail || e?.message || 'Failed to save'),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => financeApi.deleteCategory(id),
    onSuccess: () => {
      invalidate()
      toast.success('Deleted')
      resetForm()
      onSuccess?.()
    },
    onError: (e: any) => toast.error(e?.response?.data?.detail || 'Failed to delete'),
  })

  let helperText = 'Pick an existing category or type a new one'
  if (subcategoryText.trim()) {
    helperText = subMatch
      ? `Editing subcategory "${subMatch.name}"`
      : `New subcategory "${subcategoryText.trim()}" under "${categoryMatch?.name ?? categoryText.trim()}"`
  } else if (categoryText.trim()) {
    helperText = categoryMatch ? `Editing category "${categoryMatch.name}"` : `New category "${categoryText.trim()}"`
  }

  return (
    <DivStack>
      <div>
        <LabelText>Category</LabelText>
        <FullInput
          list="category-options"
          value={categoryText}
          onChange={(e) => { setCategoryText(e.target.value); setSubcategoryText('') }}
          placeholder="Select existing or type a new category"
        />
        <datalist id="category-options">
          {topLevel.map((c: any) => <option key={c.name} value={c.name}>{c.icon ? `${c.icon} ` : ''}{c.name}</option>)}
        </datalist>
      </div>

      <div>
        <LabelText>Subcategory <OptionalText>(optional)</OptionalText></LabelText>
        <FullInput
          list="subcategory-options"
          value={subcategoryText}
          onChange={(e) => setSubcategoryText(e.target.value)}
          placeholder={categoryText.trim() ? 'Select existing or type a new subcategory' : 'Choose a category first'}
          disabled={!categoryText.trim()}
        />
        <datalist id="subcategory-options">
          {subOptions.map((c: any) => <option key={c.name} value={c.name}>{c.icon ? `${c.icon} ` : ''}{c.name}</option>)}
        </datalist>
      </div>

      <div>
        <LabelText>Emoji Icon</LabelText>
        <FullInput value={icon} onChange={(e) => setIcon(e.target.value)} placeholder="🛒" maxLength={2} />
      </div>

      <InfoText>{helperText}</InfoText>

      <ActionsGroup>
        <Button variant="primary" onClick={() => saveMutation.mutate()} loading={saveMutation.isPending} style={{ width: '100%' }}>Save</Button>
        {activeMatch ? (
          <Popconfirm title="Delete this?" onConfirm={() => activeMatch && deleteMutation.mutate(activeMatch.id)}>
            <Button variant="destructive" loading={deleteMutation.isPending}>Delete</Button>
          </Popconfirm>
        ) : (
          <Button variant="destructive" disabled>Delete</Button>
        )}
      </ActionsGroup>
    </DivStack>
  )
}

function AddInvestmentForm({ onSuccess }: { onSuccess?: () => void }) {
  const queryClient = useQueryClient()
  const [type, setType] = useState('mutual_fund')
  const [values, setValues] = useState({ name: '', invested_amount: '', current_value: '', units: '', purchase_date: '', notes: '' })
  const f = useFieldErrors<'name' | 'invested_amount'>('add-investment')

  const { mutate, isPending } = useMutation({
    mutationFn: (v: Record<string, string>) => financeApi.createInvestment({
      name: v.name,
      type,
      invested_amount: parseFloat(v.invested_amount),
      current_value: parseFloat(v.current_value || v.invested_amount),
      units: v.units ? parseFloat(v.units) : undefined,
      purchase_date: v.purchase_date || null,
      notes: v.notes || undefined,
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['finance', 'investments'] })
      toast.success('Holding added')
      setValues({ name: '', invested_amount: '', current_value: '', units: '', purchase_date: '', notes: '' })
      setType('mutual_fund')
      f.reset()
      onSuccess?.()
    },
    onError: () => toast.error('Failed to add holding'),
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const invested = Number(values.invested_amount)
    const ok = f.submit({
      name: values.name.trim() ? undefined : 'Give the holding a name.',
      invested_amount: values.invested_amount.trim() === '' || !Number.isFinite(invested)
        ? 'Enter the amount you invested.'
        : invested <= 0
          ? 'The invested amount must be more than zero.'
          : undefined,
    })
    if (ok) mutate({ ...values, name: values.name.trim() })
  }

  return (
    <FormStack noValidate onSubmit={handleSubmit}>
      <div>
        <HelperText>Type</HelperText>
        <TypePicker meta={INVESTMENT_TYPE_META} value={type} onChange={setType} />
      </div>
      <div>
        <LabelText>Name</LabelText>
        <FullInput
          placeholder="e.g. Nifty 50 Index Fund"
          value={values.name}
          {...f.fieldProps('name')}
          onChange={e => { f.clearField('name'); setValues({ ...values, name: e.target.value }) }}
        />
        <FieldError id={f.errorId('name')}>{f.errors.name}</FieldError>
      </div>
      <Grid2Col>
        <div>
          <LabelText>Invested (₹)</LabelText>
          <FullInput
            type="number"
            min="0"
            step="0.01"
            value={values.invested_amount}
            {...f.fieldProps('invested_amount')}
            onChange={e => { f.clearField('invested_amount'); setValues({ ...values, invested_amount: e.target.value }) }}
          />
          <FieldError id={f.errorId('invested_amount')}>{f.errors.invested_amount}</FieldError>
        </div>
        <div>
          <LabelText>Current (₹)</LabelText>
          <FullInput type="number" min="0" placeholder="= invested" value={values.current_value} onChange={e => setValues({ ...values, current_value: e.target.value })} />
        </div>
        <div>
          <LabelText>Units</LabelText>
          <FullInput type="number" min="0" step="any" value={values.units} onChange={e => setValues({ ...values, units: e.target.value })} />
        </div>
        <div>
          <LabelText>Purchased</LabelText>
          <FullInput type="date" value={values.purchase_date} onChange={e => setValues({ ...values, purchase_date: e.target.value })} />
        </div>
      </Grid2Col>
      <div>
        <LabelText>Notes</LabelText>
        <FullInput placeholder="Optional" value={values.notes} onChange={e => setValues({ ...values, notes: e.target.value })} />
      </div>
      <SubmitButton type="submit" variant="primary" loading={isPending}>Add Holding</SubmitButton>
    </FormStack>
  )
}

function AddLoanForm({ onSuccess }: { onSuccess?: () => void }) {
  const queryClient = useQueryClient()
  const [type, setType] = useState('personal')
  const { data: accounts } = useQuery({ queryKey: ['finance', 'accounts'], queryFn: financeApi.accounts })

  const [values, setValues] = useState({
    name: '', lender: '', account_id: '', principal_amount: '', outstanding_amount: '', emi_amount: '', emi_day: '', interest_rate: '', tenure_months: '', notes: ''
  })
  const f = useFieldErrors<'name' | 'principal_amount' | 'emi_amount' | 'emi_day'>('add-loan')

  const { mutate, isPending } = useMutation({
    mutationFn: (v: Record<string, string>) => financeApi.createLoan({
      name: v.name,
      loan_type: type,
      lender: v.lender || undefined,
      principal_amount: parseFloat(v.principal_amount),
      outstanding_amount: parseFloat(v.outstanding_amount || v.principal_amount),
      interest_rate: parseFloat(v.interest_rate || '0'),
      emi_amount: parseFloat(v.emi_amount),
      emi_day: parseInt(v.emi_day, 10),
      tenure_months: v.tenure_months ? parseInt(v.tenure_months, 10) : undefined,
      notes: v.notes || undefined,
      account_id: v.account_id || undefined,
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['finance', 'loans'] })
      toast.success('Loan added')
      setValues({
        name: '', lender: '', account_id: '', principal_amount: '', outstanding_amount: '', emi_amount: '', emi_day: '', interest_rate: '', tenure_months: '', notes: ''
      })
      setType('personal')
      f.reset()
      onSuccess?.()
    },
    onError: () => toast.error('Failed to add loan'),
  })

  /** Positive-number check shared by the two rupee fields. */
  const money = (raw: string, missing: string) => {
    if (raw.trim() === '') return missing
    const n = Number(raw)
    if (!Number.isFinite(n)) return 'Enter a number.'
    return n > 0 ? undefined : 'Must be more than zero.'
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const day = Number(values.emi_day)
    const ok = f.submit({
      name: values.name.trim() ? undefined : 'Give the loan a name.',
      principal_amount: money(values.principal_amount, 'Enter the amount borrowed.'),
      emi_amount: money(values.emi_amount, 'Enter the monthly EMI.'),
      // Bounded here as well as by the input's min/max: `noValidate` turns off
      // the browser's own range check, and parseInt would happily send 45.
      emi_day: values.emi_day.trim() === ''
        ? 'Enter the day of the month the EMI is taken.'
        : Number.isInteger(day) && day >= 1 && day <= 31
          ? undefined
          : 'Use a day between 1 and 31.',
    })
    if (ok) mutate({ ...values, name: values.name.trim() })
  }

  return (
    <FormStack noValidate onSubmit={handleSubmit}>
      <div>
        <HelperText>Type</HelperText>
        <TypePicker meta={LOAN_TYPE_META} value={type} onChange={setType} />
      </div>
      <Grid2Col>
        <ColSpan2>
          <LabelText>Loan Name</LabelText>
          <FullInput
            placeholder="e.g. Home Loan - HDFC"
            value={values.name}
            {...f.fieldProps('name')}
            onChange={e => { f.clearField('name'); setValues({ ...values, name: e.target.value }) }}
          />
          <FieldError id={f.errorId('name')}>{f.errors.name}</FieldError>
        </ColSpan2>
        <div>
          <LabelText>Lender</LabelText>
          <FullInput placeholder="Optional" value={values.lender} onChange={e => setValues({ ...values, lender: e.target.value })} />
        </div>
        <div>
          <LabelText>EMI From</LabelText>
          <Select value={values.account_id} onChange={v => setValues({ ...values, account_id: String(v) })} options={[{label: 'Select account', value: ''}, ...(accounts ?? []).map((a: any) => ({ label: a.name, value: a.id }))]} />
        </div>
        <div>
          <LabelText>Principal (₹)</LabelText>
          <FullInput
            type="number"
            min="0"
            step="0.01"
            value={values.principal_amount}
            {...f.fieldProps('principal_amount')}
            onChange={e => { f.clearField('principal_amount'); setValues({ ...values, principal_amount: e.target.value }) }}
          />
          <FieldError id={f.errorId('principal_amount')}>{f.errors.principal_amount}</FieldError>
        </div>
        <div>
          <LabelText>Outstanding (₹)</LabelText>
          <FullInput type="number" min="0" placeholder="= principal" value={values.outstanding_amount} onChange={e => setValues({ ...values, outstanding_amount: e.target.value })} />
        </div>
        <div>
          <LabelText>EMI Amount (₹)</LabelText>
          <FullInput
            type="number"
            min="0"
            step="0.01"
            value={values.emi_amount}
            {...f.fieldProps('emi_amount')}
            onChange={e => { f.clearField('emi_amount'); setValues({ ...values, emi_amount: e.target.value }) }}
          />
          <FieldError id={f.errorId('emi_amount')}>{f.errors.emi_amount}</FieldError>
        </div>
        <div>
          <LabelText>EMI Day (1-31)</LabelText>
          <FullInput
            type="number"
            min="1"
            max="31"
            value={values.emi_day}
            {...f.fieldProps('emi_day')}
            onChange={e => { f.clearField('emi_day'); setValues({ ...values, emi_day: e.target.value }) }}
          />
          <FieldError id={f.errorId('emi_day')}>{f.errors.emi_day}</FieldError>
        </div>
        <div>
          <LabelText>Interest % p.a.</LabelText>
          <FullInput type="number" min="0" step="0.01" value={values.interest_rate} onChange={e => setValues({ ...values, interest_rate: e.target.value })} />
        </div>
        <div>
          <LabelText>Tenure (mo)</LabelText>
          <FullInput type="number" min="0" value={values.tenure_months} onChange={e => setValues({ ...values, tenure_months: e.target.value })} />
        </div>
      </Grid2Col>
      <div>
        <LabelText>Notes</LabelText>
        <FullInput placeholder="Optional" value={values.notes} onChange={e => setValues({ ...values, notes: e.target.value })} />
      </div>
      <SubmitButton type="submit" variant="primary" loading={isPending}>Add Loan</SubmitButton>
    </FormStack>
  )
}

export function AccountsTabModal({ open, onClose, defaultTab = 'Account' }: { open: boolean; onClose: () => void; defaultTab?: 'Account' | 'Category' | 'Investment' | 'Loan' }) {
  const [activeTab, setActiveTab] = useState<'Account' | 'Category' | 'Investment' | 'Loan'>(defaultTab)

  useEffect(() => { if (open) setActiveTab(defaultTab) }, [open, defaultTab])

  return (
    <Dialog
      title={<DialogTitle>Add Financial Asset / Liability</DialogTitle>}
      open={open}
      onOpenChange={(v) => { if (!v) onClose() }}
      size="sm"
    >
      <div style={{ marginBottom: '0.75rem' }}>
        <SegmentedControl
          options={[
            { label: 'Account', value: 'Account' },
            { label: 'Category', value: 'Category' },
            { label: 'Investment', value: 'Investment' },
            { label: 'Loan', value: 'Loan' }
          ]}
          value={activeTab}
          onChange={v => setActiveTab(v as any)}
        />
      </div>
      {activeTab === 'Account' && <AddAccountForm onSuccess={onClose} />}
      {activeTab === 'Category' && <AddCategoryForm onSuccess={onClose} />}
      {activeTab === 'Investment' && <AddInvestmentForm onSuccess={onClose} />}
      {activeTab === 'Loan' && <AddLoanForm onSuccess={onClose} />}
    </Dialog>
  )
}
