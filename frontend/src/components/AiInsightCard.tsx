import { useMutation } from '@tanstack/react-query'
import { Button } from '@ledgr/ui'
import { toast } from 'sonner'
import { Sparkles, RefreshCw } from 'lucide-react'
import { aiApi } from '@/api/areas'
import { Skeleton } from '@/components/ui/skeleton'
import { Card as GlassCard } from '@ledgr/ui';
import styled from 'styled-components'

const ThemedSparkles = styled(Sparkles)`
  color: ${({ theme }) => theme.color.accent};
  flex-shrink: 0;
`

const SkeletonStack = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
`

const ResultText = styled.div`
  font-size: 13px;
  color: ${({ theme }) => theme.color.foreground};
  line-height: 1.6;
  white-space: pre-wrap;
`

const HintText = styled.p`
  font-size: 12px;
  color: ${({ theme }) => theme.color?.mutedForeground || 'var(--muted-foreground)'};
  margin: 0;
`

const SkelInsightLine1 = styled(Skeleton)`
  height: 0.875rem;
  width: 100%;
`

const SkelInsightLine2 = styled(Skeleton)`
  height: 0.875rem;
  width: 83.333333%;
`

const SkelInsightLine3 = styled(Skeleton)`
  height: 0.875rem;
  width: 66.666667%;
`

/** "Explain this month/week" — one-click LLM insight card for an area page. */
export function AiInsightCard({ area, title, className }: { area: 'finance' | 'health'; title?: string; className?: string }) {
  const { mutate, data, isPending, isError } = useMutation({
    mutationFn: () => aiApi.explain(area),
    onError: () => toast.error('AI temporarily unavailable'),
  })

  return (
    <GlassCard
      className={className}
      title={title ?? (area === 'finance' ? 'Explain This Month' : 'Explain This Week')}
      subtitle={area === 'finance' ? 'AI financial advisor analysis' : 'AI health analyst snapshot'}
      icon={<ThemedSparkles size={14} />}
      action={
        <Button
          size="sm"
          variant={data ? 'ghost' : 'primary'}
          startIcon={data ? <RefreshCw size={12} /> : <Sparkles size={12} />}
          loading={isPending}
          onClick={() => mutate()}
        >
          {data ? 'Refresh' : 'Analyse'}
        </Button>
      }
    >
      {isPending ? (
        <SkeletonStack>
          <SkelInsightLine1 />
          <SkelInsightLine2 />
          <SkelInsightLine3 />
        </SkeletonStack>
      ) : data ? (
        <ResultText>{data.text}</ResultText>
      ) : (
        <HintText>
          {isError ? 'Could not reach the AI — try again.' : `One click — AI reads your ${area} data and tells you what matters.`}
        </HintText>
      )}
    </GlassCard>
  )
}
