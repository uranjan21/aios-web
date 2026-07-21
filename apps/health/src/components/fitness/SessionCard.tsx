import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Popconfirm } from '@aios/shared/components/ui/Popconfirm'
import { toast } from 'sonner'
import dayjs from 'dayjs'
import { Dumbbell, Trash2 } from 'lucide-react'
import { healthApi } from '@aios/shared/api/areas'
import type { WorkoutSessionItem } from '@aios/shared/types'
import { Card as GlassCard } from '@ledgr/ui'
import styled from 'styled-components'




const StyledDeleteButton = styled.button`
  padding: 0.25rem;
  border-radius: 0.25rem;
  background: none;
  border: none;
  cursor: pointer;
  color: ${({ theme }) => theme.color?.mutedForeground || 'var(--muted-foreground)'};
  opacity: 0;
  transition: opacity 0.2s, color 0.2s;

  .glass-card:hover & {
    opacity: 1;
  }

  &:hover {
    color: ${({ theme }) => theme.color?.destructive || 'var(--destructive)'};
  }

  &:focus-visible {
    outline: none;
    box-shadow: 0 0 0 2px var(--primary);
    opacity: 1;
  }
`;

const StyledSessionSetsWrapper = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.375rem;
`;

const StyledSessionSetRow = styled.div`
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 0.5rem;
`;

const StyledSessionSetExercise = styled.span`
  font-size: 12px;
  font-weight: 500;
  color: ${({ theme }) => theme.color?.foreground || 'var(--foreground)'};
`;

const StyledSessionSetDetails = styled.span`
  font-size: 11px;
  color: ${({ theme }) => theme.color?.mutedForeground || 'var(--muted-foreground)'};
`;

const StyledSessionNotes = styled.div`
  font-size: 11px;
  color: ${({ theme }) => theme.color?.mutedForeground || 'var(--muted-foreground)'};
  margin-top: 0.5rem;
`;

export function SessionCard({ session }: { session: WorkoutSessionItem }) {
  const queryClient = useQueryClient()
  const deleteMutation = useMutation({
    mutationFn: () => healthApi.deleteWorkout(session.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['health'] })
      toast.success('Workout deleted')
    },
    onError: () => toast.error('Failed to delete workout'),
  })

  const byExercise = session.sets.reduce<Record<string, typeof session.sets>>((acc, s) => {
    (acc[s.exercise] = acc[s.exercise] ?? []).push(s)
    return acc
  }, {})

  return (
    <GlassCard
      className="glass-card"
      size="sm"
      title={session.name}
      subtitle={dayjs(session.logged_at).format('ddd, MMM D')}
      icon={<Dumbbell size={16} />}
      action={
        <Popconfirm title="Delete this workout?" onConfirm={() => deleteMutation.mutate()} okText="Delete" okButtonProps={{ danger: true }}>
          <StyledDeleteButton aria-label="Delete workout">
            <Trash2 size={13} />
          </StyledDeleteButton>
        </Popconfirm>
      }
    >
      <StyledSessionSetsWrapper>
        {Object.entries(byExercise).map(([ex, sets]) => (
          <StyledSessionSetRow key={ex}>
            <StyledSessionSetExercise>{ex}</StyledSessionSetExercise>
            <StyledSessionSetDetails>
              {sets.map(s => s.weight_kg != null ? `${s.reps}×${s.weight_kg}kg` : `${s.reps} reps`).join(' · ')}
            </StyledSessionSetDetails>
          </StyledSessionSetRow>
        ))}
      </StyledSessionSetsWrapper>
      {session.notes && <StyledSessionNotes>{session.notes}</StyledSessionNotes>}
    </GlassCard>
  )
}
