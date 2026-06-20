import { AlertCircle, RefreshCw } from 'lucide-react'
import styled from 'styled-components'
import { Button } from '@ledgr/ui'

const Root = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 48px 16px;
  gap: 12px;
  text-align: center;
`

const Message = styled.p`
  font-size: 14px;
  color: ${({ theme }) => theme.color.mutedForeground};
  margin: 0;
`

interface ErrorCardProps {
  message?: string
  onRetry?: () => void
}

export function ErrorCard({ message = 'Something went wrong.', onRetry }: ErrorCardProps) {
  return (
    <Root>
      <AlertCircle size={32} color="var(--destructive, #dc2626)" />
      <Message>{message}</Message>
      {onRetry && (
        <Button variant="secondary" size="sm" onClick={onRetry}>
          <RefreshCw size={12} /> Retry
        </Button>
      )}
    </Root>
  )
}
