/**
 * Contribute to / withdraw from a savings pot, plus that pot's ledger.
 *
 * This is the PRIMARY way a pot's balance should move. `FinancialGoal
 * .current_amount` stays the running total (every summary reads it) and the
 * server moves it in lockstep with each row written here, so the two cannot
 * drift. Editing "Current amount" on the goal form directly is still possible —
 * it is the correction path — but it writes no ledger row, which is why the
 * form labels it as a correction rather than as the way to add money.
 *
 * Direction is a segmented control, not a minus sign the user has to type:
 * `amount` is negated for a withdrawal before it goes to the API. The endpoint
 * deliberately allows a negative amount (a withdrawal is a real event and the
 * series has to be able to go down) but rejects zero.
 */
import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import dayjs from 'dayjs'
import styled from 'styled-components'
import { Button, Input, SegmentedControl, Select } from '@ledgr/ui'
import { Trash2 } from 'lucide-react'
import { financeApi } from '@ct/shared/api/areas'
import { formatCurrency } from '@ct/shared/lib/utils'

const Wrap = styled.section`
  border-top: 1px solid ${({ theme }) => theme.color.border};
  padding-top: ${({ theme }) => theme.spacing[4]};
  margin-top: ${({ theme }) => theme.spacing[2]};
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.spacing[3]};
`

const Heading = styled.h4`
  margin: 0;
  font-size: ${({ theme }) => theme.typography.fontSize.sm};
  font-weight: 600;
`

const Label = styled.label`
  font-size: ${({ theme }) => theme.typography.fontSize.xs};
  color: ${({ theme }) => theme.color.mutedForeground};
  margin-bottom: ${({ theme }) => theme.spacing[1]};
  display: block;
`

const Row = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: ${({ theme }) => theme.spacing[3]};

  @media ${({ theme }) => theme.media.belowSm} {
    grid-template-columns: 1fr;
  }
`

const LedgerList = styled.ul`
  list-style: none;
  margin: 0;
  padding: 0;
  max-height: 190px;
  overflow-y: auto;
`

const LedgerRow = styled.li`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: ${({ theme }) => theme.spacing[3]};
  padding: ${({ theme }) => `${theme.spacing[2]} 0`};
  border-bottom: 1px solid ${({ theme }) => theme.color.border};

  &:last-child { border-bottom: none; }
`

const LedgerMeta = styled.div`
  min-width: 0;
`

const LedgerDate = styled.div`
  font-size: ${({ theme }) => theme.typography.fontSize.xs};
  color: ${({ theme }) => theme.color.mutedForeground};
`

const LedgerNote = styled.div`
  font-size: ${({ theme }) => theme.typography.fontSize.xs};
  color: ${({ theme }) => theme.color.mutedForeground};
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`

/* Sign is stated by the leading +/− as well as the colour — colour alone is
   never the only carrier of meaning. */
const Amount = styled.span<{ $negative: boolean }>`
  font-size: ${({ theme }) => theme.typography.fontSize.sm};
  font-weight: 600;
  font-variant-numeric: tabular-nums;
  color: ${({ theme, $negative }) => ($negative ? theme.color.destructive : theme.color.success)};
`

const Empty = styled.p`
  font-size: ${({ theme }) => theme.typography.fontSize.xs};
  color: ${({ theme }) => theme.color.mutedForeground};
  margin: 0;
`

const Actions = styled.div`
  display: flex;
  gap: ${({ theme }) => theme.spacing[2]};
`

export function GoalContributionsPanel({ goalId }: { goalId: string }) {
  const qc = useQueryClient()
  const [direction, setDirection] = useState<'in' | 'out'>('in')
  const [amount, setAmount] = useState('')
  const [when, setWhen] = useState(dayjs().format('YYYY-MM-DD'))
  const [note, setNote] = useState('')
  const [accountId, setAccountId] = useState('')

  const { data: ledger, isLoading } = useQuery({
    queryKey: ['finance', 'goals', goalId, 'contributions'],
    queryFn: () => financeApi.goalContributions(goalId),
    staleTime: 30_000,
  })

  const { data: accounts } = useQuery({
    queryKey: ['finance', 'accounts'],
    queryFn: financeApi.accounts,
    staleTime: 60_000,
  })

  /* The server moves `current_amount` on every write here, so the goals list
     and the monthly series both have to be refetched alongside the ledger. */
  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ['finance', 'goals'] })
    qc.invalidateQueries({ queryKey: ['finance', 'goals', goalId, 'contributions'] })
    qc.invalidateQueries({ queryKey: ['finance', 'goals', 'contributions', 'monthly'] })
    qc.invalidateQueries({ queryKey: ['finance', 'accounts'] })
  }

  const createMutation = useMutation({
    mutationFn: (d: Parameters<typeof financeApi.createGoalContribution>[1]) =>
      financeApi.createGoalContribution(goalId, d),
    onSuccess: () => {
      invalidate()
      toast.success(direction === 'in' ? 'Contribution added' : 'Withdrawal recorded')
      setAmount(''); setNote('')
    },
    onError: (e: any) => toast.error(e?.response?.data?.detail || 'Failed to record that'),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => financeApi.deleteGoalContribution(goalId, id),
    onSuccess: () => { invalidate(); toast.success('Entry removed') },
    onError: (e: any) => toast.error(e?.response?.data?.detail || 'Failed to remove entry'),
  })

  const submit = () => {
    const raw = parseFloat(amount)
    if (Number.isNaN(raw) || raw <= 0) { toast.error('Enter an amount greater than zero'); return }
    createMutation.mutate({
      // The control carries the direction; the user never types a minus sign.
      amount: direction === 'out' ? -raw : raw,
      // Naive local — these columns are TIMESTAMP WITHOUT TIME ZONE.
      contributed_at: `${when}T${dayjs().format('HH:mm:ss')}`,
      note: note.trim() || null,
      account_id: accountId || null,
    })
  }

  return (
    <Wrap>
      <Heading>Contributions</Heading>

      <div>
        <Label>Direction</Label>
        <SegmentedControl
          value={direction}
          onChange={(v: any) => setDirection(v as 'in' | 'out')}
          options={[
            { label: 'Contribute', value: 'in' },
            { label: 'Withdraw', value: 'out' },
          ]}
        />
      </div>

      <Row>
        <div>
          <Label>Amount</Label>
          <Input
            type="number"
            startAdornment="₹"
            min="0.01"
            step="0.01"
            value={amount}
            onChange={(e: any) => setAmount(e.target.value)}
            placeholder="0.00"
          />
        </div>
        <div>
          <Label>Date</Label>
          <Input type="date" value={when} onChange={(e: any) => setWhen(e.target.value)} />
        </div>
      </Row>

      <Row>
        <div>
          <Label>Funding account (optional)</Label>
          <Select
            fullWidth
            value={accountId}
            onChange={(v: any) => setAccountId(String(v))}
            placeholder="No account"
            options={[
              { value: '', label: 'No account' },
              ...(accounts ?? []).map(a => ({ value: a.id, label: a.name })),
            ]}
          />
        </div>
        <div>
          <Label>Note (optional)</Label>
          <Input value={note} onChange={(e: any) => setNote(e.target.value)} placeholder="e.g. bonus" />
        </div>
      </Row>

      <Actions>
        <Button
          type="button"
          variant="primary"
          size="sm"
          onClick={submit}
          loading={createMutation.isPending}
        >
          {direction === 'in' ? 'Add contribution' : 'Record withdrawal'}
        </Button>
      </Actions>

      {isLoading ? (
        <Empty>Loading ledger…</Empty>
      ) : !(ledger ?? []).length ? (
        <Empty>No contributions logged yet. Adding them is what makes the monthly chart and finish-date projection real.</Empty>
      ) : (
        <LedgerList>
          {(ledger ?? []).map((row) => {
            const amt = Number(row.amount)
            return (
              <LedgerRow key={row.id}>
                <LedgerMeta>
                  <LedgerDate>{dayjs(row.contributed_at).format('D MMM YYYY')}</LedgerDate>
                  {row.note && <LedgerNote>{row.note}</LedgerNote>}
                </LedgerMeta>
                <Amount $negative={amt < 0}>
                  {amt < 0 ? '−' : '+'}{formatCurrency(Math.abs(amt))}
                </Amount>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  aria-label="Remove this entry"
                  onClick={() => deleteMutation.mutate(row.id)}
                  disabled={deleteMutation.isPending}
                >
                  <Trash2 size={14} />
                </Button>
              </LedgerRow>
            )
          })}
        </LedgerList>
      )}
    </Wrap>
  )
}
