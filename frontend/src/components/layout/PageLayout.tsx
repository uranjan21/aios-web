import React, { useEffect } from 'react'
import styled from 'styled-components'



/* ── PageToolbar — same card style as AreaToolbar for consistency ──── */
import { AreaToolbar } from '@/components/ui/AreaToolbar'

/** Only renders when `children` are present — never renders a title-only toolbar. */
export function PageToolbar({ children, className, title }: {
  children?: React.ReactNode
  className?: string
  title?: React.ReactNode
}) {
  if (!children && !title) return null
  return (
    <AreaToolbar className={className} title={title}>
      {children}
    </AreaToolbar>
  )
}
