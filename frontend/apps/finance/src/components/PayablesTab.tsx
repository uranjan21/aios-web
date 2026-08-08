/**
 * Finance → Bills.
 *
 * Phase 4 conversion to the canvas's `finance:bills` composition —
 * calendar(7) · rows(5) · controls(12) — rebuilt from the live payables API.
 * The canvas asks "what is due this month, when, and what pays itself", which
 * is what `/areas/finance/payables` answers.
 *
 * The old flat pay-checklist is replaced, but nothing it did is lost: marking
 * an item paid moved onto the "Next up" rows, which is where the canvas puts
 * the actionable list.
 */
import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import dayjs from 'dayjs'
import { Button, SkeletonPage } from '@ledgr/ui'
import { Bell, ChevronLeft, ChevronRight, FileText, Settings } from 'lucide-react'
import styled from 'styled-components'
import { financeApi, type PayableItem } from '@ct/shared/api/areas'
import { api } from '@ct/shared/api/client'
import { ModuleGrid, type ModuleSpec } from '@ct/shared/components/modules'
import { formatCurrency } from '@ct/shared/lib/utils'

const Root = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.spacing[5]};
`

/** The automation rule that sends the pre-due-date nudge. */
const REMINDER_RULE = 'bill_reminder_3d'

interface AutomationRule { key: string; enabled: boolean }

function ordinal(n: number) {
  const s = ['th', 'st', 'nd', 'rd']
  const v = n % 100
  return n + (s[(v - 20) % 10] || s[v] || s[0])
}

/**
 * A payable's urgency, driving both the calendar mark colour and the "Next up"
 * tag. The canvas's legend entries map onto exactly these four states.
 */
function urgencyOf(item: PayableItem, dueDay: number | null, today: number, isCurrentMonth: boolean) {
  if (item.paid) return { key: 'mutedFg', label: 'Paid' }
  if (isCurrentMonth && dueDay !== null && dueDay < today) return { key: 'destructive', label: 'Overdue' }
  if (!item.is_auto_debit) return { key: 'destructive', label: 'Action' }
  if (isCurrentMonth && dueDay !== null && dueDay - today <= 3) return { key: 'warning', label: 'Due soon' }
  return { key: 'info', label: 'Autopay' }
}

export function PayablesTab() {
  const queryClient = useQueryClient()
  const [month, setMonth] = useState(dayjs().format('YYYY-MM'))

  const { data, isLoading } = useQuery({
    queryKey: ['finance', 'payables', month],
    queryFn: () => financeApi.payables(month),
    staleTime: 30_000,
  })

  const { data: rules } = useQuery({
    queryKey: ['automations'],
    queryFn: () => api.get<AutomationRule[]>('/automations/').then(r => r.data),
    staleTime: 60_000,
  })

  const payMutation = useMutation({
    mutationFn: (item: PayableItem) =>
      financeApi.togglePaid({
        obligation_type: item.type,
        obligation_id: item.id,
        period: month,
        paid: !item.paid,
        account_id: item.account_id,
      }),
    onMutate: async (item) => {
      // Optimistic flip so the list stays responsive.
      await queryClient.cancelQueries({ queryKey: ['finance', 'payables', month] })
      const prev = queryClient.getQueryData<typeof data>(['finance', 'payables', month])
      if (prev) {
        queryClient.setQueryData(['finance', 'payables', month], {
          ...prev,
          items: prev.items.map((i) =>
            i.type === item.type && i.id === item.id ? { ...i, paid: !i.paid } : i,
          ),
        })
      }
      return { prev }
    },
    onError: (_e, _item, ctx) => {
      if (ctx?.prev) queryClient.setQueryData(['finance', 'payables', month], ctx.prev)
      toast.error('Could not update')
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: ['finance', 'payables', month] }),
  })

  /** Autopay is a column on the Bill row, so only `bill` payables can toggle it. */
  const autopayMutation = useMutation({
    mutationFn: ({ id, on }: { id: string; on: boolean }) => financeApi.patchBill(id, { is_auto_debit: on }),
    onSuccess: (_d, v) => {
      queryClient.invalidateQueries({ queryKey: ['finance', 'payables'] })
      queryClient.invalidateQueries({ queryKey: ['finance', 'bills'] })
      toast.success(v.on ? 'Autopay on' : 'Autopay off')
    },
    onError: () => toast.error('Could not change autopay'),
  })

  const reminderMutation = useMutation({
    mutationFn: (enabled: boolean) => api.put(`/automations/${REMINDER_RULE}`, { enabled, params: {} }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['automations'] })
      toast.success('Reminder updated')
    },
    onError: () => toast.error('Could not update the reminder'),
  })

  const shift = (delta: number) => setMonth(dayjs(month + '-01').add(delta, 'month').format('YYYY-MM'))

  const items = useMemo(() => data?.items ?? [], [data])
  const billRows = useMemo(() => items.filter(i => i.type === 'bill'), [items])
  const reminderOn = rules?.find(r => r.key === REMINDER_RULE)?.enabled ?? false

  const modules = useMemo<ModuleSpec[]>(() => {
    const start = dayjs(month + '-01')
    const daysInMonth = start.daysInMonth()
    const isCurrentMonth = start.isSame(dayjs(), 'month')
    const today = dayjs().date()

    // Lead/trail fill the first and last weeks with the neighbouring months'
    // days, dimmed — the canvas draws a complete 7-column grid.
    const firstWeekday = start.day()
    const prevMonthDays = start.subtract(1, 'month').daysInMonth()
    const lead = Array.from({ length: firstWeekday }, (_, i) => prevMonthDays - firstWeekday + 1 + i)
    const trailCount = (7 - ((firstWeekday + daysInMonth) % 7)) % 7
    const trail = Array.from({ length: trailCount }, (_, i) => i + 1)

    const dayOf = (item: PayableItem): number | null =>
      item.due_date ? dayjs(item.due_date).date() : item.due_day ?? null

    // One mark per day carrying that day's total and its most urgent state.
    const RANK: Record<string, number> = { destructive: 3, warning: 2, info: 1, mutedFg: 0 }
    const byDay = new Map<number, { total: number; key: string }>()
    for (const item of items) {
      const d = dayOf(item)
      if (d === null) continue
      const u = urgencyOf(item, d, today, isCurrentMonth)
      const cur = byDay.get(d)
      byDay.set(d, {
        total: (cur?.total ?? 0) + Number(item.amount),
        key: !cur || RANK[u.key] > RANK[cur.key] ? u.key : cur.key,
      })
    }
    const marks: Record<number, { t: string; k?: string }> = {}
    for (const [d, v] of byDay) marks[d] = { t: formatCurrency(v.total), k: v.key }

    const unpaidCount = items.filter(i => !i.paid).length

    // "Next up" — unpaid, soonest first. Clicking a row marks it paid.
    const nextUp = items
      .filter(i => !i.paid)
      .sort((a, b) => (dayOf(a) ?? 99) - (dayOf(b) ?? 99))
      .slice(0, 6)

    const specs: ModuleSpec[] = [
      {
        kind: 'calendar',
        span: 7,
        title: start.format('MMMM YYYY'),
        subtitle: `${formatCurrency(data?.total_unpaid ?? 0)} still due across ${unpaidCount} item${unpaidCount === 1 ? '' : 's'}`,
        icon: FileText,
        /* The month steppers sit on the calendar because its title IS the
         * month — no separate label needed, which is why this is two chevrons
         * and not the old MonthNav. They used to portal into a page header. */
        actionNode: (
          <>
            <Button variant="ghost" size="icon" aria-label="Previous month" onClick={() => shift(-1)}>
              <ChevronLeft size={16} />
            </Button>
            <Button variant="ghost" size="icon" aria-label="Next month" onClick={() => shift(1)}>
              <ChevronRight size={16} />
            </Button>
          </>
        ),
        lead,
        days: daysInMonth,
        trail,
        ...(isCurrentMonth && { today }),
        marks,
        legend: [
          { label: 'Autopay', colorKey: 'info' },
          { label: 'Needs action', colorKey: 'destructive' },
          { label: 'Due soon', colorKey: 'warning' },
          { label: 'Paid', colorKey: 'mutedFg' },
        ],
      },
      {
        kind: 'rows',
        span: 5,
        title: 'Next up',
        subtitle: nextUp.length ? 'Sorted by due date · click to mark paid' : 'Nothing outstanding',
        icon: Bell,
        rows: nextUp.map((item) => {
          const d = dayOf(item)
          const u = urgencyOf(item, d, today, isCurrentMonth)
          return {
            title: item.name,
            meta: [
              d === null ? 'No due date' : start.date(d).format('D MMM'),
              item.account_name ? `from ${item.account_name}` : 'no account set',
            ].join(' · '),
            tagLabel: u.label,
            tagColorKey: u.key,
            value: formatCurrency(item.amount),
          }
        }),
        onRowClick: (i: number) => payMutation.mutate(nextUp[i]),
      },
    ]

    if (billRows.length) {
      specs.push({
        kind: 'controls',
        span: 12,
        title: 'Autopay and reminders',
        subtitle: `${billRows.filter(b => b.is_auto_debit).length} of ${billRows.length} bills self-pay`,
        icon: Settings,
        rows: [
          ...billRows.map((b) => ({
            title: b.name,
            meta: [
              b.account_name ?? 'No account set',
              b.due_day ? `${ordinal(b.due_day)} of month` : 'no fixed day',
            ].join(' · '),
            control: 'toggle' as const,
            on: b.is_auto_debit,
            busy: autopayMutation.isPending && autopayMutation.variables?.id === b.id,
          })),
          {
            title: 'Remind me before bills are due',
            meta: 'Push notification, 3 days ahead',
            control: 'toggle' as const,
            on: reminderOn,
            busy: reminderMutation.isPending,
          },
        ],
        onToggle: (i: number, next: boolean) => {
          if (i < billRows.length) autopayMutation.mutate({ id: billRows[i].id, on: next })
          else reminderMutation.mutate(next)
        },
      })
    }

    return specs
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items, billRows, month, data, reminderOn, autopayMutation.isPending, reminderMutation.isPending])

  if (isLoading) return <SkeletonPage kpis={0} modules={[7, 5, 12]} />

  return (
    <Root>
      <ModuleGrid modules={modules} />
    </Root>
  )
}
