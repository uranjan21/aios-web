// @ts-nocheck
import { useDeferredValue, useMemo, useState, useEffect, useRef } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import dayjs, { Dayjs } from 'dayjs'
import isoWeek from 'dayjs/plugin/isoWeek'
import { Popconfirm } from '@/components/ui/Popconfirm'
import { SegmentedControl, Button, Dialog, DialogFooter, Input, Select, SelectItem, EmptyState, Badge, Sheet } from '@ledgr/ui'
import { toast } from 'sonner'
import {
  ChevronLeft, ChevronRight, ShoppingBag, Clapperboard, Home, Heart,
  CreditCard, Shirt, GraduationCap, Zap, Wallet, TrendingUp, TrendingDown, ArrowUpRight, ArrowDownRight,
  ArrowLeftRight, ArrowDownCircle, ArrowUpCircle, PencilLine, Trash2, Search, Upload as UploadIcon,
  Plus, Split } from 'lucide-react'
import { financeApi } from '@/api/areas'
import { cn, formatCurrency } from '@/lib/utils'
import styled from 'styled-components'
import { Skeleton } from '@/components/ui/skeleton'
import { Card as GlassCard, KpiCard } from '@ledgr/ui';
import { AreaToolbar, ToolbarIconBtn, DateNav, DateNavBtn, DateNavLabel } from '@ledgr/ui'
import { WorkspaceLayout, RailHeading } from '@/components/layout/WorkspaceLayout'
import { TransactionCalendar } from './TransactionCalendar'
import { ImportCsvModal } from './ImportCsvModal'
import { CategoryPicker } from './CategoryPicker'
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, LineChart, Line, XAxis, YAxis, CartesianGrid, Legend } from 'recharts'

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
  category_id?: string | null
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

// ── Summary bar ────────────────────────────────────────────────────────────
const KpiGrid = styled.div`
  display: flex;
  overflow-x: auto;
  gap: 8px;
  padding-bottom: 4px;
  margin-bottom: 8px;
  
  scrollbar-width: none;
  -ms-overflow-style: none;
  &::-webkit-scrollbar { display: none; }
  
  > * {
    flex: 0 0 auto;
    min-width: 140px;
  }

  @media (min-width: 640px) {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 12px;
    padding-bottom: 0;
    
    > * { min-width: 0; }
  }
`

function SummaryBar({ income, expense }: { income: number; expense: number }) {
  const net = income - expense
  return (
    <KpiGrid>
      <KpiCard
        label="Income"
        value={formatCurrency(income)}
        color="primary"
        icon={TrendingUp}
      />
      <KpiCard
        label="Expenses"
        value={formatCurrency(expense)}
        color="rose"
        icon={TrendingDown}
      />
      <KpiCard
        label="Net"
        value={formatCurrency(net)}
        color={net >= 0 ? 'foreground' : 'rose'}
        icon={Wallet}
      />
    </KpiGrid>
  )
}

// ── Form Components ────────────────────────────────────────────────────────
const FormGrid = styled.div`
  display: grid;
  grid-template-columns: 1fr;
  gap: 12px;
  margin-bottom: 12px;

  @media (min-width: 640px) {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
`

const FormLabel = styled.label`
  font-size: 11px;
  color: ${({ theme }) => theme.color.mutedForeground};
  margin-bottom: 4px;
  display: block;
`

const FormGroup = styled.div`
  margin-bottom: 12px;
`

const FullWidthWrap = styled.div`
  width: 100%;
  margin-bottom: 16px;
`

const StyledSkeleton = styled(Skeleton)<{ $height?: string; $width?: string; $margin?: string }>`
  height: ${({ $height }) => $height || 'auto'};
  width: ${({ $width }) => $width || '100%'};
  ${({ $margin }) => $margin && `margin: ${$margin};`}
`

const FiltersGroup = styled.div`
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin-top: 12px;
`

const FilterLabel = styled.div`
  font-size: 11px;
  color: ${({ theme }) => theme.color.mutedForeground};
  text-transform: uppercase;
  letter-spacing: 0.05em;
  font-weight: 500;
`

const FilterRow = styled.div`
  display: flex;
  gap: 8px;
`

const FilterActions = styled.div`
  padding-top: 8px;
  display: flex;
  gap: 8px;
`

// ── Search components ───────────────────────────────────────────────────────
const DesktopSearch = styled.div`
  display: none;
  @media (min-width: 640px) {
    display: block;
  }
`

const MobileSearchBtn = styled(ToolbarIconBtn)`
  display: flex;
  @media (min-width: 640px) {
    display: none;
  }
`

// ── Transaction row ─────────────────────────────────────────────────────────

const TxnRowRoot = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 4px;
  border-bottom: 1px solid var(--border);
  &:last-child { border-bottom: none; }
  position: relative;
  &:hover .txn-actions { opacity: 1; }
`

const TxnLeft = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
  min-width: 0;
`

const TxnIconWrap = styled.div<{ $bg: string; $color: string }>`
  flex-shrink: 0;
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background: ${({ $bg }) => $bg};
  color: ${({ $color }) => $color};
  display: flex;
  align-items: center;
  justify-content: center;
`

const TxnDesc = styled.span`
  font-size: 12px;
  font-weight: 500;
  color: ${({ theme }) => theme.color.foreground};
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`

const TxnMeta = styled.div`
  font-size: 10px;
  color: ${({ theme }) => theme.color.mutedForeground};
  display: flex;
  align-items: center;
  gap: 4px;
`

const TxnRight = styled.div`
  display: flex;
  align-items: center;
  gap: 4px;
  flex-shrink: 0;
  margin-left: 8px;
`

const TxnActions = styled.div`
  display: flex;
  gap: 2px;
  opacity: 0;
  transition: opacity 120ms;
  @media (max-width: 768px) { opacity: 1; }
`

const TxnActionBtn = styled.button<{ $danger?: boolean }>`
  padding: 4px;
  border-radius: 4px;
  border: none;
  background: none;
  cursor: pointer;
  color: ${({ theme }) => theme.color.mutedForeground};
  transition: background 120ms, color 120ms;
  &:hover {
    background: ${({ theme, $danger }) => $danger ? 'rgba(244, 162, 97, 0.1)' : theme.color.muted};
    color: ${({ $danger }) => $danger ? 'var(--accent)' : 'inherit'};
  }
`

const TxnAmount = styled.div<{ $color: string }>`
  font-size: 12px;
  font-weight: 500;
  font-variant-numeric: tabular-nums;
  color: ${({ $color }) => $color};
`

const TxnList_Wrap = styled.div`
  max-height: 420px;
  overflow-y: auto;
  padding-right: 4px;
`

function useCategoryLabel(txn: Txn): string {
  const queryClient = useQueryClient()
  const cats: any[] = queryClient.getQueryData(['finance', 'categories']) ?? []
  if (!txn.category_id) return txn.category
  const leaf = cats.find(c => c.id === txn.category_id)
  if (!leaf) return txn.category
  if (!leaf.parent_id) return leaf.name
  const parent = cats.find(c => c.id === leaf.parent_id)
  return parent ? `${parent.name} › ${leaf.name}` : leaf.name
}

function TransactionRow({ txn, onEdit }: { txn: Txn; onEdit: (t: Txn) => void }) {
  const queryClient = useQueryClient()
  const categoryLabel = useCategoryLabel(txn)
  const isIncome = txn.type === 'income'
  const isTransfer = txn.type === 'transfer'

  const iconBg = isIncome ? 'rgba(248, 209, 104, 0.1)' : isTransfer ? 'rgba(45, 49, 58, 0.1)' : 'var(--muted)'
  const iconColor = isIncome ? 'var(--primary)' : isTransfer ? 'var(--muted-foreground)' : 'var(--muted-foreground)'
  const amtColor = isIncome ? 'var(--primary)' : isTransfer ? 'var(--muted-foreground)' : 'var(--accent)'

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
    <TxnRowRoot>
      <TxnLeft>
        <TxnIconWrap $bg={iconBg} $color={iconColor}>
          {getCategoryIcon(txn.category)}
        </TxnIconWrap>
        <div style={{ minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, minWidth: 0 }}>
            <TxnDesc>{txn.description || categoryLabel}</TxnDesc>
            {txn.split_group_id && (
              <span style={{ fontSize: 10, color: 'var(--primary)', flexShrink: 0, display: 'inline-flex', alignItems: 'center', gap: 2 }} title="Part of a split payment">
                <Split size={10} />
                split
              </span>
            )}
          </div>
          <TxnMeta>
            <span>{categoryLabel} · {dayjs(txn.logged_at).format('MMM D, h:mm A')}</span>
            {txn.tags && txn.tags.split(',').filter(Boolean).slice(0, 3).map(t => (
              <Badge key={t}>{t}</Badge>
            ))}
          </TxnMeta>
        </div>
      </TxnLeft>
      <TxnRight>
        <TxnActions>
          {!isTransfer && (
            <TxnActionBtn onClick={() => onEdit(txn)} aria-label="Edit transaction">
              <PencilLine size={12} />
            </TxnActionBtn>
          )}
          <Popconfirm title="Delete this transaction?" onConfirm={() => deleteMutation.mutate()} okText="Delete" cancelText="Cancel" okButtonProps={{ danger: true }}>
            <TxnActionBtn $danger aria-label="Delete transaction">
              <Trash2 size={12} />
            </TxnActionBtn>
          </Popconfirm>
        </TxnActions>
        <TxnAmount $color={amtColor}>
          {isIncome ? '+' : isTransfer ? '⇄ ' : '-'}{formatCurrency(txn.amount)}
        </TxnAmount>
      </TxnRight>
    </TxnRowRoot>
  )
}

function TxnList({ txns, emptyText, onEdit }: { txns: Txn[]; emptyText: string; onEdit: (t: Txn) => void }) {
  if (txns.length === 0) return <EmptyState title={emptyText} style={{ padding: '24px 0' }} />
  return (
    <TxnList_Wrap>
      {txns.map(t => <TransactionRow key={`${t.type}-${t.id}`} txn={t} onEdit={onEdit} />)}
    </TxnList_Wrap>
  )
}

// ── Add / edit transaction modal ────────────────────────────────────────────
export type Kind = 'Expense' | 'Income' | 'Transfer'

export function TransactionModal({ open, onClose, editing, initialKind = 'Expense' }: { open: boolean; onClose: () => void; editing: Txn | null; initialKind?: Kind }) {
  const queryClient = useQueryClient()
  const [kind, setKind] = useState<Kind>(initialKind)
  const [amount, setAmount] = useState<string>('')
  const [date, setDate] = useState<string>(dayjs().format('YYYY-MM-DD'))
  const [fromAccountId, setFromAccountId] = useState<string | undefined>()
  const [toAccountId, setToAccountId] = useState<string | undefined>()
  const [categoryId, setCategoryId] = useState<string | undefined>()
  const [accountId, setAccountId] = useState<string | undefined>()
  const [tags, setTags] = useState<string[]>([])
  const [description, setDescription] = useState<string>('')

  const { data: accounts } = useQuery({
    queryKey: ['finance', 'accounts'],
    queryFn: financeApi.accounts,
    enabled: open })
  const { data: userCategories } = useQuery({
    queryKey: ['finance', 'categories'],
    queryFn: () => financeApi.categories(),
    enabled: open })

  const isEdit = !!editing
  const effectiveKind: Kind = isEdit ? (editing!.type === 'income' ? 'Income' : 'Expense') : kind
  const noAccounts = accounts !== undefined && (accounts as any[]).length === 0

  // Prefill on open for editing, reset to the requested default for new transactions.
  // The Dialog only fires onOpenChange on *close*, so reset/prefill must be driven
  // by the `open`/`editing` props — not an onOpenChange(true) callback.
  useEffect(() => {
    if (!open) return
    if (editing) {
      setAmount(String(editing.amount))
      setCategoryId(editing.category_id ?? undefined)
      setDescription(editing.description ?? '')
      setDate(dayjs(editing.logged_at).format('YYYY-MM-DD'))
      setAccountId(editing.account_id ?? undefined)
      setTags(editing.tags ? editing.tags.split(',').filter(Boolean) : [])
    } else {
      setAmount('')
      setCategoryId(undefined)
      setDescription('')
      setDate(dayjs().format('YYYY-MM-DD'))
      setAccountId(undefined)
      setFromAccountId(undefined)
      setToAccountId(undefined)
      setTags([])
      setKind(initialKind)
    }
  }, [open, editing, initialKind])

  const { mutate, isPending } = useMutation({
    mutationFn: (): Promise<unknown> => {
      // Send the picked date as a naive LOCAL datetime (no UTC conversion). The
      // backend column is tz-naive; using toISOString() would shift the date back
      // a day for users east of UTC (e.g. IST midnight → previous-day 18:30 UTC).
      const logged_at = dayjs(date).format('YYYY-MM-DD') + 'T' + dayjs().format('HH:mm:ss')
      const amt = parseFloat(amount)
      const tagsStr = tags.join(',') || undefined
      if (effectiveKind !== 'Transfer') {
        if (!accountId) return Promise.reject({ response: { data: { detail: 'An account is required' } } })
        if (!categoryId) return Promise.reject({ response: { data: { detail: 'Select a category' } } })
      }
      if (isEdit) {
        const patch = {
          amount: amt,
          category_id: categoryId ?? null,
          description: description?.trim() || '',
          logged_at,
          account_id: accountId ?? null,
          tags: tagsStr ?? null }
        if (editing!.type === 'expense') return financeApi.patchExpense(editing!.id, patch)
        return financeApi.patchIncome(editing!.id, patch)
      }
      if (effectiveKind === 'Expense') {
        return financeApi.createExpense({
          amount: amt,
          category_id: categoryId,
          description: description?.trim() || undefined,
          logged_at,
          account_id: accountId,
          tags: tagsStr })
      }
      if (effectiveKind === 'Income') {
        return financeApi.createIncome({
          amount: amt,
          category_id: categoryId,
          description: description?.trim() || undefined,
          logged_at,
          account_id: accountId,
          tags: tagsStr })
      }
      if (!fromAccountId || !toAccountId) {
        return Promise.reject({ response: { data: { detail: 'Select both accounts' } } })
      }
      if (fromAccountId === toAccountId) {
        return Promise.reject({ response: { data: { detail: 'From and To accounts must be different' } } })
      }
      return financeApi.createTransfer({
        amount: amt,
        from_account_id: fromAccountId,
        to_account_id: toAccountId,
        description: description?.trim() || undefined,
        logged_at })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['finance'] })
      toast.success(isEdit ? 'Transaction updated' : `${effectiveKind} saved`)
      onClose()
    },
    onError: (e: any) => toast.error(e?.response?.data?.detail || `Failed to save ${effectiveKind.toLowerCase()}`) })

  return (
    <Dialog 
      open={open}
      onOpenChange={(v) => { if (!v) onClose() }}
      title={editing ? 'Edit Transaction' : 'New Transaction'}
    >
      {noAccounts ? (
        <div style={{ textAlign: 'center', padding: '24px 12px' }}>
          <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 6 }}>Add an account first</div>
          <div style={{ fontSize: 13, color: 'var(--muted-foreground)', marginBottom: 16 }}>
            Every transaction is tied to an account. Create one to start logging.
          </div>
          <Button variant="primary" type="button" onClick={() => { onClose(); window.dispatchEvent(new Event('open-new-account')) }}>
            <Plus size={14} style={{ marginRight: 4 }} /> Add account
          </Button>
        </div>
      ) : (
      <>
      {!isEdit && (
        <FullWidthWrap>
          <SegmentedControl
            options={[
              { value: 'Expense', label: 'Expense' },
              { value: 'Income', label: 'Income' },
              { value: 'Transfer', label: 'Transfer' },
            ]}
            value={kind}
            onChange={v => { setKind(v as Kind); setCategoryId(undefined) }}
          />
        </FullWidthWrap>
      )}
      <form id="transaction-form" onSubmit={e => { e.preventDefault(); mutate() }}>
        <FormGrid>
          <div>
            <FormLabel htmlFor="txn-amount">Amount (₹)</FormLabel>
            <Input id="txn-amount" type="number" startAdornment="₹" placeholder="0.00" min="0" step="0.01" value={amount} onChange={e => setAmount(e.target.value)} required />
          </div>
          <div>
            <FormLabel htmlFor="txn-date">Date</FormLabel>
            <Input id="txn-date" type="date" value={date} onChange={e => setDate(e.target.value)} required />
          </div>
        </FormGrid>
        {effectiveKind === 'Transfer' ? (
          <FormGrid>
            <div>
              <FormLabel htmlFor="txn-from-account">From Account</FormLabel>
              <Select id="txn-from-account" placeholder="Source account" options={(accounts ?? []).map((a: any) => ({ label: a.name, value: a.id }))} value={fromAccountId} onChange={(v: string) => setFromAccountId(v)} required />
            </div>
            <div>
              <FormLabel htmlFor="txn-to-account">To Account</FormLabel>
              <Select id="txn-to-account" placeholder="Destination account" options={(accounts ?? []).map((a: any) => ({ label: a.name, value: a.id }))} value={toAccountId} onChange={(v: string) => setToAccountId(v)} required />
            </div>
          </FormGrid>
        ) : (
          <FormGrid>
            <div>
              <FormLabel htmlFor="txn-category">{effectiveKind === 'Expense' ? 'Category' : 'Source'}</FormLabel>
              <CategoryPicker
                kind={effectiveKind === 'Income' ? 'income' : 'expense'}
                categories={(userCategories ?? []) as any}
                value={categoryId}
                onChange={setCategoryId}
                label={effectiveKind === 'Expense' ? 'category' : 'source'}
              />
            </div>
            <div>
              <FormLabel htmlFor="txn-account">Account</FormLabel>
              <Select id="txn-account" placeholder="Select account" options={(accounts ?? []).map((a: any) => ({ label: a.name, value: a.id }))} value={accountId} onChange={(v: string) => setAccountId(v)} required />
            </div>
          </FormGrid>
        )}
        {effectiveKind !== 'Transfer' && (
          <FormGroup>
            <FormLabel htmlFor="txn-tags">Tags (comma separated)</FormLabel>
            <Input id="txn-tags" placeholder="e.g. trip-goa, reimbursable" value={tags.join(',')} onChange={e => setTags(e.target.value.split(',').map(s => s.trim()))} />
          </FormGroup>
        )}
        <FormGroup>
          <FormLabel htmlFor="txn-description">Description</FormLabel>
          <Input id="txn-description" placeholder="Optional note" maxLength={200} value={description} onChange={e => setDescription(e.target.value)} />
        </FormGroup>
      </form>
      </>
      )}
      <DialogFooter>
        <Button variant="ghost" type="button" onClick={onClose} disabled={isPending}>Cancel</Button>
        {!noAccounts && <Button variant="primary" type="submit" form="transaction-form" loading={isPending}>Save</Button>}
      </DialogFooter>
    </Dialog>
  )
}

// ── Main tab ─────────────────────────────────────────────────────────────────
export function TransactionsTab() {
  const [view, setView] = useState<'Daily' | 'Calendar' | 'Weekly' | 'Monthly'>('Daily')
  const [month, setMonth] = useState(() => dayjs().startOf('month'))
  const [selectedDate, setSelectedDate] = useState(() => dayjs().format('YYYY-MM-DD'))
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<Txn | null>(null)
  const [quickKind, setQuickKind] = useState<Kind>('Expense')
  const [search, setSearch] = useState('')
  const [searchOpen, setSearchOpen] = useState(false)
  const [importOpen, setImportOpen] = useState(false)
  const [filterOpen, setFilterOpen] = useState(false)
  const [filterKind, setFilterKind] = useState<string>('all')
  const [filterAccount, setFilterAccount] = useState<string | undefined>()
  const [filterCategory, setFilterCategory] = useState<string | undefined>()
  const [filterMin, setFilterMin] = useState<number | null>(null)
  const [filterMax, setFilterMax] = useState<number | null>(null)
  const [filterRange, setFilterRange] = useState<[Dayjs, Dayjs] | null>(null)
  const [filterTag, setFilterTag] = useState('')
  const [chartFilter, setChartFilter] = useState<'Daily' | 'Weekly' | 'Monthly' | 'Yearly' | 'All Time'>('Monthly')
  useEffect(() => {
    const handleOpen = () => {
      setEditing(null)
      setModalOpen(true)
    }
    window.addEventListener('open-new-transaction', handleOpen)
    return () => window.removeEventListener('open-new-transaction', handleOpen)
  }, [])

  const openAdd = (k: any) => {
    setQuickKind(k)
    setEditing(null)
    setModalOpen(true)
  }

  const deferredSearch = useDeferredValue(search)
  const deferredTag = useDeferredValue(filterTag)
  const filtersActive = filterKind !== 'all' || !!filterAccount || !!filterCategory || filterMin != null || filterMax != null || !!filterRange || !!deferredTag.trim()
  const searchActive = deferredSearch.trim().length > 0 || filtersActive

  const monthStr = month.format('YYYY-MM')

  const { data: cashflow, isLoading: loadingCashflow } = useQuery({
    queryKey: ['finance', 'cashflow', monthStr],
    queryFn: () => financeApi.cashflow(monthStr) })
  const { data: expensesPage, isLoading: loadingExpenses } = useQuery({
    queryKey: ['finance', 'expenses', 'month', monthStr],
    queryFn: () => financeApi.expenses(monthStr, undefined, 200, 0) })
  const { data: incomeList, isLoading: loadingIncome } = useQuery({
    queryKey: ['finance', 'income', monthStr],
    queryFn: () => financeApi.income(monthStr) })
  const { data: transferList } = useQuery({
    queryKey: ['finance', 'transfers', monthStr],
    queryFn: () => financeApi.transfers(monthStr) })

  const { data: accounts } = useQuery({
    queryKey: ['finance', 'accounts'],
    queryFn: financeApi.accounts })
  const { data: categories } = useQuery({
    queryKey: ['finance', 'categories'],
    queryFn: () => financeApi.categories() })

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
      limit: 200 }),
    enabled: searchActive })

  const isLoading = loadingCashflow || loadingExpenses || loadingIncome

  const transactions: Txn[] = useMemo(() => {
    const exp = (expensesPage?.items ?? []).map(e => ({
      id: e.id, type: 'expense' as const, amount: Number(e.amount), category: e.category, description: e.description, logged_at: e.logged_at, account_id: e.account_id,
      category_id: (e as any).category_id, tags: e.tags, split_group_id: e.split_group_id }))
    const inc = (incomeList ?? []).map(i => ({
      id: i.id, type: 'income' as const, amount: Number(i.amount), category: i.source, description: i.description, logged_at: i.logged_at, account_id: i.account_id,
      category_id: (i as any).category_id, tags: i.tags }))
    const trf = (transferList ?? []).map(t => ({
      id: t.id, type: 'transfer' as const, amount: Number(t.amount), category: 'Transfer', description: t.description, logged_at: t.logged_at }))
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

  // Years we want to support in the dropdown
  const yearOptions = [
    { label: '2026', value: 2026 },
    { label: '2025', value: 2025 },
    { label: '2024', value: 2024 }
  ]

  // Months
  const monthOptions = [
    { label: 'Jan', value: 0 },
    { label: 'Feb', value: 1 },
    { label: 'Mar', value: 2 },
    { label: 'Apr', value: 3 },
    { label: 'May', value: 4 },
    { label: 'Jun', value: 5 },
    { label: 'Jul', value: 6 },
    { label: 'Aug', value: 7 },
    { label: 'Sep', value: 8 },
    { label: 'Oct', value: 9 },
    { label: 'Nov', value: 10 },
    { label: 'Dec', value: 11 }
  ]

  // ── Toolbar date label ─────────────────────────────────────────────────
  const dateLabel = useMemo(() => {
    if (view === 'Daily') return dayjs(selectedDate).format('MMM D, YYYY')
    if (view === 'Weekly') {
      const start = dayjs(selectedDate).startOf('isoWeek')
      return `${start.format('MMM D')} – ${start.add(6, 'day').format('MMM D')}`
    }
    if (view === 'Monthly') return month.format('MMMM YYYY')
    return month.format('MMMM YYYY')
  }, [view, selectedDate, month])

  const goPrev = () => {
    if (view === 'Daily') setSelectedDate(dayjs(selectedDate).subtract(1, 'day').format('YYYY-MM-DD'))
    else if (view === 'Weekly') setSelectedDate(dayjs(selectedDate).subtract(7, 'day').format('YYYY-MM-DD'))
    else setMonth(m => m.subtract(1, 'month'))
  }
  const goNext = () => {
    if (view === 'Daily') setSelectedDate(dayjs(selectedDate).add(1, 'day').format('YYYY-MM-DD'))
    else if (view === 'Weekly') setSelectedDate(dayjs(selectedDate).add(7, 'day').format('YYYY-MM-DD'))
    else setMonth(m => m.add(1, 'month'))
  }

  const toolbar = (
    <AreaToolbar
      left={
        <>
          <DesktopSearch>
            <Input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search transactions…"
              startAdornment={<Search size={13} />}
              size="sm"
              style={{ width: 200, height: 32 }}
              aria-label="Search transactions"
            />
          </DesktopSearch>
          <MobileSearchBtn onClick={() => setSearchOpen(true)} aria-label="Search transactions">
            <Search size={13} />
          </MobileSearchBtn>
          <ToolbarIconBtn
            onClick={() => setFilterOpen(true)}
            data-active={filtersActive}
            aria-pressed={filtersActive}
          >
            Filters
            {filtersActive && (
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--primary)', display: 'inline-block', marginLeft: 4 }} />
            )}
          </ToolbarIconBtn>
          {searchActive && (
            <ToolbarIconBtn onClick={clearFilters}>
              Clear
            </ToolbarIconBtn>
          )}
        </>
      }

    >
      {/* View switcher */}
      <SegmentedControl
        size="sm"
        value={view}
        onChange={v => setView(v as 'Daily' | 'Calendar' | 'Weekly' | 'Monthly')}
        options={[
          { label: 'Daily', value: 'Daily' },
          { label: 'Weekly', value: 'Weekly' },
          { label: 'Monthly', value: 'Monthly' },
          { label: 'Calendar', value: 'Calendar' },
        ]}
        aria-label="Transaction view"
      />
      {/* Date navigation */}
      {view !== 'Calendar' && (
        <DateNav>
          <DateNavBtn onClick={goPrev} aria-label="Previous period">
            <ChevronLeft size={14} />
          </DateNavBtn>
          <DateNavLabel>{dateLabel}</DateNavLabel>
          <DateNavBtn onClick={goNext} aria-label="Next period">
            <ChevronRight size={14} />
          </DateNavBtn>
        </DateNav>
      )}
      <ToolbarIconBtn onClick={() => setImportOpen(true)}>
        <UploadIcon size={13} />
        Import
      </ToolbarIconBtn>
      <Button size="sm" variant="primary" onClick={() => openAdd('Expense')}>
        <Plus size={12} style={{ marginRight: 4 }} /> Add
      </Button>
    </AreaToolbar>
  )

  if (isLoading) return (
    <div style={{ padding: '16px' }}>
      <StyledSkeleton $height="2.5rem" $margin="0 0 12px 0" />
      <StyledSkeleton $height="16rem" />
    </div>
  )

  // ── Search results (server-side, all months/types) ─────────────────────────
  let body: React.ReactNode = null
  let summaryElement: React.ReactNode = null

  if (searchActive) {
    const items: Txn[] = (searchResult?.items ?? []).map(i => ({
      id: i.id, type: i.kind, amount: i.amount, category: i.category ?? '—',
      description: i.description, logged_at: i.logged_at, account_id: i.account_id ?? undefined,
      category_id: (i as any).category_id, tags: i.tags, split_group_id: i.split_group_id }))
    const totals = dayTotals(items)
    summaryElement = <SummaryBar income={totals.income} expense={totals.expense} />
    body = loadingSearch ? (
      <StyledSkeleton $height="16rem" />
    ) : (
      <>
        <div style={{ fontSize: '11px', color: 'var(--muted-foreground)', marginBottom: '8px' }}>
          {items.length} result{(searchResult?.total ?? 0) === 1 ? '' : 's'} across all months
          {searchResult?.has_more ? ' — showing first 200' : ''}
        </div>
        <TxnList txns={items} emptyText="No matching transactions" onEdit={openEdit} />
      </>
    )
  } else if (view === 'Daily') {
    const dayTxns = transactions.filter(t => dayjs(t.logged_at).format('YYYY-MM-DD') === selectedDate)
    const totals = dayTotals(dayTxns)
    summaryElement = <SummaryBar income={totals.income} expense={totals.expense} />
    body = (
      <>
        <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--muted-foreground)', marginBottom: 12, letterSpacing: '0.01em' }}>
          {dayjs(selectedDate).format('dddd, MMM D YYYY')}
        </div>
        <TxnList txns={dayTxns} emptyText="No transactions on this day" onEdit={openEdit} />
      </>
    )
  } else if (view === 'Calendar') {
    const dayTxns = transactions.filter(t => dayjs(t.logged_at).format('YYYY-MM-DD') === selectedDate)
    const monthTotals = dayTotals(transactions)
    summaryElement = <SummaryBar income={monthTotals.income} expense={monthTotals.expense} />
    body = (
      <>
        <TransactionCalendar
          month={month}
          byDay={cashflow?.by_day ?? []}
          selectedDate={selectedDate}
          onSelectDate={goToDate}
          onMonthChange={delta => setMonth(m => m.add(delta, 'month'))}
        />
        <div style={{ marginTop: 16 }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--muted-foreground)', marginBottom: 8 }}>{dayjs(selectedDate).format('dddd, MMM D')}</div>
          <TxnList txns={dayTxns} emptyText="No transactions on this day" onEdit={openEdit} />
        </div>
      </>
    )
  } else if (view === 'Weekly') {
    const monthTotals = dayTotals(transactions)
    summaryElement = <SummaryBar income={monthTotals.income} expense={monthTotals.expense} />
    const weeks = new Map<string, Txn[]>()
    transactions.forEach(t => {
      const wk = dayjs(t.logged_at).startOf('isoWeek').format('YYYY-MM-DD')
      if (!weeks.has(wk)) weeks.set(wk, [])
      weeks.get(wk)!.push(t)
    })
    const sortedWeeks = Array.from(weeks.entries()).sort((a, b) => b[0].localeCompare(a[0]))
    body = (
      <>
        <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--muted-foreground)', marginBottom: 12 }}>
          {month.format('MMMM YYYY')}
        </div>
        {sortedWeeks.length === 0 ? <EmptyState title="No transactions this month" style={{ padding: '24px 0' }} /> : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12, maxHeight: 460, overflowY: 'auto', paddingRight: 4 }}>
            {sortedWeeks.map(([weekStart, txns]) => {
              const totals = dayTotals(txns)
              const start = dayjs(weekStart)
              const end = start.add(6, 'day')
              return (
                <div key={weekStart} style={{ paddingBottom: 14, borderBottom: '1px solid var(--border, #dde3ef)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                    <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--foreground)' }}>{start.format('MMM D')} – {end.format('MMM D')}</div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, fontSize: 11 }}>
                      <span style={{ color: 'var(--primary)', fontWeight: 500 }}>+{formatCurrency(totals.income)}</span>
                      <span style={{ color: 'var(--accent)', fontWeight: 500 }}>-{formatCurrency(totals.expense)}</span>
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
    summaryElement = <SummaryBar income={totals.income} expense={totals.expense} />
    body = (
      <>
        <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--muted-foreground)', marginBottom: 12 }}>
          {month.format('MMMM YYYY')}
        </div>
        <TxnList txns={transactions} emptyText="No transactions this month" onEdit={openEdit} />
      </>
    )
  }

  return (
    <>
      <WorkspaceLayout rail={undefined}>
        {toolbar}
        {summaryElement}
        <GlassCard
          title="Transactions"
          subtitle="Browse and search transaction logs for the selected period"
          icon={<ArrowLeftRight size={16} />}
        >
          {body}
        </GlassCard>
      </WorkspaceLayout>
      <TransactionModal open={modalOpen} onClose={closeModal} editing={editing} initialKind={quickKind} />
      <ImportCsvModal open={importOpen} onClose={() => setImportOpen(false)} />
      <Dialog open={searchOpen} onOpenChange={setSearchOpen} title="Search Transactions">
        <div style={{ paddingBottom: '16px' }}>
          <Input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search transactions…"
            startAdornment={<Search size={13} />}
            style={{ width: '100%' }}
            aria-label="Search transactions"
            autoFocus
          />
        </div>
      </Dialog>
      <FilterModal
        open={filterOpen}
        onClose={() => setFilterOpen(false)}
        accounts={accounts ?? []}
        categories={categories ?? []}
        filterKind={filterKind}
        setFilterKind={setFilterKind}
        filterAccount={filterAccount}
        setFilterAccount={setFilterAccount}
        filterCategory={filterCategory}
        setFilterCategory={setFilterCategory}
        filterTag={filterTag}
        setFilterTag={setFilterTag}
        filterMin={filterMin}
        setFilterMin={setFilterMin}
        filterMax={filterMax}
        setFilterMax={setFilterMax}
        filterRange={filterRange}
        setFilterRange={setFilterRange}
        filtersActive={filtersActive}
        clearFilters={clearFilters}
      />
    </>
  )
}

function FilterModal({
  open,
  onClose,
  accounts,
  categories,
  filterKind,
  setFilterKind,
  filterAccount,
  setFilterAccount,
  filterCategory,
  setFilterCategory,
  filterTag,
  setFilterTag,
  filterMin,
  setFilterMin,
  filterMax,
  setFilterMax,
  filterRange,
  setFilterRange,
  filtersActive,
  clearFilters }: {
  open: boolean
  onClose: () => void
  accounts: any[]
  categories: any[]
  filterKind: string
  setFilterKind: (k: string) => void
  filterAccount: string | undefined
  setFilterAccount: (a: string | undefined) => void
  filterCategory: string | undefined
  setFilterCategory: (c: string | undefined) => void
  filterTag: string
  setFilterTag: (t: string) => void
  filterMin: number | null
  setFilterMin: (n: number | null) => void
  filterMax: number | null
  setFilterMax: (n: number | null) => void
  filterRange: any
  setFilterRange: (r: any) => void
  filtersActive: boolean
  clearFilters: () => void
}) {
  return (
    <Sheet 
      open={open}
      onOpenChange={(v) => { if(!v) onClose() }}
      title="Advanced Filters"
      side="right"
    >
      <FiltersGroup>
        <FilterLabel>Type</FilterLabel>
        <Select
          size="sm"
          fullWidth
          options={[{ label: 'All', value: 'all' }, { label: 'Expense', value: 'expense' }, { label: 'Income', value: 'income' }, { label: 'Transfer', value: 'transfer' }]}
          value={filterKind}
          onChange={setFilterKind}
          aria-label="Filter by type"
        />
        <FilterLabel htmlFor="filter-account">Account</FilterLabel>
        <Select
          id="filter-account"
          size="sm"
          placeholder="Select Account"
          allowClear
          style={{ width: '100%' }}
          value={filterAccount}
          onChange={setFilterAccount}
          options={(accounts ?? []).map((a: any) => ({ label: a.name, value: a.id }))}
          aria-label="Filter by account"
        />
        <FilterLabel htmlFor="filter-category">Category</FilterLabel>
        <Select
          id="filter-category"
          size="sm"
          placeholder="Select Category"
          allowClear
          style={{ width: '100%' }}
          value={filterCategory}
          onChange={setFilterCategory}
          options={(categories ?? []).map((c: any) => ({ label: c.name, value: c.name }))}
          aria-label="Filter by category"
        />
        <FilterLabel htmlFor="filter-tag">Tag</FilterLabel>
        <Input id="filter-tag" size="sm" placeholder="Enter tag name" value={filterTag} onChange={e => setFilterTag(e.target.value)} allowClear aria-label="Filter by tag name" />
        <FilterLabel>Amount Range</FilterLabel>
        <FilterRow>
          <Input type="number" size="sm" placeholder="Min ₹" min="0" step="0.01" style={{ width: '100%' }} value={filterMin ?? ''} onChange={e => setFilterMin(e.target.value ? Number(e.target.value) : null)} aria-label="Minimum amount" />
          <Input type="number" size="sm" placeholder="Max ₹" min="0" step="0.01" style={{ width: '100%' }} value={filterMax ?? ''} onChange={e => setFilterMax(e.target.value ? Number(e.target.value) : null)} aria-label="Maximum amount" />
        </FilterRow>
        <FilterLabel>Date Range</FilterLabel>
        <FilterRow>
          <Input type="date" size="sm" style={{ width: '100%' }} value={filterRange?.[0] ? filterRange[0].format('YYYY-MM-DD') : ''} onChange={e => setFilterRange(e.target.value ? [dayjs(e.target.value), filterRange?.[1] || dayjs(e.target.value)] : null)} aria-label="Start date" />
          <Input type="date" size="sm" style={{ width: '100%' }} value={filterRange?.[1] ? filterRange[1].format('YYYY-MM-DD') : ''} onChange={e => setFilterRange(e.target.value ? [filterRange?.[0] || dayjs(e.target.value), dayjs(e.target.value)] : null)} aria-label="End date" />
        </FilterRow>
        <FilterActions>
          <Button variant="primary" size="sm" style={{ width: '100%' }} onClick={onClose}>Apply Filters</Button>
          {filtersActive && (
            <Button size="sm" variant="ghost" onClick={() => { clearFilters(); onClose(); }} style={{ fontSize: '11px', width: '100%', color: 'var(--kpi-red)' }}>Clear all</Button>
          )}
        </FilterActions>
      </FiltersGroup>
    </Sheet>
  )
}
