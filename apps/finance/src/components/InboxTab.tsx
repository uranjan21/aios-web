import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Card, Button, Input, Select } from '@ledgr/ui'
import { Check, X, Inbox as InboxIcon, Receipt, Mail, RefreshCw } from 'lucide-react'
import { financeApi, type FinancePendingTransaction } from '@aios/shared/api/areas'
import { agentsApi } from '@aios/shared/api/agents'
import type { Account, Category } from '@aios/shared/types'
import { toast } from 'sonner'
import dayjs from 'dayjs'
import relativeTime from 'dayjs/plugin/relativeTime'
import styled from 'styled-components'

dayjs.extend(relativeTime)

const TransactionCard = styled(Card)`
  padding: ${({ theme }) => `${theme.spacing[6]}`};
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => `${theme.spacing[5]}`};
  transition: transform 0.2s ease, box-shadow 0.2s ease;
  
  &:hover {
    box-shadow: var(--ui-shadow-md);
  }
`

const CardHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
`

const HeaderLeft = styled.div`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => `${theme.spacing[3]}`};
`

const TypeBadge = styled.span<{ $type: string }>`
  background: ${props => props.$type === 'expense' ? 'var(--ui-danger-subtle)' : 'var(--ui-success-subtle)'};
  color: ${props => props.$type === 'expense' ? 'var(--ui-danger)' : 'var(--ui-success)'};
  padding: ${({ theme }) => `${theme.spacing[1.5]} ${theme.spacing[3]}`};
  border-radius: ${({ theme }) => theme.radii.md};
  font-size: 0.75rem;
  font-weight: 700;
  letter-spacing: 0.5px;
`

const MetaText = styled.span`
  font-size: 0.875rem;
  color: var(--ui-text-tertiary);
  font-weight: 500;
`

const SourceChip = styled.span`
  display: inline-flex;
  align-items: center;
  gap: ${({ theme }) => `${theme.spacing[1.5]}`};
  background: var(--ui-bg-subtle);
  border: 1px solid var(--ui-border);
  color: var(--ui-text-secondary);
  padding: ${({ theme }) => `${theme.spacing[1]} ${theme.spacing[2.5]}`};
  border-radius: ${({ theme }) => theme.radii.sm};
  font-size: 0.75rem;
  font-weight: 600;
`

const BulkBar = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: ${({ theme }) => `${theme.spacing[3]}`};
`

const ActionGroup = styled.div`
  display: flex;
  gap: ${({ theme }) => `${theme.spacing[3]}`};
`

const FieldsGrid = styled.div`
  display: grid;
  grid-template-columns: 1fr 2fr 2fr 2fr;
  gap: ${({ theme }) => `${theme.spacing[5]}`};
  align-items: start;
`

const FieldGroup = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => `${theme.spacing[2]}`};
`

const FieldLabel = styled.div`
  font-size: 0.75rem;
  font-weight: 600;
  color: var(--ui-text-secondary);
  display: flex;
  justify-content: space-between;
  align-items: center;
`

const SuggestedBadge = styled.span`
  color: var(--ui-primary);
  font-size: 0.7rem;
  font-weight: 600;
  background: var(--ui-primary-subtle);
  padding: ${({ theme }) => `${theme.spacing[0.5]} ${theme.spacing[2]}`};
  border-radius: ${({ theme }) => theme.radii.md};
`

const SnippetContainer = styled.div`
  padding: ${({ theme }) => `${theme.spacing[4]}`};
  background: var(--ui-bg-subtle);
  border-radius: ${({ theme }) => theme.radii.md};
  border: 1px solid var(--ui-border);
`

const SnippetHeader = styled.div`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => `${theme.spacing[2]}`};
  margin-bottom: ${({ theme }) => `${theme.spacing[3]}`};
  color: var(--ui-text-secondary);
  font-size: 0.875rem;
  font-weight: 600;
`

const SnippetGrid = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: ${({ theme }) => `${theme.spacing[2.5]}`};
`

const SnippetPill = styled.div`
  background: var(--ui-bg-base);
  border: 1px solid var(--ui-border);
  padding: ${({ theme }) => `${theme.spacing[1.5]} ${theme.spacing[3]}`};
  border-radius: ${({ theme }) => theme.radii.sm};
  display: flex;
  align-items: center;
  gap: ${({ theme }) => `${theme.spacing[2]}`};
  font-size: 0.8125rem;
  box-shadow: var(--ui-shadow-sm);
`

const SnippetKey = styled.span`
  color: var(--ui-text-tertiary);
  font-weight: 500;
`

const SnippetValue = styled.span`
  color: var(--ui-text-primary);
  font-weight: 600;
`

const SnippetRaw = styled.div`
  color: var(--ui-text-secondary);
  white-space: pre-wrap;
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  font-size: 0.8125rem;
  line-height: 1.5;
`

const EmptyStateContainer = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 60px 0;
  color: var(--ui-text-tertiary);
`

const EmptyStateTitle = styled.div`
  font-size: 1.25rem;
  font-weight: 600;
  color: var(--ui-text-primary);
  margin-top: ${({ theme }) => `${theme.spacing[4]}`};
  margin-bottom: ${({ theme }) => `${theme.spacing[2]}`};
`

const EmptyStateDesc = styled.div`
  font-size: 0.9375rem;
`

export function InboxTab() {
  const [transactions, setTransactions] = useState<FinancePendingTransaction[]>([])
  const [accounts, setAccounts] = useState<Account[]>([])
  const [expenseCategories, setExpenseCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState<Record<string, boolean>>({})

  // Editable fields per transaction
  const [edits, setEdits] = useState<Record<string, { amount: number, account_id: string | null, category_id: string | null, description: string | null }>>({})

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    setLoading(true)
    try {
      const [txs, accs, cats] = await Promise.all([
        financeApi.pending(),
        financeApi.accounts(),
        financeApi.categories('expense')
      ])
      setTransactions(txs)
      setAccounts(accs)
      setExpenseCategories(cats)
      
      const initEdits: Record<string, any> = {}
      txs.forEach(t => {
        initEdits[t.id] = {
          amount: t.amount,
          // Pre-fill: stored account, else the account last used for this inbox.
          account_id: t.account_id ?? t.suggested_account_id ?? null,
          // Pre-fill the server-matched category so approving is one click.
          category_id: t.category_id ?? null,
          description: t.description
        }
      })
      setEdits(initEdits)
    } catch (e) {
      toast.error('Failed to load pending transactions')
    } finally {
      setLoading(false)
    }
  }

  const handleUpdate = (id: string, field: string, val: any) => {
    setEdits(prev => ({ ...prev, [id]: { ...prev[id], [field]: val } }))
  }

  const onApprove = async (tx: FinancePendingTransaction) => {
    const edit = edits[tx.id]
    if (!edit.account_id) {
      toast.error('Please select an account')
      return
    }
    
    setSubmitting(prev => ({ ...prev, [tx.id]: true }))
    try {
      await financeApi.approvePending(tx.id, edit)
      toast.success('Transaction approved')
      setTransactions(prev => prev.filter(t => t.id !== tx.id))
    } catch (e: any) {
      // 409 = already in the ledger (dedupe guard) — surface the server reason.
      toast.error(e?.response?.data?.detail || 'Failed to approve transaction')
    } finally {
      setSubmitting(prev => ({ ...prev, [tx.id]: false }))
    }
  }

  const onApproveAll = async () => {
    try {
      const result = await financeApi.bulkApprovePending(transactions.map(t => t.id))
      const msg = result.skipped.length
        ? `Approved ${result.approved} — skipped ${result.skipped.length} (duplicates or missing data)`
        : `Approved ${result.approved} transaction(s)`
      toast.success(msg)
      await loadData()
    } catch (e) {
      toast.error('Bulk approve failed')
    }
  }

  const onDismissAll = async () => {
    try {
      const result = await financeApi.bulkDismissPending(transactions.map(t => t.id))
      toast.success(`Dismissed ${result.dismissed} transaction(s)`)
      await loadData()
    } catch (e) {
      toast.error('Bulk dismiss failed')
    }
  }

  const onFetchNow = async () => {
    try {
      await agentsApi.trigger('aios-upi-tracker')
      toast.success('Transaction Tracker is running — new items appear here shortly')
      setTimeout(loadData, 6000)
    } catch (e) {
      toast.error('Could not trigger the tracker')
    }
  }

  const onDismiss = async (tx: FinancePendingTransaction) => {
    setSubmitting(prev => ({ ...prev, [tx.id]: true }))
    try {
      await financeApi.dismissPending(tx.id)
      toast.success('Transaction dismissed')
      setTransactions(prev => prev.filter(t => t.id !== tx.id))
    } catch (e) {
      toast.error('Failed to dismiss transaction')
    } finally {
      setSubmitting(prev => ({ ...prev, [tx.id]: false }))
    }
  }

  if (loading) return <div>Loading inbox...</div>

  if (transactions.length === 0) {
    return (
      <Card>
        <EmptyStateContainer>
          <InboxIcon size={56} style={{ opacity: 0.3 }} />
          <EmptyStateTitle>Inbox is empty</EmptyStateTitle>
          <EmptyStateDesc>No pending transactions from your emails.</EmptyStateDesc>
          <div style={{ display: 'flex', gap: 12, marginTop: 20 }}>
            <Button variant="outline" size="sm" onClick={onFetchNow}>
              <RefreshCw size={14} style={{ marginRight: 6 }} /> Fetch now
            </Button>
            <Link to="/app/settings">
              <Button variant="outline" size="sm">
                <Mail size={14} style={{ marginRight: 6 }} /> Connect Gmail
              </Button>
            </Link>
          </div>
        </EmptyStateContainer>
      </Card>
    )
  }

  const accountOptions = accounts.map(a => ({ label: a.name, value: a.id }))
  const categoryOptions = [{ label: 'None (Use suggested)', value: '' }, ...expenseCategories.map(c => ({ label: c.name, value: c.id }))]

  const renderSnippet = (snippet: string) => {
    try {
      // Replace single quotes with double quotes to parse python dicts as JSON
      const jsonStr = snippet.replace(/'/g, '"').replace(/True/g, 'true').replace(/False/g, 'false').replace(/None/g, 'null');
      const obj = JSON.parse(jsonStr);
      
      return (
        <SnippetGrid>
          {Object.entries(obj).map(([key, value]) => (
            <SnippetPill key={key}>
              <SnippetKey>{key.replace(/_/g, ' ')}:</SnippetKey>
              <SnippetValue>{String(value)}</SnippetValue>
            </SnippetPill>
          ))}
        </SnippetGrid>
      )
    } catch (e) {
      // Fallback for complex strings that fail to parse
      return <SnippetRaw>{snippet}</SnippetRaw>
    }
  }

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 24 }}>
      {transactions.length > 1 && (
        <BulkBar>
          <MetaText>{transactions.length} transactions waiting for review</MetaText>
          <div style={{ display: 'flex', gap: 8 }}>
            <Button variant="outline" size="sm" onClick={onDismissAll}>
              <X size={14} style={{ marginRight: 6 }} /> Dismiss all
            </Button>
            <Button variant="primary" size="sm" onClick={onApproveAll}>
              <Check size={14} style={{ marginRight: 6 }} /> Approve all
            </Button>
          </div>
        </BulkBar>
      )}
      {transactions.map(tx => {
        const edit = edits[tx.id]
        if (!edit) return null
        const isSubmitting = submitting[tx.id]

        return (
          <TransactionCard key={tx.id}>
            <CardHeader>
              <HeaderLeft>
                <TypeBadge $type={tx.transaction_type}>
                  {tx.transaction_type.toUpperCase()}
                </TypeBadge>
                {tx.source_account_email && (
                  <SourceChip><Mail size={12} /> {tx.source_account_email}</SourceChip>
                )}
                <MetaText>
                  {tx.auto_commit_at
                    ? `Auto-commits ${dayjs(tx.auto_commit_at).fromNow()}`
                    : 'Waiting for your review'}
                </MetaText>
              </HeaderLeft>
              <ActionGroup>
                <Button variant="outline" onClick={() => onDismiss(tx)} disabled={isSubmitting}>
                  <X size={16} style={{ marginRight: 6 }} /> Dismiss
                </Button>
                <Button variant="primary" onClick={() => onApprove(tx)} disabled={isSubmitting}>
                  <Check size={16} style={{ marginRight: 6 }} /> Approve
                </Button>
              </ActionGroup>
            </CardHeader>

            <FieldsGrid>
              <FieldGroup>
                <FieldLabel>Amount</FieldLabel>
                <Input
                  type="number"
                  value={edit.amount}
                  onChange={(e: any) => handleUpdate(tx.id, 'amount', parseFloat(e.target.value) || 0)}
                />
              </FieldGroup>
              <FieldGroup>
                <FieldLabel>Payee / Description</FieldLabel>
                <Input
                  value={edit.description || ''}
                  placeholder={tx.payee_name || 'UPI Transaction'}
                  onChange={(e: any) => handleUpdate(tx.id, 'description', e.target.value)}
                />
              </FieldGroup>
              <FieldGroup>
                <FieldLabel>Account</FieldLabel>
                <Select
                  options={accountOptions}
                  value={edit.account_id || ''}
                  onChange={(val: any) => handleUpdate(tx.id, 'account_id', val)}
                  placeholder="Select account"
                />
              </FieldGroup>
              <FieldGroup>
                <FieldLabel>
                  <span>Category</span>
                  {tx.suggested_category && (
                    <SuggestedBadge>Suggested: {tx.suggested_category}</SuggestedBadge>
                  )}
                </FieldLabel>
                <Select
                  options={categoryOptions}
                  value={edit.category_id || ''}
                  onChange={(val: any) => handleUpdate(tx.id, 'category_id', val)}
                  placeholder="Change category"
                />
              </FieldGroup>
            </FieldsGrid>

            {tx.raw_email_snippet && (
              <SnippetContainer>
                <SnippetHeader>
                  <Receipt size={16} />
                  Receipt Snippet
                </SnippetHeader>
                {renderSnippet(tx.raw_email_snippet)}
              </SnippetContainer>
            )}
          </TransactionCard>
        )
      })}
    </div>
  )
}
