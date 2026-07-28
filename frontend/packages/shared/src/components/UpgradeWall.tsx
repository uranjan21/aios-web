import styled from 'styled-components'
import { Crown } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { Button } from '@ledgr/ui'

const Root = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  padding: ${({ theme }) => `${theme.spacing[8]} ${theme.spacing[5]}`};
  gap: ${({ theme }) => `${theme.spacing[3]}`};
  border: 1px dashed ${({ theme }) => theme.color.accent}60;
  border-radius: ${({ theme }) => theme.radii.md};
  background: ${({ theme }) => theme.color.accent}06;
`

const IconWrap = styled.div`
  width: 44px;
  height: 44px;
  border-radius: ${({ theme }) => theme.radii.sm};
  background: ${({ theme }) => theme.color.accent}15;
  color: ${({ theme }) => theme.color.accent};
  display: flex;
  align-items: center;
  justify-content: center;
`

const Title = styled.div`
  font-size: ${({ theme }) => theme.typography.fontSize.sm};
  font-weight: 600;
  color: ${({ theme }) => theme.color.foreground};
`

const Sub = styled.div`
  font-size: ${({ theme }) => theme.typography.fontSize.sm};
  color: ${({ theme }) => theme.color.mutedForeground};
  max-width: 240px;
  line-height: 1.5;
`

interface Props {
  feature?: string
  style?: React.CSSProperties
}

export function UpgradeWall({ feature = 'AI features', style }: Props) {
  const navigate = useNavigate()
  return (
    <Root style={style}>
      <IconWrap><Crown size={22} /></IconWrap>
      <div>
        <Title>Pro plan required</Title>
        <Sub style={{ marginTop: 4 }}>{feature} are available on the Pro plan.</Sub>
      </div>
      <Button size="sm" variant="primary" onClick={() => navigate('/pricing')}>
        Upgrade to Pro
      </Button>
    </Root>
  )
}

export function is402(err: unknown): boolean {
  return (err as { response?: { status?: number } })?.response?.status === 402
}
