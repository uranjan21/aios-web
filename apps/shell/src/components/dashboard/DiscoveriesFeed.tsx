import styled, { useTheme } from 'styled-components'
import { InsightCard } from '@ledgr/ui'
import { Sparkles, Activity } from 'lucide-react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { insightsApi } from '@aios/shared/api/insights'

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


// The standalone /app/discoveries page was a 39-line wrapper that re-queried
// this same endpoint just to decide empty-vs-not. This is now the only
// discoveries surface, so it shows the full set rather than a teaser + link.
export function DiscoveriesFeed({ limit = 8 }: { limit?: number }) {
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
