import React from 'react'
import styled from 'styled-components'
import type { TooltipProps } from 'recharts'

const TooltipContainer = styled.div`
  background-color: ${({ theme }) => theme.color.card};
  border: 1px solid ${({ theme }) => theme.color.border};
  border-radius: ${({ theme }) => theme.radii.md};
  padding: 12px;
  box-shadow: ${({ theme }) => theme.shadow.sm};
  min-width: 140px;
`

const TooltipLabel = styled.p`
  margin: 0;
  margin-bottom: 8px;
  font-size: 13px;
  font-weight: 600;
  color: ${({ theme }) => theme.color.foreground};
`

const TooltipRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 6px;
  font-size: 12px;
  
  &:last-child {
    margin-bottom: 0;
  }
`

const TooltipKey = styled.div`
  display: flex;
  align-items: center;
  gap: 6px;
  color: ${({ theme }) => theme.color.mutedForeground};
`

const TooltipDot = styled.span<{ $color: string }>`
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background-color: ${({ $color }) => $color};
`

const TooltipValue = styled.span`
  font-weight: 600;
  color: ${({ theme }) => theme.color.foreground};
  font-variant-numeric: tabular-nums;
`

export interface ChartTooltipProps extends TooltipProps<number | string | Array<number | string>, string> {
  valueFormatter?: (value: any, name?: string) => string | React.ReactNode;
}

export function ChartTooltip({ active, payload, label, valueFormatter }: ChartTooltipProps) {
  if (active && payload && payload.length) {
    return (
      <TooltipContainer>
        {label && <TooltipLabel>{label}</TooltipLabel>}
        {payload.map((entry, index) => (
          <TooltipRow key={`item-${index}`}>
            <TooltipKey>
              <TooltipDot $color={entry.color || 'var(--primary)'} />
              {entry.name}
            </TooltipKey>
            <TooltipValue>
              {valueFormatter ? valueFormatter(entry.value, entry.name) : entry.value as React.ReactNode}
            </TooltipValue>
          </TooltipRow>
        ))}
      </TooltipContainer>
    )
  }
  return null
}
