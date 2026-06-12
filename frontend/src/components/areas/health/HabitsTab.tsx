import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Button, Input, Popconfirm } from 'antd'
import { toast } from 'sonner'
import dayjs from 'dayjs'
import { Plus, Flame, Trash2, Repeat } from 'lucide-react'
import { healthApi } from '@/api/areas'
import { Skeleton } from '@/components/ui/skeleton'
import { EmptyState } from '@/components/EmptyState'
import { cn } from '@/lib/utils'
import type { HabitItem } from '@/types'

const DAYS_SHOWN = 7

function HabitRow({ habit }: { habit: HabitItem }) {
  const queryClient = useQueryClient()
  const checks = new Set(habit.checks)
  const days = Array.from({ length: DAYS_SHOWN }, (_, i) =>
    dayjs().subtract(DAYS_SHOWN - 1 - i, 'day').format('YYYY-MM-DD')
  )

  const toggleMutation = useMutation({
    mutationFn: (date: string) => healthApi.toggleHabit(habit.id, date),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['health', 'habits'] }),
    onError: () => toast.error('Failed to update habit'),
  })

  const deleteMutation = useMutation({
    mutationFn: () => healthApi.deleteHabit(habit.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['health', 'habits'] })
      toast.success('Habit archived')
    },
    onError: () => toast.error('Failed to archive habit'),
  })

  return (
    <div className="flex items-center justify-between gap-3 px-3 py-2.5 border-b border-border/40 last:border-b-0 group">
      <div className="flex items-center gap-2 min-w-0">
        <span className="text-base shrink-0">{habit.icon || '🎯'}</span>
        <div className="min-w-0">
          <div className="text-[13px] font-medium text-foreground truncate">{habit.name}</div>
          <div className="flex items-center gap-1 text-[11px] text-muted-foreground">
            <Flame size={11} className={habit.streak > 0 ? 'text-orange-500' : ''} />
            {habit.streak > 0 ? `${habit.streak} day streak` : 'No streak yet'}
          </div>
        </div>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <div className="flex gap-1">
          {days.map(d => {
            const checked = checks.has(d)
            const isToday = d === dayjs().format('YYYY-MM-DD')
            return (
              <button
                key={d}
                onClick={() => toggleMutation.mutate(d)}
                title={dayjs(d).format('ddd, MMM D')}
                aria-label={`${habit.name} on ${d}: ${checked ? 'done' : 'not done'}`}
                className={cn(
                  'w-6 h-6 rounded-md border text-[9px] font-medium transition-colors',
                  checked
                    ? 'bg-primary border-primary text-primary-foreground'
                    : 'bg-muted/40 border-border text-muted-foreground hover:border-primary/50',
                  isToday && !checked && 'border-primary/60 border-dashed',
                )}
              >
                {dayjs(d).format('dd')[0]}
              </button>
            )
          })}
        </div>
        <Popconfirm title="Archive this habit?" onConfirm={() => deleteMutation.mutate()} okText="Archive" okButtonProps={{ danger: true }}>
          <button className="p-1 rounded opacity-0 group-hover:opacity-100 transition text-muted-foreground hover:text-destructive" aria-label="Archive habit">
            <Trash2 size={12} />
          </button>
        </Popconfirm>
      </div>
    </div>
  )
}

export function HabitsTab() {
  const queryClient = useQueryClient()
  const [name, setName] = useState('')
  const [icon, setIcon] = useState('')

  const { data: habits, isLoading } = useQuery({
    queryKey: ['health', 'habits'],
    queryFn: healthApi.habits,
  })

  const createMutation = useMutation({
    mutationFn: () => healthApi.createHabit({ name: name.trim(), icon: icon.trim() || undefined }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['health', 'habits'] })
      toast.success('Habit added')
      setName(''); setIcon('')
    },
    onError: () => toast.error('Failed to add habit'),
  })

  const bestStreak = Math.max(0, ...(habits ?? []).map(h => h.streak))
  const doneToday = (habits ?? []).filter(h => h.checks.includes(dayjs().format('YYYY-MM-DD'))).length

  return (
    <div className="max-w-2xl space-y-4">
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'Habits', value: String(habits?.length ?? 0) },
          { label: 'Done Today', value: `${doneToday}/${habits?.length ?? 0}` },
          { label: 'Best Streak', value: bestStreak > 0 ? `${bestStreak}d` : '—' },
        ].map(c => (
          <div key={c.label} className="bg-card border border-border rounded-xl p-3 text-center">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">{c.label}</p>
            <p className="text-xl font-semibold text-foreground font-mono tracking-tight mt-0.5">{c.value}</p>
          </div>
        ))}
      </div>

      <div className="flex gap-2">
        <Input
          placeholder="New habit — Meditate, Read 20 min…"
          value={name}
          onChange={e => setName(e.target.value)}
          onPressEnter={() => name.trim() && createMutation.mutate()}
        />
        <Input placeholder="🧘" value={icon} onChange={e => setIcon(e.target.value)} className="!w-14 text-center" maxLength={2} />
        <Button type="primary" icon={<Plus size={14} />} disabled={!name.trim()} loading={createMutation.isPending} onClick={() => createMutation.mutate()}>
          Add
        </Button>
      </div>

      <div className="bg-card border border-border rounded-xl shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="p-3 space-y-2">
            {[1, 2, 3].map(i => <Skeleton key={i} className="h-12 w-full" />)}
          </div>
        ) : !habits?.length ? (
          <EmptyState icon={Repeat} title="No habits yet" description="Add a daily habit and build your streaks." />
        ) : (
          habits.map(h => <HabitRow key={h.id} habit={h} />)
        )}
      </div>
    </div>
  )
}
