import React from 'react'
import styled from 'styled-components'
import { motion } from 'framer-motion'
import { Inbox } from 'lucide-react'

const Container = styled(motion.div)`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 4rem 2rem;
  text-align: center;
  background: ${({ theme }) => theme.color.card};
  border: 1px dashed ${({ theme }) => theme.color.border};
  border-radius: 16px;
  min-height: 300px;
  position: relative;
  overflow: hidden;

  &::before {
    content: '';
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    width: 200px;
    height: 200px;
    background: radial-gradient(circle, ${({ theme }) => theme.color.accent}15, transparent 70%);
    pointer-events: none;
    z-index: 0;
  }
`

const IconWrapper = styled(motion.div)`
  width: 64px;
  height: 64px;
  border-radius: 16px;
  background: ${({ theme }) => theme.color.muted};
  color: ${({ theme }) => theme.color.mutedForeground};
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 1.5rem;
  z-index: 1;
`

const Title = styled.h3`
  font-family: ${({ theme }) => theme.typography.fontFamily.sans};
  font-size: 1.25rem;
  font-weight: 600;
  color: ${({ theme }) => theme.color.foreground};
  margin-bottom: 0.5rem;
  z-index: 1;
`

const Description = styled.p`
  font-size: 0.9375rem;
  color: ${({ theme }) => theme.color.mutedForeground};
  max-width: 400px;
  line-height: 1.5;
  margin-bottom: 2rem;
  z-index: 1;
`

const ActionWrapper = styled.div`
  z-index: 1;
`

export interface EmptyStateProps {
  icon?: React.ReactNode
  title: string
  description?: string
  action?: React.ReactNode
}

export function EmptyState({
  icon = <Inbox size={32} />,
  title,
  description,
  action,
}: EmptyStateProps) {
  return (
    <Container
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.3 }}
    >
      <IconWrapper
        initial={{ y: 10, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.1 }}
      >
        {icon}
      </IconWrapper>
      <Title>{title}</Title>
      {description && <Description>{description}</Description>}
      {action && <ActionWrapper>{action}</ActionWrapper>}
    </Container>
  )
}
