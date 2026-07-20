import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Button } from '@ledgr/ui'
import { Mail, Plus, Trash2 } from 'lucide-react'
import dayjs from 'dayjs'
import relativeTime from 'dayjs/plugin/relativeTime'
import { integrationsApi } from '@aios/shared/api/integrations'
import { RowRoot, Section } from '../shared'

dayjs.extend(relativeTime)

// ── Connections (linked Gmail accounts for the Transaction Tracker) ───────────

export function ConnectionsSection() {
  const queryClient = useQueryClient()
  const { data: integrations } = useQuery({
    queryKey: ['integrations'],
    queryFn: integrationsApi.list,
    staleTime: 30_000,
  })
  const accounts = integrations?.find(i => i.provider === 'gmail')?.accounts ?? []
  const linked = accounts.filter(a => a.status !== 'disconnected')

  const connectMutation = useMutation({
    mutationFn: () => integrationsApi.authUrl('gmail'),
    onSuccess: ({ url }) => { window.location.href = url },
    onError: () => toast.error('Could not start the Gmail connection'),
  })

  const disconnectMutation = useMutation({
    mutationFn: (email: string) => integrationsApi.disconnect('gmail', email),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['integrations'] })
      toast.success('Gmail account unlinked')
    },
    onError: () => toast.error('Could not unlink the account'),
  })

  return (
    <Section
      title="Connections"
      action={
        <Button size="sm" onClick={() => connectMutation.mutate()} disabled={connectMutation.isPending}>
          <Plus size={14} style={{ marginRight: 6 }} />
          {connectMutation.isPending ? 'Redirecting…' : 'Connect Gmail'}
        </Button>
      }
    >
      <div style={{ padding: '0 20px 20px' }}>
        <p style={{ fontSize: 13, color: 'var(--muted-foreground)', marginBottom: 16 }}>
          Link the Gmail account(s) that receive your bank and UPI alerts — they can be
          different from the account you sign in with. Access is read-only; the
          Transaction Tracker queues anything it finds for review in Finance → Inbox.
        </p>
        {linked.length === 0 ? (
          <p style={{ fontSize: 13, color: 'var(--muted-foreground)' }}>
            No Gmail account linked yet.
          </p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {linked.map(account => (
              <RowRoot key={account.email} style={{ padding: '10px 0' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
                  <Mail size={15} style={{ flexShrink: 0, color: 'var(--muted-foreground)' }} />
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {account.email}
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--muted-foreground)' }}>
                      {account.status === 'connected'
                        ? account.last_sync
                          ? `Synced ${dayjs(account.last_sync).fromNow()}`
                          : 'Connected'
                        : 'Expired — reconnect to resume syncing'}
                    </div>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => disconnectMutation.mutate(account.email)}
                  disabled={disconnectMutation.isPending}
                  aria-label={`Unlink ${account.email}`}
                >
                  <Trash2 size={14} />
                </Button>
              </RowRoot>
            ))}
          </div>
        )}
      </div>
    </Section>
  )
}
