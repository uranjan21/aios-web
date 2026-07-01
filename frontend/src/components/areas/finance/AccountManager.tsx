import React, { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Popconfirm } from '@/components/ui/Popconfirm'
import { Button, EmptyState, DataTable, Select, Card, Input } from '@ledgr/ui'
import { Trash2, Wallet, X, PencilLine, ArrowLeftRight, TrendingUp, TrendingDown, Plus } from 'lucide-react'
import { toast } from 'sonner'
import styled, { keyframes } from 'styled-components'
import dayjs from 'dayjs'
import { financeApi } from '@/api/areas'
import { formatCurrency } from '@/lib/utils'
import { Skeleton } from '@/components/ui/skeleton'
import { TransactionModal, type Txn, type Kind } from './TransactionsTab'
import type { LedgerEntry } from '@/types'

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

const slideIn = keyframes`
  from { transform: translateX(100%); }
  to   { transform: translateX(0); }
`

const Overlay = styled.div<{ $visible: boolean }>`
  position: fixed;
  inset: 0;
  z-index: ${({ theme }) => theme.zIndex.modal - 1};
  background: rgba(0, 0, 0, 0.3);
  opacity: ${({ $visible }) => ($visible ? 1 : 0)};
  pointer-events: ${({ $visible }) => ($visible ? 'all' : 'none')};
  transition: opacity 200ms ease;
`

const Panel = styled.aside<{ $visible: boolean }>`
  position: fixed;
  top: 0;
  right: 0;
  height: 100%;
  width: 420px;
  max-width: 100vw;
  z-index: ${({ theme }) => theme.zIndex.modal};
  background: ${({ theme }) => theme.color.background};
  border-left: 1px solid ${({ theme }) => theme.color.border};
  display: flex;
  flex-direction: column;
  box-shadow: -8px 0 32px rgba(0, 0, 0, 0.12);
  transform: ${({ $visible }) => ($visible ? 'translateX(0)' : 'translateX(100%)')};
  transition: transform 220ms cubic-bezier(0.2, 0, 0, 1);
  overflow: hidden;

  @media (max-width: 480px) { width: 100vw; }
`

const PanelHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 20px;
  border-bottom: 1px solid ${({ theme }) => theme.color.border};
  flex-shrink: 0;
`

const PanelTitle = styled.div`
  display: flex;
  flex-direction: column;
  gap: 2px;
`

const PanelName = styled.h3`
  font-size: 15px;
  font-weight: 600;
  color: ${({ theme }) => theme.color.foreground};
  margin: 0;
`

const PanelBalance = styled.span`
  font-size: 12px;
  color: ${({ theme }) => theme.color.mutedForeground};
`

const CloseBtn = styled.button`
  width: 32px;
  height: 32px;
  border-radius: ${({ theme }) => theme.radii.md};
  border: 1px solid ${({ theme }) => theme.color.border};
  background: transparent;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  color: ${({ theme }) => theme.color.mutedForeground};
  flex-shrink: 0;
  &:hover { background: ${({ theme }) => theme.color.muted}; }
`

const PanelBody = styled.div`
  flex: 1;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
`

const Section = styled.div`
  padding: 16px 20px;
  border-bottom: 1px solid ${({ theme }) => theme.color.border};
`

const SectionLabel = styled.div`
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: ${({ theme }) => theme.color.mutedForeground};
  margin-bottom: 12px;
`

const FormGrid = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
  @media (max-width: 480px) { grid-template-columns: 1fr; }
`

const FieldLabel = styled.label`
  display: flex;
  flex-direction: column;
  gap: 4px;
  font-size: 12px;
  font-weight: 500;
  color: ${({ theme }) => theme.color.foreground};
`

const FullWidth = styled.div`
  grid-column: 1 / -1;
`

const SaveRow = styled.div`
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  padding-top: 4px;
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
  padding: 14px 20px 10px;
  font-size: 11px;
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
  gap: 10px;
  padding: 10px 20px;
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
  font-size: 13px;
  font-weight: 500;
  color: ${({ theme }) => theme.color.foreground};
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`

const TxnMeta = styled.div`
  font-size: 11px;
  color: ${({ theme }) => theme.color.mutedForeground};
  margin-top: 1px;
  display: flex;
  align-items: center;
  gap: 6px;
`

const TxnAmount = styled.div<{ $positive: boolean }>`
  font-size: 13px;
  font-weight: 600;
  flex-shrink: 0;
  font-variant-numeric: tabular-nums;
  color: ${({ $positive, theme }) => ($positive ? theme.color.success : theme.color.destructive)};
`

const TxnActions = styled.div`
  display: flex;
  gap: 4px;
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
  const panelRef = useRef<HTMLDivElement>(null)
  const visible = !!account

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

  // Close on Escape
  useEffect(() => {
    if (!visible) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [visible, onClose])

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

  return createPortal(
    <>
      <Overlay $visible={visible} onClick={onClose} />
      <Panel $visible={visible} ref={panelRef} role="dialog" aria-modal="true" aria-label="Edit account">
        <PanelHeader>
          <PanelTitle>
            <PanelName>{account?.name ?? 'Account'}</PanelName>
            <PanelBalance>
              {account?.currency} {account ? Number(account.balance).toFixed(2) : ''}
            </PanelBalance>
          </PanelTitle>
          <CloseBtn onClick={onClose} aria-label="Close panel">
            <X size={15} />
          </CloseBtn>
        </PanelHeader>

        <PanelBody>
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
        </PanelBody>
      </Panel>

      {/* Reuse the full TransactionModal for editing individual transactions */}
      <TransactionModal
        open={txnModalOpen}
        onClose={() => { setTxnModalOpen(false); setEditingTxn(null) }}
        editing={editingTxn}
        initialKind={(editingTxn?.type === 'income' ? 'Income' : editingTxn?.type === 'transfer' ? 'Transfer' : 'Expense') as Kind}
      />
    </>,
    document.body,
  )
}

// ── AccountManager ────────────────────────────────────────────────────────────

export const AccountManager: React.FC<{ onAdd?: () => void }> = ({ onAdd }) => {
  const queryClient = useQueryClient()
  const [panelAccount, setPanelAccount] = useState<any | null>(null)
  const [typeFilter, setTypeFilter] = useState<string>('all')

  const { data: accounts = [], isLoading } = useQuery({
    queryKey: ['finance', 'accounts'],
    queryFn: financeApi.accounts,
  })

  const deleteMutation = useMutation({
    mutationFn: financeApi.deleteAccount,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['finance', 'accounts'] })
      toast.success('Account deleted')
      setPanelAccount(null)
    },
    onError: (e: any) => toast.error(e?.response?.data?.detail || 'Failed to delete account'),
  })

  const columns = [
    { id: 'name', header: 'Name', cell: (row: any) => row.name },
    { id: 'type', header: 'Type', cell: (row: any) => row.type.replace('_', ' ').toUpperCase() },
    { id: 'balance', header: 'Balance', cell: (row: any) => `${row.currency} ${Number(row.balance).toFixed(2)}` },
    {
      id: 'action',
      header: 'Action',
      cell: (row: any) => (
        <div style={{ display: 'flex', gap: '8px' }}>
          <Button variant="outline" size="icon" onClick={e => { e.stopPropagation(); setPanelAccount(row) }}>
            <PencilLine size={14} />
          </Button>
          <Popconfirm title="Delete account?" onConfirm={() => deleteMutation.mutate(row.id)}>
            <Button variant="destructive" size="icon" onClick={e => e.stopPropagation()}>
              <Trash2 size={14} />
            </Button>
          </Popconfirm>
        </div>
      ),
    },
  ]

  const accountTypes = Array.from(new Set(accounts.map((a: any) => a.type))) as string[]
  const visibleAccounts = typeFilter === 'all'
    ? accounts
    : accounts.filter((a: any) => a.type === typeFilter)

  return (
    <>
      <Card
        title="Accounts"
        subtitle="Your cash, bank, and wallet balances"
        icon={<Wallet size={16} />}
        action={
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
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
            {onAdd && (
              <Button size="sm" variant="primary" onClick={onAdd}>
                <Plus size={12} style={{ marginRight: 4 }} /> Add Account
              </Button>
            )}
          </div>
        }
      >
        <DataTable
          rows={visibleAccounts}
          columns={columns}
          getRowKey={row => row.id}
          loading={isLoading}
          onRowClick={row => setPanelAccount(row)}
        />
      </Card>

      <AccountSidePanel
        account={panelAccount}
        onClose={() => setPanelAccount(null)}
      />
    </>
  )
}
