import { useMemo, useState } from 'react'
import { Segmented, InputNumber, Tag } from 'antd'
import dayjs from 'dayjs'
import { Landmark } from 'lucide-react'
import { formatCurrency } from '@/lib/utils'
import type { FinanceLoan } from '@/types'

type Strategy = 'avalanche' | 'snowball'

type SimLoan = { id: string; name: string; balance: number; rate: number; emi: number; paidOffMonth?: number }

type SimResult = {
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
    <div className="bg-card border-0 rounded-2xl shadow-sm p-4 mt-4">
      <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <Landmark size={14} className="text-muted-foreground" />
          <h2 className="text-[12px] font-semibold uppercase tracking-wide text-muted-foreground">Debt Payoff Planner</h2>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <Segmented
            size="small"
            value={strategy}
            onChange={v => setStrategy(v as Strategy)}
            options={[
              { label: 'Avalanche (highest rate)', value: 'avalanche' },
              { label: 'Snowball (smallest first)', value: 'snowball' },
            ]}
          />
          <div className="flex items-center gap-1.5">
            <span className="text-[11px] text-muted-foreground">Extra / month</span>
            <InputNumber size="small" prefix="₹" min={0} step={1000} className="w-28" value={extra} onChange={v => setExtra(v ?? 0)} />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-3">
        <div>
          <div className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider mb-0.5">Debt-free</div>
          <div className="text-[12px] font-medium text-foreground tracking-tight">
            {result.capped ? '50y+' : debtFreeDate.format('MMM YYYY')}
          </div>
          <div className="text-[10px] text-muted-foreground">{result.capped ? 'EMIs too low to close' : `${Math.floor(result.months / 12)}y ${result.months % 12}m away`}</div>
        </div>
        <div>
          <div className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider mb-0.5">Total Interest</div>
          <div className="text-[12px] font-medium text-foreground tracking-tight">{formatCurrency(Math.round(result.totalInterest))}</div>
          <div className="text-[10px] text-muted-foreground">over the payoff period</div>
        </div>
        <div>
          <div className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider mb-0.5">Interest Saved</div>
          <div className={`text-[12px] font-medium tracking-tight ${interestSaved > 0 ? 'text-emerald-500' : 'text-foreground'}`}>
            {formatCurrency(Math.round(Math.max(interestSaved, 0)))}
          </div>
          <div className="text-[10px] text-muted-foreground">vs no extra payment</div>
        </div>
        <div>
          <div className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider mb-0.5">Time Saved</div>
          <div className={`text-[12px] font-medium tracking-tight ${monthsSaved > 0 ? 'text-emerald-500' : 'text-foreground'}`}>
            {monthsSaved > 0 ? `${Math.floor(monthsSaved / 12)}y ${monthsSaved % 12}m` : '—'}
          </div>
          <div className="text-[10px] text-muted-foreground">earlier debt-free</div>
        </div>
      </div>

      {result.payoffOrder.length > 0 && (
        <div>
          <div className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide mb-1.5">Payoff Order</div>
          <div className="flex flex-wrap gap-2">
            {result.payoffOrder.map((p, i) => (
              <Tag key={p.name} color={i === 0 ? 'processing' : 'default'}>
                {i + 1}. {p.name} — {dayjs().add(p.month, 'month').format('MMM YYYY')}
              </Tag>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
