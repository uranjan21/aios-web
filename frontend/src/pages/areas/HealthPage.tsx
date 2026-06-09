import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useState, useMemo } from 'react'
import { toast } from 'sonner'
import {
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer,
  CartesianGrid, TooltipProps,
} from 'recharts'
import { Dumbbell, Scale, Plus, Download, Flame } from 'lucide-react'
import { healthApi } from '@/api/areas'
import { cn, formatRelativeTime, exportToCsv } from '@/lib/utils'
import { Skeleton } from '@/components/ui/skeleton'
import { ErrorCard } from '@/components/ErrorCard'
import { useCountUp } from '@/hooks/useCountUp'

// ─── Weight tooltip ──────────────────────────────────────────────────────────

function WeightTooltip({ active, payload, label, data }: TooltipProps<number, string> & { data: { date: string; weight: number }[] }) {
  if (!active || !payload?.length) return null
  const current = payload[0].value ?? 0
  const idx = data.findIndex(d => d.date === label)
  const prev = idx > 0 ? data[idx - 1].weight : null
  const delta = prev !== null ? current - prev : null
  return (
    <div className="bg-popover border border-border rounded-lg px-3 py-2 text-sm shadow-lg">
      <p className="text-muted-foreground text-xs mb-1">{label}</p>
      <p className="font-semibold font-mono">{current.toFixed(1)} kg</p>
      {delta !== null && (
        <p className={delta <= 0 ? 'text-emerald-400 text-xs' : 'text-red-400 text-xs'}>
          {delta <= 0 ? '↓' : '↑'} {Math.abs(delta).toFixed(1)} kg
        </p>
      )}
    </div>
  )
}

// ─── Heatmap helpers ──────────────────────────────────────────────────────────

const WEEKS = 16 // show 16 weeks (112 days)

/** Returns a Tailwind class for heatmap intensity 0–3 */
function heatIntensity(count: number): string {
  if (count === 0) return 'bg-muted'
  if (count === 1) return 'bg-emerald-600/60'
  if (count === 2) return 'bg-emerald-500'
  return 'bg-emerald-400'           // 3+ days in a week treated as weekly agg
}

// ─── Stat card ────────────────────────────────────────────────────────────────

function StatCard({ label, value, sub, icon: Icon }: {
  label: string
  value: string
  sub?: string
  icon?: React.FC<{ className?: string }>
}) {
  return (
    <div className="bg-card premium-shadow rounded-3xl p-6">
      {Icon && (
        <div className="flex items-center gap-2 mb-1">
          <Icon className="w-4 h-4 text-muted-foreground" aria-hidden="true" />
          <p className="text-xs text-muted-foreground">{label}</p>
        </div>
      )}
      {!Icon && <p className="text-xs text-muted-foreground mb-1">{label}</p>}
      <p className="text-2xl font-bold text-foreground font-mono">{value}</p>
      {sub && <p className="text-xs text-muted-foreground mt-1">{sub}</p>}
    </div>
  )
}

// ─── Main page ────────────────────────────────────────────────────────────────

export function HealthPage() {
  const { data: streak, isLoading: loadingStreak, isError: errorStreak, refetch: refetchStreak } = useQuery({
    queryKey: ['health', 'streak'],
    queryFn: healthApi.streak,
  })
  const { data: summary, isLoading: loadingSummary } = useQuery({
    queryKey: ['health', 'summary'],
    queryFn: healthApi.summary,
  })
  const { data: weightLogs, isLoading: loadingWeight } = useQuery({
    queryKey: ['health', 'logs', 'weight'],
    queryFn: () => healthApi.logs('weight'),
  })
  const { data: gymLogs, isLoading: loadingGym, isError: errorGym, refetch: refetchGym } = useQuery({
    queryKey: ['health', 'logs', 'gym'],
    queryFn: () => healthApi.logs('gym'),
  })
  const queryClient = useQueryClient()

  const [logType, setLogType] = useState<'gym' | 'weight' | 'water'>('gym')
  const [logValue, setLogValue] = useState('')
  const [logNote, setLogNote] = useState('')
  const [valueError, setValueError] = useState('')

  // Count-up animations for KPI values
  const animatedStreak = useCountUp(streak?.current_streak ?? null)
  const animatedSessions = useCountUp(gymLogs?.length ?? null)

  const addLog = useMutation({
    mutationFn: () => healthApi.createLog({
      entry_type: logType,
      value: logValue ? parseFloat(logValue) : undefined,
      unit: logType === 'weight' ? 'kg' : logType === 'water' ? 'L' : undefined,
      notes: logNote || undefined,
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['health'] })
      setLogValue('')
      setLogNote('')
      setValueError('')
      toast.success(`${logType === 'gym' ? 'Gym session' : logType === 'weight' ? 'Weight' : 'Water'} logged`)
    },
    onError: () => toast.error('Failed to log entry'),
  })

  const handleLog = () => {
    if (logType !== 'gym' && (!logValue || isNaN(parseFloat(logValue)))) {
      setValueError('Enter a valid number')
      return
    }
    setValueError('')
    addLog.mutate()
  }

  const weightData = useMemo(
    () => weightLogs?.slice(0, 30).reverse().map(l => ({
      date: l.logged_at.slice(0, 10),
      weight: Number(l.value),
    })) ?? [],
    [weightLogs]
  )

  // 3-level heatmap: count sessions per day, then aggregate per cell
  const heatmapDays = useMemo(() => {
    // count sessions per day
    const countByDate = (gymLogs ?? []).reduce<Record<string, number>>((acc, l) => {
      const date = l.logged_at.slice(0, 10)
      acc[date] = (acc[date] ?? 0) + 1
      return acc
    }, {})

    return Array.from({ length: WEEKS * 7 }, (_, i) => {
      const d = new Date()
      d.setDate(d.getDate() - (WEEKS * 7 - 1 - i))
      const iso = d.toISOString().slice(0, 10)
      const count = countByDate[iso] ?? 0
      return { date: iso, count }
    })
  }, [gymLogs])

  // Month labels for heatmap (one per week column)
  const weekLabels = useMemo(() =>
    Array.from({ length: WEEKS }, (_, week) => {
      const day = heatmapDays[week * 7]
      const prevDay = week > 0 ? heatmapDays[(week - 1) * 7] : null
      const month = day?.date.slice(5, 7)
      const prevMonth = prevDay?.date.slice(5, 7)
      return { week, show: month !== prevMonth, label: day ? new Date(day.date).toLocaleDateString('en', { month: 'short' }) : '' }
    }),
    [heatmapDays]
  )

  return (
    <div className="p-4 sm:p-6 space-y-6">
      <h1 className="text-2xl font-semibold text-foreground">Health</h1>

      {/* KPI Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {loadingSummary || loadingStreak || loadingGym ? (
          Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="bg-card premium-shadow rounded-3xl p-6 space-y-2">
              <Skeleton className="h-3 w-20" />
              <Skeleton className="h-8 w-24" />
            </div>
          ))
        ) : errorStreak || errorGym ? (
          <div className="col-span-4">
            <ErrorCard message="Could not load health data" onRetry={() => { refetchStreak(); refetchGym() }} />
          </div>
        ) : <>
            <StatCard label="Weight" icon={Scale} value={summary?.weight != null ? `${summary.weight} kg` : '—'} />
            <StatCard
              label="Gym Streak"
              icon={Flame}
              value={animatedStreak != null ? `${Math.round(animatedStreak)}` : '—'}
              sub="days in a row"
            />
            <StatCard
              label="Last Workout"
              value={formatRelativeTime(streak?.last_workout_at ?? null)}
            />
            <StatCard
              label="Total Sessions"
              value={animatedSessions != null ? String(Math.round(animatedSessions)) : '0'}
            />
          </>
        }
      </div>

      {/* Weight trend chart — upgraded to AreaChart */}
      {(loadingWeight || weightData.length > 0) && (
        <div className="bg-card premium-shadow rounded-3xl p-6">
          <h2 className="text-sm font-semibold mb-4">Weight Trend</h2>
          {loadingWeight
            ? <Skeleton className="h-[200px]" />
            : <ResponsiveContainer width="100%" height={200}>
                <AreaChart data={weightData}>
                  <defs>
                    <linearGradient id="weightGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%"  stopColor="hsl(var(--primary))" stopOpacity={0.2} />
                      <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" strokeOpacity={0.4} />
                  <XAxis
                    dataKey="date"
                    tick={{ fontSize: 10 }}
                    tickFormatter={v => new Date(v).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                    interval="preserveStartEnd"
                  />
                  <YAxis domain={['auto', 'auto']} tick={{ fontSize: 11 }} unit=" kg" />
                  <Tooltip content={<WeightTooltip data={weightData} />} />
                  <Area
                    type="monotone"
                    dataKey="weight"
                    stroke="hsl(var(--primary))"
                    strokeWidth={2}
                    strokeLinecap="round"
                    fill="url(#weightGradient)"
                    dot={false}
                  />
                </AreaChart>
              </ResponsiveContainer>
          }
        </div>
      )}

      {/* Workout heatmap — 16 weeks, 3-level intensity */}
      <div className="bg-card premium-shadow rounded-3xl p-6">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold">Workout Calendar <span className="text-xs font-normal text-muted-foreground">(last {WEEKS} weeks)</span></h2>
          {gymLogs && gymLogs.length > 0 && (
            <button
              onClick={() => exportToCsv(
                gymLogs.map(l => ({ date: l.logged_at, type: l.entry_type, value: l.value ?? '', notes: l.notes ?? '' })),
                `health-logs-${new Date().toISOString().slice(0, 10)}`
              )}
              aria-label="Export health logs as CSV"
              className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded"
            >
              <Download className="w-3.5 h-3.5" aria-hidden="true" /> Export
            </button>
          )}
        </div>

        {loadingGym
          ? <Skeleton className="h-32" />
          : <div className="overflow-x-auto" role="region" aria-label="Workout heatmap">
              <div style={{ minWidth: `${WEEKS * 16 + 24}px` }}>
                {/* Month labels */}
                <div className="flex gap-1 mb-1 pl-6">
                  <div className="grid gap-1 flex-1" style={{ gridTemplateColumns: `repeat(${WEEKS}, 1fr)` }}>
                    {weekLabels.map(({ week, show, label }) => (
                      <div key={week} className="text-[9px] text-muted-foreground text-center truncate">
                        {show ? label : ''}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Day labels + grid */}
                <div className="flex gap-1" role="grid" aria-label="Workout calendar">
                  {/* Mon/Wed/Fri labels */}
                  <div className="flex flex-col gap-1 w-5 shrink-0">
                    {['', 'M', '', 'W', '', 'F', ''].map((d, i) => (
                      <div
                        key={i}
                        className="text-[9px] text-muted-foreground text-right pr-1 leading-none"
                        style={{ height: '0.75rem', lineHeight: '0.75rem', marginBottom: '1px' }}
                      >
                        {d}
                      </div>
                    ))}
                  </div>

                  {/* Cells */}
                  <div className="grid gap-1 flex-1" style={{ gridTemplateColumns: `repeat(${WEEKS}, 1fr)` }}>
                    {Array.from({ length: WEEKS }, (_, week) => (
                      <div key={week} className="flex flex-col gap-1" role="row">
                        {heatmapDays.slice(week * 7, week * 7 + 7).map(day => (
                          <div
                            key={day.date}
                            role="gridcell"
                            title={`${day.date}${day.count > 0 ? ` — ${day.count} session${day.count > 1 ? 's' : ''}` : ''}`}
                            aria-label={`${day.date}${day.count > 0 ? `, ${day.count} session${day.count > 1 ? 's' : ''}` : ', rest day'}`}
                            className={cn(
                              'aspect-square rounded-sm min-w-[8px] transition-colors',
                              heatIntensity(day.count)
                            )}
                          />
                        ))}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
        }

        {/* Legend */}
        <div className="flex items-center gap-4 mt-3 text-xs text-muted-foreground">
          <span>Less</span>
          <div className="flex items-center gap-1">
            {(['bg-muted', 'bg-emerald-600/60', 'bg-emerald-500', 'bg-emerald-400'] as const).map((cls, i) => (
              <div key={i} className={cn('w-3 h-3 rounded-sm', cls)} aria-hidden="true" />
            ))}
          </div>
          <span>More</span>
        </div>
      </div>

      {/* Quick Log */}
      <div className="bg-card premium-shadow rounded-3xl p-6">
        <h2 className="text-sm font-semibold mb-3">Quick Log</h2>
        <div className="flex gap-2 flex-wrap items-start">
          <select
            value={logType}
            onChange={e => { setLogType(e.target.value as typeof logType); setValueError('') }}
            aria-label="Log type"
            className="px-3 py-2 text-sm rounded-lg bg-muted border border-border text-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
          >
            <option value="gym">Gym session</option>
            <option value="weight">Weight</option>
            <option value="water">Water intake</option>
          </select>
          {logType !== 'gym' && (
            <div className="flex flex-col gap-1">
              <input
                type="number"
                placeholder={logType === 'weight' ? 'kg' : 'litres'}
                value={logValue}
                onChange={e => { setLogValue(e.target.value); setValueError('') }}
                aria-label={logType === 'weight' ? 'Weight in kg' : 'Water in litres'}
                aria-invalid={!!valueError}
                className="w-24 px-3 py-2 text-sm rounded-lg bg-muted border border-border text-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 aria-invalid:border-destructive"
              />
              {valueError && <span className="text-xs text-destructive">{valueError}</span>}
            </div>
          )}
          <input
            placeholder="Note (optional)"
            value={logNote}
            onChange={e => setLogNote(e.target.value)}
            aria-label="Log note (optional)"
            className="flex-1 min-w-[100px] px-3 py-2 text-sm rounded-lg bg-muted border border-border text-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
          />
          <button
            onClick={handleLog}
            disabled={addLog.isPending}
            className="flex items-center gap-1.5 px-3 py-2 text-sm rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          >
            <Plus className="w-4 h-4" aria-hidden="true" /> Log
          </button>
        </div>
      </div>
    </div>
  )
}
