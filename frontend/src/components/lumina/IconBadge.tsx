import styled from 'styled-components'
import type { LucideIcon } from 'lucide-react'

export type IconBadgeColor = 'primary' | 'emerald' | 'blue' | 'indigo' | 'purple' | 'red' | 'amber' | 'muted' | 'accent'

export interface IconBadgeProps {
  icon: LucideIcon
  color?: IconBadgeColor
  size?: 'sm' | 'md'
  className?: string
}

// Map color name → {bg, text} using semantic tokens where available, raw hex for kpi colors
const COLOR_MAP: Record<string, { bg: string; color: string }> = {
  primary: { bg: 'rgba(202, 138, 4, 0.1)',  color: '#CA8A04' },
  emerald: { bg: 'rgba(22,163,74,0.1)',  color: '#16a34a' },
  blue:    { bg: 'rgba(2,132,199,0.1)',  color: '#0284c7' },
  indigo:  { bg: 'rgba(99,102,241,0.1)', color: '#6366f1' },
  purple:  { bg: 'rgba(124,58,237,0.1)', color: '#7c3aed' },
  red:     { bg: 'rgba(220,38,38,0.1)',  color: '#dc2626' },
  amber:   { bg: 'rgba(217,119,6,0.1)',  color: '#d97706' },
  muted:   { bg: 'transparent',          color: 'inherit' },
  accent:  { bg: 'rgba(244, 162, 97, 0.1)',   color: '#f4a261' },
}

const FALLBACK = COLOR_MAP['primary']

const SIZE_MAP = { sm: 28, md: 32 }
const ICON_SIZE = { sm: 14, md: 16 }

const Wrap = styled.div<{ $size: number; $bg: string; $color: string }>`
  width: ${({ $size }) => $size}px;
  height: ${({ $size }) => $size}px;
  border-radius: 10px;
  background: ${({ $bg }) => $bg};
  color: ${({ $color }) => $color};
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
`

export function IconBadge({ icon: Icon, color = 'primary', size = 'md', className }: IconBadgeProps) {
  const { bg, color: c } = COLOR_MAP[color] ?? FALLBACK
  return (
    <Wrap $size={SIZE_MAP[size]} $bg={bg} $color={c} className={className}>
      <Icon size={ICON_SIZE[size]} />
    </Wrap>
  )
}
