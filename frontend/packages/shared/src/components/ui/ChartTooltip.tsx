import React from 'react'
import styled from 'styled-components'
import type { TooltipProps } from 'recharts'

const TooltipContainer = styled.div`
  background-color: ${({ theme }) => theme.color.card};
  border: 1px solid ${({ theme }) => theme.color.border};
  border-radius: ${({ theme }) => theme.radii.md};
  padding: ${({ theme }) => `${theme.spacing[3]}`};
  box-shadow: ${({ theme }) => theme.elevation[1]};
  min-width: 140px;
`

const TooltipLabel = styled.p`
  margin: 0;
  margin-bottom: ${({ theme }) => `${theme.spacing[2]}`};
  font-size: ${({ theme }) => theme.typography.fontSize.sm};
  font-weight: 600;
  color: ${({ theme }) => theme.color.foreground};
`

const TooltipRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: ${({ theme }) => `${theme.spacing[4]}`};
  margin-bottom: ${({ theme }) => `${theme.spacing[1.5]}`};
  font-size: ${({ theme }) => theme.typography.fontSize.sm};
  
  &:last-child {
    margin-bottom: 0;
  }
`

const TooltipKey = styled.div`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => `${theme.spacing[1.5]}`};
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
