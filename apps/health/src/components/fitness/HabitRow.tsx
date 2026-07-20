import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Popconfirm } from '@aios/shared/components/ui/Popconfirm'
import { toast } from 'sonner'
import dayjs from 'dayjs'
import { Trash2, Target, Flame } from 'lucide-react'
import { healthApi } from '@aios/shared/api/areas'
import type { HabitItem } from '@aios/shared/types'
import styled from 'styled-components'
import { DAYS_SHOWN } from './constants'

const StyledHabitRowWrapper = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  padding: 0.5rem 20px;
  border-bottom: 1px solid rgba(45, 49, 58, 0.15);

  &:last-child {
    border-bottom: 0;
  }
`;

const StyledHabitInfo = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  min-width: 0;
`;

const StyledHabitIcon = styled.span`
  font-size: 1rem;
  flex-shrink: 0;
`;

const StyledHabitDetails = styled.div`
  min-width: 0;
`;

const StyledHabitName = styled.div`
  font-size: 13px;
  font-weight: 500;
  color: ${({ theme }) => theme.color?.foreground || 'var(--foreground)'};
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`;

const StyledHabitStreak = styled.div`
  display: flex;
  align-items: center;
  gap: 0.25rem;
  font-size: 11px;
  color: ${({ theme }) => theme.color?.mutedForeground || 'var(--muted-foreground)'};
`;

const StyledHabitActions = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  flex-shrink: 0;
`;

const StyledHabitDaysWrapper = styled.div`
  display: flex;
  gap: 0.25rem;
`;

const StyledHabitDayButton = styled.button<{ $checked?: boolean; $isToday?: boolean }>`
  width: 1.5rem;
  height: 1.5rem;
  border-radius: 0.375rem;
  font-size: 9px;
  font-weight: 500;
  transition: background-color 0.2s, border-color 0.2s, color 0.2s;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0;
  cursor: pointer;
  border: 1px solid ${({ $checked, $isToday, theme }) =>
    $checked ? 'var(--primary)' :
    $isToday ? 'var(--accent)' :
    $checked ? 'var(--primary)' : 'transparent'};
  background-color: ${({ $checked }) => $checked ? 'var(--primary)' : 'var(--muted)'};
  color: ${({ $checked, theme }) => $checked ? 'var(--primary-foreground)' : (theme.color?.mutedForeground || 'var(--muted-foreground)')};
  border-style: ${({ $isToday, $checked }) => ($isToday && !$checked) ? 'dashed' : 'solid'};

  &:hover {
    border-color: ${({ $checked }) => $checked ? 'var(--primary)' : 'var(--accent)'};
  }

  &:focus-visible {
    outline: 2px solid ${({ theme }) => theme.color?.ring || '#CA8A04'};
    outline-offset: 1px;
  }
`;

const StyledHabitDeleteButton = styled.button`
  padding: 0.25rem;
  border-radius: 0.25rem;
  background: none;
  border: none;
  cursor: pointer;
  color: ${({ theme }) => theme.color?.mutedForeground || 'var(--muted-foreground)'};
  opacity: 0;
  transition: opacity 0.2s, color 0.2s;

  ${StyledHabitRowWrapper}:hover & {
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

export function HabitRow({ habit }: { habit: HabitItem }) {
  const queryClient = useQueryClient()
  const checks = new Set(habit.checks)
  const days = Array.from({ length: DAYS_SHOWN }, (_, i) =>
    dayjs().subtract(DAYS_SHOWN - 1 - i, 'day').format('YYYY-MM-DD')
  )

  const toggleMutation = useMutation({
    mutationFn: (date: string) => healthApi.toggleHabit(habit.id, date),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['health', 'habits'] }),
    onError: () => toast.error('Failed to update habit'),
  })

  const deleteMutation = useMutation({
    mutationFn: () => healthApi.deleteHabit(habit.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['health', 'habits'] })
      toast.success('Habit archived')
    },
    onError: () => toast.error('Failed to archive habit'),
  })

  return (
    <StyledHabitRowWrapper>
      <StyledHabitInfo>
        <StyledHabitIcon>{habit.icon || <Target size={12} />}</StyledHabitIcon>
        <StyledHabitDetails>
          <StyledHabitName>{habit.name}</StyledHabitName>
          <StyledHabitStreak>
            <Flame size={11} style={{ color: habit.streak > 0 ? 'var(--accent)' : 'inherit' }} />
            {habit.streak > 0 ? `${habit.streak} day streak` : 'No streak yet'}
          </StyledHabitStreak>
        </StyledHabitDetails>
      </StyledHabitInfo>
      <StyledHabitActions>
        <StyledHabitDaysWrapper>
          {days.map(d => {
            const checked = checks.has(d)
            const isToday = d === dayjs().format('YYYY-MM-DD')
            return (
              <StyledHabitDayButton
                key={d}
                onClick={() => toggleMutation.mutate(d)}
                title={dayjs(d).format('ddd, MMM D')}
                aria-label={`${habit.name} on ${d}: ${checked ? 'done' : 'not done'}`}
                $checked={checked}
                $isToday={isToday}
              >
                {dayjs(d).format('dd')[0]}
              </StyledHabitDayButton>
            )
          })}
        </StyledHabitDaysWrapper>
        <Popconfirm title="Archive this habit?" onConfirm={() => deleteMutation.mutate()} okText="Archive" okButtonProps={{ danger: true }}>
          <StyledHabitDeleteButton aria-label="Archive habit">
            <Trash2 size={12} />
          </StyledHabitDeleteButton>
        </Popconfirm>
      </StyledHabitActions>
    </StyledHabitRowWrapper>
  )
}
