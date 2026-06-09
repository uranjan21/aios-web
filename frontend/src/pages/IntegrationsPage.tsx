import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { CheckCircle, XCircle, AlertCircle, ExternalLink, Trash2 } from 'lucide-react'
import { integrationsApi } from '@/api/integrations'
import { cn } from '@/lib/utils'
import type { Integration } from '@/types'

const PROVIDER_INFO = {
  notion: { label: 'Notion', desc: 'Read pages and databases from your Notion workspace' },
  gcal: { label: 'Google Calendar', desc: 'Sync upcoming events for dashboard and agent context' },
  github: { label: 'GitHub', desc: 'Track commits and activity on your repos' },
}

function StatusIcon({ status }: { status: Integration['status'] }) {
  if (status === 'connected') return <CheckCircle className="w-5 h-5 text-emerald-500" />
  if (status === 'expired') return <AlertCircle className="w-5 h-5 text-amber-500" />
  if (status === 'error') return <XCircle className="w-5 h-5 text-destructive" />
  return <XCircle className="w-5 h-5 text-muted-foreground" />
}

function IntegrationCard({ integration }: { integration: Integration }) {
  const queryClient = useQueryClient()
  const info = PROVIDER_INFO[integration.provider]

  const connectMutation = useMutation({
    mutationFn: () => integrationsApi.authUrl(integration.provider),
    onSuccess: ({ url }) => { window.location.href = url },
  })

  const disconnectMutation = useMutation({
    mutationFn: () => integrationsApi.disconnect(integration.provider),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['integrations'] }),
  })

  return (
    <div className="bg-card border border-border rounded-xl p-5">
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          <StatusIcon status={integration.status} />
          <div>
            <h3 className="font-semibold text-foreground">{info.label}</h3>
            <p className="text-xs text-muted-foreground mt-0.5">{info.desc}</p>
          </div>
        </div>
        <span className={cn(
          'text-xs font-medium px-2 py-0.5 rounded-full capitalize',
          integration.status === 'connected'
            ? 'bg-emerald-500/10 text-emerald-500'
            : integration.status === 'expired'
            ? 'bg-amber-500/10 text-amber-500'
            : 'bg-muted text-muted-foreground'
        )}>
          {integration.status}
        </span>
      </div>

      <div className="flex gap-2 mt-4">
        {integration.status !== 'connected' ? (
          <button
            onClick={() => connectMutation.mutate()}
            disabled={connectMutation.isPending}
            className="flex items-center gap-1.5 text-sm px-3 py-2 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition"
          >
            <ExternalLink className="w-3.5 h-3.5" /> Connect
          </button>
        ) : (
          <button
            onClick={() => disconnectMutation.mutate()}
            disabled={disconnectMutation.isPending}
            className="flex items-center gap-1.5 text-sm px-3 py-2 rounded-lg bg-muted hover:bg-destructive/10 text-muted-foreground hover:text-destructive disabled:opacity-50 transition"
          >
            <Trash2 className="w-3.5 h-3.5" /> Disconnect
          </button>
        )}
      </div>
    </div>
  )
}

export function IntegrationsPage() {
  const { data: integrations, isLoading } = useQuery({
    queryKey: ['integrations'],
    queryFn: integrationsApi.list,
  })

  return (
    <div className="p-4 sm:p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Integrations</h1>
        <p className="text-muted-foreground text-sm mt-0.5">Connect external services to enrich your AI OS context</p>
      </div>

      {isLoading ? (
        <div className="text-muted-foreground text-sm">Loading…</div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {integrations?.map(i => <IntegrationCard key={i.provider} integration={i} />)}
        </div>
      )}
    </div>
  )
}
