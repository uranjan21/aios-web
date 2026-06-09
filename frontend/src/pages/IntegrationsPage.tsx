import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { toast } from 'sonner'
import { CheckCircle, XCircle, AlertCircle, ExternalLink, Trash2 } from 'lucide-react'
import { integrationsApi } from '@/api/integrations'
import { cn } from '@/lib/utils'
import { Skeleton } from '@/components/ui/skeleton'
import { ErrorCard } from '@/components/ErrorCard'
import {
  AlertDialog,
  AlertDialogTrigger,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
  AlertDialogAction,
} from '@/components/ui/alert-dialog'
import type { Integration } from '@/types'

const PROVIDER_INFO: Record<string, { label: string; desc: string }> = {
  notion: { label: 'Notion', desc: 'Read pages and databases from your Notion workspace' },
  gcal: { label: 'Google Calendar', desc: 'Sync upcoming events for dashboard and agent context' },
  github: { label: 'GitHub', desc: 'Track commits and activity on your repos' },
}

function StatusIcon({ status }: { status: Integration['status'] }) {
  if (status === 'connected') return <CheckCircle className="w-5 h-5 text-emerald-500" aria-hidden="true" />
  if (status === 'expired') return <AlertCircle className="w-5 h-5 text-amber-500" aria-hidden="true" />
  if (status === 'error') return <XCircle className="w-5 h-5 text-destructive" aria-hidden="true" />
  return <XCircle className="w-5 h-5 text-muted-foreground" aria-hidden="true" />
}

function IntegrationCardSkeleton() {
  return (
    <div className="bg-card border border-border/60 shadow-sm rounded-xl p-4 space-y-3">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <Skeleton className="w-5 h-5 rounded-full" />
          <div className="space-y-1.5">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-3 w-48" />
          </div>
        </div>
        <Skeleton className="h-5 w-20 rounded-full" />
      </div>
      <Skeleton className="h-8 w-24 rounded-lg" />
    </div>
  )
}

function IntegrationCard({ integration }: { integration: Integration }) {
  const queryClient = useQueryClient()
  const info = PROVIDER_INFO[integration.provider] ?? { label: integration.provider, desc: '' }

  const connectMutation = useMutation({
    mutationFn: () => integrationsApi.authUrl(integration.provider),
    onSuccess: ({ url }) => { window.location.href = url },
    onError: () => toast.error(`Failed to initiate ${info.label} connection`),
  })

  const disconnectMutation = useMutation({
    mutationFn: () => integrationsApi.disconnect(integration.provider),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['integrations'] })
      toast.success(`${info.label} disconnected`)
    },
    onError: () => toast.error(`Failed to disconnect ${info.label}`),
  })

  const [dialogOpen, setDialogOpen] = useState(false)

  return (
    <div className="bg-card border border-border/60 shadow-sm rounded-xl p-4">
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          <StatusIcon status={integration.status} />
          <div>
            <h3 className="text-sm font-medium text-foreground">{info.label}</h3>
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
            className="flex items-center gap-1.5 text-sm px-3 py-2 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          >
            <ExternalLink className="w-3.5 h-3.5" aria-hidden="true" />
            {connectMutation.isPending ? 'Redirecting…' : 'Connect'}
          </button>
        ) : (
          <AlertDialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <AlertDialogTrigger asChild>
              <button
                aria-label={`Disconnect ${info.label}`}
                className="flex items-center gap-1.5 text-sm px-3 py-2 rounded-lg bg-muted hover:bg-destructive/10 text-muted-foreground hover:text-destructive disabled:opacity-50 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-destructive"
              >
                <Trash2 className="w-3.5 h-3.5" aria-hidden="true" /> Disconnect
              </button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle className="text-base font-semibold text-foreground">
                  Disconnect {info.label}?
                </AlertDialogTitle>
                <AlertDialogDescription className="text-sm text-muted-foreground">
                  The agent will no longer be able to read data from {info.label}. You can reconnect at any time.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel asChild>
                  <button className="px-3 py-2 text-sm rounded-lg bg-muted hover:bg-accent text-muted-foreground hover:text-foreground transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary">
                    Cancel
                  </button>
                </AlertDialogCancel>
                <AlertDialogAction asChild>
                  <button
                    onClick={() => { setDialogOpen(false); disconnectMutation.mutate() }}
                    disabled={disconnectMutation.isPending}
                    className="px-3 py-2 text-sm rounded-lg bg-destructive text-destructive-foreground hover:bg-destructive/90 disabled:opacity-50 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-destructive"
                  >
                    {disconnectMutation.isPending ? 'Disconnecting…' : 'Disconnect'}
                  </button>
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        )}
      </div>
    </div>
  )
}

export function IntegrationsPage() {
  const { data: integrations, isLoading, isError, refetch } = useQuery({
    queryKey: ['integrations'],
    queryFn: integrationsApi.list,
  })

  return (
    <div className="p-4 space-y-4">
      <div>
        <h1 className="text-lg font-semibold text-foreground">Integrations</h1>
        <p className="text-muted-foreground text-sm mt-0.5">Connect external services to enrich your AI OS context</p>
      </div>

      {isError ? (
        <ErrorCard message="Could not load integrations" onRetry={() => refetch()} />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {isLoading
            ? Array.from({ length: 3 }).map((_, i) => <IntegrationCardSkeleton key={i} />)
            : integrations?.map(i => <IntegrationCard key={i.provider} integration={i} />)
          }
        </div>
      )}
    </div>
  )
}
