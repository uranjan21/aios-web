import styled, { keyframes } from 'styled-components'
import { Button } from '@ledgr/ui'
import { Check, X, Zap } from 'lucide-react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { actionsApi } from '@/api/actions'

const slideDown = keyframes`
  from { opacity: 0; transform: translateY(-10px); }
  to { opacity: 1; transform: translateY(0); }
`

const StripWrapper = styled.div`
  display: flex;
  flex-direction: column;
  gap: 12px;
  animation: ${slideDown} 200ms cubic-bezier(0.2, 0, 0, 1) both;
`

const ActionCard = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 12px 16px;
  background: ${({ theme }) => theme.color.accent}0D;
  border: 1px solid ${({ theme }) => theme.color.accent}40;
  border-radius: ${({ theme }) => theme.radii.md};
  box-shadow: ${({ theme }) => theme.shadow.sm};
  
  @media (max-width: 640px) {
    flex-direction: column;
    align-items: flex-start;
  }
`

const ActionLeft = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  flex: 1;
`

const IconBox = styled.div`
  flex-shrink: 0;
  width: 32px;
  height: 32px;
  border-radius: ${({ theme }) => theme.radii.sm};
  background: ${({ theme }) => theme.color.accent}1A;
  color: ${({ theme }) => theme.color.accent};
  display: inline-flex;
  align-items: center;
  justify-content: center;
`

const ActionTextWrap = styled.div`
  display: flex;
  flex-direction: column;
  gap: 2px;
`

const ActionTitle = styled.span`
  font-size: 13.5px;
  font-weight: 600;
  color: ${({ theme }) => theme.color.foreground};
`

const ActionDesc = styled.span`
  font-size: 12px;
  color: ${({ theme }) => theme.color.mutedForeground};
`

const ActionButtons = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  @media (max-width: 640px) {
    width: 100%;
    justify-content: flex-end;
  }
`

export function ActionCenterStrip() {
  const queryClient = useQueryClient()
  const { data: actions = [] } = useQuery({
    queryKey: ['actions', 'pending'],
    queryFn: () => actionsApi.list('pending'),
    staleTime: 60_000,
  })

  const approveMutation = useMutation({
    mutationFn: actionsApi.approve,
    onSuccess: () => {
      toast.success('Action approved')
      queryClient.invalidateQueries({ queryKey: ['actions'] })
    },
    onError: () => toast.error('Could not approve action'),
  })
  const rejectMutation = useMutation({
    mutationFn: actionsApi.reject,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['actions'] }),
    onError: () => toast.error('Could not dismiss action'),
  })

  const pending = actions.filter(a => a.status === 'pending')
  if (pending.length === 0) return null

  const handleApprove = (id: string) => approveMutation.mutate(id)
  const handleDismiss = (id: string) => rejectMutation.mutate(id)

  return (
    <StripWrapper>
      {pending.map(action => (
        <ActionCard key={action.id}>
          <ActionLeft>
            <IconBox><Zap size={16} /></IconBox>
            <ActionTextWrap>
              <ActionTitle>Proactive Suggestion</ActionTitle>
              <ActionDesc>{action.ai_explanation}</ActionDesc>
            </ActionTextWrap>
          </ActionLeft>
          <ActionButtons>
            <Button size="sm" variant="outline" onClick={() => handleDismiss(action.id)}>
              <X size={14} style={{ marginRight: 4 }} /> Dismiss
            </Button>
            <Button size="sm" variant="primary" onClick={() => handleApprove(action.id)}>
              <Check size={14} style={{ marginRight: 4 }} /> Approve
            </Button>
          </ActionButtons>
        </ActionCard>
      ))}
    </StripWrapper>
  )
}
