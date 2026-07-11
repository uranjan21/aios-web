import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { chatApi } from '@/api/chat'
import { Skeleton } from '@/components/ui/skeleton'
import { ProgressBar } from '@/components/lumina'
import { Select } from '@ledgr/ui'
import styled, { useTheme } from 'styled-components'
import { Section } from '../shared'

// ── Token gauge ───────────────────────────────────────────────────────────────

const GaugeWrap = styled.div`
  padding: 14px 20px;
  display: flex;
  flex-direction: column;
  gap: 8px;
`

const GaugeMeta = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size: 14px;
`

const GaugeNote = styled.p`
  font-size: 12px;
  color: ${({ theme }) => theme.color.mutedForeground};
  margin: 0;
`

const SkelGaugeTitle = styled(Skeleton)`
  height: 0.75rem;
  width: 10rem;
`

const SkelGaugeBar = styled(Skeleton)`
  height: 0.5rem;
  width: 100%;
`

function TokenGauge() {
  const theme = useTheme()
  const { data, isLoading } = useQuery({
    queryKey: ['token-budget'],
    queryFn: chatApi.tokenBudget,
    refetchInterval: 60_000,
  })

  if (isLoading) return (
    <GaugeWrap>
      <SkelGaugeTitle />
      <SkelGaugeBar />
    </GaugeWrap>
  )
  if (!data) return null

  const pct = data.percent
  const barColor = pct >= 90 ? theme.color.mutedForeground : pct >= 70 ? theme.color.accent : theme.color.primary
  const metaColor = pct >= 90 ? theme.color.mutedForeground : pct >= 70 ? theme.color.accent : undefined

  const resetH = Math.floor(data.reset_in_seconds / 3600)
  const resetM = Math.floor((data.reset_in_seconds % 3600) / 60)

  return (
    <GaugeWrap>
      <GaugeMeta>
        <span style={{ color: theme.color.foreground }}>Chat token budget</span>
        <span style={{ fontSize: 12, fontWeight: 500, fontVariantNumeric: 'tabular-nums', color: metaColor ?? theme.color.mutedForeground }}>
          {data.used_today.toLocaleString()} / {data.daily_limit.toLocaleString()}
        </span>
      </GaugeMeta>
      <ProgressBar value={pct} color={barColor} glow={pct >= 90} size="sm" />
      <GaugeNote>
        {pct.toFixed(1)}% used · resets in {resetH}h {resetM}m
        {pct >= 80 && <span style={{ color: theme.color.accent, marginLeft: 4 }}>· approaching limit</span>}
      </GaugeNote>
    </GaugeWrap>
  )
}

// ── AI usage section ──────────────────────────────────────────────────────────

export function AiUsageSection() {
  const [aiRange, setAiRange] = useState('daily')
  return (
    <Section
      title="AI Usage"
      action={
        <Select
          size="sm"
          fullWidth={false}
          options={[
            { label: 'Daily', value: 'daily' },
            { label: 'Weekly', value: 'weekly' },
            { label: 'Monthly', value: 'monthly' },
          ]}
          value={aiRange}
          onChange={(val) => setAiRange(val as string)}
          aria-label="AI usage period"
        />
      }
    >
      <TokenGauge />
    </Section>
  )
}
