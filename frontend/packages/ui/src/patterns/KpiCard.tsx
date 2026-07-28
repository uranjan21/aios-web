import { createElement, isValidElement } from 'react'
import type { ComponentType, ReactNode } from 'react'
import { ArrowUp, ArrowDown } from 'lucide-react'
import styled, { useTheme } from 'styled-components'
import { Sparkline } from './Sparkline'

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
  delta?: { value: number; direction: 'up' | 'down'; good?: boolean }
  /** Optional 30-day (or similar) series rendered as a small sparkline beside the value. */
  spark?: number[]
  loading?: boolean
  className?: string
}

/*
 * Rebuilt 2026-07-27. The KPI used to borrow Card's *heading* machinery: the
 * label rendered as CardTitle (a 17px semibold h2) above a full-width rule,
 * with the number underneath at weight 800 — a weight that isn't in the token
 * scale at all. That inverts the hierarchy; on a KPI the number is the content
 * and the label is the caption. The surface is now purpose-shaped: caption row,
 * hero numeral, trend row. No divider, no borrowed heading.
 */

const Surface = styled.div`
  position: relative;
  display: flex;
  flex-direction: column;
  height: 100%;
  gap: ${({ theme }) => theme.spacing[3]};
  padding: ${({ theme }) => theme.spacing[4]};
  border-radius: ${({ theme }) => theme.radii.md};
  background: ${({ theme }) => theme.color.card};
  border: ${({ theme }) => theme.border.hairline} solid ${({ theme }) => theme.color.border};
  box-shadow: ${({ theme }) => theme.elevation[1]};
  transition:
    box-shadow ${({ theme }) => `${theme.motion.duration.normal} ${theme.motion.easing.standard}`},
    transform ${({ theme }) => `${theme.motion.duration.normal} ${theme.motion.easing.standard}`},
    border-color ${({ theme }) => `${theme.motion.duration.normal} ${theme.motion.easing.standard}`};

  &:hover {
    transform: translateY(-1px);
    box-shadow: ${({ theme }) => theme.elevation[2]};
    border-color: ${({ theme }) => `color-mix(in srgb, ${theme.color.accent} 30%, ${theme.color.border})`};
  }

  @media ${({ theme }) => theme.media.sm} {
    padding: ${({ theme }) => theme.spacing[5]};
  }
`

const LabelRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: ${({ theme }) => theme.spacing[2]};
  min-width: 0;
`

const LabelGroup = styled.div`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing[2]};
  min-width: 0;
`

const IconChip = styled.span`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  width: 26px;
  height: 26px;
  border-radius: ${({ theme }) => theme.radii.sm};
  background: ${({ theme }) => `color-mix(in srgb, ${theme.color.accent} 12%, transparent)`};
  color: ${({ theme }) => theme.color.accent};

  & svg {
    width: 14px;
    height: 14px;
  }
`

const Label = styled.span`
  font-size: ${({ theme }) => theme.typography.fontSize.xs};
  font-weight: 500;
  letter-spacing: 0.01em;
  color: ${({ theme }) => theme.color.mutedForeground};
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  min-width: 0;
`

const Value = styled.div`
  font-size: ${({ theme }) => theme.typography.fontSize.xl};
  font-weight: ${({ theme }) => theme.typography.fontWeight.semibold};
  letter-spacing: -0.02em;
  line-height: 1.1;
  color: ${({ theme }) => theme.color.foreground};
  font-variant-numeric: tabular-nums;
  font-feature-settings: 'tnum' 1;

  @media ${({ theme }) => theme.media.sm} {
    font-size: ${({ theme }) => theme.typography.fontSize['2xl']};
  }
`

/* Hidden below sm: KPIs share a row height in the mobile scroller, so one card
   carrying a sub would add a line to every card in the row. */
const Sub = styled.span`
  display: none;
  font-size: ${({ theme }) => theme.typography.fontSize.xs};
  color: ${({ theme }) => theme.color.mutedForeground};
  line-height: 1.4;

  @media ${({ theme }) => theme.media.sm} {
    display: block;
  }
`

const Skeleton = styled.div`
  height: 22px;
  width: 72px;
  border-radius: ${({ theme }) => theme.radii.xs};
  background: ${({ theme }) => theme.color.muted};

  @media ${({ theme }) => theme.media.sm} {
    height: 30px;
    width: 116px;
  }
`

const FooterRow = styled.div`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => `${theme.spacing[2]}`};
  margin-top: auto;
`

const TrendPill = styled.div<{ $good: boolean }>`
  display: inline-flex;
  align-items: center;
  gap: ${({ theme }) => `${theme.spacing[1]}`};
  padding: ${({ theme }) => `3px ${theme.spacing[1.5]}`};
  border-radius: ${({ theme }) => theme.radii.xs};
  font-size: ${({ theme }) => theme.typography.fontSize.xs};
  font-weight: 600;
  font-variant-numeric: tabular-nums;
  background: ${({ theme, $good }) => `color-mix(in srgb, ${$good ? theme.color.success : theme.color.destructive} 12%, transparent)`};
  color: ${({ theme, $good }) => ($good ? theme.color.success : theme.color.destructive)};

  & svg {
    width: 11px;
    height: 11px;
  }
`

export const KpiGrid = styled.div<{ $cols?: number }>`
  display: flex;
  overflow-x: auto;
  /* When placed in a height-constrained flex column, overflow-x:auto makes
     overflow-y computed 'auto' too — without this the grid silently shrinks
     and vertically clips the KPI values. */
  flex-shrink: 0;
  gap: ${({ theme }) => `${theme.spacing[2]}`};
  padding-bottom: ${({ theme }) => `${theme.spacing[1]}`};
  margin-bottom: ${({ theme }) => `${theme.spacing[2]}`};
  
  scrollbar-width: none;
  -ms-overflow-style: none;
  &::-webkit-scrollbar { display: none; }

  scroll-snap-type: x mandatory;
  -webkit-mask-image: linear-gradient(to right, black 90%, transparent 100%);
  mask-image: linear-gradient(to right, black 90%, transparent 100%);
  
  > * {
    flex: 0 0 auto;
    min-width: 140px;
    scroll-snap-align: start;
  }

  @media ${({ theme }) => theme.media.sm} {
    display: grid;
    -webkit-mask-image: none;
    mask-image: none;
    grid-template-columns: repeat(${({ $cols }) => $cols || 4}, minmax(0, 1fr));
    gap: ${({ theme }) => `${theme.spacing[3]}`};
    padding-bottom: 0;
    
    > * { min-width: 0; }
  }
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

const ValueRow = styled.div`
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: ${({ theme }) => theme.spacing[2]};
  min-width: 0;
`

const ValueCol = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.spacing[1]};
  min-width: 0;
`

export function KpiCard({ label, value, icon, sub, action, delta, spark, loading, className }: KpiCardProps) {
  const theme = useTheme()
  const renderedIcon = renderIcon(icon)

  return (
    <Surface className={className}>
      <LabelRow>
        <LabelGroup>
          {renderedIcon && <IconChip aria-hidden="true">{renderedIcon}</IconChip>}
          <Label>{label}</Label>
        </LabelGroup>
        {action}
      </LabelRow>

      {loading ? <Skeleton /> : (
        <ValueRow>
          <ValueCol>
            <Value>{value}</Value>
            {sub && <Sub>{sub}</Sub>}
          </ValueCol>
          {spark && spark.length > 1 && <Sparkline data={spark} stroke={theme?.color?.accent} />}
        </ValueRow>
      )}

      {delta && (
        <FooterRow>
          <TrendPill $good={delta.good ?? delta.direction === 'up'}>
            {delta.direction === 'up' ? <ArrowUp strokeWidth={3} /> : <ArrowDown strokeWidth={3} />}
            {Math.abs(delta.value)}%
          </TrendPill>
        </FooterRow>
      )}
    </Surface>
  )
}
