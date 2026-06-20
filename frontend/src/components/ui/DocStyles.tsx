import React from 'react'
import { AlertCircle, Lightbulb, Info } from 'lucide-react'
import styled from 'styled-components'

export const DocSection = styled.section`
  margin-bottom: 48px;
`

const DocH1Root = styled.h1`
  font-family: ${({ theme }) => theme.typography.fontFamily.serif};
  font-size: 36px;
  font-weight: 700;
  letter-spacing: -0.02em;
  margin: 0 0 16px;
  display: flex;
  align-items: center;
  gap: 12px;
  color: ${({ theme }) => theme.color.foreground};
  line-height: 1.15;
`

export function DocH1({ children, icon: Icon }: { children: React.ReactNode; icon?: any }) {
  return (
    <DocH1Root>
      {Icon && <Icon size={32} style={{ color: 'var(--color-primary, #F8D168)', flexShrink: 0 }} />}
      {children}
    </DocH1Root>
  )
}

export const DocH2 = styled.h2`
  font-size: 22px;
  font-weight: 600;
  margin: 48px 0 24px;
  padding-bottom: 8px;
  border-bottom: 1px solid ${({ theme }) => theme.color.border};
  color: ${({ theme }) => theme.color.foreground};
  line-height: 1.3;
`

export const DocH3 = styled.h3`
  font-size: 18px;
  font-weight: 500;
  margin: 32px 0 16px;
  color: ${({ theme }) => theme.color.foreground};
  opacity: 0.9;
  line-height: 1.4;
`

export const DocP = styled.p`
  font-size: 15px;
  color: ${({ theme }) => theme.color.mutedForeground};
  line-height: 1.75;
  margin: 0 0 16px;
`

export const DocUl = styled.ul`
  list-style-type: disc;
  list-style-position: outside;
  margin: 0 0 24px 24px;
  color: ${({ theme }) => theme.color.mutedForeground};
  display: flex;
  flex-direction: column;
  gap: 8px;
`

export const DocLi = styled.li`
  line-height: 1.75;
`

export const Kbd = styled.kbd`
  padding: 4px 8px;
  margin: 0 2px;
  font-size: 11px;
  font-weight: 500;
  color: ${({ theme }) => theme.color.foreground};
  background: ${({ theme }) => theme.color.muted};
  border: 1px solid ${({ theme }) => theme.color.border};
  border-radius: 6px;
  box-shadow: ${({ theme }) => theme.shadow.xs};
  font-family: ui-monospace, monospace;
`

export const Code = styled.code`
  padding: 2px 6px;
  margin: 0 2px;
  font-size: 0.85em;
  color: ${({ theme }) => theme.color.primary};
  background: ${({ theme }) => `${theme.color.primary}18`};
  border-radius: 4px;
  font-family: ui-monospace, monospace;
`

const ALERT_STYLES = {
  info:    { bg: 'rgba(248, 209, 104, 0.1)',  border: 'rgba(248, 209, 104, 0.2)',  color: 'var(--color-primary, #F8D168)', Icon: Info },
  tip:     { bg: 'rgba(244, 162, 97, 0.1)',   border: 'rgba(244, 162, 97, 0.2)',   color: 'var(--color-accent, #F4A261)', Icon: Lightbulb },
  warning: { bg: 'rgba(45, 49, 58, 0.1)',     border: 'rgba(45, 49, 58, 0.2)',     color: 'var(--color-muted, #2D313A)', Icon: AlertCircle },
}

const AlertRoot = styled.div<{ $bg: string; $border: string }>`
  margin: 24px 0;
  padding: 16px;
  border-radius: 12px;
  border: 1px solid ${({ $border }) => $border};
  background: ${({ $bg }) => $bg};
  display: flex;
  gap: 16px;
`

const AlertTitle = styled.h4<{ $color: string }>`
  font-weight: 500;
  margin: 0 0 4px;
  color: ${({ $color }) => $color};
`

const AlertBody = styled.div`
  font-size: 14px;
  color: ${({ theme }) => `${theme.color.foreground}cc`};
  line-height: 1.6;
`

export function DocAlert({ title, children, type = 'info' }: {
  title: string;
  children: React.ReactNode;
  type?: 'info' | 'tip' | 'warning';
}) {
  const { bg, border, color, Icon } = ALERT_STYLES[type]
  return (
    <AlertRoot $bg={bg} $border={border}>
      <Icon size={20} style={{ color, flexShrink: 0, marginTop: 2 }} />
      <div>
        <AlertTitle $color={color}>{title}</AlertTitle>
        <AlertBody>{children}</AlertBody>
      </div>
    </AlertRoot>
  )
}
