import { useEffect, useMemo, useState } from 'react'
import styled, { useTheme } from 'styled-components'
import { useQuery } from '@tanstack/react-query'
import { Card, KpiCard, KpiGrid, SegmentedControl, Input, EmptyState, focusRing } from '@ledgr/ui'
import { FlaskConical, TrendingUp } from 'lucide-react'
import {
  ComposedChart, Area, Line, XAxis, YAxis, CartesianGrid,
  Tooltip as RTooltip, ResponsiveContainer, ReferenceLine,
} from 'recharts'
import { financeApi, type SimulationParams } from '@aios/shared/api/areas'
import { WorkspaceLayout, RailHeading } from '@aios/shared/components/layout/WorkspaceLayout'
import { ForecastWidget } from '@aios/shared/components/widgets/ForecastWidget'
import { CashflowForecasting } from './AdvancedWidgets'
import { formatCurrency } from '@aios/shared/lib/utils'

const RailStack = styled.div`
  display: flex;
  flex-direction: column;
  gap: 20px;
`

const LeverBlock = styled.div`
  display: flex;
  flex-direction: column;
  gap: 6px;
`

const LeverLabel = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size: 12px;
  font-weight: 600;
  color: ${({ theme }) => theme.color.foreground};
`

const LeverValue = styled.span<{ $tone?: 'good' | 'bad' | 'neutral' }>`
  font-variant-numeric: tabular-nums;
  color: ${({ theme, $tone }) =>
    $tone === 'good' ? theme.color.success : $tone === 'bad' ? theme.color.destructive : theme.color.mutedForeground};
`

// Native range input, tokenized — ledgr-ui has no Slider primitive yet.
const Range = styled.input.attrs({ type: 'range' })`
  -webkit-appearance: none;
  appearance: none;
  width: 100%;
  height: 4px;
  border-radius: ${({ theme }) => theme.radii.sm};
  background: ${({ theme }) => theme.color.muted};
  outline: none;
  cursor: pointer;

  &::-webkit-slider-thumb {
    -webkit-appearance: none;
    appearance: none;
    width: 16px;
    height: 16px;
    border-radius: 50%; /* structural circle — exempt from the no-pill rule */
    background: ${({ theme }) => theme.color.primary};
    border: 2px solid ${({ theme }) => theme.color.card};
    box-shadow: ${({ theme }) => theme.shadow.sm};
  }
  &::-moz-range-thumb {
    width: 16px;
    height: 16px;
    border-radius: 50%;
    background: ${({ theme }) => theme.color.primary};
    border: 2px solid ${({ theme }) => theme.color.card};
  }
  ${focusRing}
`

const AssumptionsBox = styled.div`
  font-size: 11.5px;
  line-height: 1.7;
  color: ${({ theme }) => theme.color.mutedForeground};
  background: ${({ theme }) => theme.color.muted};
  border-radius: ${({ theme }) => theme.radii.md};
  padding: 10px 12px;
  font-variant-numeric: tabular-nums;
`

const ChartWrap = styled.div`
  height: 320px;
`

function useDebounced<T>(value: T, ms: number): T {
  const [v, setV] = useState(value)
  useEffect(() => {
    const t = setTimeout(() => setV(value), ms)
    return () => clearTimeout(t)
  }, [value, ms])
  return v
}

export function SimulatorTab() {
  const theme = useTheme()
  const [months, setMonths] = useState(12)
  const [incomeDelta, setIncomeDelta] = useState(0)
  const [spendDelta, setSpendDelta] = useState(0)
  const [oneTimeAmount, setOneTimeAmount] = useState('')
  const [oneTimeMonth, setOneTimeMonth] = useState('1')

  const params: SimulationParams = useDebounced(
    useMemo(() => ({
      months,
      income_delta_pct: incomeDelta,
      spend_delta_pct: spendDelta,
      one_time_amount: Number(oneTimeAmount) || 0,
      one_time_month: Math.min(Math.max(Number(oneTimeMonth) || 1, 1), months),
    }), [months, incomeDelta, spendDelta, oneTimeAmount, oneTimeMonth]),
    450,
  )

  const { data, error, isLoading } = useQuery({
    queryKey: ['finance', 'simulate', params],
    queryFn: () => financeApi.simulate(params),
    staleTime: 5 * 60_000,
    retry: false,
  })

  const chartData = useMemo(() => {
    if (!data) return []
    return data.labels.map((label, i) => ({
      label,
      p10: data.p10[i],
      band: data.p90[i] - data.p10[i], // stacked on p10 → renders the p10–p90 envelope
      p50: data.p50[i],
      deterministic: data.deterministic[i],
    }))
  }, [data])

  const endP50 = data ? data.p50[data.p50.length - 1] : null
  const endP90 = data ? data.p90[data.p90.length - 1] : null
  const endP10 = data ? data.p10[data.p10.length - 1] : null

  const rail = (
    <RailStack>
      <RailHeading>What-if levers</RailHeading>

      <LeverBlock>
        <LeverLabel>Horizon</LeverLabel>
        <SegmentedControl
          size="sm"
          value={String(months)}
          onChange={v => setMonths(Number(v))}
          options={[
            { label: '6m', value: '6' },
            { label: '12m', value: '12' },
            { label: '24m', value: '24' },
          ]}
          aria-label="Simulation horizon"
        />
      </LeverBlock>

      <LeverBlock>
        <LeverLabel>
          Income change
          <LeverValue $tone={incomeDelta > 0 ? 'good' : incomeDelta < 0 ? 'bad' : 'neutral'}>
            {incomeDelta > 0 ? '+' : ''}{incomeDelta}%
          </LeverValue>
        </LeverLabel>
        <Range min={-50} max={100} step={5} value={incomeDelta}
          onChange={e => setIncomeDelta(Number(e.target.value))} aria-label="Income change percent" />
      </LeverBlock>

      <LeverBlock>
        <LeverLabel>
          Spending change
          <LeverValue $tone={spendDelta < 0 ? 'good' : spendDelta > 0 ? 'bad' : 'neutral'}>
            {spendDelta > 0 ? '+' : ''}{spendDelta}%
          </LeverValue>
        </LeverLabel>
        <Range min={-50} max={50} step={5} value={spendDelta}
          onChange={e => setSpendDelta(Number(e.target.value))} aria-label="Spending change percent" />
      </LeverBlock>

      <LeverBlock>
        <LeverLabel>One-time expense (₹)</LeverLabel>
        <Input size="sm" type="number" min="0" step="1000" placeholder="e.g. 50000"
          value={oneTimeAmount} onChange={e => setOneTimeAmount(e.target.value)} aria-label="One-time expense amount" />
      </LeverBlock>
      {Number(oneTimeAmount) > 0 && (
        <LeverBlock>
          <LeverLabel>…in month #</LeverLabel>
          <Input size="sm" type="number" min="1" max={String(months)} step="1"
            value={oneTimeMonth} onChange={e => setOneTimeMonth(e.target.value)} aria-label="One-time expense month" />
        </LeverBlock>
      )}

      {data && (
        <AssumptionsBox>
          <strong>Baseline (last 90 days)</strong><br />
          Start balance: {formatCurrency(data.assumptions.start_balance)}<br />
          Income: {formatCurrency(data.assumptions.monthly_income)}/mo<br />
          Spend: {formatCurrency(data.assumptions.monthly_spend_mean)}/mo (±{formatCurrency(data.assumptions.monthly_spend_std)})
        </AssumptionsBox>
      )}
    </RailStack>
  )

  if (error) {
    return (
      <WorkspaceLayout rail={rail} railTitle="Assumptions" railSubtitle="Adjust the levers to re-run the projection">
        <EmptyState
          icon={<FlaskConical size={24} />}
          title="Not enough history to simulate"
          description="Log some income and expenses first — the simulator projects from your real 90-day burn rate."
        />
      </WorkspaceLayout>
    )
  }

  return (
    <WorkspaceLayout rail={rail} railTitle="Assumptions" railSubtitle="Adjust the levers to re-run the projection">
      {/*
        Every forward-looking finance surface lives here now. They used to be
        scattered across three tabs — ForecastWidget on Overview,
        CashflowForecasting in Analytics and the Monte-Carlo simulator alone in
        its own tab — so "what happens next to my money" had three different
        answers in three places. Analytics is retrospective only.
      */}
      <ForecastWidget domain="finance" />
      <CashflowForecasting />

      <KpiGrid $cols={3}>
        <KpiCard label="Median outcome" icon={FlaskConical} sub={`Balance after ${months} months (p50)`}
          loading={isLoading} value={endP50 != null ? formatCurrency(endP50) : '—'} spark={data?.p50} />
        <KpiCard label="Best case" icon={TrendingUp} sub="90th percentile"
          loading={isLoading} value={endP90 != null ? formatCurrency(endP90) : '—'} />
        <KpiCard label="Worst case" icon={TrendingUp} sub="10th percentile"
          loading={isLoading} value={endP10 != null ? formatCurrency(endP10) : '—'} />
      </KpiGrid>

      <Card
        title="Balance projection"
        subtitle={`${400} Monte-Carlo runs seeded from your real history — shaded band = 80% of outcomes`}
        icon={<FlaskConical size={16} />}
      >
        {data?.zero_month && (
          <AssumptionsBox style={{ marginBottom: 12 }}>
            ⚠️ On the median path your balance crosses ₹0 in month {data.zero_month} ({data.labels[data.zero_month - 1]}).
          </AssumptionsBox>
        )}
        <ChartWrap>
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={theme.color.border} />
              <XAxis dataKey="label" axisLine={false} tickLine={false}
                tick={{ fontSize: 11, fill: theme.color.mutedForeground }} />
              <YAxis axisLine={false} tickLine={false} width={70}
                tick={{ fontSize: 11, fill: theme.color.mutedForeground }}
                tickFormatter={(v: number) => formatCurrency(v)} />
              <RTooltip
                contentStyle={{ background: theme.color.card, border: `1px solid ${theme.color.border}`, borderRadius: 8, fontSize: 12 }}
                formatter={(value: number, name: string) => {
                  const labels: Record<string, string> = { p50: 'Median', deterministic: 'Steady path', band: 'p90', p10: 'p10' }
                  return [formatCurrency(name === 'band' ? value : value), labels[name] ?? name]
                }}
              />
              <ReferenceLine y={0} stroke={theme.color.destructive} strokeDasharray="4 4" />
              <Area dataKey="p10" stackId="band" stroke="none" fill="transparent" isAnimationActive={false} />
              <Area dataKey="band" stackId="band" stroke="none" fill={theme.color.accent} fillOpacity={0.14} isAnimationActive={false} />
              <Line dataKey="deterministic" stroke={theme.color.mutedForeground} strokeDasharray="5 4" strokeWidth={1.5} dot={false} isAnimationActive={false} />
              <Line dataKey="p50" stroke={theme.color.accent} strokeWidth={2} dot={false} isAnimationActive={false} />
            </ComposedChart>
          </ResponsiveContainer>
        </ChartWrap>
      </Card>
    </WorkspaceLayout>
  )
}
