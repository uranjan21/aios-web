import { useMemo, useState } from 'react'
import { Badge, SegmentedControl, Input, Card, Select } from '@ledgr/ui'
import dayjs from 'dayjs'
import { Landmark } from 'lucide-react'
import { formatCurrency } from '@/lib/utils'
import type { FinanceLoan } from '@/types'
import styled from 'styled-components'

const ControlsGroup = styled.div`
  display: flex;
  align-items: center;
  gap: 0.75rem;
  flex-wrap: nowrap;
`

const ExtraInputGroup = styled.div`
  display: flex;
  align-items: center;
  gap: 0.375rem;
`

const ExtraLabel = styled.span`
  font-size: 11px;
  color: ${({ theme }) => theme.color.mutedForeground};
  white-space: nowrap;
`

const StatsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(130px, 1fr));
  gap: 1rem;
  padding: 1rem;
  background-color: ${({ theme }) => theme.color.background}40;
  border-radius: 0.5rem;
`

const StatLabel = styled.div`
  font-size: 10px;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: ${({ theme }) => theme.color.mutedForeground};
  margin-bottom: 0.25rem;
`

const StatValue = styled.div<{ $positive?: boolean }>`
  font-size: 18px;
  font-weight: 700;
  color: ${({ theme, $positive }) => $positive ? theme.color.success : theme.color.foreground};
  font-variant-numeric: tabular-nums;
`

const StatSubtext = styled.div`
  font-size: 11px;
  color: ${({ theme }) => theme.color.mutedForeground};
  margin-top: 0.125rem;
`

const OrderSection = styled.div`
  margin-top: 1rem;
  padding-top: 1rem;
  border-top: 1px dashed ${({ theme }) => theme.color.border};
`

const OrderTitle = styled.div`
  font-size: 11px;
  font-weight: 500;
  color: ${({ theme }) => theme.color.mutedForeground};
  margin-bottom: 0.5rem;
`

const OrderBadges = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
`

type Strategy = 'avalanche' | 'snowball'

interface SimLoan {
  id: string
  name: string
  balance: number
  rate: number
  emi: number
  paidOffMonth?: number
}

interface SimResult {
  months: number
  totalInterest: number
  payoffOrder: { name: string; month: number }[]
  capped: boolean
}

/** Month-by-month payoff simulation. Freed-up EMIs of closed loans roll into the
 *  extra pool (classic debt-snowball rollover), targeted by strategy order. */
export function simulatePayoff(loans: FinanceLoan[], strategy: Strategy, extra: number): SimResult | null {
  const sim: SimLoan[] = loans
    .filter(l => l.is_active && Number(l.outstanding_amount) > 0)
    .map(l => ({
      id: l.id, name: l.name,
      balance: Number(l.outstanding_amount),
      rate: Number(l.interest_rate),
      emi: Number(l.emi_amount),
    }))
  if (sim.length === 0) return null

  const order = [...sim].sort((a, b) =>
    strategy === 'avalanche' ? b.rate - a.rate : a.balance - b.balance
  )

  let month = 0
  let totalInterest = 0
  let rolledOver = 0
  const payoffOrder: { name: string; month: number }[] = []
  const MAX_MONTHS = 600

  while (sim.some(l => l.balance > 0) && month < MAX_MONTHS) {
    month++
    for (const l of sim) {
      if (l.balance <= 0) continue
      const interest = l.balance * l.rate / 1200
      l.balance += interest
      totalInterest += interest
    }
    // minimum EMIs
    for (const l of sim) {
      if (l.balance <= 0) continue
      l.balance -= Math.min(l.emi, l.balance)
    }
    // extra + rolled-over EMIs to the strategy target
    let pool = extra + rolledOver
    for (const target of order) {
      if (pool <= 0) break
      const live = sim.find(s => s.id === target.id)!
      if (live.balance <= 0) continue
      const pay = Math.min(pool, live.balance)
      live.balance -= pay
      pool -= pay
    }
    for (const l of sim) {
      if (l.balance <= 0 && l.paidOffMonth === undefined) {
        l.paidOffMonth = month
        payoffOrder.push({ name: l.name, month })
        rolledOver += l.emi
      }
    }
  }

  return { months: month, totalInterest, payoffOrder, capped: month >= MAX_MONTHS }
}

export function PayoffPlanner({ loans }: { loans: FinanceLoan[] }) {
  const [strategy, setStrategy] = useState<Strategy>('avalanche')
  const [extra, setExtra] = useState<number>(0)

  const result = useMemo(() => simulatePayoff(loans, strategy, extra), [loans, strategy, extra])
  const baseline = useMemo(() => simulatePayoff(loans, strategy, 0), [loans, strategy])

  if (!result || !baseline) return null

  const debtFreeDate = dayjs().add(result.months, 'month')
  const interestSaved = baseline.totalInterest - result.totalInterest
  const monthsSaved = baseline.months - result.months

  return (
    <Card
      style={{ marginTop: '1rem' }}
      title="Debt Payoff Planner"
      subtitle="Project debt-free date and savings under your chosen strategy"
      icon={<Landmark size={16} />}
      action={
        <ControlsGroup>
          <Select
            size="sm"
            fullWidth={false}
            aria-label="Payoff strategy"
            value={strategy}
            onChange={(v: any) => setStrategy(v as Strategy)}
            options={[
              { label: 'Avalanche', value: 'avalanche' },
              { label: 'Snowball', value: 'snowball' },
            ]}
          />
          <ExtraInputGroup>
            <ExtraLabel>Extra / month</ExtraLabel>
            <Input size="sm" type="number" startAdornment="₹" min="0" step="1000" style={{ width: '6rem' }} value={String(extra)} onChange={e => setExtra(Number(e.target.value) || 0)} />
          </ExtraInputGroup>
        </ControlsGroup>
      }
    >
      <StatsGrid>
        <div>
          <StatLabel>Debt-free</StatLabel>
          <StatValue>
            {result.capped ? '50y+' : debtFreeDate.format('MMM YYYY')}
          </StatValue>
          <StatSubtext>{result.capped ? 'EMIs too low to close' : `${Math.floor(result.months / 12)}y ${result.months % 12}m away`}</StatSubtext>
        </div>
        <div>
          <StatLabel>Total Interest</StatLabel>
          <StatValue>{formatCurrency(Math.round(result.totalInterest))}</StatValue>
          <StatSubtext>over the payoff period</StatSubtext>
        </div>
        <div>
          <StatLabel>Interest Saved</StatLabel>
          <StatValue $positive={interestSaved > 0}>
            {formatCurrency(Math.round(Math.max(interestSaved, 0)))}
          </StatValue>
          <StatSubtext>vs no extra payment</StatSubtext>
        </div>
        <div>
          <StatLabel>Time Saved</StatLabel>
          <StatValue $positive={monthsSaved > 0}>
            {monthsSaved > 0 ? `${Math.floor(monthsSaved / 12)}y ${monthsSaved % 12}m` : '—'}
          </StatValue>
          <StatSubtext>earlier debt-free</StatSubtext>
        </div>
      </StatsGrid>

      {result.payoffOrder.length > 0 && (
        <OrderSection>
          <OrderTitle>Payoff Order</OrderTitle>
          <OrderBadges>
            {result.payoffOrder.map((p, i) => (
              <Badge key={p.name} tone="neutral">
                <span style={{ opacity: 0.5, marginRight: 4 }}>{i + 1}.</span> {p.name}
              </Badge>
            ))}
          </OrderBadges>
        </OrderSection>
      )}
    </Card>
  )
}
