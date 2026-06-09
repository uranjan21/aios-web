import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { toast } from 'sonner'
import { Play, Pause, RefreshCw, CheckCircle, XCircle, Zap, ChevronDown, ChevronRight } from 'lucide-react'
import { agentsApi } from '@/api/agents'
import { formatRelativeTime } from '@/lib/utils'
import { Skeleton } from '@/components/ui/skeleton'
import { ErrorCard } from '@/components/ErrorCard'
import { EmptyState } from '@/components/EmptyState'
import { cn } from '@/lib/utils'
import type { Agent } from '@/types'

function StatusBadge({ status }: { status: Agent['last_run_status'] }) {
  if (!status) return <span className="text-muted-foreground text-xs">Never run</span>
  const map = {
    success: { cls: 'text-emerald-500', Icon: CheckCircle, label: 'success' },
    error: { cls: 'text-destructive', Icon: XCircle, label: 'error' },
    running: { cls: 'text-blue-400 animate-pulse', Icon: RefreshCw, label: 'running' },
  }
  const { cls, Icon, label } = map[status]
  return (
    <span className={cn('flex items-center gap-1 text-xs font-medium', cls)}>
      <Icon className="w-3 h-3" aria-hidden="true" />
      {label}
    </span>
  )
}

function AgentRowSkeleton() {
  return (
    <tr className="border-b border-border">
      <td className="px-4 py-3"><div className="space-y-1.5"><Skeleton className="h-4 w-32" /><Skeleton className="h-3 w-48" /></div></td>
      <td className="px-4 py-3"><Skeleton className="h-3 w-24" /></td>
      <td className="px-4 py-3"><Skeleton className="h-5 w-16 rounded-full" /></td>
      <td className="px-4 py-3"><Skeleton className="h-3 w-20" /></td>
      <td className="px-4 py-3"><Skeleton className="h-4 w-16" /></td>
      <td className="px-4 py-3"><div className="flex gap-2"><Skeleton className="h-7 w-16" /><Skeleton className="h-7 w-16" /></div></td>
    </tr>
  )
}

function AgentRow({ agent }: { agent: Agent }) {
  const queryClient = useQueryClient()
  const [triggering, setTriggering] = useState(false)
  const [outputOpen, setOutputOpen] = useState(false)

  const toggleMutation = useMutation({
    mutationFn: (is_active: boolean) => agentsApi.patch(agent.task_id, { is_active }),
    onSuccess: (_, is_active) => {
      queryClient.invalidateQueries({ queryKey: ['agents'] })
      toast.success(`${agent.name} ${is_active ? 'enabled' : 'paused'}`)
    },
    onError: () => toast.error('Failed to update agent'),
  })

  const triggerMutation = useMutation({
    mutationFn: () => agentsApi.trigger(agent.task_id),
    onSuccess: () => {
      setTriggering(true)
      toast.success(`${agent.name} triggered`)
      setTimeout(() => {
        setTriggering(false)
        queryClient.invalidateQueries({ queryKey: ['agents'] })
      }, 3000)
    },
    onError: () => toast.error(`Failed to trigger ${agent.name}`),
  })

  const hasOutput = !!agent.last_output_text

  return (
    <>
      <tr className="border-b border-border hover:bg-muted/30 transition-colors">
        <td className="px-4 py-3">
          <div className="font-medium text-sm text-foreground">{agent.name}</div>
          {agent.description && <div className="text-xs text-muted-foreground mt-0.5">{agent.description}</div>}
        </td>
        <td className="px-4 py-3">
          <span className="text-xs font-mono text-muted-foreground">{agent.cron_expression}</span>
        </td>
        <td className="px-4 py-3">
          <span className={cn(
            'inline-flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-full',
            agent.is_active ? 'bg-emerald-500/10 text-emerald-500' : 'bg-muted text-muted-foreground',
          )}>
            <span className={cn('w-1.5 h-1.5 rounded-full', agent.is_active ? 'bg-emerald-500' : 'bg-muted-foreground')} aria-hidden="true" />
            {agent.is_active ? 'Active' : 'Paused'}
          </span>
        </td>
        <td className="px-4 py-3 text-sm text-muted-foreground">{formatRelativeTime(agent.last_run_at)}</td>
        <td className="px-4 py-3">
          <div className="flex items-center gap-1.5">
            <StatusBadge status={agent.last_run_status} />
            {hasOutput && (
              <button
                onClick={() => setOutputOpen(o => !o)}
                aria-label={outputOpen ? 'Hide output' : 'View output'}
                className="text-muted-foreground hover:text-foreground transition p-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded"
              >
                {outputOpen
                  ? <ChevronDown className="w-3.5 h-3.5" aria-hidden="true" />
                  : <ChevronRight className="w-3.5 h-3.5" aria-hidden="true" />}
              </button>
            )}
          </div>
        </td>
        <td className="px-4 py-3">
          <div className="flex items-center gap-2">
            <button
              onClick={() => triggerMutation.mutate()}
              disabled={triggering || triggerMutation.isPending}
              aria-label={`Run ${agent.name} now`}
              className="flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-md bg-primary/10 text-primary hover:bg-primary/20 disabled:opacity-50 transition font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            >
              {triggering ? <RefreshCw className="w-3 h-3 animate-spin" aria-hidden="true" /> : <Play className="w-3 h-3" aria-hidden="true" />}
              Run
            </button>
            <button
              onClick={() => toggleMutation.mutate(!agent.is_active)}
              disabled={toggleMutation.isPending}
              aria-label={agent.is_active ? `Pause ${agent.name}` : `Enable ${agent.name}`}
              className="flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-md bg-muted hover:bg-accent text-muted-foreground hover:text-foreground disabled:opacity-50 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            >
              {agent.is_active ? <Pause className="w-3 h-3" aria-hidden="true" /> : <Play className="w-3 h-3" aria-hidden="true" />}
              {agent.is_active ? 'Pause' : 'Enable'}
            </button>
          </div>
        </td>
      </tr>
      {outputOpen && hasOutput && (
        <tr className="border-b border-border bg-muted/20">
          <td colSpan={6} className="px-4 py-3">
            <pre className="text-xs text-muted-foreground whitespace-pre-wrap font-mono leading-relaxed">
              {agent.last_output_text}
            </pre>
          </td>
        </tr>
      )}
    </>
  )
}

export function AgentsPage() {
  const { data: agents, isLoading, isError, refetch } = useQuery({
    queryKey: ['agents'],
    queryFn: agentsApi.list,
  })

  return (
    <div className="p-4 sm:p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Agents</h1>
        <p className="text-muted-foreground text-sm mt-0.5">Scheduled automations that run your AI OS in the background</p>
      </div>

      <div className="bg-card border border-border rounded-xl overflow-hidden">
        {isError ? (
          <ErrorCard message="Could not load agents" onRetry={() => refetch()} />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full" aria-label="Agents list">
              <thead>
                <tr className="border-b border-border text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                  <th scope="col" className="px-4 py-3 text-left">Name</th>
                  <th scope="col" className="px-4 py-3 text-left">Schedule</th>
                  <th scope="col" className="px-4 py-3 text-left">Status</th>
                  <th scope="col" className="px-4 py-3 text-left">Last Run</th>
                  <th scope="col" className="px-4 py-3 text-left">Result</th>
                  <th scope="col" className="px-4 py-3 text-left">Actions</th>
                </tr>
              </thead>
              <tbody>
                {isLoading
                  ? Array.from({ length: 5 }).map((_, i) => <AgentRowSkeleton key={i} />)
                  : agents?.length === 0
                  ? (
                    <tr>
                      <td colSpan={6}>
                        <EmptyState icon={Zap} title="No agents yet" description="Agents will appear here once seeded." />
                      </td>
                    </tr>
                  )
                  : agents?.map(agent => <AgentRow key={agent.id} agent={agent} />)
                }
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
