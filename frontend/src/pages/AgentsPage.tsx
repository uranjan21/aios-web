import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Play, Pause, RefreshCw, CheckCircle, XCircle, Clock } from 'lucide-react'
import { agentsApi } from '@/api/agents'
import { formatRelativeTime } from '@/lib/utils'
import { cn } from '@/lib/utils'
import type { Agent } from '@/types'

function StatusBadge({ status }: { status: Agent['last_run_status'] }) {
  if (!status) return <span className="text-muted-foreground text-xs">Never run</span>
  const styles = {
    success: 'text-emerald-500',
    error: 'text-destructive',
    running: 'text-blue-400 animate-pulse',
  }
  const icons = {
    success: CheckCircle,
    error: XCircle,
    running: RefreshCw,
  }
  const Icon = icons[status]
  return (
    <span className={cn('flex items-center gap-1 text-xs font-medium', styles[status])}>
      <Icon className="w-3 h-3" />
      {status}
    </span>
  )
}

function AgentRow({ agent }: { agent: Agent }) {
  const queryClient = useQueryClient()
  const [triggering, setTriggering] = useState(false)

  const toggleMutation = useMutation({
    mutationFn: (is_active: boolean) => agentsApi.patch(agent.task_id, { is_active }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['agents'] }),
  })

  const triggerMutation = useMutation({
    mutationFn: () => agentsApi.trigger(agent.task_id),
    onSuccess: () => {
      setTriggering(true)
      setTimeout(() => {
        setTriggering(false)
        queryClient.invalidateQueries({ queryKey: ['agents'] })
      }, 3000)
    },
  })

  return (
    <tr className="border-b border-border hover:bg-muted/30 transition-colors">
      <td className="px-4 py-3">
        <div className="font-medium text-sm text-foreground">{agent.name}</div>
        {agent.description && (
          <div className="text-xs text-muted-foreground mt-0.5">{agent.description}</div>
        )}
      </td>
      <td className="px-4 py-3">
        <span className="text-xs font-mono text-muted-foreground">{agent.cron_expression}</span>
      </td>
      <td className="px-4 py-3">
        <span className={cn(
          'inline-flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-full',
          agent.is_active
            ? 'bg-emerald-500/10 text-emerald-500'
            : 'bg-muted text-muted-foreground'
        )}>
          <span className={cn('w-1.5 h-1.5 rounded-full', agent.is_active ? 'bg-emerald-500' : 'bg-muted-foreground')} />
          {agent.is_active ? 'Active' : 'Paused'}
        </span>
      </td>
      <td className="px-4 py-3 text-sm text-muted-foreground">
        {formatRelativeTime(agent.last_run_at)}
      </td>
      <td className="px-4 py-3">
        <StatusBadge status={agent.last_run_status} />
      </td>
      <td className="px-4 py-3">
        <div className="flex items-center gap-2">
          <button
            onClick={() => triggerMutation.mutate()}
            disabled={triggering || triggerMutation.isPending}
            className="flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-md bg-primary/10 text-primary hover:bg-primary/20 disabled:opacity-50 transition font-medium"
          >
            {triggering ? <RefreshCw className="w-3 h-3 animate-spin" /> : <Play className="w-3 h-3" />}
            Run
          </button>
          <button
            onClick={() => toggleMutation.mutate(!agent.is_active)}
            disabled={toggleMutation.isPending}
            className="flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-md bg-muted hover:bg-accent text-muted-foreground hover:text-foreground disabled:opacity-50 transition"
          >
            {agent.is_active ? <Pause className="w-3 h-3" /> : <Play className="w-3 h-3" />}
            {agent.is_active ? 'Pause' : 'Enable'}
          </button>
        </div>
      </td>
    </tr>
  )
}

export function AgentsPage() {
  const { data: agents, isLoading } = useQuery({
    queryKey: ['agents'],
    queryFn: agentsApi.list,
  })

  return (
    <div className="p-4 sm:p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Agents</h1>
        <p className="text-muted-foreground text-sm mt-0.5">Scheduled automations that run your AI OS in the background</p>
      </div>

      <div className="bg-card border border-border rounded-xl overflow-hidden">
        {isLoading ? (
          <div className="p-8 text-center text-muted-foreground">Loading agents…</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                  <th className="px-4 py-3 text-left">Name</th>
                  <th className="px-4 py-3 text-left">Schedule</th>
                  <th className="px-4 py-3 text-left">Status</th>
                  <th className="px-4 py-3 text-left">Last Run</th>
                  <th className="px-4 py-3 text-left">Result</th>
                  <th className="px-4 py-3 text-left">Actions</th>
                </tr>
              </thead>
              <tbody>
                {agents?.map(agent => <AgentRow key={agent.id} agent={agent} />)}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
