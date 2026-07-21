
import { useState, useEffect } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Dialog, SegmentedControl, Input, Button } from '@ledgr/ui'
import { toast } from 'sonner'
import { healthApi } from '@aios/shared/api/areas'
import { Plus } from 'lucide-react'
import styled from 'styled-components'

const StyledSegmentedControlWrapper = styled.div`
  margin-bottom: 1rem;
  width: 100%;
  display: flex;
  
  & > * {
    flex: 1;
    display: flex;
  }
  
  & > * > button {
    flex: 1;
  }
`;

const StyledFormGroup = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
`;

const StyledInputWrapper = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
`;

const StyledErrorMessage = styled.span`
  font-size: 11px;
  color: ${({ theme }) => theme.color?.destructive || 'var(--destructive)'};
  padding-left: 0.25rem;
`;

const StyledTextarea = styled.textarea`
  display: flex;
  min-height: 60px;
  width: 100%;
  border-radius: 0.375rem;
  border: 1px solid ${({ theme }) => theme.color?.border || 'var(--border)'};
  background-color: transparent;
  padding: 0.5rem 0.75rem;
  font-size: 0.875rem;
  color: ${({ theme }) => theme.color?.foreground || 'var(--foreground)'};
  box-shadow: ${({ theme }) => theme.elevation[1]};
  
  &::placeholder {
    color: ${({ theme }) => theme.color?.mutedForeground || 'var(--muted-foreground)'};
  }
  
  &:focus-visible {
    outline: none;
    box-shadow: 0 0 0 1px ${({ theme }) => theme.color?.ring || 'var(--ring)'};
  }
  
  &:disabled {
    cursor: not-allowed;
    opacity: 0.5;
  }
`;

const StyledButtonGroup = styled.div`
  display: flex;
  justify-content: flex-end;
  gap: 0.5rem;
  margin-top: 0.5rem;
`;

const StyledButtonContent = styled.div`
  display: flex;
  align-items: center;
  gap: 0.25rem;
`;

export function HealthLogModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [activeTab, setActiveTab] = useState<'gym' | 'weight' | 'water'>('gym')
  const queryClient = useQueryClient()
  const [logValue, setLogValue] = useState('')
  const [logNote, setLogNote] = useState('')
  const [valueError, setValueError] = useState('')

  useEffect(() => {
    if (open) {
      setActiveTab('gym')
      setLogValue('')
      setLogNote('')
      setValueError('')
    }
  }, [open])

  const addLog = useMutation({
    mutationFn: () => healthApi.createLog({
      entry_type: activeTab,
      value: logValue ? parseFloat(logValue) : undefined,
      unit: activeTab === 'weight' ? 'kg' : activeTab === 'water' ? 'L' : undefined,
      notes: logNote || undefined }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['health'] })
      setLogValue('')
      setLogNote('')
      setValueError('')
      toast.success(`${activeTab === 'gym' ? 'Gym session' : activeTab === 'weight' ? 'Weight' : 'Water'} logged`)
      onClose()
    },
    onError: () => toast.error('Failed to log entry') })

  const handleLog = () => {
    if (activeTab !== 'gym' && (!logValue || isNaN(parseFloat(logValue)))) {
      setValueError('Enter a valid number')
      return
    }
    setValueError('')
    addLog.mutate()
  }

  return (
    <Dialog open={open} onOpenChange={(isOpen) => { if(!isOpen) onClose() }} title="Log Health Data">
        <StyledSegmentedControlWrapper>
          <SegmentedControl
            options={[
              { label: 'Gym Session', value: 'gym' },
              { label: 'Weight', value: 'weight' },
              { label: 'Water', value: 'water' },
            ]}
            value={activeTab}
            onChange={v => {
              setActiveTab(v as any)
              setValueError('')
            }}
            style={{ width: '100%', display: 'flex' }}
          />
        </StyledSegmentedControlWrapper>

        <StyledFormGroup>
          {activeTab !== 'gym' && (
            <StyledInputWrapper>
              <Input
                type="number"
                placeholder={activeTab === 'weight' ? 'Enter weight in kg' : 'Enter water in litres'}
                value={logValue}
                onChange={e => { setLogValue(e.target.value); setValueError('') }}
                style={valueError ? { borderColor: 'var(--destructive)' } : {}}
              />
              {valueError && <StyledErrorMessage>{valueError}</StyledErrorMessage>}
            </StyledInputWrapper>
          )}
          
          <StyledTextarea
            placeholder="Note (optional)"
            value={logNote}
            onChange={e => setLogNote(e.target.value)}
            rows={3}
          />
          
          <StyledButtonGroup>
            <Button variant="outline" onClick={onClose}>Cancel</Button>
            <Button variant="primary" onClick={handleLog} disabled={addLog.isPending}>
              {addLog.isPending ? 'Logging...' : (
                <StyledButtonContent>
                  <Plus size={14} /> Log Entry
                </StyledButtonContent>
              )}
            </Button>
          </StyledButtonGroup>
        </StyledFormGroup>
    </Dialog>
  )
}
