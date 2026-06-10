import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Bell, AlertTriangle, Zap, ShieldAlert, X } from 'lucide-react'
import { agentsApi } from '@/api/agents'
import { chatApi } from '@/api/chat'
import { cn } from '@/lib/utils'
import type { VaultSyncStatus } from '@/types'

interface Alert {
  id: string
  type: 'conflict' | 'agent_error' | 'token_budget'
  message: string
  to: string
}

export function NotificationBell({
  conflicts,
}: {
  conflicts: VaultSyncStatus['conflicts']
}) {
  const [open, setOpen] = useState(false)

  const { data: agents } = useQuery({
    queryKey: ['agents'],
    queryFn: agentsApi.list,
    staleTime: 30_000,
  })

  const { data: budget } = useQuery({
    queryKey: ['tokenBudget'],
    queryFn: chatApi.tokenBudget,
    refetchInterval: 60_000,
    staleTime: 30_000,
  })

  const alerts: Alert[] = []

  conflicts.forEach(c => {
    alerts.push({
      id: `conflict-${c.id}`,
      type: 'conflict',
      message: `Vault conflict: ${c.path.split('/').pop()}`,
      to: '/settings',
    })
  })

  agents?.filter(a => a.last_run_status === 'error').forEach(a => {
    alerts.push({
      id: `agent-${a.id}`,
      type: 'agent_error',
      message: `${a.name} failed last run`,
      to: '/agents',
    })
  })

  if (budget && budget.percent >= 80) {
    alerts.push({
      id: 'token-budget',
      type: 'token_budget',
      message: `Claude API ${budget.percent}% daily budget used`,
      to: '/settings',
    })
  }

  const count = alerts.length

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(o => !o)}
        aria-label={count > 0 ? `${count} notification${count > 1 ? 's' : ''}` : 'Notifications — all clear'}
        aria-haspopup="true"
        aria-expanded={open}
        className="relative p-1.5 rounded-md hover:bg-accent text-muted-foreground hover:text-foreground transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
      >
        <Bell className="w-4 h-4" aria-hidden="true" />
        {count > 0 && (
          <span
            aria-hidden="true"
            className="absolute -top-0.5 -right-0.5 w-3.5 h-3.5 flex items-center justify-center text-[9px] font-bold bg-destructive text-destructive-foreground rounded-full leading-none"
          >
            {count > 9 ? '9+' : count}
          </span>
        )}
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} aria-hidden="true" />
          <div
            role="dialog"
            aria-label="Notifications"
            className="absolute right-0 top-full mt-1.5 w-72 z-50 bg-card border border-border rounded-xl shadow-lg overflow-hidden"
          >
            <div className="flex items-center justify-between px-4 py-3 border-b border-border">
              <span className="text-sm font-semibold">Alerts</span>
              <button
                onClick={() => setOpen(false)}
                aria-label="Close notifications"
                className="text-muted-foreground hover:text-foreground transition p-0.5 rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              >
                <X className="w-4 h-4" aria-hidden="true" />
              </button>
            </div>

            {alerts.length === 0 ? (
              <p className="px-4 py-6 text-center text-sm text-muted-foreground">
                All clear — no alerts
              </p>
            ) : (
              <ul role="list">
                {alerts.map(alert => (
                  <li key={alert.id} className="border-b border-border last:border-0">
                    <Link
                      to={alert.to}
                      onClick={() => setOpen(false)}
                      className="flex items-start gap-3 px-4 py-3 hover:bg-muted/50 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary"
                    >
                      <AlertIcon type={alert.type} />
                      <span className="text-xs text-foreground leading-snug">{alert.message}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </>
      )}
    </div>
  )
}

function AlertIcon({ type }: { type: Alert['type'] }) {
  const map = {
    conflict: { Icon: AlertTriangle, cls: 'text-amber-500' },
    agent_error: { Icon: Zap, cls: 'text-destructive' },
    token_budget: { Icon: ShieldAlert, cls: 'text-blue-400' },
  }
  const { Icon, cls } = map[type]
  return <Icon className={cn('w-4 h-4 shrink-0 mt-0.5', cls)} aria-hidden="true" />
}
