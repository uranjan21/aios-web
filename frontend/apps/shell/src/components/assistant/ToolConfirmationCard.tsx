import styled from 'styled-components'
import { AlertTriangle, IndianRupee, Target, Check, X, type LucideIcon } from 'lucide-react'
import { Button } from '@ledgr/ui'

interface Props {
  tool: string
  tool_call_id: string
  params: Record<string, unknown>
  onConfirm: (tool_call_id: string) => void
  onCancel: (tool_call_id: string) => void
}

const TOOL_LABELS: Record<string, { label: string; icon: LucideIcon }> = {
  log_transaction:         { label: 'Log transaction', icon: IndianRupee },
  log_finance_transaction: { label: 'Log transaction', icon: IndianRupee },
  update_goal:             { label: 'Update goal',     icon: Target },
}

function humaniseParams(tool: string, params: Record<string, unknown>): string {
  if ((tool === 'log_transaction' || tool === 'log_finance_transaction') && params.amount) {
    const type = String(params.type ?? params.kind ?? 'transaction')
    const desc = String(params.description ?? params.category ?? '')
    return `₹${params.amount} ${type}${desc ? ` — ${desc}` : ''}`
  }
  if (tool === 'update_goal' && params.progress_score != null) {
    return `Progress → ${params.progress_score}%${params.notes ? `: ${params.notes}` : ''}`
  }
  // Generic fallback: show up to 3 key=value pairs
  return Object.entries(params)
    .slice(0, 3)
    .map(([k, v]) => `${k}: ${String(v).slice(0, 30)}`)
    .join(', ')
}

const Card = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => `${theme.spacing[2.5]}`};
  padding: ${({ theme }) => `${theme.spacing[3]} ${theme.spacing[3.5]}`};
  border: 1px solid ${({ theme }) => `color-mix(in srgb, ${theme.color.warning} 20%, transparent)`};
  border-radius: ${({ theme }) => theme.radii.md};
  background: ${({ theme }) => theme.color.card};
  margin: ${({ theme }) => `${theme.spacing[1]} 0`};
`

const Header = styled.div`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => `${theme.spacing[2]}`};
`

const IconWrap = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  color: ${({ theme }) => theme.color.warning};
`

const TitleBlock = styled.div`
  display: flex;
  flex-direction: column;
  gap: 1px;
`

const Title = styled.div`
  font-size: ${({ theme }) => theme.typography.fontSize.sm};
  font-weight: 600;
  color: ${({ theme }) => theme.color.foreground};
`

const Detail = styled.div`
  font-size: ${({ theme }) => theme.typography.fontSize.sm};
  color: ${({ theme }) => theme.color.mutedForeground};
`

const Actions = styled.div`
  display: flex;
  gap: ${({ theme }) => `${theme.spacing[2]}`};
`

export function ToolConfirmationCard({ tool, tool_call_id, params, onConfirm, onCancel }: Props) {
  const meta = TOOL_LABELS[tool] ?? { label: tool, icon: AlertTriangle }
  const detail = humaniseParams(tool, params)

  return (
    <Card>
      <Header>
        <IconWrap>
          <AlertTriangle size={14} />
        </IconWrap>
        <TitleBlock>
          <Title>Confirm: {meta.label}</Title>
          {detail && <Detail>{detail}</Detail>}
        </TitleBlock>
      </Header>
      <Actions>
        <Button
          size="sm"
          variant="primary"
          onClick={() => onConfirm(tool_call_id)}
          style={{ display: 'flex', alignItems: 'center', gap: 5 }}
        >
          <Check size={12} /> Approve
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={() => onCancel(tool_call_id)}
          style={{ display: 'flex', alignItems: 'center', gap: 5 }}
        >
          <X size={12} /> Cancel
        </Button>
      </Actions>
    </Card>
  )
}
