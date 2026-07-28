/**
 * Backwards-compat Skeleton shim. Rendering is delegated to the @ledgr/ui
 * `Skeleton` so there is a SINGLE source of visual truth (no duplicate pulse /
 * styling implementation). This shim only translates the legacy Tailwind
 * `className` API (~36 call sites) into DS `width`/`height` props.
 *
 * New code: import { Skeleton } from '@ledgr/ui' and pass width/height/shape.
 * This file can be deleted once the remaining call sites are codemod-migrated.
 */
import type { CSSProperties } from 'react'
import { Skeleton as UISkeleton } from '@ledgr/ui'

// Maps common Tailwind h-/w-/rounded- class tokens to CSS values for legacy callers.
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

export function Skeleton({ className, style }: { className?: string; style?: CSSProperties }) {
  const parsed = parseClassName(className)
  const width = parsed.width ?? (style?.width as string | number | undefined)
  const height = parsed.height ?? (style?.height as string | number | undefined)
  // Preserve any other inline style (e.g. margin) but let width/height flow through props.
  const rest: CSSProperties = { ...style }
  delete rest.width
  delete rest.height
  const mergedStyle = parsed.borderRadius ? { borderRadius: parsed.borderRadius, ...rest } : rest
  return <UISkeleton width={width} height={height} style={mergedStyle} />
}
