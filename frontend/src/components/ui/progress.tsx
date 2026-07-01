import * as ProgressPrimitive from '@radix-ui/react-progress'
import styled from 'styled-components'

const Root = styled(ProgressPrimitive.Root)`
  position: relative;
  width: 100%;
  overflow: hidden;
  border-radius: ${({ theme }) => theme.radii.sm};
  background: ${({ theme }) => theme.color.muted};
`

const Indicator = styled(ProgressPrimitive.Indicator)<{ $color?: string }>`
  height: 100%;
  border-radius: ${({ theme }) => theme.radii.sm};
  background: ${({ theme, $color }) => $color ?? theme.color.primary};
  transition: width 500ms ease;
`

export function Progress({ value, height = 8, color, className }: {
  value: number
  height?: number
  color?: string
  className?: string
}) {
  return (
    <Root value={value} style={{ height }} className={className}>
      <Indicator
        $color={color}
        style={{ width: `${Math.min(100, Math.max(0, value))}%` }}
      />
    </Root>
  )
}
