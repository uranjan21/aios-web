import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { Plus, Rocket } from 'lucide-react'
import { businessApi } from '@/api/areas'
import { formatCurrency, formatDate } from '@/lib/utils'

const EVENT_TYPE_COLORS: Record<string, string> = {
  feature_shipped: 'bg-emerald-500/10 text-emerald-500',
  decision: 'bg-blue-500/10 text-blue-400',
  revenue: 'bg-amber-500/10 text-amber-500',
  blocker: 'bg-red-500/10 text-red-400',
  milestone: 'bg-violet-500/10 text-violet-400',
  note: 'bg-muted text-muted-foreground',
}

export function BusinessPage() {
  const { data: events } = useQuery({ queryKey: ['business', 'events'], queryFn: businessApi.events })
  const { data: summary } = useQuery({ queryKey: ['business', 'summary'], queryFn: businessApi.summary })
  const queryClient = useQueryClient()

  const [form, setForm] = useState({ event_type: 'feature_shipped', title: '', description: '' })

  const addEvent = useMutation({
    mutationFn: () => businessApi.createEvent({
      event_type: form.event_type,
      title: form.title,
      description: form.description || undefined,
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['business'] })
      setForm(f => ({ ...f, title: '', description: '' }))
    },
  })

  return (
    <div className="p-4 sm:p-6 space-y-6">
      <h1 className="text-2xl font-bold text-foreground">Business</h1>

      {/* Ledgr status */}
      <div className="bg-card border border-border rounded-xl p-5">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 rounded-lg bg-violet-500/10">
            <Rocket className="w-5 h-5 text-violet-400" />
          </div>
          <div>
            <h2 className="font-semibold text-foreground">Ledgr</h2>
            <p className="text-xs text-muted-foreground">SaaS accounting for Indian freelancers</p>
          </div>
          <span className="ml-auto text-xs px-2.5 py-1 rounded-full bg-blue-500/10 text-blue-400 font-medium">Building</span>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div>
            <p className="text-xs text-muted-foreground">MRR</p>
            <p className="text-xl font-bold font-mono mt-0.5">{formatCurrency(summary?.mrr ?? 0)}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Last feature</p>
            <p className="text-sm font-medium mt-0.5 truncate">{summary?.last_feature ?? '—'}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Shipped at</p>
            <p className="text-sm font-medium mt-0.5">{formatDate(summary?.last_feature_at)}</p>
          </div>
        </div>
      </div>

      {/* Log event */}
      <div className="bg-card border border-border rounded-xl p-4">
        <h2 className="text-sm font-semibold mb-3">Log Event</h2>
        <div className="flex gap-2 flex-wrap">
          <select
            value={form.event_type}
            onChange={e => setForm(f => ({ ...f, event_type: e.target.value }))}
            className="px-3 py-2 text-sm rounded-lg bg-muted border border-border text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
          >
            {Object.keys(EVENT_TYPE_COLORS).map(t => (
              <option key={t} value={t}>{t.replace('_', ' ')}</option>
            ))}
          </select>
          <input
            placeholder="Title"
            value={form.title}
            onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
            className="flex-1 min-w-[140px] px-3 py-2 text-sm rounded-lg bg-muted border border-border text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
          />
          <button
            onClick={() => addEvent.mutate()}
            disabled={!form.title || addEvent.isPending}
            className="flex items-center gap-1.5 px-3 py-2 text-sm rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition"
          >
            <Plus className="w-4 h-4" /> Log
          </button>
        </div>
      </div>

      {/* Feature timeline */}
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <div className="px-4 py-3 border-b border-border">
          <h2 className="text-sm font-semibold">Event Timeline</h2>
        </div>
        <div className="divide-y divide-border">
          {events?.map(e => (
            <div key={e.id} className="flex items-start gap-3 px-4 py-3">
              <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full shrink-0 mt-0.5 ${EVENT_TYPE_COLORS[e.event_type] ?? 'bg-muted text-muted-foreground'}`}>
                {e.event_type.replace('_', ' ')}
              </span>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground">{e.title}</p>
                {e.description && <p className="text-xs text-muted-foreground mt-0.5">{e.description}</p>}
              </div>
              <span className="text-xs text-muted-foreground shrink-0">{formatDate(e.occurred_at)}</span>
            </div>
          ))}
          {!events?.length && (
            <p className="px-4 py-8 text-center text-sm text-muted-foreground">No events logged yet</p>
          )}
        </div>
      </div>
    </div>
  )
}
