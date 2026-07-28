import React, { useState } from 'react'
import styled from 'styled-components'
import { Sparkles, ThumbsUp, ThumbsDown, X } from 'lucide-react'

export interface InsightCardProps {
  /** The insight content text */
  text: string
  /** Optional title */
  title?: string
  /** Optional icon to display. Defaults to Sparkles. */
  icon?: React.ReactNode
  /** Source attribution, e.g. "AI · based on your last 30 days" */
  attribution?: string
  /** Callback when thumbs up is clicked */
  onRateUp?: () => void
  /** Callback when thumbs down is clicked */
  onRateDown?: () => void
  /** Callback when dismiss is clicked */
  onDismiss?: () => void
  className?: string
}

const CardWrapper = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => `${theme.spacing[3]}`};
  padding: ${({ theme }) => `${theme.spacing[4]}`};
  background: ${({ theme }) => theme.color.card};
  border: 1px solid ${({ theme }) => theme.color.border};
  border-radius: ${({ theme }) => theme.radii.lg};
  box-shadow: ${({ theme }) => theme.shadow.sm};
  position: relative;
`

const Header = styled.div`
  display: flex;
  align-items: flex-start;
  gap: ${({ theme }) => `${theme.spacing[3]}`};
`

const IconWrap = styled.div`
  flex-shrink: 0;
  width: 24px;
  height: 24px;
  border-radius: ${({ theme }) => theme.radii.sm};
  background: ${({ theme }) => theme.color.accent}1A;
  color: ${({ theme }) => theme.color.accent};
  display: inline-flex;
  align-items: center;
  justify-content: center;
  margin-top: ${({ theme }) => `${theme.spacing[0.5]}`};
`

const BodyWrap = styled.div`
  flex: 1;
  min-width: 0;
`

const Title = styled.h4`
  margin: ${({ theme }) => `0 0 ${theme.spacing[1]} 0`};
  font-size: ${({ theme }) => theme.typography.fontSize.base};
  font-weight: 600;
  color: ${({ theme }) => theme.color.foreground};
`

const BodyText = styled.p<{ $expanded: boolean }>`
  margin: 0;
  font-size: ${({ theme }) => theme.typography.fontSize.sm};
  line-height: 1.5;
  color: ${({ theme }) => theme.color.mutedForeground};
  
  display: -webkit-box;
  -webkit-line-clamp: ${({ $expanded }) => ($expanded ? 'unset' : 3)};
  -webkit-box-orient: vertical;
  overflow: hidden;
`

const ExpandBtn = styled.button`
  background: none;
  border: none;
  padding: 0;
  margin-top: ${({ theme }) => `${theme.spacing[1]}`};
  font-size: ${({ theme }) => theme.typography.fontSize.sm};
  font-weight: 600;
  color: ${({ theme }) => theme.color.accent};
  cursor: pointer;
  &:hover {
    text-decoration: underline;
  }
`

const Footer = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: ${({ theme }) => `${theme.spacing[1]}`};
  padding-top: ${({ theme }) => `${theme.spacing[3]}`};
  border-top: 1px solid ${({ theme }) => theme.color.border};
`

const Attribution = styled.span`
  font-size: ${({ theme }) => theme.typography.fontSize.xs};
  color: ${({ theme }) => theme.color.mutedForeground};
  font-weight: 500;
`

const Actions = styled.div`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => `${theme.spacing[2]}`};
`

const IconButton = styled.button`
  background: none;
  border: none;
  padding: ${({ theme }) => `${theme.spacing[1]}`};
  display: inline-flex;
  align-items: center;
  justify-content: center;
  color: ${({ theme }) => theme.color.mutedForeground};
  border-radius: ${({ theme }) => theme.radii.sm};
  cursor: pointer;
  transition: background 120ms, color 120ms;
  &:hover {
    background: ${({ theme }) => theme.color.muted};
    color: ${({ theme }) => theme.color.foreground};
  }
`

export function InsightCard({
  text,
  title,
  icon,
  attribution = "AI · Synergy Engine",
  onRateUp,
  onRateDown,
  onDismiss,
  className
}: InsightCardProps) {
  const [expanded, setExpanded] = useState(false)
  const isLong = text.length > 150 // simple heuristic

  return (
    <CardWrapper className={className}>
      <Header>
        <IconWrap>
          {icon ?? <Sparkles size={14} />}
        </IconWrap>
        <BodyWrap>
          {title && <Title>{title}</Title>}
          <BodyText $expanded={expanded}>{text}</BodyText>
          {isLong && !expanded && (
            <ExpandBtn onClick={() => setExpanded(true)}>Read more</ExpandBtn>
          )}
        </BodyWrap>
      </Header>
      <Footer>
        <Attribution>{attribution}</Attribution>
        <Actions>
          {onRateUp && (
            <IconButton onClick={onRateUp} aria-label="Helpful">
              <ThumbsUp size={14} />
            </IconButton>
          )}
          {onRateDown && (
            <IconButton onClick={onRateDown} aria-label="Not helpful">
              <ThumbsDown size={14} />
            </IconButton>
          )}
          {onDismiss && (
            <IconButton onClick={onDismiss} aria-label="Dismiss">
              <X size={14} />
            </IconButton>
          )}
        </Actions>
      </Footer>
    </CardWrapper>
  )
}
