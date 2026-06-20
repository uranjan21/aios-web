import React from 'react'
import styled from 'styled-components'
import type { LucideIcon } from 'lucide-react'

/* ── PageHeader ─────────────────────────────────────────────────────── */
const HeaderRoot = styled.div`
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 12px;
  @media (min-width: 640px) {
    flex-direction: row;
    align-items: center;
  }
`

const HeaderLeft = styled.div`
  display: flex;
  align-items: flex-start;
  gap: 12px;
`

const IconWrap = styled.div`
  width: 40px;
  height: 40px;
  border-radius: 12px;
  background: ${({ theme }) => theme.color.primary}12;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  margin-top: 2px;
  color: ${({ theme }) => theme.color.primary};
  box-shadow: ${({ theme }) => theme.shadow.xs};
`

const CategoryLabel = styled.div`
  font-size: 11px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  margin-bottom: 2px;
  display: flex;
  align-items: center;
  gap: 6px;
  color: ${({ theme }) => theme.color.primary};
`

const CategoryLine = styled.span`
  width: 12px;
  height: 1px;
  background: currentColor;
  display: inline-block;
`

const PageTitle = styled.h1`
  font-family: ${({ theme }) => theme.typography.fontFamily.serif};
  font-size: 20px;
  font-weight: 600;
  color: ${({ theme }) => theme.color.foreground};
  letter-spacing: -0.01em;
  margin: 0;
  line-height: 1.2;
`

const PageDesc = styled.p`
  font-size: 13px;
  color: ${({ theme }) => theme.color.mutedForeground};
  margin: 4px 0 0;
`

const Actions = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  flex-shrink: 0;
  flex-wrap: wrap;
`

/** Ghost pill chip for header quick-actions (top-right cluster). icon + label. */
export const ActionChip = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 8px;
  height: 38px;
  padding: 0 16px;
  border: 1px solid ${({ theme }) => theme.color.border};
  border-radius: ${({ theme }) => theme.radii.full};
  background: ${({ theme }) => theme.color.card};
  color: ${({ theme }) => theme.color.foreground};
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  white-space: nowrap;
  transition: background-color 120ms, border-color 120ms, color 120ms;

  & > svg { width: 16px; height: 16px; color: ${({ theme }) => theme.color.mutedForeground}; }

  &:hover {
    background: ${({ theme }) => theme.color.muted};
    border-color: ${({ theme }) => theme.color.mutedForeground};
  }
  &:focus-visible {
    outline: 2px solid ${({ theme }) => theme.color.ring};
    outline-offset: 2px;
  }
`

export function PageHeader({
  title, description, actions, className, icon: Icon, category,
}: {
  title: React.ReactNode
  description?: React.ReactNode
  actions?: React.ReactNode
  className?: string
  icon?: LucideIcon
  category?: string
  categoryColor?: string
}) {
  return (
    <HeaderRoot className={className}>
      <HeaderLeft>
        {Icon && <IconWrap><Icon size={20} /></IconWrap>}
        <div>
          {category && (
            <CategoryLabel>
              <CategoryLine />
              {category}
            </CategoryLabel>
          )}
          <PageTitle>{title}</PageTitle>
          {description && <PageDesc>{description}</PageDesc>}
        </div>
      </HeaderLeft>
      {actions && <Actions>{actions}</Actions>}
    </HeaderRoot>
  )
}

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
