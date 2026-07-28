import styled, { useTheme, keyframes } from 'styled-components'
import { Card, InsightCard } from '@ledgr/ui'
import { Sparkles, Activity } from 'lucide-react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { insightsApi } from '@ct/shared/api/insights'

const pulseGlow = keyframes`
  0% { box-shadow: 0 0 0 0 ${({ theme }) => theme.color.accent}40; }
  70% { box-shadow: 0 0 0 10px ${({ theme }) => theme.color.accent}00; }
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

const LuxuryEmptyContainer = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  padding: ${({ theme }) => `${theme.spacing[8]} ${theme.spacing[4]}`};
  gap: ${({ theme }) => theme.spacing[3]};
`

const GlowingBadge = styled.div`
  width: 48px;
  height: 48px;
  border-radius: 50%;
  background: ${({ theme }) => `linear-gradient(135deg, ${theme.color.accent}20, transparent)`};
  border: 1px solid ${({ theme }) => `${theme.color.accent}40`};
  display: flex;
  align-items: center;
  justify-content: center;
  color: ${({ theme }) => theme.color.accent};
  animation: ${pulseGlow} 2s infinite;
  margin-bottom: ${({ theme }) => theme.spacing[2]};
`

const EmptyTitle = styled.h4`
  margin: 0;
  font-size: ${({ theme }) => theme.typography.fontSize.base};
  font-weight: 600;
  color: ${({ theme }) => theme.color.foreground};
`

const EmptyDesc = styled.p`
  margin: 0;
  font-size: ${({ theme }) => theme.typography.fontSize.sm};
  color: ${({ theme }) => theme.color.mutedForeground};
  max-width: 250px;
  line-height: 1.5;
`

const FeedWrapper = styled(StyledCard)`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => `${theme.spacing[4]}`};
  padding: ${({ theme }) => theme.spacing[4]};
`

const Header = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
`

const Title = styled.h3`
  margin: 0;
  font-size: ${({ theme }) => theme.typography.fontSize.base};
  font-weight: 700;
  color: ${({ theme }) => theme.color.foreground};
  display: flex;
  align-items: center;
  gap: ${({ theme }) => `${theme.spacing[1.5]}`};
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

  // Previously `return null`. Discoveries are cross-domain correlations the
  // synergy job finds; with little logged data there are none, and silently
  // rendering nothing gave no hint that the feature exists.
  if (visible.length === 0) {
    return (
      <StyledCard title="Discoveries" icon={<Sparkles size={16} style={{ color: theme.color.accent }} />}>
        <LuxuryEmptyContainer>
          <GlowingBadge>
            <Sparkles size={24} />
          </GlowingBadge>
          <EmptyTitle>Nothing spotted yet</EmptyTitle>
          <EmptyDesc>Once there's a few weeks of data across your areas, patterns worth knowing about show up here.</EmptyDesc>
        </LuxuryEmptyContainer>
      </StyledCard>
    )
  }

  return (
    <FeedWrapper>
      <Header>
        <Title><Sparkles size={16} style={{ color: theme.color.accent }} /> Discoveries</Title>
      </Header>
      <div style={{ display: 'flex', flexDirection: 'column', gap: theme.spacing[3] }}>
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
      </div>
    </FeedWrapper>
  )
}

