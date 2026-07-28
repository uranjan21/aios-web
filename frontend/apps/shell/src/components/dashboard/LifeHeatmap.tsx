import styled, { useTheme, keyframes } from 'styled-components'
import { Card, Tooltip } from '@ledgr/ui'
import { Activity, Flame } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { insightsApi } from '@ct/shared/api/insights'
import { fmtDateKey } from '@ct/shared/stores/dayEventsStore'

const pulseGlow = keyframes`
  0% { box-shadow: 0 0 0 0 ${({ theme }) => theme.color.accent}40; }
  70% { box-shadow: 0 0 0 6px ${({ theme }) => theme.color.accent}00; }
  100% { box-shadow: 0 0 0 0 ${({ theme }) => theme.color.accent}00; }
`

const StyledCard = styled(Card)`
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

const HeatmapWrapper = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => `${theme.spacing[3]}`};
  overflow-x: auto;
  
  /* Thin scrollbar */
  scrollbar-width: thin;
  scrollbar-color: ${({ theme }) => theme.color.border} transparent;
  &::-webkit-scrollbar { height: 4px; }
  &::-webkit-scrollbar-track { background: transparent; }
  &::-webkit-scrollbar-thumb {
    background: ${({ theme }) => theme.color.border};
    border-radius: ${({ theme }) => theme.radii.sm};
  }
`

const Grid = styled.div`
  display: grid;
  grid-template-rows: repeat(7, 1fr);
  grid-auto-flow: column;
  gap: ${({ theme }) => `${theme.spacing[0.5]}`};
  min-width: max-content;
`

const Cell = styled.div<{ $intensity: number }>`
  width: 10px;
  height: 10px;
  border-radius: ${({ theme }) => theme.radii.xs};
  background: ${({ theme, $intensity }) => {
    if ($intensity === 0) return theme.mode === 'dark' ? 'rgba(255,255,255,0.05)' : theme.color.muted
    const opacities = ['0.3', '0.6', '0.8', '1.0']
    const op = opacities[Math.min($intensity - 1, 3)]
    return `color-mix(in srgb, ${theme.color.accent} ${Number(op) * 100}%, transparent)`
  }};
  transition: all 200ms cubic-bezier(0.175, 0.885, 0.32, 1.275);
  box-shadow: ${({ theme, $intensity }) => 
    $intensity > 2 ? `0 0 ${$intensity * 2}px color-mix(in srgb, ${theme.color.accent} 40%, transparent)` : 'none'};

  &:hover {
    transform: scale(1.4);
    z-index: 1;
    border: 1px solid ${({ theme }) => theme.color.accent};
    box-shadow: 0 0 8px ${({ theme }) => theme.color.accent};
  }
`

const Footer = styled.div`
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: ${({ theme }) => `${theme.spacing[1.5]}`};
  font-size: ${({ theme }) => theme.typography.fontSize.xs};
  color: ${({ theme }) => theme.color.mutedForeground};
`

const LegendCell = styled(Cell)`
  width: 8px;
  height: 8px;
  &:hover { transform: none; border: none; box-shadow: none; }
`

const StreakChip = styled.span`
  display: inline-flex;
  align-items: center;
  gap: ${({ theme }) => `${theme.spacing[0.5]}`};
  font-size: ${({ theme }) => theme.typography.fontSize.xs};
  font-weight: 700;
  color: ${({ theme }) => theme.color.accent};
  background: ${({ theme }) => theme.color.accent}1A;
  padding: ${({ theme }) => `${theme.spacing[0.5]} ${theme.spacing[1.5]}`};
  border-radius: ${({ theme }) => theme.radii.sm};
  white-space: nowrap;
  animation: ${pulseGlow} 2s infinite;
`

// Bucket a raw per-day log count into 0–4 intensity levels.
function bucket(count: number): number {
  if (count <= 0) return 0
  if (count === 1) return 1
  if (count <= 3) return 2
  if (count <= 5) return 3
  return 4
}

export function LifeHeatmap() {
  const theme = useTheme()
  const { data } = useQuery({
    queryKey: ['insights', 'heatmap'],
    queryFn: () => insightsApi.heatmap(180),
    staleTime: 10 * 60_000,
  })
  const dayCounts = data?.days ?? {}
  const streak = data?.streak ?? 0

  const now = new Date()
  const cells = []
  // We want to align the last day to today's day of week
  const todayDow = now.getDay()
  const startDate = new Date(now)
  startDate.setDate(startDate.getDate() - (180 + todayDow))

  for (let i = 0; i <= 180 + todayDow; i++) {
    const d = new Date(startDate)
    d.setDate(d.getDate() + i)
    const key = fmtDateKey(d)
    const count = dayCounts[key] || 0

    cells.push(
      <Tooltip key={key} content={`${key}: ${count} log${count === 1 ? '' : 's'}`} side="top">
        <Cell $intensity={bucket(count)} />
      </Tooltip>
    )
  }

  return (
    <StyledCard
      title="Life Heatmap"
      subtitle="Your logging consistency"
      icon={<Activity size={14} style={{ color: theme.color.accent }} />}
      action={streak > 1 ? (
        <StreakChip><Flame size={11} /> {streak}-day streak</StreakChip>
      ) : undefined}
    >
      <HeatmapWrapper>
        <Grid>
          {cells}
        </Grid>
      </HeatmapWrapper>
      <Footer>
        Less
        <LegendCell $intensity={0} />
        <LegendCell $intensity={1} />
        <LegendCell $intensity={2} />
        <LegendCell $intensity={3} />
        <LegendCell $intensity={4} />
        More
      </Footer>
    </StyledCard>
  )
}

