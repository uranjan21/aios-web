import { useState, useMemo, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Button, Input, Select, Dialog, SegmentedControl, HeaderActionPortal, focusRing } from '@ledgr/ui'
import { Scale, Percent, Ruler, Moon, Clock, Plus, LineChart as LineChartIcon, BarChart3, BedDouble } from 'lucide-react'
import { healthApi } from '@ct/shared/api/areas'
import { Skeleton } from '@ct/shared/components/ui/skeleton'
import { format } from 'date-fns'
import {
  ComposedChart, Area, Bar, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ReferenceLine,
  ResponsiveContainer,
} from 'recharts'
import { KpiCard, KpiGrid } from '@ledgr/ui';
import { Card as SectionCard } from '@ledgr/ui'
import styled, { useTheme } from 'styled-components'

const TabContent = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.spacing[6]};
`

const QUALITY_OPTIONS = ['poor', 'fair', 'good', 'excellent']

const StyledContainer = styled.div`
  display: flex;
  flex-direction: column;
  gap: 1rem;
`;

const StyledChartsGrid = styled.div`
  display: grid;
  grid-template-columns: 1fr;
  gap: 1rem;

  @media ${({ theme }) => theme.media.lg} {
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
  cursor: pointer;
  
  &:hover {
    background-color: rgba(45, 49, 58, 0.02);
  }

  ${focusRing}
`;

const StyledListItemTitle = styled.p`
  font-size: 0.875rem;
  font-weight: 500;
  color: ${({ theme }) => theme.color?.foreground || 'var(--foreground)'};
  margin: 0;
`;

const StyledListItemSubtitle = styled.p`
  font-size: ${({ theme }) => theme.typography.fontSize.xs};
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
  font-size: ${({ theme }) => theme.typography.fontSize.xs};
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

/**
 * `section` splits this surface into two single-purpose tabs. Body composition
 * and sleep were always two unrelated jobs sharing one screen; the sidebar now
 * addresses them separately. 'all' keeps the combined view for any caller that
 * still wants it.
 */
export interface BodySleepTabProps {
  section?: 'body' | 'sleep' | 'all'
}

export function BodySleepTab({ section = 'all' }: BodySleepTabProps = {}) {
  const showBody = section !== 'sleep'
  const showSleep = section !== 'body'
  const theme = useTheme()
  const queryClient = useQueryClient()
  const [bodyFormState, setBodyFormState] = useState({ logged_at: '', weight_kg: '', body_fat_pct: '', notes: '' })
  const [sleepFormState, setSleepFormState] = useState({ logged_at: '', hours: '', quality: 'good' })
  const [bodyPeriod, setBodyPeriod] = useState<'7d' | '30d' | '90d'>('30d')
  const [sleepPeriod, setSleepPeriod] = useState<'7d' | '30d'>('7d')
  const [sleepQualityFilter, setSleepQualityFilter] = useState<string>('all')

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
    const sliceCount = bodyPeriod === '7d' ? 7 : bodyPeriod === '30d' ? 30 : 90
    weightLogs?.slice(0, sliceCount).forEach(l => {
      const d = l.logged_at.slice(0, 10)
      map.set(d, { ...(map.get(d) ?? { date: d }), weight: l.value != null ? Number(l.value) : undefined })
    })
    bodyFatLogs?.slice(0, sliceCount).forEach(l => {
      const d = l.logged_at.slice(0, 10)
      map.set(d, { ...(map.get(d) ?? { date: d }), body_fat: l.value != null ? Number(l.value) : undefined })
    })
    return Array.from(map.values()).sort((a, b) => a.date.localeCompare(b.date))
  }, [weightLogs, bodyFatLogs, bodyPeriod])

  const target = sleep?.target ?? 8
  const lastNight = sleep?.last_night
  const sleepChartData = sleep?.daily ?? []

  const filteredSleepChartData = useMemo(() => {
    const sliceCount = sleepPeriod === '7d' ? 7 : 30
    return sleepChartData.slice(-sliceCount)
  }, [sleepChartData, sleepPeriod])

  const filteredSleepList = useMemo(() => {
    if (sleepQualityFilter === 'all') return sleepChartData
    return sleepChartData.filter(d => d.quality === sleepQualityFilter)
  }, [sleepChartData, sleepQualityFilter])

  const isLoadingBody = loadingWeight || loadingBodyFat

  const qualitySelectOptions = QUALITY_OPTIONS.map(q => ({
    value: q,
    label: q.charAt(0).toUpperCase() + q.slice(1)
  }))

  const [logModalOpen, setLogModalOpen] = useState(false)
  const [logType, setLogType] = useState<'body' | 'sleep'>(section === 'sleep' ? 'sleep' : 'body')

  useEffect(() => {
    const handleOpen = () => setLogModalOpen(true)
    window.addEventListener('open-new-body-sleep', handleOpen)
    return () => window.removeEventListener('open-new-body-sleep', handleOpen)
  }, [])


  return (
    <>
    <TabContent>
      <HeaderActionPortal>
        <Button size="sm" variant="primary" onClick={() => setLogModalOpen(true)}>
          <Plus size={12} style={{ marginRight: 4 }} />
          {section === 'body' ? 'Log Body Stats' : section === 'sleep' ? 'Log Sleep' : 'Log Body Stats / Sleep'}
        </Button>
      </HeaderActionPortal>
      <StyledContainer>
        <KpiGrid $cols={section === 'all' ? 5 : section === 'body' ? 3 : 2}>
          {showBody && (
            <KpiCard
              label="Weight" icon={Scale} color="primary"
              loading={loadingWeight} value={latestWeight != null ? `${latestWeight} kg` : '—'}
              spark={weightLogs && weightLogs.length > 1
                ? [...weightLogs].slice(0, 30).reverse().map(l => Number(l.value) || 0)
                : undefined}
            />
          )}
          {showBody && <KpiCard label="Body Fat" icon={Percent} color="purple" loading={loadingBodyFat} value={latestBodyFat != null ? `${latestBodyFat}%` : '—'} />}
          {showBody && <KpiCard label="BMI" icon={Ruler} color="emerald" loading={loadingGoals} value={bmi != null ? bmi.toFixed(1) : '—'} />}
          {showSleep && <KpiCard label="Last Night" icon={Moon} color="indigo" loading={loadingSleep} value={lastNight != null ? `${lastNight}h` : '—'} />}
          {showSleep && <KpiCard label="7-Day Avg" icon={Clock} color="primary" loading={loadingSleep} value={sleep?.weekly_avg != null ? `${sleep.weekly_avg}h` : '—'} />}
        </KpiGrid>

        <StyledChartsGrid>
          {showBody && (
          <SectionCard
            title="Weight & Body Fat Trend"
            subtitle="Recent body composition logs over time"
            icon={<LineChartIcon size={16} />}
            action={
              <div style={{ display: 'flex', alignItems: 'center', gap: 24 }} onClick={(e) => e.stopPropagation()}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, fontSize: 10, color: 'var(--muted-foreground)' }}>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                    <span style={{ width: 8, height: 8, borderRadius: 999, background: theme.color.accent }} /> Weight
                  </span>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                    <span style={{ width: 8, height: 8, borderRadius: 999, background: theme.color.primary }} /> Body fat
                  </span>
                </div>
                <Select
                  size="sm"
                  value={bodyPeriod}
                  onChange={(val: any) => setBodyPeriod(val)}
                  options={[
                    { value: '7d', label: '7 Days' },
                    { value: '30d', label: '30 Days' },
                    { value: '90d', label: '90 Days' },
                  ]}
                />
              </div>
            }
            style={{ height: '100%' }}
          >
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
                  <Area yAxisId="weight" type="monotone" dataKey="weight" name="Weight (kg)" stroke={theme.color.accent} fill={`color-mix(in srgb, ${theme.color.accent} 15%, transparent)`} connectNulls strokeWidth={2} isAnimationActive={false} />
                  <Area yAxisId="fat" type="monotone" dataKey="body_fat" name="Body Fat (%)" stroke={theme.color.primary} fill={`color-mix(in srgb, ${theme.color.primary} 12%, transparent)`} connectNulls strokeWidth={2} isAnimationActive={false} />
                </ComposedChart>
              </ResponsiveContainer>
            )}
          </SectionCard>
          )}

          {showSleep && (
          <SectionCard
            title="Sleep Duration Trend"
            subtitle="Hours slept per day vs your target"
            icon={<BarChart3 size={16} />}
            action={
              <div style={{ display: 'flex', alignItems: 'center', gap: 24 }} onClick={(e) => e.stopPropagation()}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, fontSize: 10, color: 'var(--muted-foreground)' }}>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                    <span style={{ width: 8, height: 8, borderRadius: 2, background: theme.color.accent }} /> At/above target
                  </span>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                    <span style={{ width: 8, height: 8, borderRadius: 2, background: theme.color.mutedForeground }} /> Below target
                  </span>
                </div>
                <Select
                  size="sm"
                  value={sleepPeriod}
                  onChange={(val: any) => setSleepPeriod(val)}
                  options={[
                    { value: '7d', label: '7 Days' },
                    { value: '30d', label: '30 Days' },
                  ]}
                />
              </div>
            }
            style={{ height: '100%' }}
          >
            {loadingSleep ? <Skeleton style={{ height: '200px', width: '100%' }} /> : !filteredSleepChartData.length ? (
              <StyledEmptyState>No sleep logs yet</StyledEmptyState>
            ) : (
              <ResponsiveContainer width="100%" height={200}>
                <ComposedChart data={filteredSleepChartData} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
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
                    {filteredSleepChartData.map((d, i) => (
                      <Cell key={i} fill={d.hours >= target ? theme.color.accent : theme.color.mutedForeground} />
                    ))}
                  </Bar>
                </ComposedChart>
              </ResponsiveContainer>
            )}
          </SectionCard>
          )}
        </StyledChartsGrid>

        {showSleep && (
        <SectionCard
          title="Sleep — Last 7 Days"
          subtitle="Each night's hours and quality rating"
          icon={<BedDouble size={16} />}
          action={
            <div onClick={(e) => e.stopPropagation()}>
              <Select
                size="sm"
                value={sleepQualityFilter}
                onChange={(val: any) => setSleepQualityFilter(val)}
                options={[
                  { value: 'all', label: 'All Qualities' },
                  { value: 'excellent', label: 'Excellent' },
                  { value: 'good', label: 'Good' },
                  { value: 'fair', label: 'Fair' },
                  { value: 'poor', label: 'Poor' },
                ]}
              />
            </div>
          }
          style={{ height: '100%' }}
        >
          {loadingSleep ? (
            <div style={{ padding: '0.75rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>{[1, 2, 3].map(i => <Skeleton key={i} style={{ height: '3rem', width: '100%' }} />)}</div>
          ) : !filteredSleepList.length ? (
            <StyledEmptyState>No sleep logged yet. Use the "Log Body Stats / Sleep" button above to log tonight's sleep.</StyledEmptyState>
          ) : (
            <StyledListWrapper>
              {[...filteredSleepList].reverse().map(d => (
                <StyledListItem key={d.date} tabIndex={0}>
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
        )}
      </StyledContainer>
    </TabContent>

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
              <StyledLabel htmlFor="body-date">Date</StyledLabel>
              <Input id="body-date" type="date" value={bodyFormState.logged_at} onChange={(e: any) => setBodyFormState(p => ({ ...p, logged_at: e.target.value }))} />
            </StyledFormGroup>
            <StyledFormGroup>
              <StyledLabel htmlFor="body-weight">Weight (kg)</StyledLabel>
              <Input id="body-weight" type="number" required placeholder="0" min={0} step={0.1} value={bodyFormState.weight_kg} onChange={(e: any) => setBodyFormState(p => ({ ...p, weight_kg: e.target.value }))} />
            </StyledFormGroup>
            <StyledFormGroup>
              <StyledLabel htmlFor="body-fat">Body Fat % (optional)</StyledLabel>
              <Input id="body-fat" type="number" placeholder="0" min={0} max={100} step={0.1} value={bodyFormState.body_fat_pct} onChange={(e: any) => setBodyFormState(p => ({ ...p, body_fat_pct: e.target.value }))} />
            </StyledFormGroup>
            <StyledFormGroup>
              <StyledLabel htmlFor="body-notes">Notes</StyledLabel>
              <Input id="body-notes" placeholder="Optional note" value={bodyFormState.notes} onChange={(e: any) => setBodyFormState(p => ({ ...p, notes: e.target.value }))} />
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
              <StyledLabel htmlFor="sleep-date">Date</StyledLabel>
              <Input id="sleep-date" type="date" value={sleepFormState.logged_at} onChange={(e: any) => setSleepFormState(p => ({ ...p, logged_at: e.target.value }))} />
            </StyledFormGroup>
            <StyledFormGroup>
              <StyledLabel htmlFor="sleep-hours">Hours Slept</StyledLabel>
              <Input id="sleep-hours" type="number" required placeholder="8" min={0} max={24} step={0.5} value={sleepFormState.hours} onChange={(e: any) => setSleepFormState(p => ({ ...p, hours: e.target.value }))} />
            </StyledFormGroup>
            <StyledFormGroup>
              <StyledLabel htmlFor="sleep-quality">Quality</StyledLabel>
              <Select id="sleep-quality" size="sm" options={qualitySelectOptions} value={sleepFormState.quality} onChange={(val: any) => setSleepFormState(p => ({ ...p, quality: val }))} />
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
