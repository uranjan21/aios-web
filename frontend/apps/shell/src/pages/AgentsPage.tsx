/**
 * Intelligence → Agents.
 *
 * Phase 4 conversion to the canvas's `agents:overview` composition —
 * tiles(12) · agents(12) · table(12) — rebuilt from the live agents API. The
 * old ModuleSidebar + `?tab=` filter rail is gone: the redesign's IA has no
 * per-page rails, and the roster is small enough to read whole.
 *
 * Toggling an agent card writes through `PATCH /agents/{task_id}`, and clicking
 * one opens a dialog to run it now or change its schedule.
 *
 * TWO DEPARTURES, both because an agent row keeps only its LAST run:
 *  - The canvas draws a 14-run sparkline per agent. There is no run-history
 *    table, so the strip shows the one run we know about and renders the rest
 *    as "did not run" rather than inventing a history.
 *  - The canvas's third module is a cross-agent run log. For the same reason it
 *    lists each agent's most recent run instead of the last six runs overall.
 *
 * BACKEND FOLLOW-UP: an `agent_runs` table (started_at, duration, trigger,
 * status) would fill both modules exactly as drawn.
 */
import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import dayjs from 'dayjs'
import relativeTime from 'dayjs/plugin/relativeTime'
import styled from 'styled-components'
import { Bot, Cpu, FileText, Shield, Zap } from 'lucide-react'
import { Button, Dialog, EmptyState, ErrorState, Input, PageHeader } from '@ledgr/ui'
import { agentsApi } from '@ct/shared/api/agents'
import { ModuleGrid, type ModuleSpec } from '@ct/shared/components/modules'
import { PageDivider } from '@ct/shared/components/layout/PageDivider'
import { PageContainer, PageContent } from '@ct/shared/components/layout/PageLayout'
import { Skeleton } from '@ct/shared/components/ui/skeleton'
import type { Agent } from '@ct/shared/types'

dayjs.extend(relativeTime)

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

const CronHint = styled.div`
  margin-top: ${({ theme }) => theme.spacing[1.5]};
  font-size: ${({ theme }) => theme.typography.fontSize.xs};
  color: ${({ theme }) => theme.color.mutedForeground};
`

const OutputBlock = styled.div`
  white-space: pre-wrap;
  font-size: ${({ theme }) => theme.typography.fontSize.xs};
  color: ${({ theme }) => theme.color.mutedForeground};
  max-height: 180px;
  overflow-y: auto;
`

const Actions = styled.div`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing[2]};
  padding-top: ${({ theme }) => theme.spacing[2]};
`

const Spacer = styled.div`
  flex: 1;
`

/** Icon per agent family, matched on the task id the backend seeds. */
function iconFor(taskId: string) {
  if (taskId.includes('finance') || taskId.includes('upi') || taskId.includes('statement')) return Shield
  if (taskId.includes('brief') || taskId.includes('pulse')) return Zap
  return FileText
}

/**
 * Cron to something a person reads. Covers the shapes the seeded roster uses;
 * anything else falls back to the raw expression rather than guessing wrong.
 */
function describeCron(expr: string): string {
  const parts = (expr ?? '').trim().split(/\s+/)
  if (parts.length !== 5) return expr || 'No schedule'
  const [min, hour, dom, , dow] = parts
  const at = (h: string, m: string) => {
    const hh = Number(h)
    if (Number.isNaN(hh)) return expr
    const mm = String(Number(m)).padStart(2, '0')
    const suffix = hh < 12 ? 'AM' : 'PM'
    const h12 = hh % 12 === 0 ? 12 : hh % 12
    return `${h12}:${mm} ${suffix}`
  }
  if (hour.startsWith('*/')) return `Every ${hour.slice(2)} hours`
  if (dow !== '*') {
    const names = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
    return `${names[Number(dow)] ?? `Day ${dow}`}s at ${at(hour, min)}`
  }
  if (dom !== '*') return `Day ${dom} of the month at ${at(hour, min)}`
  return `Every day at ${at(hour, min)}`
}

export function AgentsPage() {
  const qc = useQueryClient()
  const [detail, setDetail] = useState<Agent | null>(null)
  const [cron, setCron] = useState('')

  const { data: agents, isLoading, isError, refetch } = useQuery({
    queryKey: ['agents'],
    queryFn: agentsApi.list,
  })

  const seed = useMutation({
    mutationFn: () => agentsApi.seed(),
    onSuccess: async () => { await refetch(); toast.success('Default agents seeded') },
    onError: () => toast.error('Failed to seed agents'),
  })

  const patch = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Parameters<typeof agentsApi.patch>[1] }) =>
      agentsApi.patch(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['agents'] })
      toast.success('Agent updated')
    },
    onError: () => toast.error('Could not update that agent'),
  })

  const trigger = useMutation({
    mutationFn: (id: string) => agentsApi.trigger(id),
    onSuccess: () => {
      toast.success('Agent triggered — its result appears here shortly')
      setTimeout(() => qc.invalidateQueries({ queryKey: ['agents'] }), 4000)
    },
    onError: () => toast.error('Could not trigger that agent'),
  })

  const rows = useMemo(() => agents ?? [], [agents])

  const openDetail = (a: Agent) => {
    setDetail(a)
    setCron(a.cron_expression)
  }

  const modules = useMemo<ModuleSpec[]>(() => {
    if (!rows.length) return []

    const active = rows.filter(a => a.is_active)
    const errored = rows.filter(a => a.last_run_status === 'error')
    const ranToday = rows.filter(a => a.last_run_at && dayjs(a.last_run_at).isSame(dayjs(), 'day'))
    const totalRuns = rows.reduce((s, a) => s + a.run_count, 0)
    // Success rate across the runs we can see — one data point per agent.
    const withStatus = rows.filter(a => a.last_run_status === 'success' || a.last_run_status === 'error')
    const successPct = withStatus.length
      ? Math.round((withStatus.filter(a => a.last_run_status === 'success').length / withStatus.length) * 100)
      : null

    const byRecency = [...rows].sort((a, b) => (b.last_run_at ?? '').localeCompare(a.last_run_at ?? ''))

    return [
      {
        kind: 'tiles',
        span: 12,
        tiles: [
          {
            label: 'Active agents',
            value: String(active.length),
            sub: errored.length ? `${errored.length} needing attention` : `${rows.length - active.length} paused`,
            dotKey: errored.length ? 'destructive' : 'success',
          },
          {
            label: 'Ran today',
            value: String(ranToday.length),
            sub: `${totalRuns} run${totalRuns === 1 ? '' : 's'} all time`,
          },
          {
            label: 'Last run healthy',
            value: successPct === null ? '—' : `${successPct}%`,
            sub: successPct === null
              ? 'Nothing has run yet'
              : `Across ${withStatus.length} agent${withStatus.length === 1 ? '' : 's'}`,
            subKey: successPct !== null && successPct >= 90 ? 'success' : 'warning',
            ...(successPct !== null && { bar: successPct, barKey: successPct >= 90 ? 'success' : 'warning' }),
          },
          {
            label: 'On a schedule',
            value: String(active.filter(a => !!a.cron_expression).length),
            sub: 'Running without you',
          },
        ],
      },
      {
        kind: 'agents',
        span: 12,
        cols: 3,
        onToggle: (i: number) => patch.mutate({ id: rows[i].task_id, data: { is_active: !rows[i].is_active } }),
        onCardClick: (i: number) => openDetail(rows[i]),
        agents: rows.map((a) => {
          const ok = a.last_run_status === 'success'
          const bad = a.last_run_status === 'error'
          return {
            name: a.name,
            schedule: describeCron(a.cron_expression),
            icon: iconFor(a.task_id),
            iconKey: bad ? 'destructive' : a.is_active ? 'accent' : 'mutedFg',
            on: a.is_active,
            // Only the last run is known; the rest read as "did not run".
            runs: [...Array(13).fill(0), ok ? 1 : bad ? 0.25 : 0],
            lastRun: a.last_run_at ? `Ran ${dayjs(a.last_run_at).fromNow()}` : 'Never run',
            successPct: !a.is_active ? 'Paused' : bad ? 'Failed' : ok ? 'Healthy' : 'Idle',
            statusKey: !a.is_active ? 'mutedFg' : bad ? 'destructive' : ok ? 'success' : 'warning',
            log: a.last_output_text
              ? a.last_output_text.replace(/\s+/g, ' ').slice(0, 160)
              : a.description ?? 'No output recorded yet.',
          }
        }),
      },
      {
        kind: 'table',
        span: 12,
        title: 'Latest run per agent',
        subtitle: 'Click a row to open the agent',
        icon: Cpu,
        gridCols: '1.2fr 1.4fr 1.4fr 0.7fr 0.9fr',
        cols: [
          { l: 'When' },
          { l: 'Agent' },
          { l: 'Schedule' },
          { l: 'Runs', a: 'right' },
          { l: 'Status', a: 'right' },
        ],
        rows: byRecency.map((a) => [
          { t: a.last_run_at ? dayjs(a.last_run_at).format('HH:mm ddd') : '—', bold: true },
          a.name,
          describeCron(a.cron_expression),
          String(a.run_count),
          {
            t: a.last_run_status ?? 'never',
            tag: true,
            colorKey: a.last_run_status === 'success' ? 'success'
              : a.last_run_status === 'error' ? 'destructive'
              : a.last_run_status === 'running' ? 'info' : 'mutedFg',
          },
        ]),
        onRowClick: (i: number) => openDetail(byRecency[i]),
      },
    ]
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rows])

  return (
    <PageContainer>
      <PageContent>
        <PageHeader
          title="Agents"
          subtitle="A compact control room for autonomous workflows across your life OS."
          icon={<Bot />}
          eyebrow="Automation"
        />
        <PageDivider />

        {isError ? (
          <ErrorState title="Could not load agents" onRetry={() => refetch()} />
        ) : isLoading ? (
          <Skeleton style={{ height: 320 }} />
        ) : rows.length === 0 ? (
          <EmptyState
            icon={<Zap size={24} />}
            title="No agents yet"
            description="Seed the default roster and they start running on their own schedules."
            action={
              <Button variant="secondary" size="sm" onClick={() => seed.mutate()}>
                {seed.isPending ? 'Seeding…' : 'Seed agents'}
              </Button>
            }
          />
        ) : (
          <ModuleGrid modules={modules} />
        )}

        <Dialog
          open={!!detail}
          onOpenChange={(o) => !o && setDetail(null)}
          icon={<Bot size={18} />}
          eyebrow="Agent"
          title={detail?.name ?? 'Agent'}
          description={detail?.description ?? undefined}
          size="md"
        >
          <Form>
            <div>
              <Label>Schedule (cron)</Label>
              <Input value={cron} onChange={(e: any) => setCron(e.target.value)} placeholder="0 7 * * *" />
              <CronHint>{describeCron(cron)}</CronHint>
            </div>
            {detail?.last_output_text && (
              <div>
                <Label>Last output</Label>
                <OutputBlock>{detail.last_output_text}</OutputBlock>
              </div>
            )}
            <Actions>
              <Button
                variant="primary"
                loading={patch.isPending}
                disabled={!detail || cron === detail.cron_expression}
                onClick={() => detail && patch.mutate({ id: detail.task_id, data: { cron_expression: cron } })}
              >
                Save schedule
              </Button>
              <Button variant="ghost" onClick={() => setDetail(null)}>Close</Button>
              <Spacer />
              <Button
                variant="outline"
                size="sm"
                loading={trigger.isPending}
                onClick={() => detail && trigger.mutate(detail.task_id)}
              >
                Run now
              </Button>
            </Actions>
          </Form>
        </Dialog>
      </PageContent>
    </PageContainer>
  )
}
