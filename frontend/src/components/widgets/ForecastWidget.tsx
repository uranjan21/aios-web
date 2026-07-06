import styled from 'styled-components'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Card, Button } from '@ledgr/ui'
import { forecastsApi } from '@/api/forecasts'
import { TrendingUp } from 'lucide-react'

interface Props {
  domain: string
}

const ValueRow = styled.div`
  display: flex;
  align-items: flex-end;
  gap: 8px;
`

const Value = styled.span`
  font-size: 28px;
  font-weight: 700;
  color: ${({ theme }) => theme.color.foreground};
  font-variant-numeric: tabular-nums;
  line-height: 1;
`

const Meta = styled.span`
  font-size: 12px;
  color: ${({ theme }) => theme.color.mutedForeground};
  padding-bottom: 2px;
`

const ConfidenceChip = styled.span`
  display: inline-flex;
  align-items: center;
  font-size: 11px;
  font-weight: 600;
  color: ${({ theme }) => theme.color.accent};
  background: ${({ theme }) => theme.color.accent}1A;
  padding: 2px 7px;
  border-radius: ${({ theme }) => theme.radii.sm};
`

const InsightText = styled.p`
  margin: 12px 0 0;
  font-size: 13px;
  line-height: 1.5;
  color: ${({ theme }) => theme.color.mutedForeground};
`

export function ForecastWidget({ domain }: Props) {
  const queryClient = useQueryClient()
  const { data: forecasts = [], isLoading } = useQuery({
    queryKey: ['forecasts', domain],
    queryFn: () => forecastsApi.list(domain),
    staleTime: 10 * 60_000,
  })

  const { mutate: generate, isPending } = useMutation({
    mutationFn: () => forecastsApi.generate(domain),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['forecasts', domain] }),
  })

  // Plan §7.7: low-confidence forecasts are noise — don't show them.
  const latest = forecasts.find(f => f.confidence >= 0.5)

  if (!latest) {
    return (
      <Card
        title="Predictive Forecasting"
        subtitle={`AI projection for ${domain}`}
        icon={<TrendingUp size={16} />}
      >
        <InsightText>No forecast generated yet.</InsightText>
        <div style={{ marginTop: 12 }}>
          <Button size="sm" variant="primary" onClick={() => generate()} loading={isPending}>
            Generate Forecast
          </Button>
        </div>
      </Card>
    )
  }

  return (
    <Card
      title={`Forecast: ${latest.metric.replace(/_/g, ' ')}`}
      subtitle={`AI projection for ${domain}`}
      icon={<TrendingUp size={16} />}
      action={
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <ConfidenceChip>{Math.round(latest.confidence * 100)}% conf</ConfidenceChip>
          <Button size="sm" variant="ghost" onClick={() => generate()} loading={isPending}>
            Refresh
          </Button>
        </div>
      }
    >
      <ValueRow>
        <Value>{latest.predicted_value.toLocaleString('en-IN')}</Value>
        <Meta>by {latest.target_date}</Meta>
      </ValueRow>
      {latest.ai_insight && <InsightText>{latest.ai_insight}</InsightText>}
    </Card>
  )
}
