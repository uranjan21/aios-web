import styled, { useTheme } from 'styled-components'
import { InsightCard } from '@ledgr/ui'
import { useNavigate } from 'react-router-dom'
import { Sparkles, Activity } from 'lucide-react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { insightsApi } from '@/api/insights'

const FeedWrapper = styled.div`
  display: flex;
  flex-direction: column;
  gap: 12px;
`

const Header = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
`

const Title = styled.h3`
  margin: 0;
  font-size: 14px;
  font-weight: 700;
  color: ${({ theme }) => theme.color.foreground};
  display: flex;
  align-items: center;
  gap: 6px;
`

const SeeAllBtn = styled.button`
  background: none;
  border: none;
  font-size: 12px;
  font-weight: 600;
  color: ${({ theme }) => theme.color.mutedForeground};
  cursor: pointer;
  padding: 4px 8px;
  border-radius: ${({ theme }) => theme.radii.sm};
  transition: background 120ms, color 120ms;
  &:hover {
    background: ${({ theme }) => theme.color.muted};
    color: ${({ theme }) => theme.color.foreground};
  }
`

export function DiscoveriesFeed({ limit = 3, showSeeAll = true }: { limit?: number; showSeeAll?: boolean }) {
  const navigate = useNavigate()
  const theme = useTheme()
  const queryClient = useQueryClient()

  const { data: insights = [] } = useQuery({
    queryKey: ['insights', 'discoveries'],
    queryFn: insightsApi.discoveries,
    staleTime: 5 * 60_000,
  })

  const feedbackMutation = useMutation({
    mutationFn: ({ id, feedback }: { id: string; feedback: 1 | -1 }) => insightsApi.feedback(id, feedback),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['insights', 'discoveries'] }),
  })

  const visible = insights.slice(0, limit)
  if (visible.length === 0) return null

  return (
    <FeedWrapper>
      <Header>
        <Title><Sparkles size={14} style={{ color: theme.color.accent }} /> Discoveries</Title>
        {showSeeAll && <SeeAllBtn onClick={() => navigate('/app/discoveries')}>See all</SeeAllBtn>}
      </Header>
      {visible.map(i => (
        <InsightCard
          key={i.id}
          title={i.title}
          text={i.body}
          icon={<Activity size={14} />}
          attribution={`AI · ${i.metric_a} × ${i.metric_b} · last ${i.n} days`}
          onRateUp={() => feedbackMutation.mutate({ id: i.id, feedback: 1 })}
          onRateDown={() => feedbackMutation.mutate({ id: i.id, feedback: -1 })}
          onDismiss={() => feedbackMutation.mutate({ id: i.id, feedback: -1 })}
        />
      ))}
    </FeedWrapper>
  )
}
