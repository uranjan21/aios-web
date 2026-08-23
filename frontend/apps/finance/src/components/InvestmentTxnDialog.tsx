/**
 * Log a dated cashflow against a holding — a buy, a sell or a dividend.
 *
 * This is what makes XIRR computable. `FinanceInvestment` stores only an
 * invested total and a current value, which between them cannot say WHEN money
 * moved, and the return maths needs exactly that.
 *
 * Direction is carried by `kind`, never by the sign of `amount`: the backend
 * declares `amount: float = Field(gt=0)` and rejects anything else (422), and
 * a "sell" of -5000 would be ambiguous besides. The form therefore never shows
 * a negative amount field.
 */
import { useEffect, useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import dayjs from 'dayjs'
import styled from 'styled-components'
import { Button, Dialog, Input, SegmentedControl, Select } from '@ledgr/ui'
import { ArrowLeftRight, Trash2 } from 'lucide-react'
import { financeApi, type InvestmentTransaction } from '@ct/shared/api/areas'
import { Popconfirm } from '@ct/shared/components/ui/Popconfirm'
import { formatCurrency } from '@ct/shared/lib/utils'
import { FieldError, useFieldErrors } from '@ct/shared/components/forms/fieldErrors'
import type { FinanceInvestment } from '@ct/shared/types'

const FormContainer = styled.form`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.spacing[3]};
  margin-top: ${({ theme }) => theme.spacing[3]};
`

const FormGroup = styled.div``

const Label = styled.label`
  font-size: ${({ theme }) => theme.typography.fontSize.xs};
  color: ${({ theme }) => theme.color.mutedForeground};
  margin-bottom: ${({ theme }) => theme.spacing[1]};
  display: block;
`

const Pair = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: ${({ theme }) => theme.spacing[3]};

  @media ${({ theme }) => theme.media.belowSm} {
    grid-template-columns: 1fr;
  }
`

const ActionsContainer = styled.div`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing[2]};
  padding-top: ${({ theme }) => theme.spacing[2]};
`

const Spacer = styled.div`
  flex: 1;
`

const Hint = styled.p`
  font-size: ${({ theme }) => theme.typography.fontSize.xs};
  color: ${({ theme }) => theme.color.mutedForeground};
  margin: 0;
`

const ReadRow = styled.div`
  display: flex;
  justify-content: space-between;
  gap: ${({ theme }) => theme.spacing[4]};
  padding: ${({ theme }) => `${theme.spacing[2]} 0`};
  border-bottom: 1px solid ${({ theme }) => theme.color.border};

  &:last-of-type { border-bottom: none; }
`

const ReadLabel = styled.span`
  font-size: ${({ theme }) => theme.typography.fontSize.xs};
  color: ${({ theme }) => theme.color.mutedForeground};
`

const ReadValue = styled.span`
  font-size: ${({ theme }) => theme.typography.fontSize.sm};
  font-weight: 600;
  font-variant-numeric: tabular-nums;
`

type Kind = 'buy' | 'sell' | 'dividend'

interface Props {
  open: boolean
  onClose: () => void
  holdings: FinanceInvestment[]
  /** Present = view/delete an existing row. Absent = log a new one. */
  viewing?: InvestmentTransaction | null
  holdingName?: string
}

const EMPTY = { investment_id: '', kind: 'buy' as Kind, amount: '', units: '', transacted_at: '', is_sip: false, notes: '' }

export function InvestmentTxnDialog({ open, onClose, holdings, viewing, holdingName }: Props) {
  const queryClient = useQueryClient()
  const [form, setForm] = useState(EMPTY)
  const f = useFieldErrors<'investment_id' | 'amount' | 'units' | 'transacted_at'>('investment-txn')

  /* Dialog fires onOpenChange on CLOSE only, so prefill/reset has to hang off
     `open` — an onOpenChange(true) branch would never run. */
  useEffect(() => {
    if (!open) return
    f.reset()
    setForm({
      ...EMPTY,
      investment_id: holdings[0]?.id ?? '',
      transacted_at: dayjs().format('YYYY-MM-DD'),
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps -- f is stable; adding it re-runs the reset on every error change
  }, [open, holdings])

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['finance', 'investments'] })
    queryClient.invalidateQueries({ queryKey: ['finance', 'investments', 'summary'] })
    queryClient.invalidateQueries({ queryKey: ['finance', 'investments', 'performance'] })
    queryClient.invalidateQueries({ queryKey: ['finance', 'investments', 'transactions'] })
  }

  const createMutation = useMutation({
    mutationFn: (d: Parameters<typeof financeApi.createInvestmentTransaction>[0]) =>
      financeApi.createInvestmentTransaction(d),
    onSuccess: () => {
      invalidate()
      toast.success('Cashflow logged')
      onClose()
    },
    onError: (e: any) => toast.error(e?.response?.data?.detail || 'Failed to log cashflow'),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => financeApi.deleteInvestmentTransaction(id),
    onSuccess: () => {
      invalidate()
      toast.success('Cashflow removed')
      onClose()
    },
    onError: (e: any) => toast.error(e?.response?.data?.detail || 'Failed to remove cashflow'),
  })

  /* These were three toasts that named no field. They are all field problems —
     the backend's own contract is `amount > 0` and a required investment_id —
     so they are answered on the control that is wrong. */
  const handleSave = () => {
    const amount = parseFloat(form.amount)
    const hasUnits = form.units.trim() !== ''
    const units = hasUnits ? parseFloat(form.units) : undefined
    const ok = f.submit({
      investment_id: form.investment_id ? undefined : 'Pick a holding.',
      amount: form.amount.trim() === '' || !Number.isFinite(amount)
        ? 'Enter an amount.'
        : amount <= 0
          ? 'Must be more than zero — the kind says buy or sell, not the sign.'
          : undefined,
      units: hasUnits && (!Number.isFinite(units!) || units! < 0)
        ? 'Units cannot be negative.'
        : undefined,
      transacted_at: form.transacted_at ? undefined : 'Pick a date.',
    })
    if (!ok) return
    createMutation.mutate({
      investment_id: form.investment_id,
      kind: form.kind,
      amount,
      ...(units !== undefined && { units }),
      /* Naive local, never toISOString() — these columns are TIMESTAMP WITHOUT
         TIME ZONE, and converting local midnight to UTC shifts the date back a
         day for anyone east of UTC. */
      transacted_at: `${form.transacted_at}T${dayjs().format('HH:mm:ss')}`,
      is_sip: form.is_sip,
      notes: form.notes.trim() || null,
    })
  }

  if (viewing) {
    return (
      <Dialog
        open={open}
        icon={<ArrowLeftRight size={18} />}
        eyebrow="Finance"
        title="Cashflow"
        description="Cashflows are not editable — remove and re-log to correct one."
        onOpenChange={(o) => { if (!o) onClose() }}
        size="sm"
      >
        <div>
          <ReadRow><ReadLabel>Holding</ReadLabel><ReadValue>{holdingName ?? '—'}</ReadValue></ReadRow>
          <ReadRow><ReadLabel>Kind</ReadLabel><ReadValue>{viewing.kind}{viewing.is_sip ? ' · SIP' : ''}</ReadValue></ReadRow>
          <ReadRow><ReadLabel>Date</ReadLabel><ReadValue>{dayjs(viewing.transacted_at).format('D MMM YYYY')}</ReadValue></ReadRow>
          <ReadRow><ReadLabel>Amount</ReadLabel><ReadValue>{formatCurrency(Number(viewing.amount))}</ReadValue></ReadRow>
          {viewing.units != null && (
            <ReadRow><ReadLabel>Units</ReadLabel><ReadValue>{Number(viewing.units)}</ReadValue></ReadRow>
          )}
          {viewing.notes && (
            <ReadRow><ReadLabel>Notes</ReadLabel><ReadValue>{viewing.notes}</ReadValue></ReadRow>
          )}
        </div>
        <ActionsContainer>
          <Button variant="ghost" type="button" onClick={onClose}>Close</Button>
          <Spacer />
          <Popconfirm
            title="Remove this cashflow?"
            description="The holding's invested total and units are rolled back."
            onConfirm={() => deleteMutation.mutate(viewing.id)}
            okText="Remove"
            cancelText="Cancel"
            okButtonProps={{ danger: true }}
          >
            <Button variant="destructive" type="button" size="sm" loading={deleteMutation.isPending}>
              <Trash2 size={14} style={{ marginRight: 4 }} /> Remove
            </Button>
          </Popconfirm>
        </ActionsContainer>
      </Dialog>
    )
  }

  return (
    <Dialog
      open={open}
      icon={<ArrowLeftRight size={18} />}
      eyebrow="Finance"
      title="Log a cashflow"
      description="Dated buys, sells and dividends are what make annualised return (XIRR) computable."
      onOpenChange={(o) => { if (!o) onClose() }}
      size="md"
    >
      <FormContainer noValidate onSubmit={e => { e.preventDefault(); handleSave() }}>
        <FormGroup>
          <Label>Holding</Label>
          <Select
            fullWidth
            value={form.investment_id}
            onChange={(v: any) => { f.clearField('investment_id'); setForm(prev => ({ ...prev, investment_id: String(v) })) }}
            placeholder="Select a holding"
            options={holdings.map(h => ({ value: h.id, label: h.name }))}
          />
          <FieldError id={f.errorId('investment_id')}>{f.errors.investment_id}</FieldError>
        </FormGroup>

        <FormGroup>
          <Label>Kind</Label>
          <SegmentedControl
            value={form.kind}
            onChange={(v: any) => setForm(prev => ({ ...prev, kind: v as Kind }))}
            options={[
              { label: 'Buy', value: 'buy' },
              { label: 'Sell', value: 'sell' },
              { label: 'Dividend', value: 'dividend' },
            ]}
          />
          <Hint>The kind sets the direction — always enter a positive amount.</Hint>
        </FormGroup>

        <Pair>
          <FormGroup>
            <Label>Amount</Label>
            <Input
              type="number"
              startAdornment="₹"
              min="0.01"
              step="0.01"
              value={form.amount}
              {...f.fieldProps('amount')}
              onChange={(e: any) => { f.clearField('amount'); setForm(prev => ({ ...prev, amount: e.target.value })) }}
              placeholder="0.00"
              autoFocus
            />
            <FieldError id={f.errorId('amount')}>{f.errors.amount}</FieldError>
          </FormGroup>
          <FormGroup>
            <Label>Units (optional)</Label>
            <Input
              type="number"
              min="0"
              step="0.0001"
              value={form.units}
              {...f.fieldProps('units')}
              onChange={(e: any) => { f.clearField('units'); setForm(prev => ({ ...prev, units: e.target.value })) }}
              placeholder="0"
            />
            <FieldError id={f.errorId('units')}>{f.errors.units}</FieldError>
          </FormGroup>
        </Pair>

        <Pair>
          <FormGroup>
            <Label>Date</Label>
            <Input
              type="date"
              value={form.transacted_at}
              {...f.fieldProps('transacted_at')}
              onChange={(e: any) => { f.clearField('transacted_at'); setForm(prev => ({ ...prev, transacted_at: e.target.value })) }}
            />
            <FieldError id={f.errorId('transacted_at')}>{f.errors.transacted_at}</FieldError>
          </FormGroup>
          <FormGroup>
            <Label>Part of a SIP?</Label>
            <SegmentedControl
              value={form.is_sip ? 'yes' : 'no'}
              onChange={(v: any) => setForm(prev => ({ ...prev, is_sip: v === 'yes' }))}
              options={[{ label: 'No', value: 'no' }, { label: 'Yes', value: 'yes' }]}
            />
          </FormGroup>
        </Pair>

        <FormGroup>
          <Label>Notes</Label>
          <Input
            value={form.notes}
            onChange={(e: any) => setForm(prev => ({ ...prev, notes: e.target.value }))}
            placeholder="Optional"
          />
        </FormGroup>

        <ActionsContainer>
          <Button variant="primary" type="submit" loading={createMutation.isPending}>Log cashflow</Button>
          <Button variant="ghost" type="button" onClick={onClose} disabled={createMutation.isPending}>Cancel</Button>
        </ActionsContainer>
      </FormContainer>
    </Dialog>
  )
}
