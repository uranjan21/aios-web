import React, { useEffect, useMemo, useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Popconfirm } from '@ct/shared/components/ui/Popconfirm'
import { Button, EmptyState, Select, Card, Input, Sheet } from '@ledgr/ui'
import { Trash2, Wallet, PencilLine, ArrowLeftRight, TrendingUp, TrendingDown, Landmark, CreditCard } from 'lucide-react'
import { toast } from 'sonner'
import styled from 'styled-components'
import dayjs from 'dayjs'
import { financeApi } from '@ct/shared/api/areas'
import { ModuleGrid, type ModuleSpec } from '@ct/shared/components/modules'
import { formatCurrency } from '@ct/shared/lib/utils'
import { Skeleton } from '@ct/shared/components/ui/skeleton'
import { TransactionModal, type Txn, type Kind } from './TransactionsTab'
import type { LedgerEntry } from '@ct/shared/types'

const AccountsRoot = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.spacing[5]};
`

const AccountsToolbar = styled.div`
  display: flex;
  justify-content: flex-end;
`

// ── Constants ────────────────────────────────────────────────────────────────

const ACCOUNT_TYPE_OPTIONS = [
  { value: 'checking', label: 'Checking' },
  { value: 'savings', label: 'Savings' },
  { value: 'credit_card', label: 'Credit card' },
  { value: 'investment', label: 'Investment' },
  { value: 'loan', label: 'Loan' },
]

const CURRENCY_OPTIONS = [
  { value: 'INR', label: 'INR — Indian Rupee' },
  { value: 'USD', label: 'USD — US Dollar' },
  { value: 'EUR', label: 'EUR — Euro' },
  { value: 'GBP', label: 'GBP — British Pound' },
  { value: 'AED', label: 'AED — UAE Dirham' },
  { value: 'SGD', label: 'SGD — Singapore Dollar' },
]

type EditState = { name: string; type: string; balance: string; currency: string }
const EMPTY_EDIT: EditState = { name: '', type: 'checking', balance: '0', currency: 'INR' }

// ── Styled ───────────────────────────────────────────────────────────────────

const Section = styled.div`
  padding: ${({ theme }) => `${theme.spacing[4]} ${theme.spacing[5]}`};
  border-bottom: 1px solid ${({ theme }) => theme.color.border};
`

const SectionLabel = styled.div`
  font-size: ${({ theme }) => theme.typography.fontSize.xs};
  font-weight: 600;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: ${({ theme }) => theme.color.mutedForeground};
  margin-bottom: ${({ theme }) => `${theme.spacing[3]}`};
`

const FormGrid = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: ${({ theme }) => `${theme.spacing[3]}`};
  @media ${({ theme }) => theme.media.belowXs} { grid-template-columns: 1fr; }
`

const FieldLabel = styled.label`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => `${theme.spacing[1]}`};
  font-size: ${({ theme }) => theme.typography.fontSize.sm};
  font-weight: 500;
  color: ${({ theme }) => theme.color.foreground};
`

const FullWidth = styled.div`
  grid-column: 1 / -1;
`

const SaveRow = styled.div`
  display: flex;
  justify-content: flex-end;
  gap: ${({ theme }) => `${theme.spacing[2]}`};
  padding-top: ${({ theme }) => `${theme.spacing[1]}`};
`

// Transaction list section
const TxnSection = styled.div`
  flex: 1;
  display: flex;
  flex-direction: column;
`

const TxnSectionHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: ${({ theme }) => `${theme.spacing[3.5]} ${theme.spacing[5]} ${theme.spacing[2.5]}`};
  font-size: ${({ theme }) => theme.typography.fontSize.xs};
  font-weight: 600;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: ${({ theme }) => theme.color.mutedForeground};
  border-bottom: 1px solid ${({ theme }) => theme.color.border};
  flex-shrink: 0;
`

const TxnList = styled.div`
  flex: 1;
  overflow-y: auto;
`

const TxnCard = styled.div`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => `${theme.spacing[2.5]}`};
  padding: ${({ theme }) => `${theme.spacing[2.5]} ${theme.spacing[5]}`};
  border-bottom: 1px solid ${({ theme }) => theme.color.border}55;
  &:last-child { border-bottom: 0; }
  &:hover { background: ${({ theme }) => theme.color.muted}44; }
`

const TxnIcon = styled.div<{ $kind: string }>`
  width: 32px;
  height: 32px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  background: ${({ $kind, theme }) =>
    $kind === 'income' ? `${theme.color.success}18` :
    $kind === 'transfer' ? `${theme.color.primary}12` :
    `${theme.color.destructive}12`};
  color: ${({ $kind, theme }) =>
    $kind === 'income' ? theme.color.success :
    $kind === 'transfer' ? theme.color.primary :
    theme.color.destructive};
`

const TxnInfo = styled.div`
  flex: 1;
  min-width: 0;
`

const TxnLabel = styled.div`
  font-size: ${({ theme }) => theme.typography.fontSize.sm};
  font-weight: 500;
  color: ${({ theme }) => theme.color.foreground};
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`

const TxnMeta = styled.div`
  font-size: ${({ theme }) => theme.typography.fontSize.xs};
  color: ${({ theme }) => theme.color.mutedForeground};
  margin-top: 1px;
  display: flex;
  align-items: center;
  gap: ${({ theme }) => `${theme.spacing[1.5]}`};
`

const TxnAmount = styled.div<{ $positive: boolean }>`
  font-size: ${({ theme }) => theme.typography.fontSize.sm};
  font-weight: 600;
  flex-shrink: 0;
  font-variant-numeric: tabular-nums;
  color: ${({ $positive, theme }) => ($positive ? theme.color.success : theme.color.destructive)};
`

const TxnActions = styled.div`
  display: flex;
  gap: ${({ theme }) => `${theme.spacing[1]}`};
  flex-shrink: 0;
  opacity: 0;
  transition: opacity 120ms;

  ${TxnCard}:hover & { opacity: 1; }
`

const IconBtn = styled.button`
  width: 28px;
  height: 28px;
  border-radius: ${({ theme }) => theme.radii.md};
  border: 1px solid ${({ theme }) => theme.color.border};
  background: ${({ theme }) => theme.color.card};
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  color: ${({ theme }) => theme.color.mutedForeground};
  &:hover { background: ${({ theme }) => theme.color.muted}; color: ${({ theme }) => theme.color.foreground}; }
`

const DestructiveIconBtn = styled(IconBtn)`
  &:hover { background: ${({ theme }) => theme.color.destructive}15; color: ${({ theme }) => theme.color.destructive}; border-color: ${({ theme }) => theme.color.destructive}40; }
`

// ── Helpers ──────────────────────────────────────────────────────────────────

function kindIcon(kind: string) {
  if (kind === 'income') return <TrendingUp size={14} />
  if (kind === 'transfer') return <ArrowLeftRight size={14} />
  return <TrendingDown size={14} />
}

function ledgerEntryToTxn(e: LedgerEntry): Txn {
  return {
    id: e.id,
    type: e.kind as 'income' | 'expense' | 'transfer',
    amount: Math.abs(e.amount),
    category: e.category ?? e.label,
    description: e.description ?? null,
    logged_at: e.logged_at,
    account_id: e.account_id ?? null,
    category_id: e.category_id ?? null,
    tags: null,
  }
}

// ── AccountSidePanel ─────────────────────────────────────────────────────────

interface AccountSidePanelProps {
  account: any | null
  onClose: () => void
}

function AccountSidePanel({ account, onClose }: AccountSidePanelProps) {
  const queryClient = useQueryClient()
  const [form, setForm] = useState<EditState>(EMPTY_EDIT)
  const [editingTxn, setEditingTxn] = useState<Txn | null>(null)
  const [txnModalOpen, setTxnModalOpen] = useState(false)

  // Hydrate form when account changes
  useEffect(() => {
    if (account) {
      setForm({
        name: account.name ?? '',
        type: account.type ?? 'checking',
        balance: String(account.balance ?? 0),
        currency: account.currency ?? 'INR',
      })
    }
  }, [account])

  const { data: ledger, isLoading: ledgerLoading } = useQuery({
    queryKey: ['finance', 'accounts', account?.id, 'ledger'],
    queryFn: () => financeApi.accountLedger(account!.id, 100),
    enabled: !!account,
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: { name: string; type: string; balance: number; currency: string } }) =>
      financeApi.updateAccount(id, patch),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['finance', 'accounts'] })
      queryClient.invalidateQueries({ queryKey: ['finance', 'net-worth'] })
      toast.success('Account updated')
    },
    onError: (e: any) => toast.error(e?.response?.data?.detail || 'Failed to update account'),
  })

  const deleteTxnMutation = useMutation({
    mutationFn: ({ id, kind }: { id: string; kind: string }) => {
      if (kind === 'expense') return financeApi.deleteExpense(id)
      if (kind === 'income') return financeApi.deleteIncome(id)
      return financeApi.deleteTransfer(id)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['finance'] })
      toast.success('Transaction deleted')
    },
    onError: (e: any) => toast.error(e?.response?.data?.detail || 'Failed to delete transaction'),
  })

  const handleSave = () => {
    if (!account) return
    const name = form.name.trim()
    if (!name) { toast.error('Name is required'); return }
    const bal = parseFloat(form.balance)
    if (Number.isNaN(bal)) { toast.error('Balance must be a number'); return }
    updateMutation.mutate({
      id: account.id,
      patch: { name, type: form.type, balance: bal, currency: form.currency.trim().toUpperCase() },
    })
  }

  const openEditTxn = (entry: LedgerEntry) => {
    if (entry.kind === 'transfer') return // transfers are not editable via this modal
    setEditingTxn(ledgerEntryToTxn(entry))
    setTxnModalOpen(true)
  }

  const entries: LedgerEntry[] = ledger?.entries ?? []

  return (
    <>
      <Sheet
        open={!!account}
        onOpenChange={v => { if (!v) onClose() }}
        side="right"
        size="420px"
        title={account?.name ?? 'Account'}
        description={account ? `${account.currency} ${Number(account.balance).toFixed(2)}` : undefined}
      >
          {/* ── Edit form ── */}
          <Section>
            <SectionLabel>Account details</SectionLabel>
            <FormGrid>
              <FullWidth>
                <FieldLabel htmlFor="sp-account-name">
                  Account name
                  <Input
                    id="sp-account-name"
                    value={form.name}
                    onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                    placeholder="e.g. HDFC Savings"
                  />
                </FieldLabel>
              </FullWidth>
              <FieldLabel htmlFor="sp-account-type">
                Type
                <Select
                  id="sp-account-type"
                  fullWidth
                  size="md"
                  value={form.type}
                  onChange={v => setForm(f => ({ ...f, type: String(v) }))}
                  options={ACCOUNT_TYPE_OPTIONS}
                  aria-label="Account type"
                />
              </FieldLabel>
              <FieldLabel htmlFor="sp-account-currency">
                Currency
                <Select
                  id="sp-account-currency"
                  fullWidth
                  size="md"
                  value={form.currency}
                  onChange={v => setForm(f => ({ ...f, currency: String(v) }))}
                  options={CURRENCY_OPTIONS}
                  aria-label="Currency"
                />
              </FieldLabel>
              <FullWidth>
                <FieldLabel htmlFor="sp-account-balance">
                  Balance
                  <Input
                    id="sp-account-balance"
                    type="number"
                    step="0.01"
                    value={form.balance}
                    onChange={e => setForm(f => ({ ...f, balance: e.target.value }))}
                    startAdornment={form.currency || '₹'}
                  />
                </FieldLabel>
              </FullWidth>
            </FormGrid>
            <SaveRow>
              <Button
                variant="primary"
                size="sm"
                onClick={handleSave}
                loading={updateMutation.isPending}
              >
                Save changes
              </Button>
            </SaveRow>
          </Section>

          {/* ── Transactions ── */}
          <TxnSection>
            <TxnSectionHeader>
              <span>Transactions</span>
              <span style={{ fontWeight: 400, letterSpacing: 0 }}>{entries.length} entries</span>
            </TxnSectionHeader>

            <TxnList>
              {ledgerLoading ? (
                <div style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {[1, 2, 3, 4].map(i => (
                    <div key={i} style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                      <Skeleton style={{ width: 32, height: 32, borderRadius: '50%', flexShrink: 0 }} />
                      <div style={{ flex: 1 }}>
                        <Skeleton style={{ height: 13, width: '55%', marginBottom: 4 }} />
                        <Skeleton style={{ height: 11, width: '35%' }} />
                      </div>
                      <Skeleton style={{ height: 13, width: 60 }} />
                    </div>
                  ))}
                </div>
              ) : entries.length === 0 ? (
                <div style={{ padding: '32px 20px' }}>
                  <EmptyState
                    title="No transactions"
                    description="Transactions linked to this account will appear here"
                  />
                </div>
              ) : (
                entries.map(e => (
                  <TxnCard key={`${e.kind}-${e.id}`}>
                    <TxnIcon $kind={e.kind}>{kindIcon(e.kind)}</TxnIcon>
                    <TxnInfo>
                      <TxnLabel>{e.label}</TxnLabel>
                      <TxnMeta>
                        <span style={{ textTransform: 'capitalize' }}>{e.kind}</span>
                        <span>·</span>
                        <span>{dayjs(e.logged_at).format('MMM D, h:mm A')}</span>
                      </TxnMeta>
                    </TxnInfo>
                    <TxnAmount $positive={e.amount >= 0}>
                      {e.amount >= 0 ? '+' : ''}{formatCurrency(Math.abs(e.amount))}
                    </TxnAmount>
                    <TxnActions>
                      {e.kind !== 'transfer' && (
                        <IconBtn
                          type="button"
                          aria-label="Edit transaction"
                          onClick={() => openEditTxn(e)}
                        >
                          <PencilLine size={13} />
                        </IconBtn>
                      )}
                      <Popconfirm
                        title={`Delete this ${e.kind}?`}
                        onConfirm={() => deleteTxnMutation.mutate({ id: e.id, kind: e.kind })}
                      >
                        <DestructiveIconBtn
                          type="button"
                          aria-label="Delete transaction"
                          onClick={e => e.stopPropagation()}
                        >
                          <Trash2 size={13} />
                        </DestructiveIconBtn>
                      </Popconfirm>
                    </TxnActions>
                  </TxnCard>
                ))
              )}
            </TxnList>
          </TxnSection>
      </Sheet>

      {/* Reuse the full TransactionModal for editing individual transactions */}
      <TransactionModal
        open={txnModalOpen}
        onClose={() => { setTxnModalOpen(false); setEditingTxn(null) }}
        editing={editingTxn}
        initialKind={(editingTxn?.type === 'income' ? 'Income' : editingTxn?.type === 'transfer' ? 'Transfer' : 'Expense') as Kind}
      />
    </>
  )
}

// ── AccountManager ────────────────────────────────────────────────────────────

/**
 * Finance → Accounts.
 *
 * Phase 4 conversion to the canvas's `finance:accounts` composition —
 * tiles(12) · table(7) · progress(5) — rebuilt from the live accounts API.
 * Clicking a table row opens the same side panel the old table did, so the
 * ledger view and edit/delete are unchanged.
 *
 * TWO DEPARTURES, both because the Account model has no institution link:
 *  - The canvas's table is "Connections", with Last sync and Status columns.
 *    Nothing syncs accounts from an institution — balances are entered and
 *    then adjusted by the ledger — so those columns become Balance and the
 *    account's share of total assets.
 *  - Its progress module is credit utilization per card, which needs a
 *    `credit_limit` the model does not carry. Until it does, the module shows
 *    where the money actually sits: each account's share of the total.
 *
 * BACKEND FOLLOW-UP: add `credit_limit` (and, if institution sync ever lands,
 * `last_synced_at` + `sync_status`) to `Account` and this page can render the
 * canvas exactly.
 */
export const AccountManager: React.FC<{ onAdd?: () => void }> = ({ onAdd }) => {
  const [panelAccount, setPanelAccount] = useState<any | null>(null)
  const [typeFilter, setTypeFilter] = useState<string>('all')

  const { data: accounts = [], isLoading } = useQuery({
    queryKey: ['finance', 'accounts'],
    queryFn: financeApi.accounts,
  })

  const accountTypes = Array.from(new Set(accounts.map((a: any) => a.type))) as string[]
  const visibleAccounts = typeFilter === 'all'
    ? accounts
    : accounts.filter((a: any) => a.type === typeFilter)

  const modules = useMemo<ModuleSpec[]>(() => {
    if (!accounts.length) return []

    const isDebt = (a: any) => a.type === 'credit_card' || a.type === 'loan'
    const assets = accounts.filter((a: any) => !isDebt(a)).reduce((s: number, a: any) => s + Number(a.balance), 0)
    const debt = accounts.filter(isDebt).reduce((s: number, a: any) => s + Math.abs(Number(a.balance)), 0)
    const biggest = accounts.reduce((a: any, b: any) => (Number(a.balance) >= Number(b.balance) ? a : b))

    return [
      {
        kind: 'tiles',
        span: 12,
        tiles: [
          { label: 'Cash and assets', value: formatCurrency(assets), sub: `Across ${accounts.filter((a: any) => !isDebt(a)).length} account(s)`, dotKey: 'success' },
          { label: 'Owed on cards and loans', value: formatCurrency(debt), sub: debt > 0 ? 'Settle before interest accrues' : 'Nothing outstanding', subKey: debt > 0 ? 'warning' : 'success', dotKey: debt > 0 ? 'warning' : 'success' },
          { label: 'Net position', value: formatCurrency(assets - debt), sub: 'Assets minus what you owe', subKey: assets - debt >= 0 ? 'success' : 'destructive' },
          { label: 'Largest balance', value: biggest.name, sub: formatCurrency(biggest.balance) },
        ],
      },
      {
        kind: 'table',
        span: 7,
        title: 'Accounts',
        subtitle: `${visibleAccounts.length} account${visibleAccounts.length === 1 ? '' : 's'} · click a row for its ledger`,
        icon: Landmark,
        ...(onAdd && { action: 'Add account', onAction: onAdd }),
        gridCols: '1.8fr 1.1fr 1fr',
        cols: [{ l: 'Account' }, { l: 'Type' }, { l: 'Balance', a: 'right' }],
        rows: visibleAccounts.map((a: any) => [
          { t: a.name, bold: true },
          { t: a.type.replace('_', ' '), tag: true, colorKey: isDebt(a) ? 'warning' : 'info' },
          { t: `${a.currency} ${Number(a.balance).toLocaleString('en-IN')}`, colorKey: isDebt(a) ? 'destructive' : undefined },
        ]),
        onRowClick: (i: number) => setPanelAccount(visibleAccounts[i]),
      },
      {
        kind: 'progress',
        span: 5,
        title: 'Where the money sits',
        subtitle: 'Share of total assets per account',
        icon: CreditCard,
        rows: accounts
          .filter((a: any) => !isDebt(a) && Number(a.balance) > 0)
          .sort((a: any, b: any) => Number(b.balance) - Number(a.balance))
          .map((a: any) => {
            const share = assets > 0 ? Math.round((Number(a.balance) / assets) * 100) : 0
            return {
              title: a.name,
              meta: `${formatCurrency(a.balance)} of ${formatCurrency(assets)}`,
              pct: share,
              value: `${share}%`,
              // A single account holding most of the cash is worth flagging.
              colorKey: share > 70 ? 'warning' : 'accent',
            }
          }),
      },
    ]
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accounts, visibleAccounts, onAdd])

  if (isLoading) return <Skeleton style={{ height: 320 }} />

  return (
    <AccountsRoot>
      {accounts.length > 0 && (
        <AccountsToolbar>
          <Select
            size="sm"
            fullWidth={false}
            aria-label="Filter accounts by type"
            value={typeFilter}
            onChange={v => setTypeFilter(String(v))}
            options={[
              { value: 'all', label: 'All types' },
              ...accountTypes.map(t => ({ value: t, label: t.replace('_', ' ').toUpperCase() })),
            ]}
          />
        </AccountsToolbar>
      )}

      {accounts.length === 0 ? (
        <Card title="Accounts" subtitle="Your cash, bank, and wallet balances" icon={<Wallet size={16} />}>
          <EmptyState
            icon={<Wallet size={20} />}
            title="No accounts yet"
            description="Add a bank account, card or wallet so transactions have somewhere to land."
            action={onAdd ? <Button size="sm" variant="primary" onClick={onAdd}>Add account</Button> : undefined}
          />
        </Card>
      ) : (
        <ModuleGrid modules={modules} />
      )}

      <AccountSidePanel
        account={panelAccount}
        onClose={() => setPanelAccount(null)}
      />
    </AccountsRoot>
  )
}
