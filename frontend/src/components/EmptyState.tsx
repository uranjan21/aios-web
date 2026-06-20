import styled from 'styled-components'
import type { LucideIcon } from 'lucide-react'
import { Button } from '@ledgr/ui'

const Root = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  padding: 56px 16px;
  gap: 12px;
`

const IconWrap = styled.div`
  width: 56px;
  height: 56px;
  border-radius: ${({ theme }) => theme.radii.xl};
  background: ${({ theme }) => theme.color.muted};
  display: flex;
  align-items: center;
  justify-content: center;
  color: ${({ theme }) => theme.color.mutedForeground};
`

const TitleText = styled.p`
  font-weight: 600;
  font-size: 13px;
  color: ${({ theme }) => theme.color.foreground};
  margin: 0;
`

const DescText = styled.p`
  font-size: 12px;
  color: ${({ theme }) => theme.color.mutedForeground};
  max-width: 240px;
  margin: 0;
  line-height: 1.5;
`

interface EmptyStateProps {
  icon: LucideIcon
  title: string
  description: string
  action?: { label: string; onClick: () => void }
}

export function EmptyState({ icon: Icon, title, description, action }: EmptyStateProps) {
  return (
    <Root>
      <IconWrap><Icon size={28} /></IconWrap>
      <div>
        <TitleText>{title}</TitleText>
        <DescText style={{ marginTop: 4 }}>{description}</DescText>
      </div>
      {action && (
        <Button variant="secondary" size="sm" onClick={action.onClick}>
          {action.label}
        </Button>
      )}
    </Root>
  )
}
