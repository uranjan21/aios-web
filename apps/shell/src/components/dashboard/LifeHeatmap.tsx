import styled, { useTheme } from 'styled-components'
import { Card, Tooltip } from '@ledgr/ui'
import { Activity, Flame } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { insightsApi } from '@ct/shared/api/insights'
import { fmtDateKey } from '@ct/shared/stores/dayEventsStore'

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
    if ($intensity === 0) return theme.color.muted
    const opacities = ['0.3', '0.6', '0.8', '1.0']
    const op = opacities[Math.min($intensity - 1, 3)]
    return `color-mix(in srgb, ${theme.color.accent} ${Number(op) * 100}%, transparent)`
  }};
  transition: transform 100ms;
  &:hover {
    transform: scale(1.2);
    z-index: 1;
    outline: 1px solid ${({ theme }) => theme.color.border};
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
  &:hover { transform: none; outline: none; }
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
    <Card
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
    </Card>
  )
}
