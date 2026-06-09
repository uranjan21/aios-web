import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { Plus } from 'lucide-react'
import { contentApi } from '@/api/areas'
import { cn } from '@/lib/utils'
import type { ContentItem } from '@/types'

const STATUS_COLS: ContentItem['status'][] = ['idea', 'in_progress', 'scheduled', 'published']

const STATUS_STYLES: Record<ContentItem['status'], string> = {
  idea: 'border-zinc-600 bg-zinc-900/50',
  in_progress: 'border-blue-600 bg-blue-950/30',
  scheduled: 'border-amber-600 bg-amber-950/30',
  published: 'border-emerald-600 bg-emerald-950/30',
  archived: 'border-zinc-700 bg-zinc-900/20',
}

const PLATFORM_BADGE: Record<ContentItem['platform'], string> = {
  linkedin: 'bg-blue-600/20 text-blue-400',
  twitter: 'bg-sky-500/20 text-sky-400',
  instagram: 'bg-pink-500/20 text-pink-400',
  youtube: 'bg-red-500/20 text-red-400',
  blog: 'bg-amber-500/20 text-amber-400',
}

function ItemCard({ item }: { item: ContentItem }) {
  const queryClient = useQueryClient()
  const advance = useMutation({
    mutationFn: (status: ContentItem['status']) => contentApi.patchItem(item.id, { status }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['content', 'items'] }),
  })

  const nextStatus: Record<ContentItem['status'], ContentItem['status'] | null> = {
    idea: 'in_progress',
    in_progress: 'scheduled',
    scheduled: 'published',
    published: null,
    archived: null,
  }

  return (
    <div className="bg-card border border-border rounded-lg p-3 space-y-2">
      <p className="text-sm font-medium text-foreground leading-tight">{item.title}</p>
      <div className="flex items-center justify-between">
        <span className={cn('text-[10px] font-semibold px-1.5 py-0.5 rounded', PLATFORM_BADGE[item.platform])}>
          {item.platform}
        </span>
        {nextStatus[item.status] && (
          <button
            onClick={() => advance.mutate(nextStatus[item.status]!)}
            className="text-[10px] text-primary hover:text-primary/80"
          >
            → {nextStatus[item.status]}
          </button>
        )}
      </div>
    </div>
  )
}

export function ContentPage() {
  const { data: items } = useQuery({
    queryKey: ['content', 'items'],
    queryFn: () => contentApi.items(),
  })
  const queryClient = useQueryClient()

  const [form, setForm] = useState({ title: '', platform: 'linkedin', content_type: '' })

  const addItem = useMutation({
    mutationFn: () => contentApi.createItem({
      title: form.title,
      platform: form.platform,
      content_type: form.content_type || undefined,
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['content', 'items'] })
      setForm(f => ({ ...f, title: '' }))
    },
  })

  const byStatus = STATUS_COLS.reduce<Record<string, ContentItem[]>>((acc, s) => {
    acc[s] = items?.filter(i => i.status === s) ?? []
    return acc
  }, {})

  return (
    <div className="p-4 sm:p-6 space-y-6">
      <h1 className="text-2xl font-bold text-foreground">Content</h1>

      {/* Add idea */}
      <div className="bg-card border border-border rounded-xl p-4">
        <h2 className="text-sm font-semibold mb-3">New Idea</h2>
        <div className="flex gap-2 flex-wrap">
          <input
            placeholder="Content idea…"
            value={form.title}
            onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
            className="flex-1 min-w-[140px] px-3 py-2 text-sm rounded-lg bg-muted border border-border text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
          />
          <select
            value={form.platform}
            onChange={e => setForm(f => ({ ...f, platform: e.target.value }))}
            className="px-3 py-2 text-sm rounded-lg bg-muted border border-border text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
          >
            {['linkedin', 'twitter', 'instagram', 'youtube', 'blog'].map(p => (
              <option key={p} value={p}>{p}</option>
            ))}
          </select>
          <button
            onClick={() => addItem.mutate()}
            disabled={!form.title || addItem.isPending}
            className="flex items-center gap-1.5 px-3 py-2 text-sm rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition"
          >
            <Plus className="w-4 h-4" /> Add
          </button>
        </div>
      </div>

      {/* Kanban */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {STATUS_COLS.map(status => (
          <div key={status} className={cn('rounded-xl border p-3 space-y-2', STATUS_STYLES[status])}>
            <div className="flex items-center justify-between mb-1">
              <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground capitalize">
                {status.replace('_', ' ')}
              </h3>
              <span className="text-xs text-muted-foreground">{byStatus[status].length}</span>
            </div>
            {byStatus[status].map(item => <ItemCard key={item.id} item={item} />)}
            {byStatus[status].length === 0 && (
              <p className="text-xs text-muted-foreground/60 text-center py-4">Empty</p>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
