import type { ReactNode } from 'react'
import styled from 'styled-components'

interface TextTabOption {
  label: ReactNode
  value: string
}

interface TextTabsProps {
  options: (string | TextTabOption)[]
  value: string
  onChange: (value: string) => void
  block?: boolean
  className?: string
}

const Container = styled.div<{ $block?: boolean }>`
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 4px;
  background: ${({ theme }) => theme.color.muted};
  border-radius: 999px;
  overflow-x: auto;
  scrollbar-width: none;
  &::-webkit-scrollbar { display: none; }
  ${({ $block }) => $block ? 'width: 100%;' : ''}
`

const TabBtn = styled.button<{ $active: boolean; $block?: boolean }>`
  position: relative;
  padding: 10px 16px;
  font-size: 12px;
  font-weight: 500;
  white-space: nowrap;
  border-radius: 999px;
  border: none;
  cursor: pointer;
  transition: background 120ms, color 120ms, box-shadow 120ms;
  ${({ $block }) => $block ? 'flex: 1; text-align: center;' : ''}
  
  &:focus-visible {
    outline: 2px solid ${({ theme }) => theme.color.ring};
    outline-offset: 2px;
  }

  ${({ theme, $active }) => $active
    ? `
      background: ${theme.color.primary};
      color: ${theme.color.primaryForeground};
      box-shadow: ${theme.shadow.sm};
    `
    : `
      background: transparent;
      color: color-mix(in srgb, ${theme.color.foreground} 70%, transparent);
      &:hover {
        color: ${theme.color.foreground};
        background: color-mix(in srgb, ${theme.color.foreground} 8%, transparent);
      }
    `
  }
`

/** Minimal pill-style tab switcher with an active filled button. */
export function TextTabs({ options, value, onChange, block, className }: TextTabsProps) {
  const items = options.map(o => (typeof o === 'string' ? { label: o, value: o } : o))

  return (
    <Container $block={block} className={className}>
      {items.map(item => (
        <TabBtn
          key={item.value}
          type="button"
          $active={value === item.value}
          $block={block}
          onClick={() => onChange(item.value)}
        >
          {item.label}
        </TabBtn>
      ))}
    </Container>
  )
}
