import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useState, useMemo } from 'react'
import { toast } from 'sonner'
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts'
import { Dumbbell, Scale, Plus, Download } from 'lucide-react'
import { healthApi } from '@/api/areas'
import { formatRelativeTime, exportToCsv } from '@/lib/utils'
import { Skeleton } from '@/components/ui/skeleton'
import { ErrorCard } from '@/components/ErrorCard'

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

  const heatmapDays = useMemo(() => {
    const gymDates = new Set(gymLogs?.map(l => l.logged_at.slice(0, 10)) ?? [])
    return Array.from({ length: 84 }, (_, i) => {
      const d = new Date()
      d.setDate(d.getDate() - (83 - i))
      const iso = d.toISOString().slice(0, 10)
      return { date: iso, worked: gymDates.has(iso) }
    })
  }, [gymLogs])

  return (
    <div className="p-4 sm:p-6 space-y-6">
      <h1 className="text-2xl font-semibold text-foreground">Health</h1>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {loadingSummary || loadingStreak || loadingGym ? (
          Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="bg-card border border-border rounded-xl p-4 space-y-2">
              <Skeleton className="h-3 w-20" />
              <Skeleton className="h-8 w-24" />
            </div>
          ))
        ) : errorStreak || errorGym ? (
          <div className="col-span-4">
            <ErrorCard message="Could not load health data" onRetry={() => { refetchStreak(); refetchGym() }} />
          </div>
        ) : <>
            <div className="bg-card border border-border rounded-xl p-4">
              <div className="flex items-center gap-2 mb-1">
                <Scale className="w-4 h-4 text-muted-foreground" aria-hidden="true" />
                <p className="text-xs text-muted-foreground">Weight</p>
              </div>
              <p className="text-2xl font-bold font-mono">{summary?.weight ?? '—'} <span className="text-sm font-normal text-muted-foreground">kg</span></p>
            </div>
            <div className="bg-card border border-border rounded-xl p-4">
              <div className="flex items-center gap-2 mb-1">
                <Dumbbell className="w-4 h-4 text-muted-foreground" aria-hidden="true" />
                <p className="text-xs text-muted-foreground">Gym Streak</p>
              </div>
              <p className="text-2xl font-bold font-mono">{streak?.current_streak ?? '—'} <span className="text-sm font-normal text-muted-foreground">days</span></p>
            </div>
            <div className="bg-card border border-border rounded-xl p-4">
              <p className="text-xs text-muted-foreground mb-1">Last Workout</p>
              <p className="text-lg font-semibold">{formatRelativeTime(streak?.last_workout_at ?? null)}</p>
            </div>
            <div className="bg-card border border-border rounded-xl p-4">
              <p className="text-xs text-muted-foreground mb-1">Total Sessions</p>
              <p className="text-2xl font-bold font-mono">{gymLogs?.length ?? 0}</p>
            </div>
          </>
        }
      </div>

      {/* Weight chart */}
      {(loadingWeight || weightData.length > 0) && (
        <div className="bg-card border border-border rounded-xl p-4">
          <h2 className="text-sm font-semibold mb-4">Weight Trend</h2>
          {loadingWeight
            ? <Skeleton className="h-[200px]" />
            : <ResponsiveContainer width="100%" height={200}>
                <LineChart data={weightData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                  <YAxis domain={['auto', 'auto']} tick={{ fontSize: 11 }} unit=" kg" />
                  <Tooltip formatter={(v: number) => `${v} kg`} />
                  <Line type="monotone" dataKey="weight" stroke="hsl(var(--primary))" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
          }
        </div>
      )}

      {/* Workout heatmap */}
      <div className="bg-card border border-border rounded-xl p-4">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold">Workout Calendar (Last 12 weeks)</h2>
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
          ? <Skeleton className="h-24" />
          : <div className="overflow-x-auto" role="region" aria-label="Workout heatmap">
              <div className="min-w-[280px]">
                {/* Month labels row */}
                <div className="flex gap-1 mb-1 pl-6">
                  <div className="grid gap-1 flex-1" style={{ gridTemplateColumns: 'repeat(12, 1fr)' }}>
                    {Array.from({ length: 12 }, (_, week) => {
                      const weekDate = heatmapDays[week * 7]?.date
                      const prevDate = week > 0 ? heatmapDays[(week - 1) * 7]?.date : null
                      const month = weekDate?.slice(5, 7)
                      const prevMonth = prevDate?.slice(5, 7)
                      return (
                        <div key={week} className="text-[9px] text-muted-foreground text-center truncate">
                          {month !== prevMonth && weekDate
                            ? new Date(weekDate).toLocaleDateString('en', { month: 'short' })
                            : ''}
                        </div>
                      )
                    })}
                  </div>
                </div>

                {/* Day labels + grid */}
                <div className="flex gap-1" role="grid" aria-label="Workout calendar">
                  {/* Mon/Wed/Fri labels */}
                  <div className="flex flex-col gap-1 w-5 shrink-0">
                    {['', 'M', '', 'W', '', 'F', ''].map((d, i) => (
                      <div key={i} className="text-[9px] text-muted-foreground text-right pr-1 leading-none" style={{ height: '0.75rem', lineHeight: '0.75rem', marginBottom: '1px' }}>
                        {d}
                      </div>
                    ))}
                  </div>

                  {/* Heatmap cells */}
                  <div className="grid gap-1 flex-1" style={{ gridTemplateColumns: 'repeat(12, 1fr)' }}>
                    {Array.from({ length: 12 }, (_, week) => (
                      <div key={week} className="flex flex-col gap-1" role="row">
                        {heatmapDays.slice(week * 7, week * 7 + 7).map(day => (
                          <div
                            key={day.date}
                            role="gridcell"
                            title={`${day.date}${day.worked ? ' — worked out' : ''}`}
                            aria-label={`${day.date}${day.worked ? ', worked out' : ', rest day'}`}
                            className={`aspect-square rounded-sm min-w-[6px] ${day.worked ? 'bg-emerald-500' : 'bg-muted'}`}
                          />
                        ))}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
        }
        <div className="flex items-center gap-3 mt-3 text-xs text-muted-foreground">
          <div className="flex items-center gap-1"><div className="w-3 h-3 rounded-sm bg-muted" aria-hidden="true" /> Rest</div>
          <div className="flex items-center gap-1"><div className="w-3 h-3 rounded-sm bg-emerald-500" aria-hidden="true" /> Gym session</div>
        </div>
      </div>

      {/* Log entry */}
      <div className="bg-card border border-border rounded-xl p-4">
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
