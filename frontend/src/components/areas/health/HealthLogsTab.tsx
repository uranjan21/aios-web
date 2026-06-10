import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Select, Tag } from 'antd'
import { Download, Activity } from 'lucide-react'
import { healthApi } from '@/api/areas'
import { Skeleton } from '@/components/ui/skeleton'
import { exportToCsv, formatRelativeTime } from '@/lib/utils'
import { EmptyState } from '@/components/EmptyState'
import { format } from 'date-fns'

const TYPE_COLORS: Record<string, string> = {
  gym: 'green',
  weight: 'blue',
  water: 'cyan',
  food: 'orange',
  meal: 'orange',
  steps: 'gold',
  body_fat: 'purple',
  sleep: 'geekblue',
  note: 'default',
}

const TYPE_LABELS: Record<string, string> = {
  gym: 'Gym', weight: 'Weight', water: 'Water',
  food: 'Food', meal: 'Meal', steps: 'Steps',
  body_fat: 'Body Fat', sleep: 'Sleep', note: 'Note',
}

const LOG_TYPES = ['all', 'gym', 'weight', 'water', 'meal', 'steps', 'body_fat', 'sleep', 'food', 'note']

export function HealthLogsTab() {
  const [filterType, setFilterType] = useState('all')

  const { data: logs, isLoading } = useQuery({
    queryKey: ['health', 'logs', 'all'],
    queryFn: () => healthApi.logs(),
  })

  const filtered = filterType === 'all' ? logs : logs?.filter(l => l.entry_type === filterType)

  const handleExport = () => {
    if (!filtered?.length) return
    exportToCsv(
      filtered.map(l => ({
        date: l.logged_at,
        type: l.entry_type,
        value: l.value ?? '',
        unit: l.unit ?? '',
        notes: l.notes ?? '',
      })),
      `health-logs-${format(new Date(), 'yyyy-MM-dd')}`,
    )
  }

  return (
    <div className="space-y-3">
      {/* Toolbar */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <Select
          value={filterType}
          onChange={setFilterType}
          size="small"
          style={{ width: 130 }}
        >
          {LOG_TYPES.map(t => (
            <Select.Option key={t} value={t}>
              {t === 'all' ? 'All types' : TYPE_LABELS[t] || t}
            </Select.Option>
          ))}
        </Select>

        <button
          onClick={handleExport}
          disabled={!filtered?.length}
          className="flex items-center gap-1.5 text-[11px] text-muted-foreground hover:text-foreground font-medium transition disabled:opacity-40"
        >
          <Download className="w-3.5 h-3.5" />
          Export CSV
        </button>
      </div>

      {/* Table */}
      <div className="bg-card border border-border/60 shadow-sm rounded-xl overflow-hidden">
        <table className="w-full text-[11px]" aria-label="Health logs">
          <thead>
            <tr className="border-b border-border/40 text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">
              <th className="px-3 py-2.5 text-left">Date</th>
              <th className="px-3 py-2.5 text-left">Type</th>
              <th className="px-3 py-2.5 text-left">Value</th>
              <th className="px-3 py-2.5 text-left hidden sm:table-cell">Notes</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              Array.from({ length: 6 }).map((_, i) => (
                <tr key={i} className="border-b border-border/30">
                  <td className="px-3 py-2" colSpan={4}><Skeleton className="h-4 w-full" /></td>
                </tr>
              ))
            ) : !filtered?.length ? (
              <tr>
                <td colSpan={4}>
                  <EmptyState icon={Activity} title="No logs" description="Start logging to see your history here." />
                </td>
              </tr>
            ) : (
              filtered.map(log => (
                <tr key={log.id} className="border-b border-border/30 last:border-0 hover:bg-muted/20 transition-colors">
                  <td className="px-3 py-2.5">
                    <div className="font-medium text-foreground">{format(new Date(log.logged_at), 'MMM d, yyyy')}</div>
                    <div className="text-[10px] text-muted-foreground">{formatRelativeTime(log.logged_at)}</div>
                  </td>
                  <td className="px-3 py-2.5">
                    <Tag color={TYPE_COLORS[log.entry_type] || 'default'} className="text-[10px]">
                      {TYPE_LABELS[log.entry_type] || log.entry_type}
                    </Tag>
                  </td>
                  <td className="px-3 py-2.5 font-mono font-medium text-foreground">
                    {log.value != null ? `${log.value}${log.unit ? ` ${log.unit}` : ''}` : '—'}
                  </td>
                  <td className="px-3 py-2.5 text-muted-foreground hidden sm:table-cell max-w-[200px] truncate">
                    {log.notes || '—'}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {filtered && filtered.length > 0 && (
        <p className="text-[10px] text-muted-foreground">{filtered.length} entries</p>
      )}
    </div>
  )
}
