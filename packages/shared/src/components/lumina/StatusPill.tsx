import styled from 'styled-components'
import { toneColor, toneSurface, type LuminaTone } from './tones'

export type StatusPillTone = LuminaTone

export interface StatusPillProps {
  label: string
  tone?: StatusPillTone
  className?: string
}

const Pill = styled.span<{ $tone: StatusPillTone }>`
  display: inline-flex;
  align-items: center;
  padding: 2px 8px;
  border-radius: ${({ theme }) => theme.radii.sm};
  font-size: 10px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  background: ${({ theme, $tone }) => toneSurface($tone, theme)};
  color: ${({ theme, $tone }) => toneColor($tone, theme)};
`

export function StatusPill({ label, tone = 'neutral', className }: StatusPillProps) {
  return <Pill $tone={tone} className={className}>{label}</Pill>
}
