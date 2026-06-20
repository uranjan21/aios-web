import { ArrowUp, ArrowDown } from 'lucide-react'
import styled from 'styled-components'
import { Card } from '../primitives/Card/Card'

export interface KpiCardProps {
  label: string
  value: React.ReactNode
  trend?: { value: number; direction: 'up' | 'down' }
  loading?: boolean
  className?: string
}

const SectionLabel = styled.div`
  font-size: 14px;
  font-weight: 500;
  color: ${({ theme }) => theme.color.mutedForeground};
  margin-bottom: 12px;
`

const Value = styled.div`
  font-size: 28px;
  font-weight: 800;
  color: ${({ theme }) => theme.color.foreground};
  font-variant-numeric: tabular-nums;
  margin-bottom: 16px;
`

const Skeleton = styled.div`
  height: 32px;
  width: 120px;
  border-radius: 6px;
  background: ${({ theme }) => theme.color.muted};
  margin-bottom: 16px;
`

const FooterRow = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
`

const TrendPill = styled.div<{ $up: boolean }>`
  display: inline-flex;
  align-items: center;
  gap: 2px;
  padding: 4px 8px;
  border-radius: 9999px;
  font-size: 11px;
  font-weight: 600;
  background: ${({ $up }) => $up ? 'rgba(27, 111, 93, 0.1)' : 'rgba(239, 68, 68, 0.1)'};
  color: ${({ $up }) => $up ? '#1b6f5d' : '#dc2626'};
`

const ContextText = styled.div`
  font-size: 11px;
  color: ${({ theme }) => theme.color.mutedForeground};
`

export function KpiCard({ label, value, trend, loading, className }: KpiCardProps) {
  return (
    <Card size="lg" className={className}>
      <SectionLabel>{label}</SectionLabel>
      {loading ? <Skeleton /> : <Value>{value}</Value>}
      <FooterRow>
        {trend && (
          <TrendPill $up={trend.direction === 'up'}>
            {trend.direction === 'up' ? <ArrowUp size={12} strokeWidth={3} /> : <ArrowDown size={12} strokeWidth={3} />}
            {Math.abs(trend.value)}%
          </TrendPill>
        )}
        <ContextText>Compared to last month</ContextText>
      </FooterRow>
    </Card>
  )
}
