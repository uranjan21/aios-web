import styled, { keyframes } from 'styled-components'

const pulse = keyframes`
  0%, 100% { opacity: 1; }
  50%       { opacity: 0.4; }
`

// Maps common Tailwind h-/w- class tokens to CSS values for backwards-compat callers.
const H_MAP: Record<string, string> = {
  'h-1.5': '6px', 'h-2': '8px', 'h-3': '12px', 'h-3.5': '14px',
  'h-4': '16px', 'h-5': '20px', 'h-6': '24px', 'h-8': '32px', 'h-10': '40px',
  'h-12': '48px', 'h-16': '64px', 'h-20': '80px', 'h-36': '144px',
  'h-28': '112px', 'h-[40px]': '40px', 'h-[64px]': '64px',
  'h-[140px]': '140px', 'h-[200px]': '200px', 'h-[240px]': '240px',
  'h-[300px]': '300px', 'h-[400px]': '400px',
}
const W_MAP: Record<string, string> = {
  'w-full': '100%', 'w-5/6': '83.333%', 'w-4/6': '66.667%',
  'w-3/4': '75%', 'w-1/2': '50%', 'w-8': '32px', 'w-16': '64px',
  'w-20': '80px', 'w-24': '96px', 'w-32': '128px', 'w-36': '144px',
  'w-40': '160px', 'w-48': '192px', 'w-64': '256px',
}
const ROUND_MAP: Record<string, string> = {
  'rounded': '4px', 'rounded-md': '6px', 'rounded-lg': '8px',
  'rounded-xl': '12px', 'rounded-2xl': '18px', 'rounded-full': '9999px',
}

function parseClassName(className = '') {
  const tokens = className.split(/\s+/)
  const h = tokens.find(t => H_MAP[t])
  const w = tokens.find(t => W_MAP[t])
  const r = tokens.find(t => ROUND_MAP[t])
  return {
    height: h ? H_MAP[h] : undefined,
    width: w ? W_MAP[w] : undefined,
    borderRadius: r ? ROUND_MAP[r] : undefined,
  }
}

const Root = styled.div<{ $h?: string; $w?: string; $r?: string }>`
  border-radius: ${({ $r }) => $r ?? '6px'};
  background: ${({ theme }) => theme.color.muted};
  animation: ${pulse} 1.5s ease-in-out infinite;
  height: ${({ $h }) => $h ?? '16px'};
  width: ${({ $w }) => $w ?? '100%'};
`

export function Skeleton({ className, style }: { className?: string; style?: React.CSSProperties }) {
  const { height, width, borderRadius } = parseClassName(className)
  return (
    <Root
      $h={height ?? style?.height?.toString()}
      $w={width ?? style?.width?.toString()}
      $r={borderRadius}
      style={style}
    />
  )
}
