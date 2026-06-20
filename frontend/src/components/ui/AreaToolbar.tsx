/**
 * AreaToolbar — THE single shared toolbar used on every page and tab.
 *
 * Always horizontal. Never stacks to column. On mobile it scrolls
 * horizontally instead of wrapping so the control layout stays predictable.
 *
 * Anatomy:
 *   [title / left controls]  |  [right actions]
 *
 * Usage:
 *   <AreaToolbar title="Overview">
 *     <Select … />
 *     <Button … />
 *   </AreaToolbar>
 *
 *   <AreaToolbar left={<DateNav />} title="Transactions">
 *     <Button>Filters</Button>
 *     <Button>Import</Button>
 *   </AreaToolbar>
 */

import type { ReactNode, CSSProperties } from 'react'
import styled from 'styled-components'

// ── Shell ─────────────────────────────────────────────────────────────────────

const Shell = styled.div<{ $fullWidth: boolean }>`
  display: flex;
  align-items: center;
  gap: 8px;
  background: transparent;
  border: none;
  padding: 0;
  margin-bottom: 16px;
  min-height: 44px;
  overflow-x: auto;
  scrollbar-width: none;
  &::-webkit-scrollbar { display: none; }
  flex-shrink: 0;
  width: 100%;
`

// ── Sections ──────────────────────────────────────────────────────────────────

const LeftSlot = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  flex-shrink: 0;
  min-width: 0;
`

export const ToolbarTitle = styled.span`
  font-size: 13px;
  font-weight: 600;
  color: ${({ theme }) => theme.color.foreground};
  white-space: nowrap;
`

export const ToolbarDivider = styled.div`
  width: 1px;
  height: 20px;
  background: ${({ theme }) => theme.color.border};
  flex-shrink: 0;
  margin: 0 4px;
`

const RightSlot = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  margin-left: auto;
  flex-shrink: 0;
`

// ── Convenience sub-components ────────────────────────────────────────────────

/** Small muted label inside the toolbar (e.g., "Showing 24 results") */
export const ToolbarMeta = styled.span`
  font-size: 11px;
  color: ${({ theme }) => theme.color.mutedForeground};
  white-space: nowrap;
`

/** Icon button slot — pill shape, white bg, thin border */
export const ToolbarIconBtn = styled.button`
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 8px 16px;
  border: 1px solid ${({ theme }) => theme.color.border};
  border-radius: 9999px;
  background: ${({ theme }) => theme.color.card};
  color: ${({ theme }) => theme.color.mutedForeground};
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  white-space: nowrap;
  transition: all 120ms;
  &:hover {
    background: ${({ theme }) => theme.color.muted};
    color: ${({ theme }) => theme.color.foreground};
  }
  &:focus-visible {
    outline: 2px solid ${({ theme }) => theme.color.ring};
    outline-offset: 2px;
  }
  &[aria-pressed="true"], &[data-active="true"] {
    background: ${({ theme }) => `${theme.color.primary}10`};
    color: ${({ theme }) => theme.color.primary};
    border-color: ${({ theme }) => theme.color.primary};
  }
`

/** Inline date nav: [ChevronLeft] [Label] [ChevronRight] */
export const DateNav = styled.div`
  display: flex;
  align-items: center;
  gap: 4px;
  flex-shrink: 0;
`

export const DateNavBtn = styled.button`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border-radius: 7px;
  border: none;
  background: transparent;
  color: ${({ theme }) => theme.color.mutedForeground};
  cursor: pointer;
  transition: background 120ms, color 120ms;
  &:hover { background: ${({ theme }) => theme.color.muted}; color: ${({ theme }) => theme.color.foreground}; }
  &:focus-visible { outline: 2px solid ${({ theme }) => theme.color.ring}; outline-offset: 2px; }
`

export const DateNavLabel = styled.span`
  font-size: 12px;
  font-weight: 600;
  color: ${({ theme }) => theme.color.foreground};
  min-width: 100px;
  text-align: center;
  white-space: nowrap;
`

// ── Exports ───────────────────────────────────────────────────────────────────

export interface AreaToolbarProps {
  /** Left-side title text */
  title?: ReactNode
  /** Additional left-side content (selects, date nav, etc.) placed after title */
  left?: ReactNode
  /** Right-side action controls */
  children?: ReactNode
  /** Show the center divider between left and right. Default: true when both sides have content. */
  divider?: boolean
  className?: string
  style?: CSSProperties
}

export function AreaToolbar({ title, left, children, divider, className, style }: AreaToolbarProps) {
  const hasLeft = !!title || !!left
  const hasRight = !!children
  if (!hasLeft && !hasRight) return null

  const showDivider = divider !== false && hasLeft && hasRight

  return (
    <Shell
      $fullWidth={hasLeft}
      className={className}
      style={style}
      role="toolbar"
      aria-label="Page controls"
    >
      {hasLeft && (
        <LeftSlot>
          {title && <ToolbarTitle>{title}</ToolbarTitle>}
          {left}
        </LeftSlot>
      )}
      {showDivider && <ToolbarDivider />}
      {hasRight && <RightSlot>{children}</RightSlot>}
    </Shell>
  )
}
