import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Form, Input, Select, Button } from 'antd'
import { financeApi } from '@/api/areas'
import { GlassCard } from '@/components/lumina'
import { RailHeading } from '@/components/layout/WorkspaceLayout'
import { TextTabs } from '@/components/ui/TextTabs'
import { cn } from '@/lib/utils'

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
    <div className="flex gap-1.5 flex-wrap mb-2">
      {Object.entries(meta).map(([k, m]) => (
        <button
          key={k}
          type="button"
          onClick={() => onChange(k)}
          className={cn(
            'px-2 py-1 rounded-lg text-[11px] font-medium border transition flex items-center gap-1',
            value === k ? 'border-primary bg-primary/10 text-foreground' : 'border-border text-muted-foreground hover:border-primary/50'
          )}
        >
          <span>{m.icon}</span>{m.label}
        </button>
      ))}
    </div>
  )
}

function AddAccountForm() {
  const [form] = Form.useForm()
  const queryClient = useQueryClient()
  const { mutate, isPending } = useMutation({
    mutationFn: (v: any) => financeApi.createAccount({ ...v, balance: Number(v.balance) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['finance', 'accounts'] })
      toast.success('Account created')
      form.resetFields()
    },
    onError: () => toast.error('Failed to create account'),
  })

  return (
    <Form form={form} layout="vertical" size="small" onFinish={mutate} requiredMark={false}>
      <Form.Item name="name" label="Account Name" rules={[{ required: true }]}>
        <Input placeholder="e.g. HDFC Savings" />
      </Form.Item>
      <Form.Item name="type" label="Type" rules={[{ required: true }]} initialValue="checking">
        <Select>
          <Select.Option value="checking">Checking</Select.Option>
          <Select.Option value="savings">Savings</Select.Option>
          <Select.Option value="credit_card">Credit Card</Select.Option>
          <Select.Option value="investment">Investment</Select.Option>
          <Select.Option value="loan">Loan</Select.Option>
        </Select>
      </Form.Item>
      <div className="grid grid-cols-2 gap-2">
        <Form.Item name="balance" label="Initial Balance" initialValue={0}>
          <Input type="number" step="0.01" />
        </Form.Item>
        <Form.Item name="currency" label="Currency" initialValue="INR">
          <Input />
        </Form.Item>
      </div>
      <Button type="primary" htmlType="submit" loading={isPending} size="small" block>Add Account</Button>
    </Form>
  )
}

function AddCategoryForm() {
  const [form] = Form.useForm()
  const queryClient = useQueryClient()
  const { data: categories } = useQuery({ queryKey: ['finance_categories'], queryFn: financeApi.categories })

  const { mutate, isPending } = useMutation({
    mutationFn: (v: any) => financeApi.createCategory(v),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['finance_categories'] })
      toast.success('Category created')
      form.resetFields()
    },
    onError: (e: any) => toast.error(e?.response?.data?.detail || 'Failed to create category'),
  })

  return (
    <Form form={form} layout="vertical" size="small" onFinish={mutate} requiredMark={false}>
      <Form.Item name="name" label="Category Name" rules={[{ required: true }]}>
        <Input placeholder="e.g. Groceries" />
      </Form.Item>
      <Form.Item name="parent_id" label="Parent Category">
        <Select allowClear placeholder="None (top level)">
          {(categories ?? []).map((c: any) => <Select.Option key={c.id} value={c.id}>{c.name}</Select.Option>)}
        </Select>
      </Form.Item>
      <Form.Item name="icon" label="Emoji Icon">
        <Input placeholder="🛒" maxLength={2} />
      </Form.Item>
      <Button type="primary" htmlType="submit" loading={isPending} size="small" block>Add Category</Button>
    </Form>
  )
}

function AddInvestmentForm() {
  const [form] = Form.useForm()
  const queryClient = useQueryClient()
  const [type, setType] = useState('mutual_fund')

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
      form.resetFields()
      setType('mutual_fund')
    },
    onError: () => toast.error('Failed to add holding'),
  })

  return (
    <Form form={form} layout="vertical" size="small" onFinish={mutate} requiredMark={false}>
      <div className="text-[11px] text-muted-foreground mb-1">Type</div>
      <TypePicker meta={INVESTMENT_TYPE_META} value={type} onChange={setType} />
      <Form.Item name="name" label="Name" rules={[{ required: true }]}>
        <Input placeholder="e.g. Nifty 50 Index Fund" />
      </Form.Item>
      <div className="grid grid-cols-2 gap-2">
        <Form.Item name="invested_amount" label="Invested (₹)" rules={[{ required: true }]}>
          <Input type="number" min="0" />
        </Form.Item>
        <Form.Item name="current_value" label="Current (₹)">
          <Input type="number" min="0" placeholder="= invested" />
        </Form.Item>
        <Form.Item name="units" label="Units">
          <Input type="number" min="0" step="any" />
        </Form.Item>
        <Form.Item name="purchase_date" label="Purchased">
          <Input type="date" />
        </Form.Item>
      </div>
      <Form.Item name="notes" label="Notes">
        <Input placeholder="Optional" />
      </Form.Item>
      <Button type="primary" htmlType="submit" loading={isPending} size="small" block>Add Holding</Button>
    </Form>
  )
}

function AddLoanForm() {
  const [form] = Form.useForm()
  const queryClient = useQueryClient()
  const [type, setType] = useState('personal')
  const { data: accounts } = useQuery({ queryKey: ['finance', 'accounts'], queryFn: financeApi.accounts })

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
      form.resetFields()
      setType('personal')
    },
    onError: () => toast.error('Failed to add loan'),
  })

  return (
    <Form form={form} layout="vertical" size="small" onFinish={mutate} requiredMark={false}>
      <div className="text-[11px] text-muted-foreground mb-1">Type</div>
      <TypePicker meta={LOAN_TYPE_META} value={type} onChange={setType} />
      <div className="grid grid-cols-2 gap-2">
        <Form.Item name="name" label="Loan Name" rules={[{ required: true }]} className="col-span-2">
          <Input placeholder="e.g. Home Loan - HDFC" />
        </Form.Item>
        <Form.Item name="lender" label="Lender">
          <Input placeholder="Optional" />
        </Form.Item>
        <Form.Item name="account_id" label="EMI From">
          <Select placeholder="Account" allowClear>
            {(accounts ?? []).map((a: any) => <Select.Option key={a.id} value={a.id}>{a.name}</Select.Option>)}
          </Select>
        </Form.Item>
        <Form.Item name="principal_amount" label="Principal (₹)" rules={[{ required: true }]}>
          <Input type="number" min="0" />
        </Form.Item>
        <Form.Item name="outstanding_amount" label="Outstanding (₹)">
          <Input type="number" min="0" placeholder="= principal" />
        </Form.Item>
        <Form.Item name="emi_amount" label="EMI Amount (₹)" rules={[{ required: true }]}>
          <Input type="number" min="0" />
        </Form.Item>
        <Form.Item name="emi_day" label="EMI Day (1-31)" rules={[{ required: true }]}>
          <Input type="number" min="1" max="31" />
        </Form.Item>
        <Form.Item name="interest_rate" label="Interest % p.a.">
          <Input type="number" min="0" step="0.01" />
        </Form.Item>
        <Form.Item name="tenure_months" label="Tenure (mo)">
          <Input type="number" min="0" />
        </Form.Item>
      </div>
      <Form.Item name="notes" label="Notes">
        <Input placeholder="Optional" />
      </Form.Item>
      <Button type="primary" htmlType="submit" loading={isPending} size="small" block>Add Loan</Button>
    </Form>
  )
}

const OPTIONS = [
  { label: 'Acct', value: 'Account' },
  { label: 'Cat', value: 'Category' },
  { label: 'Invest', value: 'Investment' },
  { label: 'Loan', value: 'Loan' },
]

export function QuickAddAccounts() {
  const [tab, setTab] = useState('Account')

  return (
    <>
      <RailHeading>Add New</RailHeading>
      <GlassCard hoverable fadeIn="up">
        <TextTabs block options={OPTIONS} value={tab} onChange={setTab} className="mb-3" />
        {tab === 'Account' && <AddAccountForm />}
        {tab === 'Category' && <AddCategoryForm />}
        {tab === 'Investment' && <AddInvestmentForm />}
        {tab === 'Loan' && <AddLoanForm />}
      </GlassCard>
    </>
  )
}
