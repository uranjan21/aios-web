import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts'
import { Dumbbell, Scale, Droplets, Plus } from 'lucide-react'
import { healthApi } from '@/api/areas'
import { formatDate, formatRelativeTime } from '@/lib/utils'

export function HealthPage() {
  const { data: streak } = useQuery({ queryKey: ['health', 'streak'], queryFn: healthApi.streak })
  const { data: summary } = useQuery({ queryKey: ['health', 'summary'], queryFn: healthApi.summary })
  const { data: weightLogs } = useQuery({
    queryKey: ['health', 'logs', 'weight'],
    queryFn: () => healthApi.logs('weight'),
  })
  const { data: gymLogs } = useQuery({
    queryKey: ['health', 'logs', 'gym'],
    queryFn: () => healthApi.logs('gym'),
  })
  const queryClient = useQueryClient()

  const [logType, setLogType] = useState<'gym' | 'weight' | 'water'>('gym')
  const [logValue, setLogValue] = useState('')
  const [logNote, setLogNote] = useState('')

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
    },
  })

  const weightData = weightLogs
    ?.slice(0, 30)
    .reverse()
    .map(l => ({ date: l.logged_at.slice(0, 10), weight: Number(l.value) }))
    ?? []

  // Heatmap: last 84 days of gym logs
  const gymDates = new Set(gymLogs?.map(l => l.logged_at.slice(0, 10)) ?? [])
  const heatmapDays = Array.from({ length: 84 }, (_, i) => {
    const d = new Date()
    d.setDate(d.getDate() - (83 - i))
    const iso = d.toISOString().slice(0, 10)
    return { date: iso, worked: gymDates.has(iso) }
  })

  return (
    <div className="p-4 sm:p-6 space-y-6">
      <h1 className="text-2xl font-bold text-foreground">Health</h1>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-card border border-border rounded-xl p-4">
          <div className="flex items-center gap-2 mb-1">
            <Scale className="w-4 h-4 text-muted-foreground" />
            <p className="text-xs text-muted-foreground">Weight</p>
          </div>
          <p className="text-2xl font-bold font-mono">{summary?.weight ?? '—'} <span className="text-sm font-normal text-muted-foreground">kg</span></p>
        </div>
        <div className="bg-card border border-border rounded-xl p-4">
          <div className="flex items-center gap-2 mb-1">
            <Dumbbell className="w-4 h-4 text-muted-foreground" />
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
      </div>

      {/* Weight chart */}
      {weightData.length > 0 && (
        <div className="bg-card border border-border rounded-xl p-4">
          <h2 className="text-sm font-semibold mb-4">Weight Trend</h2>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={weightData}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="date" tick={{ fontSize: 10 }} />
              <YAxis domain={['auto', 'auto']} tick={{ fontSize: 11 }} unit=" kg" />
              <Tooltip formatter={(v: number) => `${v} kg`} />
              <Line type="monotone" dataKey="weight" stroke="#f43f5e" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Workout heatmap */}
      <div className="bg-card border border-border rounded-xl p-4">
        <h2 className="text-sm font-semibold mb-3">Workout Calendar (Last 12 weeks)</h2>
        <div className="grid gap-1" style={{ gridTemplateColumns: 'repeat(12, 1fr)' }}>
          {Array.from({ length: 12 }, (_, week) => (
            <div key={week} className="flex flex-col gap-1">
              {heatmapDays.slice(week * 7, week * 7 + 7).map(day => (
                <div
                  key={day.date}
                  title={day.date}
                  className={`aspect-square rounded-sm ${day.worked ? 'bg-emerald-500' : 'bg-muted'}`}
                />
              ))}
            </div>
          ))}
        </div>
        <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
          <div className="w-3 h-3 rounded-sm bg-muted" /> Rest
          <div className="w-3 h-3 rounded-sm bg-emerald-500 ml-2" /> Worked out
        </div>
      </div>

      {/* Log entry */}
      <div className="bg-card border border-border rounded-xl p-4">
        <h2 className="text-sm font-semibold mb-3">Quick Log</h2>
        <div className="flex gap-2 flex-wrap">
          <select
            value={logType}
            onChange={e => setLogType(e.target.value as typeof logType)}
            className="px-3 py-2 text-sm rounded-lg bg-muted border border-border text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
          >
            <option value="gym">Gym session</option>
            <option value="weight">Weight</option>
            <option value="water">Water intake</option>
          </select>
          {logType !== 'gym' && (
            <input
              type="number"
              placeholder={logType === 'weight' ? 'kg' : 'litres'}
              value={logValue}
              onChange={e => setLogValue(e.target.value)}
              className="w-24 px-3 py-2 text-sm rounded-lg bg-muted border border-border text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
            />
          )}
          <input
            placeholder="Note (optional)"
            value={logNote}
            onChange={e => setLogNote(e.target.value)}
            className="flex-1 min-w-[100px] px-3 py-2 text-sm rounded-lg bg-muted border border-border text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
          />
          <button
            onClick={() => addLog.mutate()}
            disabled={addLog.isPending}
            className="flex items-center gap-1.5 px-3 py-2 text-sm rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition"
          >
            <Plus className="w-4 h-4" /> Log
          </button>
        </div>
      </div>
    </div>
  )
}
