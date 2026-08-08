import { toast } from 'sonner'
import styled, { useTheme } from 'styled-components'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Flame, Check } from 'lucide-react'
import { SkeletonList, Stack, focusRing } from '@ledgr/ui'
import { healthApi } from '@ct/shared/api/areas'
import { fmtDateKey } from '@ct/shared/stores/dayEventsStore'
import { Empty, StyledCard } from './shared'

const StatRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size: ${({ theme }) => theme.typography.fontSize.sm};
  padding: ${({ theme }) => `${theme.spacing[1.5]} 0`};
  &:not(:last-child) {
    border-bottom: 1px solid ${({ theme }) => theme.color.border};
  }
`

const StatLabel = styled.span`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => `${theme.spacing[1.5]}`};
  color: ${({ theme }) => theme.color.mutedForeground};
  font-weight: 500;
`

const StatValue = styled.span`
  color: ${({ theme }) => theme.color.foreground};
  font-weight: 600;
  font-variant-numeric: tabular-nums;
`

/* ─────────────────────── 1. HabitsCard ─────────────────────── */

const HabitRow = styled.button<{ $checkedToday: boolean }>`
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: ${({ theme }) => `${theme.spacing[2.5]}`};
  padding: ${({ theme }) => `${theme.spacing[2]} ${theme.spacing[2.5]}`};
  border-radius: ${({ theme }) => theme.radii.md};
  border: 1px solid ${({ theme }) => theme.color.border};
  background: ${({ theme, $checkedToday }) =>
    $checkedToday ? theme.color.success + '14' : theme.color.background};
  color: ${({ theme }) => theme.color.foreground};
  cursor: pointer;
  transition: background 120ms, transform 120ms;
  text-align: left;
  &:hover { transform: translateY(-1px); background: ${({ theme }) => theme.color.muted}; }
  ${focusRing}
`

const HabitName = styled.span`
  font-size: ${({ theme }) => theme.typography.fontSize.sm};
  font-weight: 600;
  display: flex;
  align-items: center;
  gap: ${({ theme }) => `${theme.spacing[2]}`};
`

const StreakBadge = styled.span`
  display: inline-flex;
  align-items: center;
  gap: ${({ theme }) => `${theme.spacing[0.5]}`};
  font-size: ${({ theme }) => theme.typography.fontSize.xs};
  font-weight: 700;
  color: ${({ theme }) => theme.color.accent};
  background: ${({ theme }) => theme.color.accent}1A;
  padding: ${({ theme }) => `${theme.spacing[0.5]} ${theme.spacing[1.5]}`};
  border-radius: ${({ theme }) => theme.radii.sm};
`

const CheckIcon = styled.span<{ $on: boolean }>`
  width: 18px;
  height: 18px;
  border-radius: 50%;
  border: 1.5px solid ${({ theme, $on }) => $on ? theme.color.success : theme.color.border};
  background: ${({ theme, $on }) => $on ? theme.color.success : 'transparent'};
  color: ${({ theme }) => theme.color.successForeground};
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
`

export function HabitsCard() {
  const theme = useTheme()
  const qc = useQueryClient()
  const { data: habits, isLoading } = useQuery({ queryKey: ['health', 'habits'], queryFn: healthApi.habits })
  const { data: streak } = useQuery({ queryKey: ['health', 'streak'], queryFn: healthApi.streak })

  const today = fmtDateKey(new Date())
  const toggle = useMutation({
    mutationFn: (id: string) => healthApi.toggleHabit(id, today),
    onMutate: async (id) => {
      await qc.cancelQueries({ queryKey: ['health', 'habits'] })
      const prev = qc.getQueryData<typeof habits>(['health', 'habits'])
      qc.setQueryData<typeof habits>(['health', 'habits'], (old) =>
        old?.map((h) =>
          h.id === id
            ? {
                ...h,
                checks: Array.isArray(h.checks) && h.checks.includes(today)
                  ? h.checks.filter((d: string) => d !== today)
                  : [...(h.checks ?? []), today],
              }
            : h
        )
      )
      return { prev }
    },
    onError: (_err, _id, ctx) => {
      qc.setQueryData(['health', 'habits'], ctx?.prev)
      toast.error('Failed to toggle habit')
    },
    onSettled: () => qc.invalidateQueries({ queryKey: ['health', 'habits'] }),
  })

  return (
    <StyledCard title="Habits & Streaks" subtitle="Daily check-ins" icon={<Flame size={14} style={{ color: theme.domain.finance }} />}>
      {isLoading ? (
        <SkeletonList rows={3} leading={false} trailing />
      ) : !habits || habits.length === 0 ? (
        <>
          <Empty>No habits tracked yet. Add some on the Health page.</Empty>
          {streak && streak.current_streak > 0 && (
            <StatRow style={{ marginTop: 10 }}>
              <StatLabel><Flame size={12} /> Gym streak</StatLabel>
              <StatValue>{streak.current_streak} days</StatValue>
            </StatRow>
          )}
        </>
      ) : (
        <Stack direction="column" gap={2}>
          {habits.slice(0, 5).map((h) => {
            const checkedToday = h.checks?.includes(today)
            return (
              <HabitRow key={h.id} $checkedToday={checkedToday} onClick={() => toggle.mutate(h.id)}>
                <HabitName>
                  <CheckIcon $on={checkedToday}>{checkedToday && <Check size={11} strokeWidth={3} />}</CheckIcon>
                  {h.name}
                </HabitName>
                {h.streak > 0 && <StreakBadge><Flame size={10} /> {h.streak}</StreakBadge>}
              </HabitRow>
            )
          })}
        </Stack>
      )}
    </StyledCard>
  )
}

