/**
 * A loan's recorded payment history, with its principal/interest split.
 *
 * The split is written at the moment a payment is marked paid, because the
 * interest share depends on the outstanding balance AT THAT TIME and cannot be
 * recomputed afterwards. Payments recorded before that capture existed carry
 * `principal: null, interest: null`.
 *
 * NULL IS NOT ZERO here, and the distinction is load-bearing: rendering an
 * unknown split as 100% principal would tell the user this EMI cost them no
 * interest, which is both false and the opposite of the truth. Those rows draw
 * as a single neutral bar labelled "split not recorded".
 */
import { useMemo } from 'react'
import styled, { useTheme } from 'styled-components'
import dayjs from 'dayjs'
import type { LoanPayments } from '@ct/shared/api/areas'
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

const Legend = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: ${({ theme }) => theme.spacing[4]};
`

const LegendItem = styled.span`
  display: inline-flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing[2]};
  font-size: ${({ theme }) => theme.typography.fontSize.xs};
  color: ${({ theme }) => theme.color.mutedForeground};
`

const Swatch = styled.span<{ $color: string }>`
  width: 10px;
  height: 10px;
  border-radius: ${({ theme }) => theme.radii.xs};
  background: ${({ $color }) => $color};
  flex-shrink: 0;
`

const List = styled.ul`
  list-style: none;
  margin: 0;
  padding: 0;
  max-height: 240px;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.spacing[3]};
`

const Item = styled.li`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.spacing[1.5]};
`

const ItemHead = styled.div`
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: ${({ theme }) => theme.spacing[3]};
`

const Period = styled.span`
  font-size: ${({ theme }) => theme.typography.fontSize.xs};
  font-weight: 600;
`

const Total = styled.span`
  font-size: ${({ theme }) => theme.typography.fontSize.xs};
  font-variant-numeric: tabular-nums;
`

/* One stacked track per payment: principal then interest, widths in percent of
   that payment's total. */
const Track = styled.div`
  display: flex;
  height: 8px;
  width: 100%;
  border-radius: ${({ theme }) => theme.radii.xs};
  overflow: hidden;
  background: ${({ theme }) => theme.color.muted};
`

const Seg = styled.div<{ $pct: number; $color: string }>`
  width: ${({ $pct }) => $pct}%;
  background: ${({ $color }) => $color};
`

const Split = styled.div`
  display: flex;
  gap: ${({ theme }) => theme.spacing[3]};
  font-size: ${({ theme }) => theme.typography.fontSize.xs};
  color: ${({ theme }) => theme.color.mutedForeground};
  font-variant-numeric: tabular-nums;
`

const Unknown = styled.span`
  font-size: ${({ theme }) => theme.typography.fontSize.xs};
  color: ${({ theme }) => theme.color.mutedForeground};
  font-style: italic;
`

const Empty = styled.p`
  font-size: ${({ theme }) => theme.typography.fontSize.xs};
  color: ${({ theme }) => theme.color.mutedForeground};
  margin: 0;
`

export function LoanPaymentsPanel({ data }: { data?: LoanPayments }) {
  const theme = useTheme()
  const rows = useMemo(() => [...(data?.payments ?? [])].reverse(), [data])

  const PRINCIPAL = theme.color.success
  const INTEREST = theme.color.destructive
  const UNRECORDED = theme.color.border

  return (
    <Wrap>
      <Heading>Payment history</Heading>

      {!rows.length ? (
        <Empty>
          No payments recorded yet. Mark an EMI paid on the Bills page and its principal/interest
          split is captured here.
        </Empty>
      ) : (
        <>
          <Legend>
            <LegendItem><Swatch $color={PRINCIPAL} />Principal</LegendItem>
            <LegendItem><Swatch $color={INTEREST} />Interest</LegendItem>
            <LegendItem><Swatch $color={UNRECORDED} />Split not recorded</LegendItem>
          </Legend>

          <List>
            {rows.map((p) => {
              const known = p.principal != null && p.interest != null
              const total = p.amount || 1
              const principalPct = known ? Math.max(0, Math.min(100, (p.principal! / total) * 100)) : 0
              const interestPct = known ? Math.max(0, Math.min(100, (p.interest! / total) * 100)) : 0

              return (
                <Item key={p.period}>
                  <ItemHead>
                    <Period>
                      {dayjs(`${p.period}-01`).format('MMM YYYY')}
                      {p.paid_at ? ` · paid ${dayjs(p.paid_at).format('D MMM')}` : ''}
                    </Period>
                    <Total>{formatCurrency(p.amount)}</Total>
                  </ItemHead>

                  <Track>
                    {known ? (
                      <>
                        <Seg $pct={principalPct} $color={PRINCIPAL} />
                        <Seg $pct={interestPct} $color={INTEREST} />
                      </>
                    ) : (
                      /* Deliberately ONE neutral bar. Not 100% principal — the
                         split is unknown, not zero-interest. */
                      <Seg $pct={100} $color={UNRECORDED} />
                    )}
                  </Track>

                  {known ? (
                    <Split>
                      <span>Principal {formatCurrency(p.principal!)}</span>
                      <span>Interest {formatCurrency(p.interest!)}</span>
                    </Split>
                  ) : (
                    <Unknown>Split not recorded for this payment.</Unknown>
                  )}
                </Item>
              )
            })}
          </List>
        </>
      )}
    </Wrap>
  )
}
