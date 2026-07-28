import styled from 'styled-components'

export interface SparklineProps {
  data: number[]
  width?: number
  height?: number
  /** Stroke color — defaults to the theme accent. */
  stroke?: string
  className?: string
}

const Svg = styled.svg`
  display: block;
  flex-shrink: 0;
`

/**
 * Dependency-free inline sparkline. Flat lines render as a horizontal midline.
 * Purely decorative — hidden from assistive tech.
 */
export function Sparkline({ data, width = 64, height = 24, stroke, className }: SparklineProps) {
  if (!data || data.length < 2) return null
  const min = Math.min(...data)
  const max = Math.max(...data)
  const range = max - min || 1
  const pad = 2
  const step = (width - pad * 2) / (data.length - 1)
  const points = data
    .map((v, i) => `${(pad + i * step).toFixed(1)},${(height - pad - ((v - min) / range) * (height - pad * 2)).toFixed(1)}`)
    .join(' ')
  return (
    <Svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} aria-hidden="true" className={className}>
      <polyline
        points={points}
        fill="none"
        stroke={stroke ?? 'var(--accent, currentColor)'}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  )
}
