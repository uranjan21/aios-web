// @ts-nocheck
import { useState, useMemo, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Button, Input, Select, Dialog, SegmentedControl } from '@ledgr/ui'
import { Scale, Percent, Ruler, Moon, Clock } from 'lucide-react'
import { healthApi } from '@/api/areas'
import { Skeleton } from '@/components/ui/skeleton'
import { format } from 'date-fns'
import {
  ComposedChart, Area, Bar, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ReferenceLine,
  ResponsiveContainer,
} from 'recharts'
import { KpiCard } from '@ledgr/ui';
import { Card as GlassCard } from '@ledgr/ui';
import { Card as SectionCard } from '@ledgr/ui'
import { WorkspaceLayout } from '@/components/layout/WorkspaceLayout'
import { TabToolbar } from '@/components/ui/TabToolbar'
import styled, { useTheme } from 'styled-components'

const QUALITY_OPTIONS = ['poor', 'fair', 'good', 'excellent']

function bmiCategory(bmi: number) {
  if (bmi < 18.5) return { label: 'Underweight', color: 'text-kpi-amber' }
  if (bmi < 25) return { label: 'Normal', color: 'text-kpi-emerald' }
  if (bmi < 30) return { label: 'Overweight', color: 'text-kpi-amber' }
  return { label: 'Obese', color: 'text-kpi-red' }
}

const StyledContainer = styled.div`
  display: flex;
  flex-direction: column;
  gap: 1rem;
`;

const StyledKpiGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 0.75rem;

  @media (min-width: 640px) {
    grid-template-columns: repeat(5, 1fr);
  }
`;

const StyledChartsGrid = styled.div`
  display: grid;
  grid-template-columns: 1fr;
  gap: 1rem;

  @media (min-width: 1024px) {
    grid-template-columns: repeat(2, 1fr);
  }
`;

const StyledEmptyState = styled.div`
  height: 200px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.875rem;
  color: ${({ theme }) => theme.color?.mutedForeground || 'var(--muted-foreground)'};
  text-align: center;
  padding: 2rem;
`;

const StyledListWrapper = styled.div`
  & > div {
    border-bottom: 1px solid rgba(45, 49, 58, 0.15);
  }
  & > div:last-child {
    border-bottom: none;
  }
`;

const StyledListItem = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.75rem 1rem;
  transition: background-color 0.2s;
  
  &:hover {
    background-color: rgba(45, 49, 58, 0.02);
  }
`;

const StyledListItemTitle = styled.p`
  font-size: 0.875rem;
  font-weight: 500;
  color: ${({ theme }) => theme.color?.foreground || 'var(--foreground)'};
  margin: 0;
`;

const StyledListItemSubtitle = styled.p`
  font-size: 11px;
  color: ${({ theme }) => theme.color?.mutedForeground || 'var(--muted-foreground)'};
  text-transform: capitalize;
  margin: 0;
`;

const StyledListValue = styled.span<{ $good?: boolean }>`
  font-size: 0.875rem;
  font-weight: 700;
  color: ${({ theme, $good }) => $good ? theme.color.primary : theme.color.accent};
`;

const StyledModalContent = styled.div`
  display: flex;
  flex-direction: column;
  gap: 1rem;
`;

const StyledSegmentedControlWrapper = styled.div`
  margin-bottom: 0.5rem;
  width: 100%;
  display: flex;
  & > * {
    flex: 1;
    display: flex;
  }
  & > * > button {
    flex: 1;
  }
`;

const StyledForm = styled.form`
  display: flex;
  flex-direction: column;
  gap: 1rem;
`;

const StyledFormGroup = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
`;

const StyledLabel = styled.label`
  font-size: 11px;
  color: ${({ theme }) => theme.color?.mutedForeground || 'var(--muted-foreground)'};
  display: block;
`;

const StyledFormActions = styled.div`
  display: flex;
  justify-content: flex-end;
  gap: 0.5rem;
  margin-top: 1rem;
  padding-top: 1rem;
  border-top: 1px solid rgba(45, 49, 58, 0.15);
`;

const StyledButtonContent = styled.span`
  display: flex;
  align-items: center;
  gap: 0.375rem;
`;

const StyledDivider = styled.div`
  width: 1px;
  height: 1rem;
  background-color: ${({ theme }) => theme.color?.border || 'var(--border)'};
  margin: 0 0.25rem;
  opacity: 0.6;
  
  @media (max-width: 768px) {
    display: none;
  }
`;

export function BodySleepTab() {
  const theme = useTheme()
  const queryClient = useQueryClient()
  const [editingHeight, setEditingHeight] = useState(false)
  const [bodyFormState, setBodyFormState] = useState({ logged_at: '', weight_kg: '', body_fat_pct: '', notes: '' })
  const [sleepFormState, setSleepFormState] = useState({ logged_at: '', hours: '', quality: 'good' })

  const { data: weightLogs, isLoading: loadingWeight } = useQuery({
    queryKey: ['health', 'logs', 'weight'],
    queryFn: () => healthApi.logs('weight'),
  })
  const { data: bodyFatLogs, isLoading: loadingBodyFat } = useQuery({
    queryKey: ['health', 'logs', 'body_fat'],
    queryFn: () => healthApi.logs('body_fat'),
  })
  const { data: goals, isLoading: loadingGoals } = useQuery({
    queryKey: ['health', 'goals'],
    queryFn: healthApi.healthGoals,
  })
  const { data: sleep, isLoading: loadingSleep } = useQuery({
    queryKey: ['health', 'sleep', 'recent'],
    queryFn: healthApi.sleepRecent,
  })

  const bodyMutation = useMutation({
    mutationFn: async (values: Record<string, string>) => {
      const logged_at = values.logged_at ? new Date(values.logged_at).toISOString() : undefined
      await healthApi.createLog({ entry_type: 'weight', value: parseFloat(values.weight_kg), unit: 'kg', notes: values.notes || undefined, logged_at })
      if (values.body_fat_pct) {
        await healthApi.createLog({ entry_type: 'body_fat', value: parseFloat(values.body_fat_pct), unit: '%', logged_at })
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['health', 'logs'] })
      queryClient.invalidateQueries({ queryKey: ['health', 'summary'] })
      toast.success('Body stats logged')
      setBodyFormState({ logged_at: '', weight_kg: '', body_fat_pct: '', notes: '' })
    },
    onError: () => toast.error('Failed to log body stats'),
  })

  const heightMutation = useMutation({
    mutationFn: (values: { height_cm: string }) => healthApi.updateHealthGoals({ height_cm: parseFloat(values.height_cm) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['health', 'goals'] })
      toast.success('Height saved')
      setEditingHeight(false)
    },
    onError: () => toast.error('Failed to save height'),
  })

  const sleepMutation = useMutation({
    mutationFn: (values: Record<string, string>) =>
      healthApi.createLog({
        entry_type: 'sleep',
        value: parseFloat(values.hours),
        unit: 'hours',
        notes: values.quality || undefined,
        logged_at: values.logged_at ? new Date(values.logged_at).toISOString() : undefined,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['health', 'sleep'] })
      toast.success('Sleep logged')
      setSleepFormState({ logged_at: '', hours: '', quality: 'good' })
    },
    onError: () => toast.error('Failed to log sleep'),
  })

  const latestWeight = weightLogs?.[0]?.value != null ? Number(weightLogs[0].value) : null
  const latestBodyFat = bodyFatLogs?.[0]?.value != null ? Number(bodyFatLogs[0].value) : null
  const heightCm = goals?.height_cm ?? null

  const bmi = useMemo(() => {
    if (!latestWeight || !heightCm) return null
    const heightM = heightCm / 100
    return latestWeight / (heightM * heightM)
  }, [latestWeight, heightCm])

  const bodyChartData = useMemo(() => {
    const map = new Map<string, { date: string; weight?: number; body_fat?: number }>()
    weightLogs?.slice(0, 30).forEach(l => {
      const d = l.logged_at.slice(0, 10)
      map.set(d, { ...(map.get(d) ?? { date: d }), weight: l.value != null ? Number(l.value) : undefined })
    })
    bodyFatLogs?.slice(0, 30).forEach(l => {
      const d = l.logged_at.slice(0, 10)
      map.set(d, { ...(map.get(d) ?? { date: d }), body_fat: l.value != null ? Number(l.value) : undefined })
    })
    return Array.from(map.values()).sort((a, b) => a.date.localeCompare(b.date))
  }, [weightLogs, bodyFatLogs])

  const target = sleep?.target ?? 8
  const lastNight = sleep?.last_night
  const weeklyAvg = sleep?.weekly_avg ?? 0
  const avgVsTarget = weeklyAvg - target
  const sleepChartData = sleep?.daily ?? []

  const isLoadingBody = loadingWeight || loadingBodyFat

  const qualitySelectOptions = QUALITY_OPTIONS.map(q => ({
    value: q,
    label: q.charAt(0).toUpperCase() + q.slice(1)
  }))

  const [logModalOpen, setLogModalOpen] = useState(false)
  const [logType, setLogType] = useState<'body' | 'sleep'>('body')

  useEffect(() => {
    const handleOpen = () => setLogModalOpen(true)
    window.addEventListener('open-new-body-sleep', handleOpen)
    return () => window.removeEventListener('open-new-body-sleep', handleOpen)
  }, [])


  return (
    <>
    <WorkspaceLayout rail={undefined}>
      <StyledContainer>
        <StyledKpiGrid>
          <KpiCard label="Weight" icon={Scale} color="primary" loading={loadingWeight} value={latestWeight != null ? `${latestWeight} kg` : '—'} />
          <KpiCard label="Body Fat" icon={Percent} color="purple" loading={loadingBodyFat} value={latestBodyFat != null ? `${latestBodyFat}%` : '—'} />
          <KpiCard label="BMI" icon={Ruler} color="emerald" loading={loadingGoals} value={bmi != null ? bmi.toFixed(1) : 'Set height & weight'} />
          <KpiCard label="Last Night" icon={Moon} color="indigo" loading={loadingSleep} value={lastNight != null ? `${lastNight}h` : '—'} />
          <KpiCard label="7-Day Avg" icon={Clock} color="primary" loading={loadingSleep} value={`${weeklyAvg}h`} />
        </StyledKpiGrid>

        <StyledChartsGrid>
          <SectionCard title="Weight & Body Fat Trend" style={{ height: '100%' }}>
            {isLoadingBody ? <Skeleton style={{ height: '200px', width: '100%' }} /> : !bodyChartData.length ? (
              <StyledEmptyState>No body composition logs yet</StyledEmptyState>
            ) : (
              <ResponsiveContainer width="100%" height={200}>
                <ComposedChart data={bodyChartData} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke={theme.color.border} />
                  <XAxis
                    dataKey="date"
                    tickFormatter={d => { try { return format(new Date(d), 'MMM d') } catch { return d } }}
                    tick={{ fontSize: 10, fill: theme.color.mutedForeground }}
                  />
                  <YAxis yAxisId="weight" tick={{ fontSize: 10, fill: theme.color.mutedForeground }} tickFormatter={v => `${v}kg`} domain={['dataMin - 2', 'dataMax + 2']} />
                  <YAxis yAxisId="fat" orientation="right" tick={{ fontSize: 10, fill: theme.color.mutedForeground }} tickFormatter={v => `${v}%`} domain={['dataMin - 2', 'dataMax + 2']} />
                  <Tooltip
                    contentStyle={{ background: theme.color.card, border: `1px solid ${theme.color.border}`, borderRadius: 8, fontSize: 12 }}
                    labelFormatter={d => { try { return format(new Date(d as string), 'MMM d, yyyy') } catch { return d as string } }}
                  />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  <Area yAxisId="weight" type="monotone" dataKey="weight" name="Weight (kg)" stroke={theme.color.accent} fill={`color-mix(in srgb, ${theme.color.accent} 15%, transparent)`} connectNulls strokeWidth={2} isAnimationActive={false} />
                  <Area yAxisId="fat" type="monotone" dataKey="body_fat" name="Body Fat (%)" stroke={theme.color.primary} fill={`color-mix(in srgb, ${theme.color.primary} 12%, transparent)`} connectNulls strokeWidth={2} isAnimationActive={false} />
                </ComposedChart>
              </ResponsiveContainer>
            )}
          </SectionCard>

          <SectionCard title="Sleep Duration Trend" style={{ height: '100%' }}>
            {loadingSleep ? <Skeleton style={{ height: '200px', width: '100%' }} /> : !sleepChartData.length ? (
              <StyledEmptyState>No sleep logs yet</StyledEmptyState>
            ) : (
              <ResponsiveContainer width="100%" height={200}>
                <ComposedChart data={sleepChartData} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke={theme.color.border} />
                  <XAxis
                    dataKey="date"
                    tickFormatter={d => { try { return format(new Date(d), 'EEE') } catch { return d } }}
                    tick={{ fontSize: 10, fill: theme.color.mutedForeground }}
                  />
                  <YAxis
                    tick={{ fontSize: 10, fill: theme.color.mutedForeground }}
                    tickFormatter={v => `${v}h`}
                    domain={[0, 'dataMax + 1']}
                  />
                  <Tooltip
                    contentStyle={{ background: theme.color.card, border: `1px solid ${theme.color.border}`, borderRadius: 8, fontSize: 12 }}
                    formatter={(val: number, _name: string, entry: any) => [`${val}h${entry?.payload?.quality ? ` · ${entry.payload.quality}` : ''}`, 'Sleep']}
                    labelFormatter={d => { try { return format(new Date(d as string), 'EEE, MMM d') } catch { return d as string } }}
                  />
                  <ReferenceLine y={target} stroke={theme.color.accent} strokeDasharray="4 4" label={{ value: `Target ${target}h`, position: 'insideTopRight', fontSize: 10, fill: theme.color.accent }} />
                  <Bar dataKey="hours" name="Hours" radius={[3, 3, 0, 0]} maxBarSize={32} isAnimationActive={false}>
                    {sleepChartData.map((d, i) => (
                      <Cell key={i} fill={d.hours >= target ? theme.color.accent : theme.color.mutedForeground} />
                    ))}
                  </Bar>
                </ComposedChart>
              </ResponsiveContainer>
            )}
          </SectionCard>
        </StyledChartsGrid>

        <SectionCard title="Sleep — Last 7 Days" style={{ height: '100%' }}>
          {loadingSleep ? (
            <div style={{ padding: '0.75rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>{[1, 2, 3].map(i => <Skeleton key={i} style={{ height: '3rem', width: '100%' }} />)}</div>
          ) : !sleepChartData.length ? (
            <StyledEmptyState>No sleep logged yet. Use the rail to log tonight's sleep.</StyledEmptyState>
          ) : (
            <StyledListWrapper>
              {[...sleepChartData].reverse().map(d => (
                <StyledListItem key={d.date}>
                  <div>
                    <StyledListItemTitle>{format(new Date(d.date), 'EEE, MMM d')}</StyledListItemTitle>
                    {d.quality && <StyledListItemSubtitle>{d.quality} quality</StyledListItemSubtitle>}
                  </div>
                  <StyledListValue $good={d.hours >= target}>{d.hours}h</StyledListValue>
                </StyledListItem>
              ))}
            </StyledListWrapper>
          )}
        </SectionCard>
      </StyledContainer>
    </WorkspaceLayout>

    <Dialog open={logModalOpen} onOpenChange={(v) => !v && setLogModalOpen(false)} title="Log Health Event">
      <StyledModalContent>
        <StyledSegmentedControlWrapper>
          <SegmentedControl
            options={[
              { label: 'Body Stats', value: 'body' },
              { label: 'Sleep', value: 'sleep' },
            ]}
            value={logType}
            onChange={v => setLogType(v as any)}
            style={{ width: '100%', display: 'flex' }}
          />
        </StyledSegmentedControlWrapper>

        {logType === 'body' && (
          <StyledForm onSubmit={e => { e.preventDefault(); bodyMutation.mutate(bodyFormState); setLogModalOpen(false); }}>
            <StyledFormGroup>
              <StyledLabel>Date</StyledLabel>
              <Input type="date" value={bodyFormState.logged_at} onChange={(e: any) => setBodyFormState(p => ({ ...p, logged_at: e.target.value }))} />
            </StyledFormGroup>
            <StyledFormGroup>
              <StyledLabel>Weight (kg)</StyledLabel>
              <Input type="number" required placeholder="0" min={0} step={0.1} value={bodyFormState.weight_kg} onChange={(e: any) => setBodyFormState(p => ({ ...p, weight_kg: e.target.value }))} />
            </StyledFormGroup>
            <StyledFormGroup>
              <StyledLabel>Body Fat % (optional)</StyledLabel>
              <Input type="number" placeholder="0" min={0} max={100} step={0.1} value={bodyFormState.body_fat_pct} onChange={(e: any) => setBodyFormState(p => ({ ...p, body_fat_pct: e.target.value }))} />
            </StyledFormGroup>
            <StyledFormGroup>
              <StyledLabel>Notes</StyledLabel>
              <Input placeholder="Optional note" value={bodyFormState.notes} onChange={(e: any) => setBodyFormState(p => ({ ...p, notes: e.target.value }))} />
            </StyledFormGroup>
            <StyledFormActions>
              <Button variant="outline" size="sm" type="button" onClick={() => setLogModalOpen(false)}>Cancel</Button>
              <Button variant="primary" size="sm" type="submit" disabled={bodyMutation.isPending}>
                {bodyMutation.isPending ? 'Saving...' : 'Save Body Stats'}
              </Button>
            </StyledFormActions>
          </StyledForm>
        )}

        {logType === 'sleep' && (
          <StyledForm onSubmit={e => { e.preventDefault(); sleepMutation.mutate(sleepFormState); setLogModalOpen(false); }}>
            <StyledFormGroup>
              <StyledLabel>Date</StyledLabel>
              <Input type="date" value={sleepFormState.logged_at} onChange={(e: any) => setSleepFormState(p => ({ ...p, logged_at: e.target.value }))} />
            </StyledFormGroup>
            <StyledFormGroup>
              <StyledLabel>Hours Slept</StyledLabel>
              <Input type="number" required placeholder="8" min={0} max={24} step={0.5} value={sleepFormState.hours} onChange={(e: any) => setSleepFormState(p => ({ ...p, hours: e.target.value }))} />
            </StyledFormGroup>
            <StyledFormGroup>
              <StyledLabel>Quality</StyledLabel>
              <Select size="sm" options={qualitySelectOptions} value={sleepFormState.quality} onChange={(val: any) => setSleepFormState(p => ({ ...p, quality: val }))} />
            </StyledFormGroup>
            <StyledFormActions>
              <Button variant="outline" size="sm" type="button" onClick={() => setLogModalOpen(false)}>Cancel</Button>
              <Button variant="primary" size="sm" type="submit" disabled={sleepMutation.isPending}>
                {sleepMutation.isPending ? 'Saving...' : 'Save Sleep Log'}
              </Button>
            </StyledFormActions>
          </StyledForm>
        )}
      </StyledModalContent>
    </Dialog>
    </>
  )
}
