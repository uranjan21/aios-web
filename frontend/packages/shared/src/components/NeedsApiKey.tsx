import styled from 'styled-components'
import { KeyRound } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { Button } from '@ledgr/ui'

/**
 * The honest successor to `UpgradeWall` (deleted with billing, 2026-08-20).
 *
 * Nothing in Control Tower is paywalled any more, so the only reason an AI
 * surface can refuse is that the account has no provider key. The backend says
 * so with **428** — deliberately not 402, which meant "pay us" and no longer
 * exists anywhere in the stack.
 */
const Root = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  padding: ${({ theme }) => `${theme.spacing[6]} ${theme.spacing[5]}`};
  gap: ${({ theme }) => theme.spacing[3]};
  border: 1px dashed ${({ theme }) => theme.color.accent}60;
  border-radius: ${({ theme }) => theme.radii.md};
  background: ${({ theme }) => theme.color.accent}0d;
`

const IconWrap = styled.div`
  width: 40px;
  height: 40px;
  border-radius: ${({ theme }) => theme.radii.sm};
  background: ${({ theme }) => theme.color.accent}20;
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
  max-width: 280px;
  line-height: 1.5;
  margin-top: ${({ theme }) => theme.spacing[1]};
`

interface Props {
  /** What the user was trying to do, e.g. "AI area analysis". */
  feature?: string
  style?: React.CSSProperties
}

/** Where the key is entered. One place, referenced rather than retyped. */
export const AI_KEYS_SETTINGS_PATH = '/app/settings/ai'

export function NeedsApiKey({ feature = 'AI features', style }: Props) {
  const navigate = useNavigate()
  return (
    <Root style={style}>
      <IconWrap><KeyRound size={20} /></IconWrap>
      <div>
        <Title>Add your AI key</Title>
        <Sub>
          {feature} run on your own OpenAI or Anthropic key — you pay your provider
          directly, and Control Tower charges nothing.
        </Sub>
      </div>
      <Button size="sm" variant="primary" onClick={() => navigate(AI_KEYS_SETTINGS_PATH)}>
        Add a key
      </Button>
    </Root>
  )
}

/** True when the server refused because no provider key is configured. */
export function isMissingKeyError(err: unknown): boolean {
  return (err as { response?: { status?: number } })?.response?.status === 428
}
