import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Button, Dialog, DialogFooter, Input, Select, SegmentedControl } from '@ledgr/ui'
import { toast } from 'sonner'
import dayjs from 'dayjs'
import { Plus } from 'lucide-react'
import { financeApi } from '@ct/shared/api/areas'
import { trackOnce } from '@ct/shared/lib/analytics'
import { CategoryPicker } from '../CategoryPicker'
import { FieldError, useFieldErrors } from '@ct/shared/components/forms/fieldErrors'
import styled from 'styled-components'
import type { Txn, Kind } from './types'

export type { Kind }

const FormGrid = styled.div`
  display: grid;
  grid-template-columns: 1fr;
  gap: ${({ theme }) => `${theme.spacing[3]}`};
  margin-bottom: ${({ theme }) => `${theme.spacing[3]}`};

  @media ${({ theme }) => theme.media.sm} {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
`

const FormLabel = styled.label`
  font-size: ${({ theme }) => theme.typography.fontSize.xs};
  color: ${({ theme }) => theme.color.mutedForeground};
  margin-bottom: ${({ theme }) => `${theme.spacing[1]}`};
  display: block;
`

const FormGroup = styled.div`
  margin-bottom: ${({ theme }) => `${theme.spacing[3]}`};
`

const FullWidthWrap = styled.div`
  width: 100%;
  margin-bottom: ${({ theme }) => `${theme.spacing[4]}`};
`

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
  const f = useFieldErrors<'amount' | 'date' | 'category' | 'account' | 'fromAccount' | 'toAccount'>('txn')

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
    f.reset()
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
    // eslint-disable-next-line react-hooks/exhaustive-deps -- f is stable; adding it re-runs the prefill on every error change
  }, [open, editing, initialKind])

  const { mutate, isPending } = useMutation({
    mutationFn: (): Promise<unknown> => {
      // Send the picked date as a naive LOCAL datetime (no UTC conversion). The
      // backend column is tz-naive; using toISOString() would shift the date back
      // a day for users east of UTC (e.g. IST midnight → previous-day 18:30 UTC).
      const logged_at = dayjs(date).format('YYYY-MM-DD') + 'T' + dayjs().format('HH:mm:ss')
      const amt = parseFloat(amount)
      const tagsStr = tags.join(',') || undefined
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
      return financeApi.createTransfer({
        amount: amt,
        from_account_id: fromAccountId!,
        to_account_id: toAccountId!,
        description: description?.trim() || undefined,
        logged_at })
    },
    onSuccess: () => {
      if (!isEdit) trackOnce('first_entry_logged', { domain: 'finance' })
      queryClient.invalidateQueries({ queryKey: ['finance'] })
      toast.success(isEdit ? 'Transaction updated' : `${effectiveKind} saved`)
      onClose()
    },
    onError: (e: any) => toast.error(e?.response?.data?.detail || `Failed to save ${effectiveKind.toLowerCase()}`) })


  /**
   * Every one of these used to be a `Promise.reject` inside `mutationFn`, which
   * surfaced as the same red toast a network failure gets — "Select a category"
   * with no idea which of the six controls is the offender. They are field
   * problems, so they are answered on the field; the toast keeps only what
   * belongs to no field (the server's own rejection).
   */
  const validate = () => {
    const amt = Number(amount)
    const isTransfer = effectiveKind === 'Transfer'
    return f.submit({
      amount: amount.trim() === '' || !Number.isFinite(amt)
        ? 'Enter an amount.'
        : amt <= 0
          ? 'The amount must be more than zero.'
          : undefined,
      date: date ? undefined : 'Pick a date.',
      category: isTransfer || categoryId ? undefined : `Choose a ${effectiveKind === 'Expense' ? 'category' : 'source'}.`,
      account: isTransfer || accountId ? undefined : 'Choose the account this came from.',
      fromAccount: !isTransfer || fromAccountId ? undefined : 'Choose the account to move money from.',
      toAccount: !isTransfer
        ? undefined
        : !toAccountId
          ? 'Choose the account to move money to.'
          : toAccountId === fromAccountId
            ? 'Pick a different account — a transfer cannot end where it started.'
            : undefined,
    })
  }

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
      <form id="transaction-form" noValidate onSubmit={e => { e.preventDefault(); if (validate()) mutate() }}>
        <FormGrid>
          <div>
            <FormLabel htmlFor="txn-amount">Amount (₹)</FormLabel>
            <Input id="txn-amount" type="number" startAdornment="₹" placeholder="0.00" min="0" step="0.01" value={amount} {...f.fieldProps('amount')} onChange={e => { f.clearField('amount'); setAmount(e.target.value) }} />
            <FieldError id={f.errorId('amount')}>{f.errors.amount}</FieldError>
          </div>
          <div>
            <FormLabel htmlFor="txn-date">Date</FormLabel>
            <Input id="txn-date" type="date" value={date} {...f.fieldProps('date')} onChange={e => { f.clearField('date'); setDate(e.target.value) }} />
            <FieldError id={f.errorId('date')}>{f.errors.date}</FieldError>
          </div>
        </FormGrid>
        {effectiveKind === 'Transfer' ? (
          <FormGrid>
            <div>
              <FormLabel htmlFor="txn-from-account">From Account</FormLabel>
              <Select id="txn-from-account" placeholder="Source account" options={(accounts ?? []).map((a: any) => ({ label: a.name, value: a.id }))} value={fromAccountId} onChange={(v: string | number) => { f.clearField('fromAccount'); f.clearField('toAccount'); setFromAccountId(String(v)) }} />
              <FieldError id={f.errorId('fromAccount')}>{f.errors.fromAccount}</FieldError>
            </div>
            <div>
              <FormLabel htmlFor="txn-to-account">To Account</FormLabel>
              <Select id="txn-to-account" placeholder="Destination account" options={(accounts ?? []).map((a: any) => ({ label: a.name, value: a.id }))} value={toAccountId} onChange={(v: string | number) => { f.clearField('toAccount'); setToAccountId(String(v)) }} />
              <FieldError id={f.errorId('toAccount')}>{f.errors.toAccount}</FieldError>
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
                onChange={(v) => { f.clearField('category'); setCategoryId(v) }}
                label={effectiveKind === 'Expense' ? 'category' : 'source'}
              />
              <FieldError id={f.errorId('category')}>{f.errors.category}</FieldError>
            </div>
            <div>
              <FormLabel htmlFor="txn-account">Account</FormLabel>
              <Select id="txn-account" placeholder="Select account" options={(accounts ?? []).map((a: any) => ({ label: a.name, value: a.id }))} value={accountId} onChange={(v: string | number) => { f.clearField('account'); setAccountId(String(v)) }} />
              <FieldError id={f.errorId('account')}>{f.errors.account}</FieldError>
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
