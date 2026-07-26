import { createElement, isValidElement } from 'react'
import type { ComponentType, ReactNode } from 'react'
import { ArrowUp, ArrowDown } from 'lucide-react'
import styled, { useTheme } from 'styled-components'
import { Card } from '../primitives/Card/Card'
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

const Value = styled.div`
  font-size: ${({ theme }) => theme.typography.fontSize.sm};
  font-weight: 800;
  color: ${({ theme }) => theme.color.foreground};
  font-variant-numeric: tabular-nums;
  margin-bottom: ${({ theme }) => `${theme.spacing[2]}`};
  
  @media ${({ theme }) => theme.media.sm} {
    font-size: ${({ theme }) => theme.typography.fontSize['3xl']};
    margin-bottom: ${({ theme }) => `${theme.spacing[4]}`};
  }
`

const Skeleton = styled.div`
  height: 18px;
  width: 60px;
  border-radius: ${({ theme }) => theme.radii.xs};
  background: ${({ theme }) => theme.color.muted};
  margin-bottom: ${({ theme }) => `${theme.spacing[2]}`};
  
  @media ${({ theme }) => theme.media.sm} {
    height: 32px;
    width: 120px;
    margin-bottom: ${({ theme }) => `${theme.spacing[4]}`};
    border-radius: ${({ theme }) => theme.radii.xs};
  }
`

const FooterRow = styled.div`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => `${theme.spacing[1]}`};
  
  @media ${({ theme }) => theme.media.sm} {
    gap: ${({ theme }) => `${theme.spacing[2]}`};
  }
`

const TrendPill = styled.div<{ $good: boolean }>`
  display: inline-flex;
  align-items: center;
  gap: ${({ theme }) => `${theme.spacing[0.5]}`};
  padding: ${({ theme }) => `${theme.spacing[0.5]} ${theme.spacing[1]}`};
  border-radius: ${({ theme }) => theme.radii.sm};
  font-size: ${({ theme }) => theme.typography.fontSize.xs};
  font-weight: 600;
  background: ${({ theme, $good }) => `color-mix(in srgb, ${$good ? theme.color.success : theme.color.destructive} 12%, transparent)`};
  color: ${({ theme, $good }) => ($good ? theme.color.success : theme.color.destructive)};
  
  & svg {
    width: 10px;
    height: 10px;
  }
  
  @media ${({ theme }) => theme.media.sm} {
    padding: ${({ theme }) => `${theme.spacing[1]} ${theme.spacing[2]}`};
    font-size: ${({ theme }) => theme.typography.fontSize.xs};
    & svg {
      width: 12px;
      height: 12px;
    }
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

const StyledCard = styled(Card)`
  position: relative;
  overflow: hidden;
  border: 1px solid ${({ theme }) =>
    theme.mode === 'dark' ? 'rgba(255, 255, 255, 0.1)' : theme.color.border};
  background: ${({ theme }) =>
    theme.mode === 'dark'
      ? 'linear-gradient(180deg, rgba(30, 32, 40, 0.8) 0%, rgba(20, 21, 26, 0.6) 100%)'
      : 'linear-gradient(180deg, rgba(255, 255, 255, 0.95) 0%, rgba(250, 250, 252, 0.8) 100%)'};
  backdrop-filter: blur(12px);
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.05);
  transition:
    box-shadow ${({ theme }) => `${theme.motion.duration.normal} ${theme.motion.easing.standard}`},
    transform  ${({ theme }) => `${theme.motion.duration.normal} ${theme.motion.easing.standard}`},
    border-color ${({ theme }) => `${theme.motion.duration.normal} ${theme.motion.easing.standard}`};
  
  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 12px 40px rgba(0, 0, 0, 0.08);
    border-color: ${({ theme }) => theme.color.accent}80;
  }
`

export function KpiCard({ label, value, icon, sub, action, delta, spark, loading, className }: KpiCardProps) {
  const theme = useTheme()
  return (
    <StyledCard
      size="lg"
      className={className}
      title={label}
      subtitle={sub}
      icon={renderIcon(icon)}
      action={action}
      style={{ height: '100%' }}
    >
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end' }}>
        {loading ? <Skeleton /> : (
          <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 8 }}>
            <Value>{value}</Value>
            {spark && spark.length > 1 && <Sparkline data={spark} stroke={theme?.color?.accent} />}
          </div>
        )}
      </div>
      {delta && (
        <FooterRow>
          <TrendPill $good={delta.good ?? delta.direction === 'up'}>
            {delta.direction === 'up' ? <ArrowUp strokeWidth={3} /> : <ArrowDown strokeWidth={3} />}
            {Math.abs(delta.value)}%
          </TrendPill>
        </FooterRow>
      )}
    </StyledCard>
  )
}
