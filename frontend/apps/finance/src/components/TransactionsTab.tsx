import { useDeferredValue, useMemo, useState, useEffect, useRef, useCallback } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import dayjs, { Dayjs } from 'dayjs'
import isoWeek from 'dayjs/plugin/isoWeek'
import {
  SegmentedControl, Button, Dialog, Input, ConfirmDialog, Checkbox,
  DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator,
  Card as GlassCard, AreaToolbar, ToolbarIconBtn, DateNav, DateNavBtn, DateNavLabel,
  SkeletonKpiRow, SkeletonList, SkeletonTable,
} from '@ledgr/ui'
import { toast } from 'sonner'
import {
  ChevronLeft, ChevronRight, ArrowLeftRight,
  Search, Upload as UploadIcon, Plus, Tag as TagIcon, FolderInput, Trash2, ArrowUpDown,
} from 'lucide-react'
import { financeApi } from '@ct/shared/api/areas'
import { TransactionCalendar } from './TransactionCalendar'
import { ImportCsvModal } from './ImportCsvModal'

import { type Txn, type Kind, type SortBy, type SortDir, keyOf } from './transactions/types'
import { dayTotals } from './transactions/utils'
import { SummaryBar } from './transactions/SummaryBar'
import { TxnHeaderRoot, TxnListBody } from './transactions/TransactionRow'
import { BulkCategorizeDialog, BulkTagDialog } from './transactions/BulkDialogs'
import { FilterModal } from './transactions/FilterModal'
import { TransactionModal } from './transactions/TransactionModal'
import {
  TxnLoadingBody, DesktopSearch, MobileSearchBtn, CardActions,
  ListHeaderRoot, ListHeaderLabel, ListHeaderSpacer, BulkBtnRow, SortBtn, PageStack,
} from './transactions/TransactionsTab.styles'

// Re-export public API consumed by AccountManager and other importers
export type { Txn, Kind }
export { TransactionModal }

dayjs.extend(isoWeek)

/*
 * The `navMenu` prop went with the WorkspaceLayout rail on 2026-08-02. No
 * caller ever passed it — the rail rendered empty — and the canvas's
 * `finance:transactions` is a single full-width card.
 */
export function TransactionsTab() {
  const queryClient = useQueryClient()
  /* `?date=YYYY-MM-DD` opens the page on that period instead of the current
   * month. The Inbox links here after approving, because an email transaction
   * files under the date it HAPPENED — landing on today's month would show an
   * empty list and read as if the approval had been lost. */
  const [searchParams] = useSearchParams()
  const dateParam = searchParams.get('date')
  const paramDay = useMemo(() => {
    if (!dateParam) return null
    const d = dayjs(dateParam)
    return d.isValid() ? d : null
  }, [dateParam])

  const [view, setView] = useState<'Daily' | 'Calendar' | 'Weekly' | 'Monthly'>('Monthly')
  const [month, setMonth] = useState(() => (paramDay ?? dayjs()).startOf('month'))
  const [selectedDate, setSelectedDate] = useState(() => (paramDay ?? dayjs()).format('YYYY-MM-DD'))

  // Re-navigating here with a new ?date= does not remount the component.
  useEffect(() => {
    if (!paramDay) return
    setMonth(paramDay.startOf('month'))
    setSelectedDate(paramDay.format('YYYY-MM-DD'))
  }, [paramDay])
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

  const [sortBy, setSortBy] = useState<SortBy>(() => (localStorage.getItem('ct.txn.sortBy') as SortBy) || 'date')
  const [sortDir, setSortDir] = useState<SortDir>(() => (localStorage.getItem('ct.txn.sortDir') as SortDir) || 'desc')
  const [compact, setCompact] = useState<boolean>(() => localStorage.getItem('ct.txn.density') === 'compact')
  const [selected, setSelected] = useState<Record<string, Txn>>({})
  const [editingKey, setEditingKey] = useState<string | null>(null)
  const [activeIndex, setActiveIndex] = useState(-1)
  const visibleRef = useRef<Txn[]>([])
  const lastToggledIndex = useRef<number>(-1)
  const [categorizeTargets, setCategorizeTargets] = useState<Txn[] | null>(null)
  const [tagTargets, setTagTargets] = useState<Txn[] | null>(null)
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false)

  useEffect(() => { localStorage.setItem('ct.txn.sortBy', sortBy) }, [sortBy])
  useEffect(() => { localStorage.setItem('ct.txn.sortDir', sortDir) }, [sortDir])
  useEffect(() => { localStorage.setItem('ct.txn.density', compact ? 'compact' : 'comfortable') }, [compact])

  useEffect(() => {
    const handleOpen = () => { setEditing(null); setModalOpen(true) }
    window.addEventListener('open-new-transaction', handleOpen)
    return () => window.removeEventListener('open-new-transaction', handleOpen)
  }, [])

  const openAdd = (k: Kind) => { setQuickKind(k); setEditing(null); setModalOpen(true) }

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

  const openEdit = (t: Txn) => { setEditing(t); setModalOpen(true) }
  const closeModal = () => { setModalOpen(false); setEditing(null) }

  const goToDate = (d: string) => {
    setSelectedDate(d)
    if (!dayjs(d).isSame(month, 'month')) setMonth(dayjs(d).startOf('month'))
  }

  const clearFilters = () => {
    setFilterKind('all'); setFilterAccount(undefined); setFilterCategory(undefined)
    setFilterMin(null); setFilterMax(null); setFilterRange(null); setFilterTag('')
  }

  // ── Selection ──────────────────────────────────────────────────────────────
  const clearSelection = useCallback(() => { setSelected({}); lastToggledIndex.current = -1 }, [])
  const selectedList = useMemo(() => Object.values(selected), [selected])

  useEffect(() => { clearSelection(); setActiveIndex(-1); setEditingKey(null) }, [view, monthStr, selectedDate, searchActive, clearSelection])

  const registerVisible = useCallback((flat: Txn[]) => { visibleRef.current = flat }, [])

  const toggleSelect = useCallback((t: Txn, index: number, shift: boolean) => {
    setSelected(prev => {
      const next = { ...prev }
      const flat = visibleRef.current
      if (shift && lastToggledIndex.current >= 0 && flat.length) {
        const [a, b] = [lastToggledIndex.current, index].sort((x, y) => x - y)
        const turnOn = !prev[keyOf(t)]
        for (let i = a; i <= b; i++) {
          const rt = flat[i]
          if (!rt) continue
          if (turnOn) next[keyOf(rt)] = rt
          else delete next[keyOf(rt)]
        }
      } else {
        const k = keyOf(t)
        if (next[k]) delete next[k]; else next[k] = t
      }
      return next
    })
    lastToggledIndex.current = index
  }, [])

  const visibleAllSelected = () => {
    const flat = visibleRef.current
    return flat.length > 0 && flat.every(t => selected[keyOf(t)])
  }
  const visibleSomeSelected = () => {
    const flat = visibleRef.current
    return flat.some(t => selected[keyOf(t)]) && !visibleAllSelected()
  }
  const toggleSelectAll = () => {
    const flat = visibleRef.current
    if (visibleAllSelected()) { clearSelection(); return }
    setSelected(prev => {
      const next = { ...prev }
      flat.forEach(t => { next[keyOf(t)] = t })
      return next
    })
  }

  // ── Keyboard navigation ─────────────────────────────────────────────────────
  const onListKeyDown = (e: React.KeyboardEvent) => {
    if (editingKey) return
    const flat = visibleRef.current
    if (!flat.length) return
    const tag = (e.target as HTMLElement)?.tagName
    const typing = tag === 'INPUT' || tag === 'TEXTAREA' || (e.target as HTMLElement)?.isContentEditable
    if (typing) return
    if (e.key === 'ArrowDown' || e.key === 'j') {
      e.preventDefault(); setActiveIndex(i => Math.min(flat.length - 1, i + 1))
    } else if (e.key === 'ArrowUp' || e.key === 'k') {
      e.preventDefault(); setActiveIndex(i => Math.max(0, (i < 0 ? 0 : i - 1)))
    } else if (e.key === 'x' || e.key === ' ') {
      if (activeIndex >= 0 && flat[activeIndex]) { e.preventDefault(); toggleSelect(flat[activeIndex], activeIndex, false) }
    } else if (e.key === 'e' || e.key === 'Enter') {
      if (activeIndex >= 0 && flat[activeIndex]) {
        const t = flat[activeIndex]
        e.preventDefault()
        if (t.type !== 'transfer') setEditingKey(keyOf(t))
      }
    } else if (e.key === 'Escape') {
      if (selectedList.length) { e.preventDefault(); clearSelection() }
      else setActiveIndex(-1)
    }
  }

  const bulkDelete = useMutation({
    mutationFn: async () => {
      const results = await Promise.allSettled(selectedList.map(t =>
        t.type === 'expense' ? financeApi.deleteExpense(t.id)
          : t.type === 'income' ? financeApi.deleteIncome(t.id)
            : financeApi.deleteTransfer(t.id)))
      return results.filter(r => r.status === 'rejected').length
    },
    onSuccess: (failed: number) => {
      queryClient.invalidateQueries({ queryKey: ['finance'] })
      const n = selectedList.length
      if (failed > 0) toast.warning(`Deleted ${n - failed}, ${failed} failed`)
      else toast.success(`Deleted ${n} transaction${n === 1 ? '' : 's'}`)
      clearSelection(); setBulkDeleteOpen(false)
    },
    onError: () => toast.error('Bulk delete failed'),
  })

  const selNonTransfer = selectedList.filter(t => t.type !== 'transfer')
  const selKinds = new Set(selNonTransfer.map(t => t.type))
  const canCategorize = selNonTransfer.length > 0 && selKinds.size === 1
  const canTag = selNonTransfer.length > 0

  const dateLabel = useMemo(() => {
    if (view === 'Daily') return dayjs(selectedDate).format('MMM D, YYYY')
    if (view === 'Weekly') {
      const start = dayjs(selectedDate).startOf('isoWeek')
      return `${start.format('MMM D')} – ${start.add(6, 'day').format('MMM D')}`
    }
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

  /*
   * The canvas puts only Filter + Add in the card header, so that is what goes
   * there. The period switcher, date navigator, search and Import are controls
   * the canvas never drew but the page genuinely has; they sit in a row INSIDE
   * the card, above the list, rather than being deleted to match a mock.
   */
  const cardActions = (
    <CardActions>
      <ToolbarIconBtn
        onClick={() => setFilterOpen(true)}
        data-active={filtersActive}
        aria-pressed={filtersActive}
      >
        Filter
        {filtersActive && (
          <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--primary)', display: 'inline-block', marginLeft: 4 }} />
        )}
      </ToolbarIconBtn>
      <Button size="sm" variant="primary" onClick={() => openAdd('Expense')}>
        <Plus size={12} style={{ marginRight: 4 }} /> Add transaction
      </Button>
    </CardActions>
  )

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
          {searchActive && (
            <ToolbarIconBtn onClick={clearFilters}>
              Clear
            </ToolbarIconBtn>
          )}
        </>
      }
    >
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
    </AreaToolbar>
  )

  /* Two bare grey bars matched nothing on this page, so the real content
   * visibly jumped in over them. This traces what actually arrives: the
   * three-KPI row, then the 5-column DATE/MERCHANT/CATEGORY/ACCOUNT/AMOUNT
   * table — same column count and the same PageStack gap. */
  if (isLoading) return (
    <PageStack>
      <SkeletonKpiRow count={3} />
      <SkeletonTable rows={8} columns={5} />
    </PageStack>
  )

  // ── Build body per view ─────────────────────────────────────────────────────
  let bodyTxns: Txn[] = []
  let grouping: 'day' | 'week' | 'none' = 'none'
  let emptyText = 'No transactions'
  let summaryElement: React.ReactNode = null
  let leadNote: React.ReactNode = null

  if (searchActive) {
    const items: Txn[] = (searchResult?.items ?? []).map(i => ({
      id: i.id, type: i.kind, amount: i.amount, category: i.category ?? '—',
      description: i.description, logged_at: i.logged_at, account_id: i.account_id ?? undefined,
      category_id: (i as any).category_id, tags: i.tags, split_group_id: i.split_group_id }))
    const totals = dayTotals(items)
    summaryElement = <SummaryBar income={totals.income} expense={totals.expense} />
    bodyTxns = items
    grouping = sortBy === 'amount' ? 'none' : 'day'
    emptyText = 'No matching transactions'
    leadNote = loadingSearch ? null : (
      <div style={{ fontSize: 11, color: 'var(--muted-foreground)', margin: '0 0 4px 4px' }}>
        {items.length} result{items.length === 1 ? '' : 's'} across all months{searchResult?.has_more ? ' — showing first 200' : ''}
      </div>
    )
  } else if (view === 'Daily') {
    const dayTxns = transactions.filter(t => dayjs(t.logged_at).format('YYYY-MM-DD') === selectedDate)
    const totals = dayTotals(dayTxns)
    summaryElement = <SummaryBar income={totals.income} expense={totals.expense} />
    bodyTxns = dayTxns
    grouping = 'none'
    emptyText = 'No transactions on this day'
    leadNote = (
      <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--muted-foreground)', margin: '0 0 4px 4px' }}>
        {dayjs(selectedDate).format('dddd, MMM D YYYY')}
      </div>
    )
  } else if (view === 'Calendar') {
    const dayTxns = transactions.filter(t => dayjs(t.logged_at).format('YYYY-MM-DD') === selectedDate)
    const monthTotals = dayTotals(transactions)
    summaryElement = <SummaryBar income={monthTotals.income} expense={monthTotals.expense} />
    bodyTxns = dayTxns
    grouping = 'none'
    emptyText = 'No transactions on this day'
  } else if (view === 'Weekly') {
    const monthTotals = dayTotals(transactions)
    summaryElement = <SummaryBar income={monthTotals.income} expense={monthTotals.expense} />
    bodyTxns = transactions
    grouping = sortBy === 'amount' ? 'none' : 'week'
    emptyText = 'No transactions this month'
    leadNote = <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--muted-foreground)', margin: '0 0 4px 4px' }}>{month.format('MMMM YYYY')}</div>
  } else {
    const totals = dayTotals(transactions)
    summaryElement = <SummaryBar income={totals.income} expense={totals.expense} />
    bodyTxns = transactions
    grouping = sortBy === 'amount' ? 'none' : 'day'
    emptyText = 'No transactions this month'
  }

  const showLoadingBody = searchActive && loadingSearch
  const anySelected = selectedList.length > 0

  const sortLabel = sortBy === 'date'
    ? (sortDir === 'desc' ? 'Newest' : 'Oldest')
    : (sortDir === 'desc' ? 'Highest' : 'Lowest')

  const listHeader = (
    <ListHeaderRoot $selecting={anySelected}>
      <Checkbox
        size="sm"
        checked={visibleAllSelected()}
        indeterminate={visibleSomeSelected()}
        onChange={toggleSelectAll}
        aria-label="Select all visible transactions"
      />
      {anySelected ? (
        <>
          <ListHeaderLabel>{selectedList.length} selected</ListHeaderLabel>
          <ListHeaderSpacer />
          <BulkBtnRow>
            <Button size="sm" variant="outline" disabled={!canCategorize} onClick={() => setCategorizeTargets(selectedList)} title={canCategorize ? '' : 'Select only expenses or only income'}>
              <FolderInput size={13} style={{ marginRight: 5 }} /> Categorize
            </Button>
            <Button size="sm" variant="outline" disabled={!canTag} onClick={() => setTagTargets(selectedList)}>
              <TagIcon size={13} style={{ marginRight: 5 }} /> Tag
            </Button>
            <Button size="sm" variant="destructive" onClick={() => setBulkDeleteOpen(true)}>
              <Trash2 size={13} style={{ marginRight: 5 }} /> Delete
            </Button>
            <Button size="sm" variant="ghost" onClick={clearSelection}>Clear</Button>
          </BulkBtnRow>
        </>
      ) : (
        <>
          <ListHeaderLabel>{bodyTxns.length} transaction{bodyTxns.length === 1 ? '' : 's'}</ListHeaderLabel>
          <ListHeaderSpacer />
          <BulkBtnRow>
            <DropdownMenu>
              <DropdownMenuTrigger>
                <SortBtn aria-label="Sort transactions"><ArrowUpDown size={13} /> {sortLabel}</SortBtn>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onSelect={() => { setSortBy('date'); setSortDir('desc') }}>Newest first</DropdownMenuItem>
                <DropdownMenuItem onSelect={() => { setSortBy('date'); setSortDir('asc') }}>Oldest first</DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onSelect={() => { setSortBy('amount'); setSortDir('desc') }}>Highest amount</DropdownMenuItem>
                <DropdownMenuItem onSelect={() => { setSortBy('amount'); setSortDir('asc') }}>Lowest amount</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <SortBtn onClick={() => setCompact(c => !c)} aria-pressed={compact} title="Toggle density">
              {compact ? 'Compact' : 'Cozy'}
            </SortBtn>
          </BulkBtnRow>
        </>
      )}
    </ListHeaderRoot>
  )

  return (
    <>
      <PageStack>
        {/* Tiles lead the page, outside the card — the summary of what the
            card below is showing, not a band wedged into its toolbar. */}
        {summaryElement}
        <GlassCard
          title="All Transactions"
          subtitle="Every income, expense and transfer"
          icon={<ArrowLeftRight size={16} />}
          action={cardActions}
        >
          {toolbar}
          {view === 'Calendar' && (
            <div style={{ marginBottom: 12 }}>
              <TransactionCalendar
                month={month}
                byDay={cashflow?.by_day ?? []}
                selectedDate={selectedDate}
                onSelectDate={goToDate}
                onMonthChange={delta => setMonth(m => m.add(delta, 'month'))}
              />
              <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--muted-foreground)', margin: '16px 0 0 4px' }}>{dayjs(selectedDate).format('dddd, MMM D')}</div>
            </div>
          )}
          {leadNote}
          <div onKeyDown={onListKeyDown}>
            {listHeader}
            {!showLoadingBody && bodyTxns.length > 0 && (
              <TxnHeaderRoot aria-hidden>
                <span />
                <span>Date</span>
                <span>Merchant</span>
                <span>Category</span>
                <span>Account</span>
                <span style={{ textAlign: 'right' }}>Amount</span>
              </TxnHeaderRoot>
            )}
            {showLoadingBody ? (
              <TxnLoadingBody><SkeletonList rows={6} /></TxnLoadingBody>
            ) : (
              <TxnListBody
                txns={bodyTxns}
                emptyText={emptyText}
                grouping={grouping}
                sortBy={sortBy}
                sortDir={sortDir}
                compact={compact}
                selected={selected}
                editingKey={editingKey}
                activeIndex={activeIndex}
                setActiveIndex={setActiveIndex}
                onToggleSelect={toggleSelect}
                onOpenModal={openEdit}
                onStartEdit={(t: Txn) => setEditingKey(keyOf(t))}
                onCancelEdit={() => setEditingKey(null)}
                onRecategorize={(t: Txn) => setCategorizeTargets([t])}
                onAddTag={(t: Txn) => setTagTargets([t])}
                onKeyNav={registerVisible}
              />
            )}
          </div>
        </GlassCard>
      </PageStack>

      <TransactionModal open={modalOpen} onClose={closeModal} editing={editing} initialKind={quickKind} />
      <ImportCsvModal open={importOpen} onClose={() => setImportOpen(false)} />

      <BulkCategorizeDialog
        open={!!categorizeTargets}
        onClose={() => setCategorizeTargets(null)}
        targets={categorizeTargets ?? []}
        onDone={clearSelection}
      />
      <BulkTagDialog
        open={!!tagTargets}
        onClose={() => setTagTargets(null)}
        targets={tagTargets ?? []}
        onDone={clearSelection}
      />
      <ConfirmDialog
        open={bulkDeleteOpen}
        onOpenChange={setBulkDeleteOpen}
        title={`Delete ${selectedList.length} transaction${selectedList.length === 1 ? '' : 's'}?`}
        description="This permanently removes the selected transactions and reverses their effect on account balances."
        confirmLabel="Delete all"
        destructive
        onConfirm={() => bulkDelete.mutate()}
      />

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

