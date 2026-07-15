import styled from 'styled-components'
import type { LucideIcon } from 'lucide-react'
import { toneColor, toneSurface, type LuminaTone } from './tones'

export type IconBadgeColor = LuminaTone

export interface IconBadgeProps {
  icon: LucideIcon
  color?: IconBadgeColor
  size?: 'sm' | 'md'
  className?: string
}

const SIZE_MAP = { sm: 28, md: 32 }
const ICON_SIZE = { sm: 14, md: 16 }

const Wrap = styled.div<{ $size: number; $tone: IconBadgeColor }>`
  width: ${({ $size }) => $size}px;
  height: ${({ $size }) => $size}px;
  border-radius: ${({ theme }) => theme.radii.md};
  background: ${({ theme, $tone }) => toneSurface($tone, theme)};
  color: ${({ theme, $tone }) => toneColor($tone, theme)};
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
`

export function IconBadge({ icon: Icon, color = 'primary', size = 'md', className }: IconBadgeProps) {
  return (
    <Wrap $size={SIZE_MAP[size]} $tone={color} className={className}>
      <Icon size={ICON_SIZE[size]} />
    </Wrap>
  )
}
