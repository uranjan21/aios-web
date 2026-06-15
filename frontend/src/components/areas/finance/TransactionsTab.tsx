import { useDeferredValue, useMemo, useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import dayjs, { Dayjs } from 'dayjs'
import isoWeek from 'dayjs/plugin/isoWeek'
import { Segmented, Button, Modal, Form, Input, InputNumber, Select, DatePicker, Empty, Popconfirm, Switch, Tag } from 'antd'
import { toast } from 'sonner'
import {
  ChevronLeft, ChevronRight, ShoppingBag, Clapperboard, Home, Heart,
  CreditCard, Shirt, GraduationCap, Zap, Wallet, TrendingUp, ArrowUpRight, ArrowDownRight,
  ArrowLeftRight, ArrowDownCircle, ArrowUpCircle, PencilLine, Trash2, Search, Upload as UploadIcon,
} from 'lucide-react'
import { financeApi } from '@/api/areas'
import { cn, formatCurrency } from '@/lib/utils'
import { Skeleton } from '@/components/ui/skeleton'
import { GlassCard } from '@/components/lumina'
import { WorkspaceLayout, RailHeading } from '@/components/layout/WorkspaceLayout'
import { TextTabs } from '@/components/ui/TextTabs'
import { TransactionCalendar } from './TransactionCalendar'
import { ImportCsvModal } from './ImportCsvModal'

dayjs.extend(isoWeek)

const EXPENSE_CATEGORIES = [
  'Food', 'Transport', 'Rent', 'Health', 'Subscriptions',
  'Clothes', 'Entertainment', 'Utilities', 'Education',
  'Groceries', 'Personal Care', 'Investments', 'Others',
]

const INCOME_SOURCES = ['Salary', 'Freelance', 'Business', 'Investment Returns', 'Gift', 'Refund', 'Other']

export type Txn = {
  id: string
  type: 'income' | 'expense' | 'transfer'
  amount: number
  category: string
  description: string | null
  logged_at: string
  account_id?: string | null
  tags?: string | null
  split_group_id?: string | null
}

function getCategoryIcon(category: string) {
  const c = category.toLowerCase()
  if (c.includes('transfer')) return <ArrowLeftRight size={15} />
  if (c.includes('sub') || c.includes('tv') || c.includes('netflix') || c.includes('entertain')) return <Clapperboard size={15} />
  if (c.includes('home') || c.includes('rent')) return <Home size={15} />
  if (c.includes('care') || c.includes('health')) return <Heart size={15} />
  if (c.includes('grocer') || c.includes('food')) return <ShoppingBag size={15} />
  if (c.includes('cloth')) return <Shirt size={15} />
  if (c.includes('educat')) return <GraduationCap size={15} />
  if (c.includes('util')) return <Zap size={15} />
  if (c.includes('invest') || c.includes('return')) return <TrendingUp size={15} />
  if (c.includes('salary') || c.includes('freelance') || c.includes('business')) return <Wallet size={15} />
  return <CreditCard size={15} />
}

// ── Summary bar (Income / Expenses / Total) ────────────────────────────────
function SummaryBar({ income, expense }: { income: number; expense: number }) {
  const net = income - expense
  return (
    <div className="grid grid-cols-3 gap-2 mb-3">
      <div className="rounded-lg bg-emerald-500/10 px-3 py-2">
        <div className="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium uppercase tracking-wide">Income</div>
        <div className="text-sm font-semibold text-emerald-600 dark:text-emerald-400">{formatCurrency(income)}</div>
      </div>
      <div className="rounded-lg bg-red-500/10 px-3 py-2">
        <div className="text-[10px] text-red-500 font-medium uppercase tracking-wide">Expenses</div>
        <div className="text-sm font-semibold text-red-500">{formatCurrency(expense)}</div>
      </div>
      <div className="rounded-lg bg-muted px-3 py-2">
        <div className="text-[10px] text-muted-foreground font-medium uppercase tracking-wide">Total</div>
        <div className={`text-sm font-semibold ${net >= 0 ? 'text-foreground' : 'text-red-500'}`}>{formatCurrency(net)}</div>
      </div>
    </div>
  )
}

// ── Transaction row ─────────────────────────────────────────────────────────
function TransactionRow({ txn, onEdit }: { txn: Txn; onEdit: (t: Txn) => void }) {
  const queryClient = useQueryClient()
  const isIncome = txn.type === 'income'
  const isTransfer = txn.type === 'transfer'

  const deleteMutation = useMutation({
    mutationFn: () => {
      if (txn.type === 'expense') return financeApi.deleteExpense(txn.id)
      if (txn.type === 'income') return financeApi.deleteIncome(txn.id)
      return financeApi.deleteTransfer(txn.id)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['finance'] })
      toast.success('Transaction deleted')
    },
    onError: () => toast.error('Failed to delete transaction'),
  })

  return (
    <div className="flex items-center justify-between py-2 px-1 border-b border-border/40 last:border-b-0 group">
      <div className="flex items-center gap-2.5 min-w-0">
        <div className={`shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${isIncome ? 'bg-emerald-500/10 text-emerald-500' : isTransfer ? 'bg-blue-500/10 text-blue-500' : 'bg-muted text-muted-foreground'}`}>
          {getCategoryIcon(txn.category)}
        </div>
        <div className="min-w-0">
          <div className="flex items-center gap-1.5 min-w-0">
            <span className="text-xs font-medium text-foreground truncate">{txn.description || txn.category}</span>
            {txn.split_group_id && <span className="text-[10px] text-primary shrink-0" title="Part of a split payment">⧉ split</span>}
          </div>
          <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
            <span>{txn.category} · {dayjs(txn.logged_at).format('MMM D, h:mm A')}</span>
            {txn.tags && txn.tags.split(',').filter(Boolean).slice(0, 3).map(t => (
              <Tag key={t} className="!text-[9px] !leading-4 !px-1 !mr-0">{t}</Tag>
            ))}
          </div>
        </div>
      </div>
      <div className="flex items-center gap-1 shrink-0 ml-2">
        <div className="flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
          {!isTransfer && (
            <button
              onClick={() => onEdit(txn)}
              className="p-1 rounded hover:bg-accent text-muted-foreground hover:text-foreground transition"
              aria-label="Edit transaction"
            >
              <PencilLine className="w-3 h-3" />
            </button>
          )}
          <Popconfirm title="Delete this transaction?" onConfirm={() => deleteMutation.mutate()} okText="Delete" cancelText="Cancel" okButtonProps={{ danger: true }}>
            <button className="p-1 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition" aria-label="Delete transaction">
              <Trash2 className="w-3 h-3" />
            </button>
          </Popconfirm>
        </div>
        <div className={`text-xs font-semibold ${isIncome ? 'text-emerald-500' : isTransfer ? 'text-blue-500' : 'text-red-500'}`}>
          {isIncome ? '+' : isTransfer ? '⇄ ' : '-'}{formatCurrency(txn.amount)}
        </div>
      </div>
    </div>
  )
}

function TxnList({ txns, emptyText, onEdit }: { txns: Txn[]; emptyText: string; onEdit: (t: Txn) => void }) {
  if (txns.length === 0) return <Empty description={emptyText} image={Empty.PRESENTED_IMAGE_SIMPLE} className="py-6" />
  return <div className="max-h-[420px] overflow-y-auto pr-1">{txns.map(t => <TransactionRow key={`${t.type}-${t.id}`} txn={t} onEdit={onEdit} />)}</div>
}

// ── Add / edit transaction modal ────────────────────────────────────────────
export type Kind = 'Expense' | 'Income' | 'Transfer'

export function TransactionModal({ open, onClose, editing, initialKind = 'Expense' }: { open: boolean; onClose: () => void; editing: Txn | null; initialKind?: Kind }) {
  const queryClient = useQueryClient()
  const [form] = Form.useForm()
  const [kind, setKind] = useState<Kind>(initialKind)
  const [splitMode, setSplitMode] = useState(false)

  const { data: accounts } = useQuery({
    queryKey: ['finance', 'accounts'],
    queryFn: financeApi.accounts,
    enabled: open,
  })

  const isEdit = !!editing
  const effectiveKind: Kind = isEdit ? (editing!.type === 'income' ? 'Income' : 'Expense') : kind

  // Prefill on open for editing, reset kind to the requested default for new transactions
  const afterOpenChange = (visible: boolean) => {
    if (visible && editing) {
      form.setFieldsValue({
        amount: String(editing.amount),
        category: editing.category,
        description: editing.description ?? undefined,
        date: dayjs(editing.logged_at),
        account_id: editing.account_id ?? undefined,
        tags: editing.tags ? editing.tags.split(',').filter(Boolean) : [],
      })
    }
    if (visible && !editing) {
      form.resetFields()
      setKind(initialKind)
      setSplitMode(false)
    }
  }

  const { mutate, isPending } = useMutation({
    mutationFn: (values: any): Promise<unknown> => {
      const logged_at = (values.date as Dayjs)?.toISOString()
      const amount = parseFloat(values.amount)
      const tags = (values.tags as string[] | undefined)?.join(',') || undefined
      if (isEdit) {
        const patch = {
          amount,
          description: values.description?.trim() || '',
          logged_at,
          account_id: values.account_id ?? null,
          tags: tags ?? null,
        }
        if (editing!.type === 'expense') return financeApi.patchExpense(editing!.id, { ...patch, category: values.category })
        return financeApi.patchIncome(editing!.id, { ...patch, source: values.category })
      }
      if (effectiveKind === 'Expense') {
        let splits: { category: string; amount: number }[] | undefined
        if (splitMode) {
          splits = (values.splits ?? [])
            .filter((s: any) => s?.category && s?.amount)
            .map((s: any) => ({ category: s.category, amount: Number(s.amount) }))
          if (!splits || splits.length < 2) {
            return Promise.reject({ response: { data: { detail: 'Add at least 2 split parts' } } })
          }
          const sum = splits.reduce((a, s) => a + s.amount, 0)
          if (Math.abs(sum - amount) > 0.01) {
            return Promise.reject({ response: { data: { detail: `Splits total ${formatCurrency(sum)} ≠ amount ${formatCurrency(amount)}` } } })
          }
        }
        return financeApi.createExpense({
          amount,
          category: splitMode ? splits![0].category : values.category,
          description: values.description?.trim() || undefined,
          logged_at,
          account_id: values.account_id || undefined,
          tags,
          splits,
        })
      }
      if (effectiveKind === 'Income') {
        return financeApi.createIncome({
          amount,
          source: values.category,
          description: values.description?.trim() || undefined,
          logged_at,
          account_id: values.account_id || undefined,
          tags,
        })
      }
      return financeApi.createTransfer({
        amount,
        from_account_id: values.from_account_id,
        to_account_id: values.to_account_id,
        description: values.description?.trim() || undefined,
        logged_at,
      })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['finance'] })
      toast.success(isEdit ? 'Transaction updated' : `${effectiveKind} saved`)
      form.resetFields()
      onClose()
    },
    onError: (e: any) => toast.error(e?.response?.data?.detail || `Failed to save ${effectiveKind.toLowerCase()}`),
  })

  return (
    <Modal
      title={isEdit ? 'Edit Transaction' : 'Add Transaction'}
      open={open}
      onCancel={onClose}
      onOk={() => form.submit()}
      confirmLoading={isPending}
      okText="Save"
      afterOpenChange={afterOpenChange}
    >
      {!isEdit && (
        <Segmented
          block
          options={['Expense', 'Income', 'Transfer']}
          value={kind}
          onChange={v => { setKind(v as Kind); form.setFieldValue('category', undefined) }}
          className="mb-4"
        />
      )}
      <Form form={form} layout="vertical" onFinish={mutate} requiredMark={false}>
        <div className="grid grid-cols-2 gap-3">
          <Form.Item name="amount" label="Amount (₹)" rules={[{ required: true, message: 'Enter amount' }]}>
            <Input type="number" prefix="₹" placeholder="0.00" min="0" step="0.01" />
          </Form.Item>
          <Form.Item name="date" label="Date" initialValue={dayjs()}>
            <DatePicker className="w-full" format="MMM D, YYYY" />
          </Form.Item>
        </div>
        {effectiveKind === 'Transfer' ? (
          <div className="grid grid-cols-2 gap-3">
            <Form.Item name="from_account_id" label="From Account" rules={[{ required: true, message: 'Required' }]}>
              <Select placeholder="Source account">
                {(accounts ?? []).map((a: any) => <Select.Option key={a.id} value={a.id}>{a.name}</Select.Option>)}
              </Select>
            </Form.Item>
            <Form.Item name="to_account_id" label="To Account" rules={[{ required: true, message: 'Required' }]}>
              <Select placeholder="Destination account">
                {(accounts ?? []).map((a: any) => <Select.Option key={a.id} value={a.id}>{a.name}</Select.Option>)}
              </Select>
            </Form.Item>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {!(effectiveKind === 'Expense' && splitMode) && (
              <Form.Item name="category" label={effectiveKind === 'Expense' ? 'Category' : 'Source'} rules={[{ required: true, message: 'Required' }]}>
                <Select placeholder={effectiveKind === 'Expense' ? 'Select category' : 'Select source'} showSearch>
                  {(effectiveKind === 'Expense' ? EXPENSE_CATEGORIES : INCOME_SOURCES).map(c => <Select.Option key={c} value={c}>{c}</Select.Option>)}
                </Select>
              </Form.Item>
            )}
            <Form.Item name="account_id" label="Account (optional)">
              <Select placeholder="No account" allowClear>
                {(accounts ?? []).map((a: any) => <Select.Option key={a.id} value={a.id}>{a.name}</Select.Option>)}
              </Select>
            </Form.Item>
          </div>
        )}
        {effectiveKind === 'Expense' && !isEdit && (
          <div className="flex items-center gap-2 mb-3">
            <Switch size="small" checked={splitMode} onChange={setSplitMode} aria-label="Split across categories" />
            <span className="text-[12px] text-muted-foreground">Split across categories</span>
          </div>
        )}
        {effectiveKind === 'Expense' && !isEdit && splitMode && (
          <Form.List name="splits" initialValue={[{}, {}]}>
            {(fields, { add, remove }) => (
              <div className="space-y-2 mb-3 p-3 bg-muted/40 border border-border/60 rounded-lg">
                {fields.map(field => (
                  <div key={field.key} className="flex gap-2 items-start">
                    <Form.Item name={[field.name, 'category']} className="flex-1 !mb-0" rules={[{ required: true, message: 'Category' }]}>
                      <Select placeholder="Category" showSearch>
                        {EXPENSE_CATEGORIES.map(c => <Select.Option key={c} value={c}>{c}</Select.Option>)}
                      </Select>
                    </Form.Item>
                    <Form.Item name={[field.name, 'amount']} className="w-32 !mb-0" rules={[{ required: true, message: 'Amount' }]}>
                      <InputNumber prefix="₹" placeholder="0" min={0.01} className="w-full" />
                    </Form.Item>
                    {fields.length > 2 && (
                      <Button type="text" size="small" onClick={() => remove(field.name)} aria-label="Remove split row">✕</Button>
                    )}
                  </div>
                ))}
                <Button type="dashed" size="small" onClick={() => add()} block>+ Add part</Button>
                <Form.Item noStyle shouldUpdate>
                  {() => {
                    const total = parseFloat(form.getFieldValue('amount') || '0')
                    const parts = (form.getFieldValue('splits') ?? []).reduce((a: number, s: any) => a + (Number(s?.amount) || 0), 0)
                    const diff = total - parts
                    return (
                      <div className={`text-[11px] ${Math.abs(diff) < 0.01 ? 'text-emerald-500' : 'text-amber-500'}`}>
                        Parts: {formatCurrency(parts)} of {formatCurrency(total)}{Math.abs(diff) >= 0.01 ? ` — ${formatCurrency(Math.abs(diff))} ${diff > 0 ? 'remaining' : 'over'}` : ' ✓'}
                      </div>
                    )
                  }}
                </Form.Item>
              </div>
            )}
          </Form.List>
        )}
        {effectiveKind !== 'Transfer' && (
          <Form.Item name="tags" label="Tags">
            <Select mode="tags" placeholder="e.g. trip-goa, reimbursable" open={false} suffixIcon={null} tokenSeparators={[',']} />
          </Form.Item>
        )}
        <Form.Item name="description" label="Description">
          <Input placeholder="Optional note" maxLength={200} />
        </Form.Item>
      </Form>
    </Modal>
  )
}

// ── Main tab ─────────────────────────────────────────────────────────────────
export function TransactionsTab() {
  const [view, setView] = useState<'Daily' | 'Calendar' | 'Weekly' | 'Monthly' | 'Total'>('Daily')
  const [month, setMonth] = useState(() => dayjs().startOf('month'))
  const [selectedDate, setSelectedDate] = useState(() => dayjs().format('YYYY-MM-DD'))
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<Txn | null>(null)
  const [quickKind, setQuickKind] = useState<Kind>('Expense')
  const [search, setSearch] = useState('')
  const [importOpen, setImportOpen] = useState(false)
  const [filterKind, setFilterKind] = useState<string>('all')
  const [filterAccount, setFilterAccount] = useState<string | undefined>()
  const [filterCategory, setFilterCategory] = useState<string | undefined>()
  const [filterMin, setFilterMin] = useState<number | null>(null)
  const [filterMax, setFilterMax] = useState<number | null>(null)
  const [filterRange, setFilterRange] = useState<[Dayjs, Dayjs] | null>(null)
  const [filterTag, setFilterTag] = useState('')

  const deferredSearch = useDeferredValue(search)
  const deferredTag = useDeferredValue(filterTag)
  const filtersActive = filterKind !== 'all' || !!filterAccount || !!filterCategory || filterMin != null || filterMax != null || !!filterRange || !!deferredTag.trim()
  const searchActive = deferredSearch.trim().length > 0 || filtersActive

  const monthStr = month.format('YYYY-MM')
  const prevMonthStr = month.subtract(1, 'month').format('YYYY-MM')

  const { data: cashflow, isLoading: loadingCashflow } = useQuery({
    queryKey: ['finance', 'cashflow', monthStr],
    queryFn: () => financeApi.cashflow(monthStr),
  })
  const { data: prevCashflow } = useQuery({
    queryKey: ['finance', 'cashflow', prevMonthStr],
    queryFn: () => financeApi.cashflow(prevMonthStr),
    enabled: view === 'Total',
  })
  const { data: expensesPage, isLoading: loadingExpenses } = useQuery({
    queryKey: ['finance', 'expenses', 'month', monthStr],
    queryFn: () => financeApi.expenses(monthStr, undefined, 200, 0),
  })
  const { data: incomeList, isLoading: loadingIncome } = useQuery({
    queryKey: ['finance', 'income', monthStr],
    queryFn: () => financeApi.income(monthStr),
  })
  const { data: transferList } = useQuery({
    queryKey: ['finance', 'transfers', monthStr],
    queryFn: () => financeApi.transfers(monthStr),
  })

  const { data: accounts } = useQuery({
    queryKey: ['finance', 'accounts'],
    queryFn: financeApi.accounts,
  })
  const { data: categories } = useQuery({
    queryKey: ['finance', 'categories'],
    queryFn: financeApi.categories,
  })

  const { data: searchResult, isLoading: loadingSearch } = useQuery({
    queryKey: ['finance', 'txn-search', deferredSearch.trim(), filterKind, filterAccount, filterCategory, deferredTag.trim(), filterMin, filterMax, filterRange?.[0]?.format('YYYY-MM-DD'), filterRange?.[1]?.format('YYYY-MM-DD')],
    queryFn: () => financeApi.searchTransactions({
      q: deferredSearch.trim() || undefined,
      kind: filterKind === 'all' ? undefined : filterKind,
      account_id: filterAccount,
      category: filterCategory,
      tag: deferredTag.trim() || undefined,
      min_amount: filterMin ?? undefined,
      max_amount: filterMax ?? undefined,
      date_from: filterRange?.[0]?.format('YYYY-MM-DD'),
      date_to: filterRange?.[1]?.format('YYYY-MM-DD'),
      limit: 200,
    }),
    enabled: searchActive,
  })

  const isLoading = loadingCashflow || loadingExpenses || loadingIncome

  const transactions: Txn[] = useMemo(() => {
    const exp = (expensesPage?.items ?? []).map(e => ({
      id: e.id, type: 'expense' as const, amount: Number(e.amount), category: e.category, description: e.description, logged_at: e.logged_at, account_id: e.account_id,
      tags: e.tags, split_group_id: e.split_group_id,
    }))
    const inc = (incomeList ?? []).map(i => ({
      id: i.id, type: 'income' as const, amount: Number(i.amount), category: i.source, description: i.description, logged_at: i.logged_at, account_id: i.account_id,
      tags: i.tags,
    }))
    const trf = (transferList ?? []).map(t => ({
      id: t.id, type: 'transfer' as const, amount: Number(t.amount), category: 'Transfer', description: t.description, logged_at: t.logged_at,
    }))
    return [...exp, ...inc, ...trf].sort((a, b) => new Date(b.logged_at).getTime() - new Date(a.logged_at).getTime())
  }, [expensesPage, incomeList, transferList])

  const dayTotals = (txns: Txn[]) => txns.reduce((acc, t) => {
    if (t.type === 'income') acc.income += t.amount
    else if (t.type === 'expense') acc.expense += t.amount
    return acc
  }, { income: 0, expense: 0 })

  const openEdit = (t: Txn) => { setEditing(t); setModalOpen(true) }
  const closeModal = () => { setModalOpen(false); setEditing(null) }

  // Keep fetched month in sync with the selected day when navigating across months
  const goToDate = (d: string) => {
    setSelectedDate(d)
    if (!dayjs(d).isSame(month, 'month')) setMonth(dayjs(d).startOf('month'))
  }

  const clearFilters = () => {
    setFilterKind('all'); setFilterAccount(undefined); setFilterCategory(undefined)
    setFilterMin(null); setFilterMax(null); setFilterRange(null); setFilterTag('')
  }

  const openQuickAdd = (kind: Kind) => { setEditing(null); setQuickKind(kind); setModalOpen(true) }

  const header = (
    <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
      <TextTabs
        options={['Daily', 'Calendar', 'Weekly', 'Monthly', 'Total']}
        value={view}
        onChange={v => setView(v as typeof view)}
      />
      <Input
        value={search}
        onChange={e => setSearch(e.target.value)}
        placeholder="Search all transactions"
        prefix={<Search size={13} className="text-muted-foreground" />}
        allowClear
        className="w-56"
        size="small"
      />
    </div>
  )

  const rail = (
    <>
      <RailHeading>Quick Log</RailHeading>
      <GlassCard title="Quick Actions" hoverable fadeIn="up">
        <div className="flex flex-col gap-2">
          {[
            { label: 'Add Expense', icon: ArrowDownCircle, tone: 'text-kpi-red', onClick: () => openQuickAdd('Expense') },
            { label: 'Add Income', icon: ArrowUpCircle, tone: 'text-kpi-emerald', onClick: () => openQuickAdd('Income') },
            { label: 'Transfer', icon: ArrowLeftRight, tone: 'text-primary', onClick: () => openQuickAdd('Transfer') },
            { label: 'Import CSV', icon: UploadIcon, tone: 'text-muted-foreground', onClick: () => setImportOpen(true) },
          ].map(a => (
            <button
              key={a.label}
              onClick={a.onClick}
              className="flex items-center gap-3 w-full px-3.5 py-3 rounded-xl bg-muted/40 border border-border/60 hover:border-primary/40 hover:bg-muted/70 transition-all text-left group"
            >
              <a.icon size={18} className={cn(a.tone, 'shrink-0')} />
              <span className="text-[13px] font-medium text-foreground flex-1">{a.label}</span>
              <ChevronRight size={14} className="text-muted-foreground group-hover:translate-x-0.5 transition-transform" />
            </button>
          ))}
        </div>
      </GlassCard>

      <RailHeading>Filters</RailHeading>
      <GlassCard hoverable fadeIn="up" contentClassName="space-y-2">
        <TextTabs
          block
          options={[{ label: 'All', value: 'all' }, { label: 'Exp', value: 'expense' }, { label: 'Inc', value: 'income' }, { label: 'Trf', value: 'transfer' }]}
          value={filterKind}
          onChange={setFilterKind}
        />
        <Select
          size="small"
          placeholder="Account"
          allowClear
          className="w-full"
          value={filterAccount}
          onChange={setFilterAccount}
          options={(accounts ?? []).map((a: any) => ({ label: a.name, value: a.id }))}
        />
        <Select
          size="small"
          placeholder="Category"
          allowClear
          className="w-full"
          value={filterCategory}
          onChange={setFilterCategory}
          options={(categories ?? []).map((c: any) => ({ label: c.name, value: c.name }))}
        />
        <Input size="small" placeholder="Tag" value={filterTag} onChange={e => setFilterTag(e.target.value)} allowClear />
        <div className="flex gap-2">
          <InputNumber size="small" placeholder="Min ₹" min={0} className="w-full" value={filterMin} onChange={setFilterMin} />
          <InputNumber size="small" placeholder="Max ₹" min={0} className="w-full" value={filterMax} onChange={setFilterMax} />
        </div>
        <DatePicker.RangePicker
          size="small"
          className="w-full"
          value={filterRange}
          onChange={v => setFilterRange(v as [Dayjs, Dayjs] | null)}
        />
        {filtersActive && (
          <Button size="small" type="text" block onClick={clearFilters}>Clear filters</Button>
        )}
      </GlassCard>
    </>
  )

  if (isLoading) {
    return (
      <WorkspaceLayout rail={rail}>
        {header}
        <Skeleton className="h-10 w-full mb-3" />
        <Skeleton className="h-64 w-full" />
      </WorkspaceLayout>
    )
  }

  // ── Search results (server-side, all months/types) ─────────────────────────
  let body: React.ReactNode = null
  if (searchActive) {
    const items: Txn[] = (searchResult?.items ?? []).map(i => ({
      id: i.id, type: i.kind, amount: i.amount, category: i.category ?? '—',
      description: i.description, logged_at: i.logged_at, account_id: i.account_id ?? undefined,
      tags: i.tags, split_group_id: i.split_group_id,
    }))
    const totals = dayTotals(items)
    body = loadingSearch ? (
      <Skeleton className="h-64 w-full" />
    ) : (
      <>
        <div className="text-[11px] text-muted-foreground mb-2">
          {searchResult?.total ?? 0} result{(searchResult?.total ?? 0) === 1 ? '' : 's'} across all months
          {searchResult?.has_more ? ' — showing first 200' : ''}
        </div>
        <SummaryBar income={totals.income} expense={totals.expense} />
        <TxnList txns={items} emptyText="No matching transactions" onEdit={openEdit} />
      </>
    )
  } else if (view === 'Daily') {
    const dayTxns = transactions.filter(t => dayjs(t.logged_at).format('YYYY-MM-DD') === selectedDate)
    const totals = dayTotals(dayTxns)
    body = (
      <>
        <div className="flex items-center justify-between mb-3">
          <button onClick={() => goToDate(dayjs(selectedDate).subtract(1, 'day').format('YYYY-MM-DD'))} className="p-1 rounded hover:bg-muted text-muted-foreground transition-colors">
            <ChevronLeft size={16} />
          </button>
          <div className="text-sm font-semibold text-foreground">{dayjs(selectedDate).format('dddd, MMM D YYYY')}</div>
          <button onClick={() => goToDate(dayjs(selectedDate).add(1, 'day').format('YYYY-MM-DD'))} className="p-1 rounded hover:bg-muted text-muted-foreground transition-colors">
            <ChevronRight size={16} />
          </button>
        </div>
        <SummaryBar income={totals.income} expense={totals.expense} />
        <TxnList txns={dayTxns} emptyText="No transactions on this day" onEdit={openEdit} />
      </>
    )
  } else if (view === 'Calendar') {
    const dayTxns = transactions.filter(t => dayjs(t.logged_at).format('YYYY-MM-DD') === selectedDate)
    body = (
      <>
        <TransactionCalendar
          month={month}
          byDay={cashflow?.by_day ?? []}
          selectedDate={selectedDate}
          onSelectDate={goToDate}
          onMonthChange={delta => setMonth(m => m.add(delta, 'month'))}
        />
        <div className="mt-4">
          <div className="text-xs font-semibold text-muted-foreground mb-2">{dayjs(selectedDate).format('dddd, MMM D')}</div>
          <TxnList txns={dayTxns} emptyText="No transactions on this day" onEdit={openEdit} />
        </div>
      </>
    )
  } else if (view === 'Weekly') {
    const weeks = new Map<string, Txn[]>()
    transactions.forEach(t => {
      const wk = dayjs(t.logged_at).startOf('isoWeek').format('YYYY-MM-DD')
      if (!weeks.has(wk)) weeks.set(wk, [])
      weeks.get(wk)!.push(t)
    })
    const sortedWeeks = Array.from(weeks.entries()).sort((a, b) => b[0].localeCompare(a[0]))
    body = (
      <>
        <div className="flex items-center justify-between mb-3">
          <button onClick={() => setMonth(m => m.subtract(1, 'month'))} className="p-1 rounded hover:bg-muted text-muted-foreground transition-colors">
            <ChevronLeft size={16} />
          </button>
          <div className="text-sm font-semibold text-foreground">{month.format('MMMM YYYY')}</div>
          <button onClick={() => setMonth(m => m.add(1, 'month'))} className="p-1 rounded hover:bg-muted text-muted-foreground transition-colors">
            <ChevronRight size={16} />
          </button>
        </div>
        {sortedWeeks.length === 0 ? <Empty description="No transactions this month" image={Empty.PRESENTED_IMAGE_SIMPLE} className="py-6" /> : (
          <div className="space-y-3 max-h-[460px] overflow-y-auto pr-1">
            {sortedWeeks.map(([weekStart, txns]) => {
              const totals = dayTotals(txns)
              const start = dayjs(weekStart)
              const end = start.add(6, 'day')
              return (
                <div key={weekStart} className="rounded-lg border border-border/50 p-3">
                  <div className="flex items-center justify-between mb-2">
                    <div className="text-xs font-semibold text-foreground">{start.format('MMM D')} – {end.format('MMM D')}</div>
                    <div className="flex items-center gap-3 text-[11px]">
                      <span className="text-emerald-500 font-medium">+{formatCurrency(totals.income)}</span>
                      <span className="text-red-500 font-medium">-{formatCurrency(totals.expense)}</span>
                    </div>
                  </div>
                  {txns.map(t => <TransactionRow key={`${t.type}-${t.id}`} txn={t} onEdit={openEdit} />)}
                </div>
              )
            })}
          </div>
        )}
      </>
    )
  } else if (view === 'Monthly') {
    const totals = dayTotals(transactions)
    body = (
      <>
        <div className="flex items-center justify-between mb-3">
          <button onClick={() => setMonth(m => m.subtract(1, 'month'))} className="p-1 rounded hover:bg-muted text-muted-foreground transition-colors">
            <ChevronLeft size={16} />
          </button>
          <div className="text-sm font-semibold text-foreground">{month.format('MMMM YYYY')}</div>
          <button onClick={() => setMonth(m => m.add(1, 'month'))} className="p-1 rounded hover:bg-muted text-muted-foreground transition-colors">
            <ChevronRight size={16} />
          </button>
        </div>
        <SummaryBar income={totals.income} expense={totals.expense} />
        <TxnList txns={transactions} emptyText="No transactions this month" onEdit={openEdit} />
      </>
    )
  } else if (view === 'Total') {
    const thisMonth = { income: cashflow?.income_total ?? 0, expense: cashflow?.expense_total ?? 0 }
    const lastMonth = { income: prevCashflow?.income_total ?? 0, expense: prevCashflow?.expense_total ?? 0 }

    const byCategory = new Map<string, number>()
    transactions.filter(t => t.type === 'expense').forEach(t => byCategory.set(t.category, (byCategory.get(t.category) ?? 0) + t.amount))
    const topCategories = Array.from(byCategory.entries()).sort((a, b) => b[1] - a[1]).slice(0, 6)
    const maxCat = topCategories[0]?.[1] ?? 1

    const Delta = ({ now, prev }: { now: number; prev: number }) => {
      if (prev === 0) return null
      const pct = ((now - prev) / prev) * 100
      const up = pct >= 0
      return (
        <span className={`inline-flex items-center text-[10px] font-medium ml-1.5 ${up ? 'text-red-500' : 'text-emerald-500'}`}>
          {up ? <ArrowUpRight size={11} /> : <ArrowDownRight size={11} />}{Math.abs(pct).toFixed(0)}%
        </span>
      )
    }

    body = (
      <>
        <div className="flex items-center justify-between mb-3">
          <button onClick={() => setMonth(m => m.subtract(1, 'month'))} className="p-1 rounded hover:bg-muted text-muted-foreground transition-colors">
            <ChevronLeft size={16} />
          </button>
          <div className="text-sm font-semibold text-foreground">{month.format('MMMM YYYY')} vs {month.subtract(1, 'month').format('MMMM YYYY')}</div>
          <button onClick={() => setMonth(m => m.add(1, 'month'))} className="p-1 rounded hover:bg-muted text-muted-foreground transition-colors">
            <ChevronRight size={16} />
          </button>
        </div>
        <div className="grid grid-cols-2 gap-3 mb-4">
          <div className="rounded-lg border border-border/50 p-3">
            <div className="text-[10px] text-muted-foreground uppercase tracking-wide font-medium mb-2">This Month</div>
            <div className="flex items-center justify-between text-xs mb-1">
              <span className="text-muted-foreground">Income</span>
              <span className="font-semibold text-emerald-500">{formatCurrency(thisMonth.income)}<Delta now={thisMonth.income} prev={lastMonth.income} /></span>
            </div>
            <div className="flex items-center justify-between text-xs mb-1">
              <span className="text-muted-foreground">Expenses</span>
              <span className="font-semibold text-red-500">{formatCurrency(thisMonth.expense)}<Delta now={thisMonth.expense} prev={lastMonth.expense} /></span>
            </div>
            <div className="flex items-center justify-between text-xs pt-1 border-t border-border/40 mt-1">
              <span className="text-muted-foreground">Net</span>
              <span className="font-semibold text-foreground">{formatCurrency(thisMonth.income - thisMonth.expense)}</span>
            </div>
          </div>
          <div className="rounded-lg border border-border/50 p-3">
            <div className="text-[10px] text-muted-foreground uppercase tracking-wide font-medium mb-2">Last Month</div>
            <div className="flex items-center justify-between text-xs mb-1">
              <span className="text-muted-foreground">Income</span>
              <span className="font-semibold text-emerald-500">{formatCurrency(lastMonth.income)}</span>
            </div>
            <div className="flex items-center justify-between text-xs mb-1">
              <span className="text-muted-foreground">Expenses</span>
              <span className="font-semibold text-red-500">{formatCurrency(lastMonth.expense)}</span>
            </div>
            <div className="flex items-center justify-between text-xs pt-1 border-t border-border/40 mt-1">
              <span className="text-muted-foreground">Net</span>
              <span className="font-semibold text-foreground">{formatCurrency(lastMonth.income - lastMonth.expense)}</span>
            </div>
          </div>
        </div>

        <div className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide mb-2">Top Categories This Month</div>
        {topCategories.length === 0 ? <Empty description="No expenses this month" image={Empty.PRESENTED_IMAGE_SIMPLE} className="py-4" /> : (
          <div className="space-y-2">
            {topCategories.map(([cat, amt]) => (
              <div key={cat}>
                <div className="flex items-center justify-between text-xs mb-1">
                  <span className="text-foreground">{cat}</span>
                  <span className="font-medium text-foreground">{formatCurrency(amt)}</span>
                </div>
                <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                  <div className="h-full rounded-full bg-primary" style={{ width: `${(amt / maxCat) * 100}%` }} />
                </div>
              </div>
            ))}
          </div>
        )}
      </>
    )
  }

  return (
    <>
      <WorkspaceLayout rail={rail}>
        {header}
        {body}
      </WorkspaceLayout>
      <TransactionModal open={modalOpen} onClose={closeModal} editing={editing} initialKind={quickKind} />
      <ImportCsvModal open={importOpen} onClose={() => setImportOpen(false)} />
    </>
  )
}
