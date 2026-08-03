/**
 * Health → Habits.
 *
 * Phase 4 conversion to the canvas's `health:habits` composition —
 * heat(12) · checklist(5) · progress(7) — rebuilt from the live habits API.
 * Every module derives exactly from `checks[]`, so nothing here is a stand-in.
 */
import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import dayjs from 'dayjs'
import styled from 'styled-components'
import { BarChart3, CheckSquare, Circle, Trash2 } from 'lucide-react'
import { Button, Card, Dialog, EmptyState, Input } from '@ledgr/ui'
import { healthApi } from '@ct/shared/api/areas'
import { ModuleGrid, type ModuleSpec } from '@ct/shared/components/modules'
import { Skeleton } from '@ct/shared/components/ui/skeleton'
import type { HabitItem } from '@ct/shared/types'

const Root = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.spacing[5]};
`

const Form = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.spacing[3]};
`

const Label = styled.label`
  display: block;
  font-size: ${({ theme }) => theme.typography.fontSize.xs};
  color: ${({ theme }) => theme.color.mutedForeground};
  margin-bottom: ${({ theme }) => theme.spacing[1]};
`

const Actions = styled.div`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing[2]};
  padding-top: ${({ theme }) => theme.spacing[2]};
`

const HEAT_DAYS = 14
const RATE_DAYS = 30

export function HabitsSection() {
  const qc = useQueryClient()
  const [addOpen, setAddOpen] = useState(false)
  const [draft, setDraft] = useState({ name: '', icon: '' })
  const [manage, setManage] = useState<HabitItem | null>(null)

  const { data: habits, isLoading } = useQuery({
    queryKey: ['health', 'habits'],
    queryFn: healthApi.habits,
  })

  const toggle = useMutation({
    mutationFn: (id: string) => healthApi.toggleHabit(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['health', 'habits'] }),
    onError: () => toast.error('Could not update that habit'),
  })

  const create = useMutation({
    mutationFn: () => healthApi.createHabit({ name: draft.name.trim(), icon: draft.icon.trim() || undefined }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['health', 'habits'] })
      setAddOpen(false)
      setDraft({ name: '', icon: '' })
      toast.success('Habit added')
    },
    onError: () => toast.error('Failed to add habit'),
  })

  const remove = useMutation({
    mutationFn: (id: string) => healthApi.deleteHabit(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['health', 'habits'] })
      setManage(null)
      toast.success('Habit removed')
    },
    onError: () => toast.error('Failed to remove habit'),
  })

  const rows = useMemo(() => habits ?? [], [habits])

  const modules = useMemo<ModuleSpec[]>(() => {
    if (!rows.length) return []

    const today = dayjs()
    const heatDays = Array.from({ length: HEAT_DAYS }, (_, i) =>
      today.subtract(HEAT_DAYS - 1 - i, 'day'))
    const todayKey = today.format('YYYY-MM-DD')

    const doneToday = rows.filter(h => h.checks.includes(todayKey)).length
    const hoursLeft = 24 - today.hour()

    return [
      {
        kind: 'heat',
        span: 12,
        title: `Last ${HEAT_DAYS} days`,
        subtitle: `Darker means done · ${rows.length} habit${rows.length === 1 ? '' : 's'} tracked daily`,
        icon: CheckSquare,
        action: 'Add habit',
        onAction: () => setAddOpen(true),
        dayLabels: heatDays.map(d => d.format('D')),
        colorKey: 'health',
        habits: rows.map((h) => {
          const cells = heatDays.map(d => (h.checks.includes(d.format('YYYY-MM-DD')) ? 3 : 0))
          // A streak that does not include today or yesterday has lapsed.
          const broken = h.streak === 0
          return {
            label: `${h.icon ? `${h.icon} ` : ''}${h.name}`,
            cells,
            streak: h.streak > 0 ? `${h.streak}d` : '—',
            broken,
          }
        }),
      },
      {
        kind: 'checklist',
        span: 5,
        title: 'Today',
        subtitle: `${doneToday} of ${rows.length} done · ${hoursLeft} hour${hoursLeft === 1 ? '' : 's'} left in the day`,
        icon: Circle,
        items: rows.map(h => ({
          label: `${h.icon ? `${h.icon} ` : ''}${h.name}`,
          meta: h.streak > 0 ? `${h.streak}-day streak` : 'No streak yet',
          done: h.checks.includes(todayKey),
          busy: toggle.isPending && toggle.variables === h.id,
        })),
        onToggle: (i: number) => toggle.mutate(rows[i].id),
      },
      {
        kind: 'progress',
        span: 7,
        title: 'Completion rate',
        subtitle: `Last ${RATE_DAYS} days per habit · click to manage`,
        icon: BarChart3,
        onRowClick: (i: number) => setManage(rows[i]),
        rows: rows.map((h) => {
          const since = today.subtract(RATE_DAYS - 1, 'day')
          const hits = h.checks.filter(c => !dayjs(c).isBefore(since, 'day')).length
          const pct = Math.round((hits / RATE_DAYS) * 100)
          return {
            title: `${h.icon ? `${h.icon} ` : ''}${h.name}`,
            meta: `${hits} of ${RATE_DAYS} days`,
            pct,
            value: `${pct}%`,
            colorKey: pct >= 80 ? 'success' : pct >= 50 ? 'accent' : 'warning',
          }
        }),
      },
    ]
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rows, toggle.isPending])

  if (isLoading) return <Skeleton style={{ height: 320 }} />

  return (
    <Root>
      {rows.length === 0 ? (
        <Card title="Habits" subtitle="Small things, done daily" icon={<CheckSquare size={16} />}>
          <EmptyState
            icon={<CheckSquare size={20} />}
            title="No habits yet"
            description="Add a habit and check it off each day — the grid fills in as you go."
            action={<Button size="sm" onClick={() => setAddOpen(true)}>Add your first habit</Button>}
          />
        </Card>
      ) : (
        <ModuleGrid modules={modules} />
      )}

      <Dialog
        open={addOpen}
        onOpenChange={(o) => !o && setAddOpen(false)}
        icon={<CheckSquare size={18} />}
        eyebrow="Health"
        title="New habit"
        description="Something you want to do every day."
      >
        <Form>
          <div>
            <Label>Name</Label>
            <Input
              value={draft.name}
              onChange={(e: any) => setDraft(d => ({ ...d, name: e.target.value }))}
              placeholder="Drink 2L water"
              autoFocus
            />
          </div>
          <div>
            <Label>Icon (emoji, optional)</Label>
            <Input
              value={draft.icon}
              maxLength={2}
              onChange={(e: any) => setDraft(d => ({ ...d, icon: e.target.value }))}
              placeholder="💧"
            />
          </div>
          <Actions>
            <Button variant="primary" disabled={!draft.name.trim() || create.isPending} onClick={() => create.mutate()}>
              {create.isPending ? 'Adding…' : 'Add habit'}
            </Button>
            <Button variant="ghost" onClick={() => setAddOpen(false)}>Cancel</Button>
          </Actions>
        </Form>
      </Dialog>

      <Dialog
        open={!!manage}
        onOpenChange={(o) => !o && setManage(null)}
        icon={<CheckSquare size={18} />}
        eyebrow="Health"
        title={manage?.name ?? 'Habit'}
        description={manage ? `${manage.checks.length} check-in(s) all time · ${manage.streak}-day streak` : undefined}
      >
        <Actions>
          <Button variant="ghost" onClick={() => setManage(null)}>Close</Button>
          <Button
            variant="destructive"
            size="sm"
            loading={remove.isPending}
            onClick={() => manage && remove.mutate(manage.id)}
          >
            <Trash2 size={14} style={{ marginRight: 4 }} /> Delete habit
          </Button>
        </Actions>
      </Dialog>
    </Root>
  )
}
