import { KpiCard } from '@ledgr/ui'
import { TrendingUp, TrendingDown, Wallet } from 'lucide-react'
import { formatCurrency } from '@/lib/utils'
import styled from 'styled-components'

const KpiGrid = styled.div`
  display: flex;
  overflow-x: auto;
  gap: 8px;
  padding-bottom: 4px;
  margin-bottom: 8px;

  scrollbar-width: none;
  -ms-overflow-style: none;
  &::-webkit-scrollbar { display: none; }

  > * {
    flex: 0 0 auto;
    min-width: 140px;
  }

  @media (min-width: 640px) {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 12px;
    padding-bottom: 0;

    > * { min-width: 0; }
  }
`

export function SummaryBar({ income, expense }: { income: number; expense: number }) {
  const net = income - expense
  return (
    <KpiGrid>
      <KpiCard label="Income" value={formatCurrency(income)} color="primary" icon={TrendingUp} />
      <KpiCard label="Expenses" value={formatCurrency(expense)} color="rose" icon={TrendingDown} />
      <KpiCard label="Net" value={formatCurrency(net)} color={net >= 0 ? 'foreground' : 'rose'} icon={Wallet} />
    </KpiGrid>
  )
}
