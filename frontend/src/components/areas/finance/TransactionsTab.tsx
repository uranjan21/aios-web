// @ts-nocheck
import { useDeferredValue, useMemo, useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import dayjs, { Dayjs } from 'dayjs'
import isoWeek from 'dayjs/plugin/isoWeek'
import { Popconfirm } from '@/components/ui/Popconfirm'
import { SegmentedControl, Button, Dialog, DialogFooter, Input, Select, SelectItem, EmptyState, Switch, Badge } from '@ledgr/ui'
import { toast } from 'sonner'
import {
  ChevronLeft, ChevronRight, ShoppingBag, Clapperboard, Home, Heart,
  CreditCard, Shirt, GraduationCap, Zap, Wallet, TrendingUp, ArrowUpRight, ArrowDownRight,
  ArrowLeftRight, ArrowDownCircle, ArrowUpCircle, PencilLine, Trash2, Search, Upload as UploadIcon,
  Plus } from 'lucide-react'
import { financeApi } from '@/api/areas'
import { cn, formatCurrency } from '@/lib/utils'
import styled from 'styled-components'
import { Skeleton } from '@/components/ui/skeleton'
import { Card as GlassCard } from '@ledgr/ui';
import { AreaToolbar, ToolbarDivider, ToolbarIconBtn, DateNav, DateNavBtn, DateNavLabel } from '@/components/ui/AreaToolbar'
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

// ── Summary bar ────────────────────────────────────────────────────────────
const SummaryGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 8px;
  margin-bottom: 12px;
`

const SumPill = styled.div<{ $bg: string }>`
  border-radius: 8px;
  background: ${({ $bg }) => $bg};
  padding: 6px 10px;
`

const SumLabel = styled.div<{ $color: string }>`
  font-size: 9px;
  color: ${({ $color }) => $color};
  font-weight: 500;
  text-transform: uppercase;
  letter-spacing: 0.08em;
`

const SumValue = styled.div<{ $color: string }>`
  font-size: 12px;
  font-weight: 500;
  font-variant-numeric: tabular-nums;
  color: ${({ $color }) => $color};
`

function SummaryBar({ income, expense }: { income: number; expense: number }) {
  const net = income - expense
  return (
    <SummaryGrid>
      <SumPill $bg="rgba(248, 209, 104, 0.1)">
        <SumLabel $color="var(--primary)">Income</SumLabel>
        <SumValue $color="var(--primary)">{formatCurrency(income)}</SumValue>
      </SumPill>
      <SumPill $bg="rgba(244, 162, 97, 0.1)">
        <SumLabel $color="var(--accent)">Expenses</SumLabel>
        <SumValue $color="var(--accent)">{formatCurrency(expense)}</SumValue>
      </SumPill>
      <SumPill $bg="rgba(45, 49, 58, 0.04)">
        <SumLabel>Net</SumLabel>
        <SumValue $color={net >= 0 ? 'var(--foreground)' : 'var(--accent)'}>{formatCurrency(net)}</SumValue>
      </SumPill>
    </SummaryGrid>
  )
}

// ── Form Components ────────────────────────────────────────────────────────
const FormGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
  margin-bottom: 12px;
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

const FormFlex = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 12px;
`

const FormFlexStart = styled.div`
  display: flex;
  gap: 8px;
  align-items: flex-start;
`

const FormFlex1 = styled.div`
  flex: 1;
`

const SplitPanel = styled.div`
  margin-bottom: 12px;
  padding: 12px;
  background-color: ${({ theme }) => theme.color.muted}66;
  border-radius: 8px;
  display: flex;
  flex-direction: column;
  gap: 8px;
`

const AmountInputWrap = styled.div`
  width: 128px;
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

const SplitText = styled.div<{ $color: string }>`
  font-size: 11px;
  margin-top: 8px;
  color: ${({ $color }) => $color};
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

function TransactionRow({ txn, onEdit }: { txn: Txn; onEdit: (t: Txn) => void }) {
  const queryClient = useQueryClient()
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
            <TxnDesc>{txn.description || txn.category}</TxnDesc>
            {txn.split_group_id && (
              <span style={{ fontSize: 10, color: 'var(--primary)', flexShrink: 0 }} title="Part of a split payment">⧉ split</span>
            )}
          </div>
          <TxnMeta>
            <span>{txn.category} · {dayjs(txn.logged_at).format('MMM D, h:mm A')}</span>
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
  const [splitMode, setSplitMode] = useState(false)
  const [amount, setAmount] = useState<string>('')
  const [date, setDate] = useState<string>(dayjs().format('YYYY-MM-DD'))
  const [fromAccountId, setFromAccountId] = useState<string | undefined>()
  const [toAccountId, setToAccountId] = useState<string | undefined>()
  const [category, setCategory] = useState<string | undefined>()
  const [accountId, setAccountId] = useState<string | undefined>()
  const [tags, setTags] = useState<string[]>([])
  const [description, setDescription] = useState<string>('')
  const [splits, setSplits] = useState<Array<{category?: string, amount?: string}>>([{}, {}])

  const { data: accounts } = useQuery({
    queryKey: ['finance', 'accounts'],
    queryFn: financeApi.accounts,
    enabled: open })

  const isEdit = !!editing
  const effectiveKind: Kind = isEdit ? (editing!.type === 'income' ? 'Income' : 'Expense') : kind

  // Prefill on open for editing, reset kind to the requested default for new transactions
  const afterOpenChange = (visible: boolean) => {
    if (visible && editing) {
      setAmount(String(editing.amount))
      setCategory(editing.category)
      setDescription(editing.description ?? '')
      setDate(dayjs(editing.logged_at).format('YYYY-MM-DD'))
      setAccountId(editing.account_id ?? undefined)
      setTags(editing.tags ? editing.tags.split(',').filter(Boolean) : [])
      setSplitMode(false)
    }
    if (visible && !editing) {
      setAmount('')
      setCategory(undefined)
      setDescription('')
      setDate(dayjs().format('YYYY-MM-DD'))
      setAccountId(undefined)
      setFromAccountId(undefined)
      setToAccountId(undefined)
      setTags([])
      setSplits([{}, {}])
      setKind(initialKind)
      setSplitMode(false)
    }
  }

  const { mutate, isPending } = useMutation({
    mutationFn: (): Promise<unknown> => {
      const logged_at = dayjs(date).toISOString()
      const amt = parseFloat(amount)
      const tagsStr = tags.join(',') || undefined
      if (isEdit) {
        const patch = {
          amount: amt,
          description: description?.trim() || '',
          logged_at,
          account_id: accountId ?? null,
          tags: tagsStr ?? null }
        if (editing!.type === 'expense') return financeApi.patchExpense(editing!.id, { ...patch, category })
        return financeApi.patchIncome(editing!.id, { ...patch, source: category })
      }
      if (effectiveKind === 'Expense') {
        let finalSplits: { category: string; amount: number }[] | undefined
        if (splitMode) {
          finalSplits = splits
            .filter((s: any) => s?.category && s?.amount)
            .map((s: any) => ({ category: s.category, amount: Number(s.amount) }))
          if (!finalSplits || finalSplits.length < 2) {
            return Promise.reject({ response: { data: { detail: 'Add at least 2 split parts' } } })
          }
          const sum = finalSplits.reduce((a, s) => a + s.amount, 0)
          if (Math.abs(sum - amt) > 0.01) {
            return Promise.reject({ response: { data: { detail: `Splits total ${formatCurrency(sum)} ≠ amount ${formatCurrency(amt)}` } } })
          }
        }
        return financeApi.createExpense({
          amount: amt,
          category: splitMode ? finalSplits![0].category : category,
          description: description?.trim() || undefined,
          logged_at,
          account_id: accountId || undefined,
          tags: tagsStr,
          splits: finalSplits })
      }
      if (effectiveKind === 'Income') {
        return financeApi.createIncome({
          amount: amt,
          source: category,
          description: description?.trim() || undefined,
          logged_at,
          account_id: accountId || undefined,
          tags: tagsStr })
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
      onOpenChange={(v) => { if(!v) onClose(); else afterOpenChange(v); }}
      title={editing ? 'Edit Transaction' : 'New Transaction'}
    >
      {!isEdit && (
        <FullWidthWrap>
          <SegmentedControl
            options={['Expense', 'Income', 'Transfer']}
            value={kind}
            onChange={v => { setKind(v as Kind); setCategory(undefined) }}
          />
        </FullWidthWrap>
      )}
      <form id="transaction-form" onSubmit={e => { e.preventDefault(); mutate() }}>
        <FormGrid>
          <div>
            <FormLabel>Amount (₹)</FormLabel>
            <Input type="number" startAdornment="₹" placeholder="0.00" min="0" step="0.01" value={amount} onChange={e => setAmount(e.target.value)} required />
          </div>
          <div>
            <FormLabel>Date</FormLabel>
            <Input type="date" value={date} onChange={e => setDate(e.target.value)} required />
          </div>
        </FormGrid>
        {effectiveKind === 'Transfer' ? (
          <FormGrid>
            <div>
              <FormLabel>From Account</FormLabel>
              <Select placeholder="Source account" options={(accounts ?? []).map((a: any) => ({ label: a.name, value: a.id }))} value={fromAccountId} onChange={(v: string) => setFromAccountId(v)} required />
            </div>
            <div>
              <FormLabel>To Account</FormLabel>
              <Select placeholder="Destination account" options={(accounts ?? []).map((a: any) => ({ label: a.name, value: a.id }))} value={toAccountId} onChange={(v: string) => setToAccountId(v)} required />
            </div>
          </FormGrid>
        ) : (
          <FormGrid>
            {!(effectiveKind === 'Expense' && splitMode) && (
              <div>
                <FormLabel>{effectiveKind === 'Expense' ? 'Category' : 'Source'}</FormLabel>
                <Select placeholder={effectiveKind === 'Expense' ? 'Select category' : 'Select source'} options={(effectiveKind === 'Expense' ? EXPENSE_CATEGORIES : INCOME_SOURCES).map(c => ({ label: c, value: c }))} value={category} onChange={(v: string) => setCategory(v)} required />
              </div>
            )}
            <div>
              <FormLabel>Account (optional)</FormLabel>
              <Select placeholder="No account" options={(accounts ?? []).map((a: any) => ({ label: a.name, value: a.id }))} value={accountId} onChange={(v: string) => setAccountId(v)} />
            </div>
          </FormGrid>
        )}
        {effectiveKind === 'Expense' && !isEdit && (
          <FormFlex>
            <Switch size="sm" checked={splitMode} onChange={setSplitMode} aria-label="Split across categories" />
            <span style={{ fontSize: 12, color: 'var(--muted-foreground)' }}>Split across categories</span>
          </FormFlex>
        )}
        {effectiveKind === 'Expense' && !isEdit && splitMode && (
          <SplitPanel>
            {splits.map((s, idx) => (
              <FormFlexStart key={idx}>
                <FormFlex1>
                  <Select placeholder="Category" options={EXPENSE_CATEGORIES.map(c => ({ label: c, value: c }))} value={s.category} onChange={(v: string) => { const n = [...splits]; n[idx].category = v; setSplits(n); }} required />
                </FormFlex1>
                <AmountInputWrap>
                  <Input type="number" startAdornment="₹" placeholder="0" min="0.01" value={s.amount || ''} onChange={(e) => { const n = [...splits]; n[idx].amount = e.target.value; setSplits(n); }} required />
                </AmountInputWrap>
                {splits.length > 2 && (
                  <Button variant="ghost" size="sm" type="button" onClick={() => { const n = [...splits]; n.splice(idx, 1); setSplits(n); }} aria-label="Remove split row">✕</Button>
                )}
              </FormFlexStart>
            ))}
            <Button variant="outline" size="sm" type="button" onClick={() => setSplits([...splits, {}])} style={{ width: '100%' }}>+ Add part</Button>
            {(() => {
              const total = parseFloat(amount || '0')
              const parts = splits.reduce((a, s) => a + (Number(s?.amount) || 0), 0)
              const diff = total - parts
              return (
                <SplitText $color={Math.abs(diff) < 0.01 ? 'var(--kpi-emerald)' : 'var(--kpi-amber)'}>
                  Parts: {formatCurrency(parts)} of {formatCurrency(total)}{Math.abs(diff) >= 0.01 ? ` — ${formatCurrency(Math.abs(diff))} ${diff > 0 ? 'remaining' : 'over'}` : ' ✓'}
                </SplitText>
              )
            })()}
          </SplitPanel>
        )}
        {effectiveKind !== 'Transfer' && (
          <FormGroup>
            <FormLabel>Tags (comma separated)</FormLabel>
            <Input placeholder="e.g. trip-goa, reimbursable" value={tags.join(',')} onChange={e => setTags(e.target.value.split(',').map(s => s.trim()))} />
          </FormGroup>
        )}
        <FormGroup>
          <FormLabel>Description</FormLabel>
          <Input placeholder="Optional note" maxLength={200} value={description} onChange={e => setDescription(e.target.value)} />
        </FormGroup>
      </form>
      <DialogFooter>
        <Button variant="ghost" type="button" onClick={onClose} disabled={isPending}>Cancel</Button>
        <Button variant="primary" type="submit" form="transaction-form" loading={isPending}>Save</Button>
      </DialogFooter>
    </Dialog>
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
  const [filterOpen, setFilterOpen] = useState(false)
  const [filterKind, setFilterKind] = useState<string>('all')
  const [filterAccount, setFilterAccount] = useState<string | undefined>()
  const [filterCategory, setFilterCategory] = useState<string | undefined>()
  const [filterMin, setFilterMin] = useState<number | null>(null)
  const [filterMax, setFilterMax] = useState<number | null>(null)
  const [filterRange, setFilterRange] = useState<[Dayjs, Dayjs] | null>(null)
  const [filterTag, setFilterTag] = useState('')

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
  const prevMonthStr = month.subtract(1, 'month').format('YYYY-MM')

  const { data: cashflow, isLoading: loadingCashflow } = useQuery({
    queryKey: ['finance', 'cashflow', monthStr],
    queryFn: () => financeApi.cashflow(monthStr) })
  const { data: prevCashflow } = useQuery({
    queryKey: ['finance', 'cashflow', prevMonthStr],
    queryFn: () => financeApi.cashflow(prevMonthStr),
    enabled: view === 'Total' })
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
    queryFn: financeApi.categories })

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
      tags: e.tags, split_group_id: e.split_group_id }))
    const inc = (incomeList ?? []).map(i => ({
      id: i.id, type: 'income' as const, amount: Number(i.amount), category: i.source, description: i.description, logged_at: i.logged_at, account_id: i.account_id,
      tags: i.tags }))
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
    if (view === 'Total') return `${month.format('MMM YYYY')} vs ${month.subtract(1, 'month').format('MMM YYYY')}`
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
          {/* Search */}
          <Input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search…"
            startAdornment={<Search size={13} />}
            size="sm"
            style={{ width: 160 }}
          />
          {/* Filters */}
          <ToolbarIconBtn
            onClick={() => setFilterOpen(true)}
            data-active={filtersActive}
            aria-pressed={filtersActive}
          >
            <Search size={13} />
            Filters
            {filtersActive && (
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--primary)', display: 'inline-block' }} />
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
      <Select
        size="sm"
        value={view}
        onChange={v => setView(v as any)}
        style={{ minWidth: 120 }}
        options={[
          { label: 'Daily', value: 'Daily' },
          { label: 'Weekly', value: 'Weekly' },
          { label: 'Monthly', value: 'Monthly' },
          { label: 'Calendar', value: 'Calendar' },
          { label: 'Compare', value: 'Total' },
        ]}
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
      <ToolbarDivider />
      {/* Import */}
      <ToolbarIconBtn onClick={() => setImportOpen(true)}>
        <UploadIcon size={13} />
        Import
      </ToolbarIconBtn>
    </AreaToolbar>
  )

  if (isLoading) return (
    <CardContent>
      <StyledSkeleton $height="2.5rem" $margin="0 0 12px 0" />
      <StyledSkeleton $height="16rem" />
    </CardContent>
  )

  // ── Search results (server-side, all months/types) ─────────────────────────
  let body: React.ReactNode = null
  if (searchActive) {
    const items: Txn[] = (searchResult?.items ?? []).map(i => ({
      id: i.id, type: i.kind, amount: i.amount, category: i.category ?? '—',
      description: i.description, logged_at: i.logged_at, account_id: i.account_id ?? undefined,
      tags: i.tags, split_group_id: i.split_group_id }))
    const totals = dayTotals(items)
    body = loadingSearch ? (
      <StyledSkeleton $height="16rem" />
    ) : (
      <>
        <div style={{ fontSize: '11px', color: 'var(--muted-foreground)', marginBottom: '8px' }}>
          {items.length} result{(searchResult?.total ?? 0) === 1 ? '' : 's'} across all months
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
        <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--muted-foreground)', marginBottom: 12, letterSpacing: '0.01em' }}>
          {dayjs(selectedDate).format('dddd, MMM D YYYY')}
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
        <div style={{ marginTop: 16 }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--muted-foreground)', marginBottom: 8 }}>{dayjs(selectedDate).format('dddd, MMM D')}</div>
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
    body = (
      <>
        <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--muted-foreground)', marginBottom: 12 }}>
          {month.format('MMMM YYYY')}
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
        <span style={{ display: 'inline-flex', alignItems: 'center', fontSize: 10, fontWeight: 500, marginLeft: 6, color: up ? 'var(--accent)' : 'var(--primary)' }}>
          {up ? <ArrowUpRight size={11} /> : <ArrowDownRight size={11} />}{Math.abs(pct).toFixed(0)}%
        </span>
      )
    }

    body = (
      <>
        <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--muted-foreground)', marginBottom: 12 }}>
          {month.format('MMMM YYYY')} vs {month.subtract(1, 'month').format('MMMM YYYY')}
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
          {[
            { label: 'This Month', data: thisMonth, showDelta: true },
            { label: 'Last Month', data: lastMonth, showDelta: false },
          ].map(({ label, data, showDelta }) => (
            <div key={label} style={{ borderRadius: 18, background: 'var(--muted, #eef1f7)', padding: 12 }}>
              <div style={{ fontSize: 10, color: 'var(--muted-foreground)', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 500, marginBottom: 8 }}>{label}</div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 12, marginBottom: 4 }}>
                <span style={{ color: 'var(--muted-foreground)' }}>Income</span>
                <span style={{ fontWeight: 600, color: 'var(--primary)' }}>
                  {formatCurrency(data.income)}
                  {showDelta && <Delta now={data.income} prev={lastMonth.income} />}
                </span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 12, marginBottom: 4 }}>
                <span style={{ color: 'var(--muted-foreground)' }}>Expenses</span>
                <span style={{ fontWeight: 600, color: 'var(--accent)' }}>
                  {formatCurrency(data.expense)}
                  {showDelta && <Delta now={data.expense} prev={lastMonth.expense} />}
                </span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 12, paddingTop: 4, borderTop: '1px solid var(--border, #dde3ef)', marginTop: 4 }}>
                <span style={{ color: 'var(--muted-foreground)' }}>Net</span>
                <span style={{ fontWeight: 600, color: 'var(--foreground)' }}>{formatCurrency(data.income - data.expense)}</span>
              </div>
            </div>
          ))}
        </div>

        <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--muted-foreground)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>Top Categories This Month</div>
        {topCategories.length === 0 ? <EmptyState title="No expenses this month" style={{ padding: '16px 0' }} /> : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {topCategories.map(([cat, amt]) => (
              <div key={cat}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 12, marginBottom: 4 }}>
                  <span style={{ color: 'var(--foreground)' }}>{cat}</span>
                  <span style={{ fontWeight: 500, color: 'var(--foreground)' }}>{formatCurrency(amt)}</span>
                </div>
                <div style={{ height: 6, borderRadius: 999, background: 'var(--muted, #eef1f7)', overflow: 'hidden' }}>
                  <div style={{ height: '100%', borderRadius: 999, background: 'var(--primary)', width: `${(amt / maxCat) * 100}%` }} />
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
      <WorkspaceLayout rail={undefined}>
        {toolbar}
        {body}
      </WorkspaceLayout>
      <TransactionModal open={modalOpen} onClose={closeModal} editing={editing} initialKind={quickKind} />
      <ImportCsvModal open={importOpen} onClose={() => setImportOpen(false)} />
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
    <Dialog 
      open={open}
      onOpenChange={(v) => { if(!v) onClose() }}
      title="Advanced Filters"
    >
      <FiltersGroup>
        <FilterLabel>Type</FilterLabel>
        <TextTabs
          style={{ width: '100%' }}
          options={[{ label: 'All', value: 'all' }, { label: 'Exp', value: 'expense' }, { label: 'Inc', value: 'income' }, { label: 'Trf', value: 'transfer' }]}
          value={filterKind}
          onChange={setFilterKind}
        />
        <FilterLabel>Account</FilterLabel>
        <Select
          size="sm"
          placeholder="Select Account"
          allowClear
          style={{ width: '100%' }}
          value={filterAccount}
          onChange={setFilterAccount}
          options={(accounts ?? []).map((a: any) => ({ label: a.name, value: a.id }))}
        />
        <FilterLabel>Category</FilterLabel>
        <Select
          size="sm"
          placeholder="Select Category"
          allowClear
          style={{ width: '100%' }}
          value={filterCategory}
          onChange={setFilterCategory}
          options={(categories ?? []).map((c: any) => ({ label: c.name, value: c.name }))}
        />
        <FilterLabel>Tag</FilterLabel>
        <Input size="sm" placeholder="Enter tag name" value={filterTag} onChange={e => setFilterTag(e.target.value)} allowClear />
        <FilterLabel>Amount Range</FilterLabel>
        <FilterRow>
          <Input type="number" size="sm" placeholder="Min ₹" min="0" style={{ width: '100%' }} value={filterMin || ''} onChange={e => setFilterMin(e.target.value ? Number(e.target.value) : null)} />
          <Input type="number" size="sm" placeholder="Max ₹" min="0" style={{ width: '100%' }} value={filterMax || ''} onChange={e => setFilterMax(e.target.value ? Number(e.target.value) : null)} />
        </FilterRow>
        <FilterLabel>Date Range</FilterLabel>
        <FilterRow>
          <Input type="date" size="sm" style={{ width: '100%' }} value={filterRange?.[0] ? filterRange[0].format('YYYY-MM-DD') : ''} onChange={e => setFilterRange(e.target.value ? [dayjs(e.target.value), filterRange?.[1] || dayjs(e.target.value)] : null)} />
          <Input type="date" size="sm" style={{ width: '100%' }} value={filterRange?.[1] ? filterRange[1].format('YYYY-MM-DD') : ''} onChange={e => setFilterRange(e.target.value ? [filterRange?.[0] || dayjs(e.target.value), dayjs(e.target.value)] : null)} />
        </FilterRow>
        <FilterActions>
          <Button variant="primary" size="sm" style={{ width: '100%' }} onClick={onClose}>Apply Filters</Button>
          {filtersActive && (
            <Button size="sm" variant="ghost" onClick={() => { clearFilters(); onClose(); }} style={{ fontSize: '11px', width: '100%', color: 'var(--kpi-red)' }}>Clear all</Button>
          )}
        </FilterActions>
      </FiltersGroup>
    </Dialog>
  )
}
