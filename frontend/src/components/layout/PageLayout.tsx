import React, { useEffect } from 'react'
import styled from 'styled-components'

export const PageContainer = styled.div`
  min-height: 100vh;
  background: ${({ theme }) => theme.color.background};
  padding: 16px;
  
  @media (min-width: 768px) {
    padding: 24px;
  }
`

export const PageContent = styled.div`
  max-width: 1440px;
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  gap: 24px;
`

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
