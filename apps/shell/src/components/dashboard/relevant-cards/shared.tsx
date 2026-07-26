import styled from 'styled-components'
import { Card } from '@ledgr/ui'

/* ─────────────────────── Shared bits ─────────────────────── */

export const Empty = styled.p`
  margin: ${({ theme }) => `${theme.spacing[2]} 0 0 0`};
  font-size: ${({ theme }) => theme.typography.fontSize.sm};
  color: ${({ theme }) => theme.color.mutedForeground};
  line-height: 1.4;
`

export const StyledCard = styled(Card)`
  position: relative;
  overflow: hidden;
  border: 1px solid ${({ theme }) =>
    theme.mode === 'dark' ? 'rgba(255, 255, 255, 0.1)' : theme.color.border};
  background: ${({ theme }) =>
    theme.mode === 'dark'
      ? 'linear-gradient(180deg, rgba(30, 32, 40, 0.8) 0%, rgba(20, 21, 26, 0.6) 100%)'
      : 'linear-gradient(180deg, rgba(255, 255, 255, 0.95) 0%, rgba(250, 250, 252, 0.8) 100%)'};
  backdrop-filter: blur(12px);
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.05);
`
