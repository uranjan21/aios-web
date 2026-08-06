/**
 * Today → Plan — the weekly time-blocking planner.
 *
 * Third page built the Phase 4 way. The canvas's `today:plan` composition is
 * week(12) · progress(6) · rows(6); this rebuilds all three from live
 * `plan_blocks` data.
 *
 * NOTE ON THE ROUTE: /app/plan used to be the goals/projects/sprints/tasks
 * page. That moved to /app/workspace/* on 2026-08-01 and this took its place,
 * which is what the redesign specifies. The old `?view=` URLs redirect.
 */
import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { CalendarCheck, BarChart3, Flag } from 'lucide-react'
import { Button, Dialog, ErrorState, Input, Select, SkeletonPage } from '@ledgr/ui'
import { PageContainer, PageContent } from '@ct/shared/components/layout/PageLayout'
import { ModuleGrid, type ModuleSpec } from '@ct/shared/components/modules'
import { workspaceApi, type PlanBlock } from '@ct/shared/api/workspace'
import { toCalendarDate } from '@ct/shared/lib/calendarDate'
import { DOMAIN_OPTIONS } from '@ct/shared/config/domains'

const DAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
const FULL_DAY_LABELS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']

/** Monday of the week containing `d`. The planner is always Mon–Sun. */
function mondayOf(d: Date): Date {
  const out = new Date(d)
  out.setHours(0, 0, 0, 0)
  out.setDate(out.getDate() - ((out.getDay() + 6) % 7))
  return out
}

/*
 * NOT toISOString().slice(0,10) — that converts local midnight to UTC and
 * shifts every date back a day east of UTC. See lib/calendarDate.
 */
const iso = toCalendarDate

/** "09:00:00" → "09:00". The seconds are storage detail, not display. */
const hhmm = (t: string) => t.slice(0, 5)

/** Duration in hours between two wall-clock strings. */
function hoursBetween(start: string, end: string): number {
  const [sh, sm] = start.split(':').map(Number)
  const [eh, em] = end.split(':').map(Number)
  return Math.max(0, (eh * 60 + em - (sh * 60 + sm)) / 60)
}

const DOMAIN_KEYS = ['finance', 'health', 'career'] as const
/** Blocks with no domain still need a stable colour. */
const colorFor = (domain?: string | null) =>
  domain && (DOMAIN_KEYS as readonly string[]).includes(domain) ? domain : 'accent'

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <span style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', opacity: 0.7 }}>
        {label}
      </span>
      {children}
    </label>
  )
}

export function WeekPlanPage() {
  const qc = useQueryClient()
  const [weekOffset, setWeekOffset] = useState(0)
  const [addOpen, setAddOpen] = useState(false)
  const [draft, setDraft] = useState({
    block_date: '', start_time: '09:00', end_time: '10:00', title: '', domain: '', is_priority: false,
  })

  const weekStart = useMemo(() => {
    const d = mondayOf(new Date())
    d.setDate(d.getDate() + weekOffset * 7)
    return d
  }, [weekOffset])

  const weekDays = useMemo(
    () => Array.from({ length: 7 }, (_, i) => {
      const d = new Date(weekStart)
      d.setDate(d.getDate() + i)
      return d
    }),
    [weekStart],
  )

  const weekEnd = weekDays[6]
  const todayIso = iso(new Date())

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['workspace', 'plan-blocks', iso(weekStart)],
    queryFn: () => workspaceApi.getPlanBlocks({ start: iso(weekStart), end: iso(weekEnd) }),
    staleTime: 30_000,
  })

  /* Real commitments for the same week. The planner and the calendar have
     never talked, so it was possible to block deep work straight over a
     standing meeting. Read-only — the Google grant is `calendar.readonly`. */
  const { data: cal } = useQuery({
    queryKey: ['workspace', 'plan-week-calendar', iso(weekStart)],
    queryFn: () => workspaceApi.getPlanWeekCalendar({ start: iso(weekStart), end: iso(weekEnd) }),
    staleTime: 5 * 60_000,
  })

  const create = useMutation({
    mutationFn: () =>
      workspaceApi.createPlanBlock({
        block_date: draft.block_date || iso(weekDays[0]),
        // The API takes seconds; the picker gives HH:MM.
        start_time: `${draft.start_time}:00`,
        end_time: `${draft.end_time}:00`,
        title: draft.title.trim(),
        domain: draft.domain || null,
        is_priority: draft.is_priority,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['workspace', 'plan-blocks'] })
      setAddOpen(false)
      setDraft({ ...draft, title: '', is_priority: false })
      toast.success('Block added')
    },
    onError: () => toast.error('Could not add that block'),
  })

  const modules = useMemo<ModuleSpec[]>(() => {
    const blocks = data ?? []

    const byDay = new Map<string, PlanBlock[]>()
    for (const b of blocks) {
      if (!byDay.has(b.block_date)) byDay.set(b.block_date, [])
      byDay.get(b.block_date)!.push(b)
    }

    // Hours per domain, and each domain's share of the week's planned time.
    const hoursByDomain = new Map<string, number>()
    let totalHours = 0
    for (const b of blocks) {
      const h = hoursBetween(b.start_time, b.end_time)
      totalHours += h
      const key = b.domain || 'Unassigned'
      hoursByDomain.set(key, (hoursByDomain.get(key) ?? 0) + h)
    }

    const domainsUsed = hoursByDomain.size
    const weekLabel = weekStart.toLocaleDateString(undefined, { day: 'numeric', month: 'long' })

    const mods: ModuleSpec[] = [
      {
        kind: 'week',
        span: 12,
        title: `Week of ${weekLabel}`,
        /* Meetings are counted separately from blocks on purpose: they are not
           yours to plan. But the subtitle has to acknowledge them, or a grid
           showing two meetings sits under the words "nothing blocked out". */
        subtitle: [
          blocks.length
            ? `${blocks.length} focus block${blocks.length === 1 ? '' : 's'} planned across ${domainsUsed} domain${domainsUsed === 1 ? '' : 's'}`
            : 'Nothing blocked out yet — add your first focus block',
          (cal?.events.length ?? 0) > 0
            ? `${cal!.events.length} meeting${cal!.events.length === 1 ? '' : 's'} already on your calendar`
            : null,
        ].filter(Boolean).join(' · '),
        icon: CalendarCheck,
        // The canvas puts the week navigator and Add in this card's header,
        // not in a page title bar — the card IS the week.
        actionNode: (
          <>
            <Button variant="outline" size="sm" onClick={() => setWeekOffset((w) => w - 1)}>← Prev</Button>
            <Button variant="outline" size="sm" onClick={() => setWeekOffset(0)}>This week</Button>
            <Button variant="outline" size="sm" onClick={() => setWeekOffset((w) => w + 1)}>Next →</Button>
          </>
        ),
        action: 'Add block',
        actionVariant: 'primary',
        onAction: () => { setDraft((d) => ({ ...d, block_date: iso(weekDays[0]) })); setAddOpen(true) },
        days: weekDays.map((d, i) => {
          const key = iso(d)
          /* Meetings render in the same column as blocks, muted, so the day
             reads as "what is already spoken for" before you add to it. They
             sort together by start time — a meeting at 09:00 above a block at
             10:00 is the only ordering that tells the truth about the day. */
          const meetings = (cal?.events ?? [])
            .filter((e) => e.start_time.slice(0, 10) === key)
            .map((e) => ({
              time: hhmm(e.start_time.slice(11)),
              title: e.title,
              colorKey: 'mutedFg' as const,
            }))
          const own = (byDay.get(key) ?? []).map((b) => ({
            time: hhmm(b.start_time),
            title: b.title,
            colorKey: colorFor(b.domain),
          }))
          return {
            label: DAY_LABELS[i],
            date: String(d.getDate()),
            today: key === todayIso,
            blocks: [...own, ...meetings].sort((a, b) => a.time.localeCompare(b.time)),
          }
        }),
      },
    ]

    if (blocks.length) {
      mods.push({
        kind: 'progress',
        span: 6,
        // Deliberately NOT "vs capacity" like the canvas: there is no capacity
        // model, and inventing one would put a fake denominator on screen.
        // Share of planned time answers the same question honestly.
        title: 'Planned hours by domain',
        subtitle: `Where the week is actually going · ${totalHours.toFixed(1)}h planned`,
        iconKey: 'accent',
        icon: BarChart3,
        rows: [...hoursByDomain.entries()]
          .sort((a, b) => b[1] - a[1])
          .map(([domain, h]) => ({
            title: domain.charAt(0).toUpperCase() + domain.slice(1),
            meta: `${((h / totalHours) * 100).toFixed(0)}% of planned time`,
            value: `${h.toFixed(1)}h`,
            pct: (h / totalHours) * 100,
            colorKey: colorFor(domain === 'Unassigned' ? null : domain),
          })),
      })

      /*
       * The canvas leads each row with the commitment and files the day
       * underneath it — the point of the card is WHAT, not which weekday. Days
       * with nothing set are left out rather than listed as empty; the subtitle
       * carries the count so an unplanned day is still visible as a gap.
       */
      const priorities = weekDays
        .map((d, i) => ({ day: FULL_DAY_LABELS[i], block: (byDay.get(iso(d)) ?? []).find((b) => b.is_priority) }))
        .filter((p): p is { day: string; block: PlanBlock } => !!p.block)

      mods.push({
        kind: 'rows',
        span: 6,
        title: 'One priority per day',
        subtitle: priorities.length
          ? `If nothing else happens, this does · ${priorities.length} of 7 days set`
          : 'If nothing else happens, this does',
        icon: Flag,
        rows: priorities.length
          ? priorities.map(({ day, block }) => ({
              title: block.title,
              meta: day,
              tagLabel: block.domain
                ? block.domain.charAt(0).toUpperCase() + block.domain.slice(1)
                : hhmm(block.start_time),
              tagColorKey: colorFor(block.domain),
            }))
          : [{ title: 'No priority set this week', meta: 'Mark a focus block as the day’s one priority' }],
      })
    }

    return mods
  }, [data, weekDays, weekStart, todayIso, cal])

  return (
    <PageContainer>
      <PageContent>
        {isLoading ? (
          <SkeletonPage kpis={0} modules={[12, 7, 5]} />
        ) : isError ? (
          <ErrorState title="Could not load your week" onRetry={() => refetch()} />
        ) : (
          <ModuleGrid modules={modules} />
        )}

        <Dialog
          open={addOpen}
          onOpenChange={(o) => !o && setAddOpen(false)}
          icon={<CalendarCheck size={18} />}
          eyebrow="Plan"
          title="Add a focus block"
          description="A time you are committing to one thing."
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <Field label="What">
              <Input
                value={draft.title}
                onChange={(e) => setDraft({ ...draft, title: e.target.value })}
                placeholder="Deep work — sync guard"
              />
            </Field>
            <Field label="Day">
              <Select
                value={draft.block_date}
                onChange={(v) => setDraft({ ...draft, block_date: String(v) })}
                options={weekDays.map((d, i) => ({
                  value: iso(d),
                  label: `${DAY_LABELS[i]} ${d.getDate()}`,
                }))}
              />
            </Field>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <Field label="From">
                <Input type="time" value={draft.start_time} onChange={(e) => setDraft({ ...draft, start_time: e.target.value })} />
              </Field>
              <Field label="To">
                <Input type="time" value={draft.end_time} onChange={(e) => setDraft({ ...draft, end_time: e.target.value })} />
              </Field>
            </div>
            <Field label="Life area">
              <Select
                value={draft.domain}
                onChange={(v) => setDraft({ ...draft, domain: String(v) })}
                options={[{ value: '', label: 'None' }, ...DOMAIN_OPTIONS]}
                placeholder="None"
              />
            </Field>
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={draft.is_priority}
                onChange={(e) => setDraft({ ...draft, is_priority: e.target.checked })}
              />
              <span style={{ fontSize: 13 }}>Make this the day&rsquo;s one priority</span>
            </label>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
              <Button variant="outline" size="sm" onClick={() => setAddOpen(false)}>Cancel</Button>
              <Button size="sm" disabled={!draft.title.trim() || create.isPending} onClick={() => create.mutate()}>
                {create.isPending ? 'Adding…' : 'Add block'}
              </Button>
            </div>
          </div>
        </Dialog>
      </PageContent>
    </PageContainer>
  )
}
