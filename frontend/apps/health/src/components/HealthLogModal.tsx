
import { useState, useEffect } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Dialog, SegmentedControl, Input, Button, Textarea } from '@ledgr/ui'
import { toast } from 'sonner'
import { healthApi } from '@ct/shared/api/areas'
import { FieldError, useFieldErrors } from '@ct/shared/components/forms/fieldErrors'
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
  const f = useFieldErrors<'value'>('health-log')

  useEffect(() => {
    if (open) {
      setActiveTab('gym')
      setLogValue('')
      setLogNote('')
      f.reset()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- f is stable; adding it re-runs the reset on every error change
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
      f.reset()
      toast.success(`${activeTab === 'gym' ? 'Gym session' : activeTab === 'weight' ? 'Weight' : 'Water'} logged`)
      onClose()
    },
    onError: () => toast.error('Failed to log entry') })

  /* Weight and water are quantities: a blank, a non-number and a zero are all
     wrong, and "Enter a valid number" said nothing about the last of those. */
  const handleLog = () => {
    if (activeTab === 'gym') { f.reset(); addLog.mutate(); return }
    const value = parseFloat(logValue)
    const unit = activeTab === 'weight' ? 'weight in kg' : 'water in litres'
    const ok = f.submit({
      value: logValue.trim() === '' || !Number.isFinite(value)
        ? `Enter the ${unit}.`
        : value <= 0
          ? 'Must be more than zero.'
          : undefined,
    })
    if (ok) addLog.mutate()
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
              f.reset()
            }}
            style={{ width: '100%', display: 'flex' }}
          />
        </StyledSegmentedControlWrapper>

        <StyledFormGroup>
          {activeTab !== 'gym' && (
            <StyledInputWrapper>
              <Input
                type="number"
                min="0"
                step="0.01"
                placeholder={activeTab === 'weight' ? 'Enter weight in kg' : 'Enter water in litres'}
                value={logValue}
                {...f.fieldProps('value')}
                onChange={e => { f.clearField('value'); setLogValue(e.target.value) }}
              />
              <FieldError id={f.errorId('value')}>{f.errors.value}</FieldError>
            </StyledInputWrapper>
          )}
          
          <Textarea
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
