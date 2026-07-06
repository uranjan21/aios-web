import { useQuery } from '@tanstack/react-query'
import styled from 'styled-components'
import { Card } from '@ledgr/ui'
import { Target, FolderKanban, ActivitySquare, ListTodo } from 'lucide-react'
import { workspaceApi } from '@/api/workspace'

const StatsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
  gap: 16px;
`

const StatItem = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 12px;
  border-radius: ${({ theme }) => theme.radii.lg};
  background: ${({ theme }) => `color-mix(in srgb, ${theme.color.muted} 50%, transparent)`};
  border: 1px solid ${({ theme }) => theme.color.border};
`

const StatHeader = styled.div`
  display: flex;
  align-items: center;
  gap: 6px;
  color: ${({ theme }) => theme.color.mutedForeground};
  font-size: 13px;
  font-weight: 500;
`

const StatValue = styled.div`
  font-size: 24px;
  font-weight: 600;
  color: ${({ theme }) => theme.color.foreground};
`

export function WorkspaceStatsWidget({ domain }: { domain: string }) {
  const { data: stats, isLoading } = useQuery({
    queryKey: ['workspace', 'stats', domain],
    queryFn: () => workspaceApi.getStats({ domain }),
  })

  if (isLoading) {
    return (
      <Card title="Workspace Activity">
        <StatsGrid style={{ opacity: 0.5 }}>
          <StatItem><StatHeader><Target size={14}/> Goals</StatHeader><StatValue>...</StatValue></StatItem>
          <StatItem><StatHeader><FolderKanban size={14}/> Projects</StatHeader><StatValue>...</StatValue></StatItem>
          <StatItem><StatHeader><ActivitySquare size={14}/> Sprints</StatHeader><StatValue>...</StatValue></StatItem>
          <StatItem><StatHeader><ListTodo size={14}/> Tasks</StatHeader><StatValue>...</StatValue></StatItem>
        </StatsGrid>
      </Card>
    )
  }

  return (
    <Card title="Workspace Activity">
      <StatsGrid>
        <StatItem>
          <StatHeader><Target size={14}/> Goals</StatHeader>
          <StatValue>{stats?.goals_count || 0}</StatValue>
        </StatItem>
        <StatItem>
          <StatHeader><FolderKanban size={14}/> Projects</StatHeader>
          <StatValue>{stats?.projects_count || 0}</StatValue>
        </StatItem>
        <StatItem>
          <StatHeader><ActivitySquare size={14}/> Sprints</StatHeader>
          <StatValue>{stats?.sprints_count || 0}</StatValue>
        </StatItem>
        <StatItem>
          <StatHeader><ListTodo size={14}/> Tasks</StatHeader>
          <StatValue>{stats?.tasks_count || 0}</StatValue>
        </StatItem>
      </StatsGrid>
    </Card>
  )
}
