import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { toast } from 'sonner'
import { CheckCircle, XCircle, AlertCircle, ExternalLink, Trash2, Puzzle } from 'lucide-react'
import { integrationsApi } from '@/api/integrations'
import { Skeleton } from '@/components/ui/skeleton'
import { ErrorCard } from '@/components/ErrorCard'
import {
  AlertDialog, AlertDialogTrigger, AlertDialogContent, AlertDialogHeader,
  AlertDialogTitle, AlertDialogDescription, AlertDialogFooter,
  AlertDialogCancel, AlertDialogAction,
} from '@/components/ui/alert-dialog'
import { IconBadge, StatusPill } from '@/components/lumina';
import { Card as GlassCard } from '@ledgr/ui';
import { PageHeader } from '@/components/layout/PageLayout'
import { Button } from '@/components/ui/button'
import { EmptyState } from '@/components/EmptyState'
import type { Integration } from '@/types'
import styled, { useTheme } from 'styled-components'

const PROVIDER_INFO: Record<string, { label: string; desc: string }> = {
  notion: { label: 'Notion', desc: 'Read pages and databases from your Notion workspace' },
  gcal: { label: 'Google Calendar', desc: 'Sync upcoming events for dashboard and agent context' },
  github: { label: 'GitHub', desc: 'Track commits and activity on your repos' },
}

// ── Layout ─────────────────────────────────────────────────────────────────────

const PageRoot = styled.div`
  min-height: 100vh;
  background: ${({ theme }) => theme.color.background};
  padding: 16px;
  @media (min-width: 768px) { padding: 24px; }
`

const PageContent = styled.div`
  margin: 0 auto;
  max-width: 1200px;
  display: flex;
  flex-direction: column;
  gap: 16px;
`

const IntGrid = styled.div`
  display: grid;
  grid-template-columns: 1fr;
  gap: 16px;
  @media (min-width: 768px) { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  @media (min-width: 1280px) { grid-template-columns: repeat(3, minmax(0, 1fr)); }
`

// ── Card header row ───────────────────────────────────────────────────────────

const CardTop = styled.div`
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  margin-bottom: 12px;
`

const ProviderInfo = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
`

const ProviderText = styled.div`
  display: flex;
  flex-direction: column;
  gap: 2px;
`

const CardActions = styled.div`
  display: flex;
  gap: 8px;
  margin-top: 16px;
`

const SkeletonGroup = styled.div`
  display: flex;
  flex-direction: column;
  gap: 6px;
`

// ── Styled Skeletons ──────────────────────────────────────────────────────────

const SkelIcon = styled(Skeleton)`
  width: 2rem;
  height: 2rem;
  border-radius: 0.75rem;
`

const SkelTitle = styled(Skeleton)`
  height: 1rem;
  width: 8rem;
`

const SkelDesc = styled(Skeleton)`
  height: 0.75rem;
  width: 12rem;
`

const SkelStatus = styled(Skeleton)`
  height: 1.25rem;
  width: 5rem;
  border-radius: 9999px;
`

const SkelButton = styled(Skeleton)`
  height: 2rem;
  width: 6rem;
  border-radius: 0.5rem;
`

// ── Components ────────────────────────────────────────────────────────────────

function StatusIcon({ status }: { status: Integration['status'] }) {
  if (status === 'connected') return <IconBadge icon={CheckCircle} color="primary" size="md" />
  if (status === 'expired') return <IconBadge icon={AlertCircle} color="accent" size="md" />
  if (status === 'error') return <IconBadge icon={XCircle} color="muted" size="md" />
  return <IconBadge icon={XCircle} color="muted" size="md" />
}

function IntegrationCardSkeleton() {
  return (
    <GlassCard style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <SkelIcon />
          <SkeletonGroup>
            <SkelTitle />
            <SkelDesc />
          </SkeletonGroup>
        </div>
        <SkelStatus />
      </div>
      <SkelButton />
    </GlassCard>
  )
}

function IntegrationCard({ integration }: { integration: Integration }) {
  const theme = useTheme()
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
    <GlassCard hoverable fadeIn="up">
      <CardTop>
        <ProviderInfo>
          <StatusIcon status={integration.status} />
          <ProviderText>
            <h3 style={{ fontSize: 14, fontWeight: 500, color: theme.color.foreground, margin: 0 }}>{info.label}</h3>
            <p style={{ fontSize: 12, color: theme.color.mutedForeground, margin: 0 }}>{info.desc}</p>
          </ProviderText>
        </ProviderInfo>
        <StatusPill
          label={integration.status}
          tone={integration.status === 'connected' ? 'primary' : integration.status === 'expired' ? 'accent' : 'muted'}
        />
      </CardTop>

      <CardActions>
        {integration.status !== 'connected' ? (
          <Button onClick={() => connectMutation.mutate()} disabled={connectMutation.isPending}>
            <ExternalLink size={14} />
            {connectMutation.isPending ? 'Redirecting…' : 'Connect'}
          </Button>
        ) : (
          <AlertDialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <AlertDialogTrigger asChild>
              <Button variant="destructive" aria-label={`Disconnect ${info.label}`}>
                <Trash2 size={14} /> Disconnect
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle style={{ fontSize: 16, fontWeight: 600, color: theme.color.foreground }}>
                  Disconnect {info.label}?
                </AlertDialogTitle>
                <AlertDialogDescription style={{ fontSize: 14, color: theme.color.mutedForeground }}>
                  The agent will no longer be able to read data from {info.label}. You can reconnect at any time.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel asChild>
                  <Button variant="secondary">Cancel</Button>
                </AlertDialogCancel>
                <AlertDialogAction asChild>
                  <Button
                    variant="destructive"
                    onClick={() => { setDialogOpen(false); disconnectMutation.mutate() }}
                    disabled={disconnectMutation.isPending}
                  >
                    {disconnectMutation.isPending ? 'Disconnecting…' : 'Disconnect'}
                  </Button>
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        )}
      </CardActions>
    </GlassCard>
  )
}

export function IntegrationsPage() {
  const { data: integrations, isLoading, isError, refetch } = useQuery({
    queryKey: ['integrations'],
    queryFn: integrationsApi.list,
  })

  return (
    <PageRoot>
      <PageContent>
        <PageHeader title="Integrations" description="Connect your favorite tools and services." icon={Puzzle} />
        {isError ? (
          <ErrorCard message="Could not load integrations" onRetry={() => refetch()} />
        ) : (
          <IntGrid>
            {isLoading
              ? Array.from({ length: 3 }).map((_, i) => <IntegrationCardSkeleton key={i} />)
              : integrations && integrations.length > 0
              ? integrations.map(i => <IntegrationCard key={i.provider} integration={i} />)
              : (
                  <div style={{ gridColumn: '1 / -1' }}>
                    <EmptyState
                      icon={ExternalLink}
                      title="No integrations configured yet"
                      description="Connect Notion, Google Calendar, or GitHub to enrich your AI OS"
                      action={{
                        label: "Connect Integration",
                        onClick: () => {
                          toast.info("Connecting Notion integration...");
                          integrationsApi.authUrl('notion')
                            .then(({ url }) => { window.location.href = url })
                            .catch(() => toast.error("Failed to initiate Notion connection"));
                        }
                      }}
                    />
                  </div>
                )
            }
          </IntGrid>
        )}
      </PageContent>
    </PageRoot>
  )
}
