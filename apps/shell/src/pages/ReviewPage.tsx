import { useState } from 'react'
import styled from 'styled-components'
import { useQuery } from '@tanstack/react-query'
import { Card, PageHeader, Button, Input, EmptyState, focusRing } from '@ledgr/ui'
import { goalsApi } from '@aios/shared/api/goals'
import { capturesApi } from '@aios/shared/api/areas'
import { insightsApi } from '@aios/shared/api/insights'
import { CheckCircle2, XCircle, ArrowRight, CalendarCheck } from 'lucide-react'
import { toast } from 'sonner'
import { PageDivider } from '@aios/shared/components/layout/PageDivider'
import { PageContainer, PageContent } from '@aios/shared/components/layout/PageLayout'

const ReviewContainer = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => `${theme.spacing[6]}`};
  max-width: 860px;
  margin: 0 auto;
  width: 100%;
`

const SummaryBox = styled.div`
  padding: ${({ theme }) => `${theme.spacing[4]}`};
  background: ${({ theme }) => theme.color.muted};
  border-radius: ${({ theme }) => theme.radii.md};
  font-size: ${({ theme }) => theme.typography.fontSize.sm};
  line-height: 1.6;
  color: ${({ theme }) => theme.color.mutedForeground};
  white-space: pre-wrap;
`

const Attribution = styled.div`
  margin-top: ${({ theme }) => `${theme.spacing[2]}`};
  font-size: ${({ theme }) => theme.typography.fontSize.xs};
  font-weight: 500;
  color: ${({ theme }) => theme.color.mutedForeground};
`

const GoalRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: ${({ theme }) => `${theme.spacing[3]}`};
  padding: ${({ theme }) => `${theme.spacing[3]} ${theme.spacing[4]}`};
  border: 1px solid ${({ theme }) => theme.color.border};
  border-radius: ${({ theme }) => theme.radii.md};
`

const GoalTitle = styled.div`
  font-size: ${({ theme }) => theme.typography.fontSize.sm};
  font-weight: 600;
  color: ${({ theme }) => theme.color.foreground};
`

const GoalCategory = styled.div`
  font-size: ${({ theme }) => theme.typography.fontSize.xs};
  font-weight: 600;
  letter-spacing: 0.05em;
  text-transform: uppercase;
  color: ${({ theme }) => theme.color.mutedForeground};
  margin-top: ${({ theme }) => `${theme.spacing[0.5]}`};
`

const RateBtn = styled.button<{ $tone: 'good' | 'bad'; $selected?: boolean }>`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: ${({ theme }) => `${theme.spacing[2]}`};
  border: none;
  background: ${({ theme, $selected, $tone }) =>
    $selected ? ($tone === 'good' ? `${theme.color.success}1A` : `${theme.color.destructive}1A`) : 'transparent'};
  color: ${({ theme, $tone }) => ($tone === 'good' ? theme.color.success : theme.color.destructive)};
  border-radius: ${({ theme }) => theme.radii.sm};
  cursor: pointer;
  transition: background 120ms;
  &:hover {
    background: ${({ theme, $tone }) =>
      $tone === 'good' ? `${theme.color.success}1A` : `${theme.color.destructive}1A`};
  }
  ${focusRing}
`

const FocusRow = styled.div`
  display: flex;
  gap: ${({ theme }) => `${theme.spacing[2]}`};
`

const FocusList = styled.ul`
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => `${theme.spacing[2]}`};
`

const FocusItem = styled.li`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: ${({ theme }) => `${theme.spacing[3]}`};
  padding: ${({ theme }) => `${theme.spacing[2.5]} ${theme.spacing[3.5]}`};
  background: ${({ theme }) => theme.color.muted};
  border-radius: ${({ theme }) => theme.radii.sm};
  font-size: ${({ theme }) => theme.typography.fontSize.sm};
  color: ${({ theme }) => theme.color.foreground};
`

const RemoveBtn = styled.button`
  background: none;
  border: none;
  padding: ${({ theme }) => `${theme.spacing[0.5]} ${theme.spacing[1.5]}`};
  font-size: ${({ theme }) => theme.typography.fontSize.base};
  color: ${({ theme }) => theme.color.mutedForeground};
  cursor: pointer;
  border-radius: ${({ theme }) => theme.radii.sm};
  &:hover {
    color: ${({ theme }) => theme.color.foreground};
    background: ${({ theme }) => theme.color.background};
  }
`

const StepActions = styled.div`
  display: flex;
  justify-content: flex-end;
  margin-top: ${({ theme }) => `${theme.spacing[4]}`};
`

const DoneWrap = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: ${({ theme }) => `${theme.spacing[3]}`};
  padding: ${({ theme }) => `${theme.spacing[8]} 0`};
  text-align: center;
`

const DoneIcon = styled.div`
  width: 56px;
  height: 56px;
  border-radius: 50%;
  background: ${({ theme }) => theme.color.success}1F;
  color: ${({ theme }) => theme.color.success};
  display: flex;
  align-items: center;
  justify-content: center;
`

const DoneTitle = styled.h2`
  margin: 0;
  font-size: ${({ theme }) => theme.typography.fontSize.lg};
  font-weight: 600;
  color: ${({ theme }) => theme.color.foreground};
`

const DoneSub = styled.p`
  margin: 0;
  font-size: ${({ theme }) => theme.typography.fontSize.sm};
  color: ${({ theme }) => theme.color.mutedForeground};
`

export function ReviewPage() {
  const [step, setStep] = useState(1)
  const [focusInput, setFocusInput] = useState('')
  const [focusItems, setFocusItems] = useState<string[]>([])
  const [marked, setMarked] = useState<Record<string, 'good' | 'bad'>>({})
  const [submitting, setSubmitting] = useState(false)

  const { data: goals = [] } = useQuery({ queryKey: ['goals'], queryFn: goalsApi.list, staleTime: 60_000 })
  const { data: briefing } = useQuery({
    queryKey: ['insights', 'briefing', 'today'],
    queryFn: insightsApi.briefingToday,
    staleTime: 10 * 60_000,
  })

  // SummaryBox renders plain text — strip markdown bold markers from the briefing.
  const summaryText =
    briefing?.status === 'ready' && briefing.briefing
      ? briefing.briefing.content_md.replace(/\*\*/g, '')
      : 'No AI summary available yet — walk through your week below and check in on each goal.'

  const handleGoalProgress = async (goalId: string, onTrack: boolean) => {
    setMarked(prev => ({ ...prev, [goalId]: onTrack ? 'good' : 'bad' }))
    try {
      await goalsApi.addProgress(goalId, { progress_score: onTrack ? 100 : 0, ai_insight: 'Weekly review' })
    } catch {
      toast.error('Failed to update progress')
    }
  }

  const handleAddFocus = () => {
    if (!focusInput.trim() || focusItems.length >= 3) return
    setFocusItems([...focusItems, focusInput.trim()])
    setFocusInput('')
  }

  const handleFinish = async () => {
    setSubmitting(true)
    try {
      for (const item of focusItems) {
        await capturesApi.create(`focus ${item}`)
      }
      toast.success('Weekly review completed!')
      setStep(4)
    } catch {
      toast.error('Failed to save focus items')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <PageContainer>
      <PageContent>
        <ReviewContainer>
      <PageHeader 
        icon={<CalendarCheck />}
        eyebrow="Routine"
        title="Weekly Review" 
        subtitle="Your Sunday ritual to align and focus" 
      />
      <PageDivider />

      {step === 1 && (
        <Card title="1. Week in Review" icon={<CalendarCheck size={16} />}>
          <SummaryBox>{summaryText}</SummaryBox>
          {briefing?.status === 'ready' && <Attribution>AI · from your daily briefing</Attribution>}
          <StepActions>
            <Button variant="primary" size="sm" onClick={() => setStep(2)}>
              Next: Goal Check-in <ArrowRight size={14} style={{ marginLeft: 4 }} />
            </Button>
          </StepActions>
        </Card>
      )}

      {step === 2 && (
        <Card title="2. Goal Check-in" icon={<CalendarCheck size={16} />}>
          {goals.length === 0 ? (
            <EmptyState
              title="No active goals"
              description="Add goals on the Goals page to check in on them each week."
            />
          ) : (
            <FocusList as="div">
              {goals.map(goal => (
                <GoalRow key={goal.id}>
                  <div>
                    <GoalTitle>{goal.title}</GoalTitle>
                    <GoalCategory>{goal.category}</GoalCategory>
                  </div>
                  <div style={{ display: 'flex', gap: 4 }}>
                    <RateBtn
                      $tone="bad"
                      $selected={marked[goal.id] === 'bad'}
                      onClick={() => handleGoalProgress(goal.id, false)}
                      aria-label={`Mark ${goal.title} behind`}
                    >
                      <XCircle size={18} />
                    </RateBtn>
                    <RateBtn
                      $tone="good"
                      $selected={marked[goal.id] === 'good'}
                      onClick={() => handleGoalProgress(goal.id, true)}
                      aria-label={`Mark ${goal.title} on track`}
                    >
                      <CheckCircle2 size={18} />
                    </RateBtn>
                  </div>
                </GoalRow>
              ))}
            </FocusList>
          )}
          <StepActions>
            <Button variant="primary" size="sm" onClick={() => setStep(3)}>
              Next: Set Focus <ArrowRight size={14} style={{ marginLeft: 4 }} />
            </Button>
          </StepActions>
        </Card>
      )}

      {step === 3 && (
        <Card title="3. Focus for Next Week" icon={<CalendarCheck size={16} />}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <FocusRow>
              <Input
                value={focusInput}
                onChange={e => setFocusInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleAddFocus()}
                placeholder={focusItems.length >= 3 ? 'Three is plenty — stay focused' : 'e.g. Finalize the pricing page'}
                disabled={focusItems.length >= 3}
                aria-label="Focus item"
              />
              <Button variant="outline" size="sm" onClick={handleAddFocus} disabled={focusItems.length >= 3 || !focusInput.trim()}>
                Add
              </Button>
            </FocusRow>
            {focusItems.length > 0 && (
              <FocusList>
                {focusItems.map((item, idx) => (
                  <FocusItem key={idx}>
                    <span>{item}</span>
                    <RemoveBtn onClick={() => setFocusItems(focusItems.filter((_, i) => i !== idx))} aria-label={`Remove ${item}`}>
                      ×
                    </RemoveBtn>
                  </FocusItem>
                ))}
              </FocusList>
            )}
          </div>
          <StepActions>
            <Button variant="primary" size="sm" onClick={handleFinish} loading={submitting} disabled={focusItems.length === 0}>
              Finish Review <CheckCircle2 size={14} style={{ marginLeft: 4 }} />
            </Button>
          </StepActions>
        </Card>
      )}

      {step === 4 && (
        <Card>
          <DoneWrap>
            <DoneIcon><CheckCircle2 size={28} /></DoneIcon>
            <DoneTitle>Review Complete</DoneTitle>
            <DoneSub>Your {focusItems.length} focus item{focusItems.length === 1 ? '' : 's'} will appear on the Dashboard Focus card.</DoneSub>
          </DoneWrap>
        </Card>
      )}
        </ReviewContainer>
      </PageContent>
    </PageContainer>
  )
}
