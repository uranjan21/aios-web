/**
 * TabToolbar — thin wrapper over AreaToolbar for backwards compatibility.
 * Existing callers (Health tabs, etc.) can keep using TabToolbar unchanged.
 * The visual treatment and layout now match AreaToolbar exactly.
 */
import type React from 'react'
import { AreaToolbar, type AreaToolbarProps } from './AreaToolbar'

export interface TabToolbarProps {
  /** Deprecated — title is no longer shown in the toolbar. Pass undefined or omit. */
  title?: React.ReactNode
  /** Right-side action controls. If empty, toolbar is not rendered. */
  actions?: React.ReactNode
  className?: string
  style?: React.CSSProperties
}

/** Renders only if `actions` has content — never renders a title-only toolbar. */
export function TabToolbar({ actions, className, style }: TabToolbarProps) {
  if (!actions) return null
  return (
    <AreaToolbar className={className} style={style}>
      {actions}
    </AreaToolbar>
  )
}
