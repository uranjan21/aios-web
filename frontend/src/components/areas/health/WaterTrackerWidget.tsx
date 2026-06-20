// @ts-nocheck
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { healthApi } from '@/api/areas'
import { Skeleton } from '@/components/ui/skeleton'
import styled from 'styled-components'

import { Card } from '@ledgr/ui'

const StyledProgressText = styled.span`
  font-size: 0.875rem;
  font-weight: 700;
  color: ${({ theme }) => theme.color?.primary || 'var(--primary)'};
`;

const StyledContent = styled.div`
  flex: 1;
  display: flex;
  flex-direction: column;
  justify-content: center;
`;

const StyledGlassesWrapper = styled.div`
  display: flex;
  align-items: flex-end;
  gap: 0.375rem;
  flex-wrap: wrap;
  margin-bottom: 0.75rem;
`;

const StyledGlassButton = styled.button<{ $filled?: boolean }>`
  background: none;
  border: none;
  padding: 0;
  transition: transform 0.2s;
  cursor: ${({ $filled }) => $filled ? 'default' : 'pointer'};
  
  &:not(:disabled):hover {
    transform: scale(1.1);
  }
  
  &:disabled {
    cursor: default;
  }
`;

const StyledMessage = styled.p`
  font-size: 11px;
  color: ${({ theme }) => theme.color?.mutedForeground || 'var(--muted-foreground)'};
  margin: 0;
`;

function GlassIcon({ filled }: { filled: boolean }) {
  return (
    <svg width="24" height="32" viewBox="0 0 24 32" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path
        d="M4 4 L2 28 L22 28 L20 4 Z"
        fill={filled ? 'var(--primary)' : 'var(--muted)'}
        stroke={filled ? '#F8D168' : 'var(--border)'}
        strokeWidth="1.5"
        strokeLinejoin="round"
        opacity={filled ? 1 : 0.5}
      />
      {filled && (
        <path
          d="M5 22 L19 22 L18.5 26 L5.5 26 Z"
          fill="rgba(255,255,255,0.15)"
        />
      )}
    </svg>
  )
}

export function WaterTrackerWidget() {
  const queryClient = useQueryClient()

  const { data: water, isLoading } = useQuery({
    queryKey: ['health', 'water', 'today'],
    queryFn: healthApi.waterToday,
  })

  const logWaterMutation = useMutation({
    mutationFn: () => healthApi.logWater(1),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['health', 'water', 'today'] })
      toast.success('Water logged')
    },
    onError: () => toast.error('Failed to log water'),
  })

  const glasses = water?.glasses_logged ?? 0
  const target = water?.target ?? 8
  const remaining = Math.max(0, target - glasses)

  return (
    <Card title="Water Intake" size="md" action={<StyledProgressText>{glasses} / {target} glasses</StyledProgressText>} style={{ height: '100%' }}>

      {isLoading ? (
        <Skeleton style={{ height: '3rem', width: '100%' }} />
      ) : (
        <StyledContent>
          <StyledGlassesWrapper>
            {Array.from({ length: target }).map((_, i) => (
              <StyledGlassButton
                key={i}
                onClick={() => i >= glasses && logWaterMutation.mutate()}
                disabled={i < glasses || logWaterMutation.isPending}
                $filled={i < glasses}
                title={i < glasses ? 'Logged' : 'Click to log'}
              >
                <GlassIcon filled={i < glasses} />
              </StyledGlassButton>
            ))}
          </StyledGlassesWrapper>

          <StyledMessage>
            {remaining === 0
              ? 'You hit your water goal today!'
              : `Drink ${remaining} more glass${remaining === 1 ? '' : 'es'} to hit your goal`}
          </StyledMessage>
        </StyledContent>
      )}
    </Card>
  )
}
