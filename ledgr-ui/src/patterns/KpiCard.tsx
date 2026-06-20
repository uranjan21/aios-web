import { createElement, isValidElement } from 'react'
import type { ComponentType, ReactNode } from 'react'
import { ArrowUp, ArrowDown } from 'lucide-react'
import styled from 'styled-components'
import { Card } from '../primitives/Card/Card'

type LucideIcon = ComponentType<{ size?: number | string; className?: string }>

export interface KpiCardProps {
  label: string
  value: React.ReactNode
  /** Optional icon rendered in the card header next to the label. Accepts a Lucide icon component or any ReactNode. */
  icon?: LucideIcon | ReactNode
  /** Optional one-line subtitle rendered below the label. Overrides the default "Compared to last month" footer when set. */
  sub?: string
  /** Right-aligned header action (e.g. a small Badge or filter). */
  action?: ReactNode
  /** @deprecated retained for backwards-compat — no-op. Use theme to control accent. */
  color?: string
  trend?: { value: number; direction: 'up' | 'down' }
  loading?: boolean
  className?: string
}

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

function renderIcon(icon: KpiCardProps['icon']): ReactNode {
  if (!icon) return null
  // Already a React element (e.g. <Scale size={16} />) — pass through.
  if (isValidElement(icon)) return icon
  // Component reference (function or forwardRef object, e.g. lucide-react icons) — instantiate.
  if (typeof icon === 'function' || (typeof icon === 'object' && icon !== null && '$$typeof' in icon)) {
    return createElement(icon as ComponentType<{ size?: number | string }>, { size: 16 })
  }
  return icon as ReactNode
}

export function KpiCard({ label, value, icon, sub, action, trend, loading, className }: KpiCardProps) {
  return (
    <Card
      size="lg"
      className={className}
      title={label}
      subtitle={sub}
      icon={renderIcon(icon)}
      action={action}
    >
      {loading ? <Skeleton /> : <Value>{value}</Value>}
      {(trend || !sub) && (
        <FooterRow>
          {trend && (
            <TrendPill $up={trend.direction === 'up'}>
              {trend.direction === 'up' ? <ArrowUp size={12} strokeWidth={3} /> : <ArrowDown size={12} strokeWidth={3} />}
              {Math.abs(trend.value)}%
            </TrendPill>
          )}
          {!sub && <ContextText>Compared to last month</ContextText>}
        </FooterRow>
      )}
    </Card>
  )
}
