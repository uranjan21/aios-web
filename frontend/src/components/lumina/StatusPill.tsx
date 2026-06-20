import styled from 'styled-components'

export type StatusPillTone = 'neutral' | 'primary' | 'emerald' | 'blue' | 'purple' | 'red' | 'amber' | 'accent' | 'muted'

export interface StatusPillProps {
  label: string
  tone?: StatusPillTone
  className?: string
}

const TONE_STYLES: Record<StatusPillTone, { bg: string; color: string }> = {
  neutral: { bg: 'rgba(12, 10, 9, 0.06)',   color: '#78716C' },
  primary: { bg: 'rgba(202, 138, 4, 0.1)',  color: '#CA8A04' },
  emerald: { bg: 'rgba(22,163,74,0.1)', color: '#16a34a' },
  blue:    { bg: 'rgba(2,132,199,0.1)', color: '#0284c7' },
  purple:  { bg: 'rgba(124,58,237,0.1)',color: '#7c3aed' },
  red:     { bg: 'rgba(220,38,38,0.1)', color: '#dc2626' },
  amber:   { bg: 'rgba(217,119,6,0.1)', color: '#d97706' },
  accent:  { bg: 'rgba(244, 162, 97, 0.1)', color: '#f4a261' },
  muted:   { bg: 'transparent',         color: 'inherit' },
}

const Pill = styled.span<{ $bg: string; $color: string }>`
  display: inline-flex;
  align-items: center;
  padding: 2px 8px;
  border-radius: 9999px;
  font-size: 10px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  background: ${({ $bg }) => $bg};
  color: ${({ $color }) => $color};
`

export function StatusPill({ label, tone = 'neutral', className }: StatusPillProps) {
  const { bg, color } = TONE_STYLES[tone]
  return <Pill $bg={bg} $color={color} className={className}>{label}</Pill>
}
