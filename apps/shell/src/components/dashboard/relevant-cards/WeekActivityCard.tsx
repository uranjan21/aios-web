import { useMemo } from 'react'
import styled, { useTheme } from 'styled-components'
import { useQuery } from '@tanstack/react-query'
import { Activity, AlertCircle } from 'lucide-react'
import { Card } from '@ledgr/ui'
import { capturesApi } from '@ct/shared/api/areas'
import { fmtDateKey } from '@ct/shared/stores/dayEventsStore'
import { Skeleton } from '@ct/shared/components/ui/skeleton'
import { Empty } from './shared'

/* ───────────────── 2. WeekActivityCard ───────────────── */

const BarsWrap = styled.div`
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: ${({ theme }) => `${theme.spacing[1.5]}`};
  align-items: end;
  height: 90px;
  margin-top: ${({ theme }) => `${theme.spacing[1]}`};
`

const BarColumn = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: ${({ theme }) => `${theme.spacing[1]}`};
  height: 100%;
  justify-content: flex-end;
`

const Bar = styled.div<{ $heightPct: number; $today: boolean }>`
  width: 100%;
  height: ${({ $heightPct }) => Math.max(4, $heightPct)}%;
  background: ${({ theme, $today }) => $today ? theme.color.accent : theme.color.foreground + 'AA'};
  border-radius: 4px 4px 2px 2px;
  transition: height 220ms ease-out;
`

const DowSm = styled.span<{ $today: boolean }>`
  font-size: ${({ theme }) => theme.typography.fontSize.xs};
  font-weight: ${({ $today }) => $today ? 700 : 500};
  color: ${({ theme, $today }) => $today ? theme.color.accent : theme.color.mutedForeground};
`

const Total = styled.div`
  margin-top: ${({ theme }) => `${theme.spacing[3]}`};
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  padding-top: ${({ theme }) => `${theme.spacing[2.5]}`};
  border-top: 1px solid ${({ theme }) => theme.color.border};
`

const TotalNum = styled.span`
  font-size: ${({ theme }) => theme.typography.fontSize.xl};
  font-weight: 700;
  color: ${({ theme }) => theme.color.foreground};
  font-variant-numeric: tabular-nums;
`

const TotalLabel = styled.span`
  font-size: ${({ theme }) => theme.typography.fontSize.xs};
  color: ${({ theme }) => theme.color.mutedForeground};
  text-transform: uppercase;
  letter-spacing: 0.06em;
`

export function WeekActivityCard() {
  const theme = useTheme()
  const { data: captures, isLoading, isError } = useQuery({
    queryKey: ['captures', 'list'],
    queryFn: () => capturesApi.list(),
    staleTime: 60_000,
  })

  const week = useMemo(() => {
    const buckets: Array<{ date: Date; key: string; count: number; dow: string }> = []
    const todayDow = ['Su','Mo','Tu','We','Th','Fr','Sa']
    for (let i = 6; i >= 0; i--) {
      const d = new Date()
      d.setDate(d.getDate() - i)
      buckets.push({ date: d, key: fmtDateKey(d), count: 0, dow: todayDow[d.getDay()] })
    }
    if (Array.isArray(captures)) {
      for (const c of captures as Array<{ created_at?: string }>) {
        if (!c.created_at) continue
        const key = fmtDateKey(new Date(c.created_at))
        const b = buckets.find((x) => x.key === key)
        if (b) b.count += 1
      }
    }
    return buckets
  }, [captures])

  const max = Math.max(1, ...week.map((b) => b.count))
  const total = week.reduce((acc, b) => acc + b.count, 0)
  const todayKey = fmtDateKey(new Date())

  return (
    <Card title="This Week" subtitle="Captures per day" icon={<Activity size={14} style={{ color: theme.domain.career }} />}>
      {isError ? (
        <Empty style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <AlertCircle size={13} /> Failed to load captures.
        </Empty>
      ) : isLoading ? (
        <Skeleton style={{ height: 110, width: '100%' }} />
      ) : (
        <>
          <BarsWrap>
            {week.map((b) => (
              <BarColumn key={b.key}>
                <Bar $heightPct={(b.count / max) * 100} $today={b.key === todayKey} title={`${b.count} captures`} />
                <DowSm $today={b.key === todayKey}>{b.dow}</DowSm>
              </BarColumn>
            ))}
          </BarsWrap>
          <Total>
            <div>
              <TotalNum>{total}</TotalNum>
              <TotalLabel style={{ marginLeft: 6 }}>logged</TotalLabel>
            </div>
            <TotalLabel>last 7 days</TotalLabel>
          </Total>
        </>
      )}
    </Card>
  )
}
