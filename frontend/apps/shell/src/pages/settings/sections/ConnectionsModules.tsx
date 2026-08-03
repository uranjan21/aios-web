/**
 * Settings → Connections.
 *
 * NEW TAB. Third-party access used to be described in two places that neither
 * agreed nor covered the feature: the old `general` tab listed Gmail accounts
 * and could link them, while `security` listed every connected provider and
 * could only disconnect. Between them, `gcal`, `gfit`, `notion` and `github`
 * had no connect affordance anywhere — `integrationsApi.authUrl` works for all
 * five and only Gmail ever called it.
 *
 * This tab is the single home for all of it. Toggling a service on sends you
 * through its OAuth flow; toggling it off revokes the stored credential.
 *
 * Gmail keeps its own module because it is the one provider that is
 * multi-account — bank and UPI alerts often arrive in a different inbox than
 * the one you sign in with, so the model is `(user_id, provider,
 * account_email)` and a single on/off switch could not express it.
 */
import { useMemo } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import dayjs from 'dayjs'
import relativeTime from 'dayjs/plugin/relativeTime'
import { Link2, Mail, RefreshCw } from 'lucide-react'
import { integrationsApi } from '@ct/shared/api/integrations'
import { ModuleGrid, type ModuleSpec } from '@ct/shared/components/modules'

dayjs.extend(relativeTime)

/**
 * The four single-account providers, in the order they are worth setting up.
 * Gmail is deliberately absent — it gets its own module below.
 */
const SERVICES: Array<{ key: string; label: string; meta: string }> = [
  {
    key: 'gcal',
    label: 'Google Calendar',
    meta: 'Your schedule on the dashboard and in the daily briefing',
  },
  {
    key: 'gfit',
    label: 'Google Fit',
    meta: 'Steps, weight and activity flow into Health',
  },
  {
    key: 'notion',
    label: 'Notion',
    meta: 'Pulls your workspace in as assistant knowledge',
  },
  {
    key: 'github',
    label: 'GitHub',
    meta: 'Commit activity for the Career journal',
  },
]

export function ConnectionsModules() {
  const qc = useQueryClient()

  const { data: integrations } = useQuery({
    queryKey: ['integrations'],
    queryFn: integrationsApi.list,
    staleTime: 30_000,
  })

  const connect = useMutation({
    mutationFn: (provider: string) => integrationsApi.authUrl(provider),
    onSuccess: ({ url }) => { window.location.href = url },
    onError: () => toast.error('Could not start that connection'),
  })

  const disconnect = useMutation({
    mutationFn: ({ provider, email }: { provider: string; email?: string }) =>
      integrationsApi.disconnect(provider, email),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['integrations'] })
      toast.success('Disconnected')
    },
    onError: () => toast.error('Could not disconnect that service'),
  })

  const sync = useMutation({
    mutationFn: (provider: string) => integrationsApi.sync(provider),
    onSuccess: (r) => {
      qc.invalidateQueries({ queryKey: ['integrations'] })
      toast.success(`Synced ${r.synced} item(s) from ${r.provider}`)
    },
    onError: () => toast.error('Sync failed — try reconnecting the account'),
  })

  const modules = useMemo<ModuleSpec[]>(() => {
    const byProvider = new Map((integrations ?? []).map(i => [i.provider, i]))
    const gmail = byProvider.get('gmail')
    const gmailAccounts = (gmail?.accounts ?? []).filter(a => a.status !== 'disconnected')

    const services = SERVICES.map(s => {
      const row = byProvider.get(s.key as never)
      return { ...s, status: row?.status ?? 'disconnected', expires: row?.token_expires_at ?? null }
    })
    /*
     * GitHub is excluded: it has no `/sync` route (SYNCABLE_PROVIDERS is the
     * Google set plus Notion), so offering a manual pull for it would call an
     * endpoint that 404s.
     */
    const syncable = [
      ...services.filter(s => s.status === 'connected' && s.key !== 'github').map(s => s.key),
      ...(gmailAccounts.length ? ['gmail'] : []),
    ]

    /*
     * NO `tiles` row (removed 2026-08-03). It counted connected services, Gmail
     * accounts, Calendar state and expired tokens — every one of which the
     * Services toggles and the Gmail list below state directly, and a tile
     * cannot be clicked to fix any of them. Expiry now surfaces where it can be
     * acted on: in the row's own meta line, beside the switch that reconnects.
     */
    return [
      {
        kind: 'rows',
        span: 12,
        title: 'Gmail',
        subtitle: gmailAccounts.length
          ? 'Read-only. Anything the tracker finds is queued in Finance → Inbox for review · click an account to unlink'
          : 'Link the inbox that receives your bank and UPI alerts — it can differ from the account you sign in with',
        icon: Mail,
        action: gmailAccounts.length ? 'Link another account' : 'Connect Gmail',
        onAction: () => connect.mutate('gmail'),
        rows: gmailAccounts.length
          ? gmailAccounts.map(a => ({
              title: a.email,
              meta: a.status === 'connected'
                ? a.last_sync
                  ? `Last synced ${dayjs(a.last_sync).fromNow()}`
                  : 'Connected — no sync yet'
                : 'Expired — reconnect to resume syncing',
              tagLabel: a.status === 'connected' ? 'Connected' : 'Expired',
              tagColorKey: a.status === 'connected' ? 'success' : 'warning',
              busy: disconnect.isPending && disconnect.variables?.email === a.email,
            }))
          // `rows: []` renders the card header above an empty body. One row
          // saying what is missing reads better than a blank panel.
          : [{
              title: 'No account linked',
              meta: 'Until one is linked the Transaction Tracker has nothing to read',
              tagLabel: 'Not set up',
              tagColorKey: 'mutedFg',
            }],
        // Rows are only clickable when they are real accounts to unlink.
        ...(gmailAccounts.length && {
          onRowClick: (i: number) =>
            disconnect.mutate({ provider: 'gmail', email: gmailAccounts[i].email }),
        }),
      },
      {
        kind: 'controls',
        // Takes the full row when Manual sync is not rendered beside it.
        span: syncable.length ? 7 : 12,
        title: 'Services',
        subtitle: 'Turning one on sends you to that provider to grant access',
        icon: Link2,
        rows: services.map(s => ({
          title: s.label,
          meta: s.status === 'connected'
            ? s.expires
              ? `${s.meta} · token valid until ${dayjs(s.expires).format('D MMM, HH:mm')}`
              : s.meta
            : s.status === 'expired' || s.status === 'error'
              ? `${s.meta} · access expired, switch off and on to reconnect`
              : s.meta,
          control: 'toggle' as const,
          on: s.status === 'connected',
          busy: (connect.isPending && connect.variables === s.key)
            || (disconnect.isPending && disconnect.variables?.provider === s.key),
        })),
        onToggle: (i: number, next: boolean) => {
          const provider = services[i].key
          if (next) connect.mutate(provider)
          else disconnect.mutate({ provider })
        },
      },
      /*
       * Omitted entirely when nothing is connected — an empty card with a
       * header and no rows says less than no card at all, and the Services
       * module directly beside it already explains why the list is empty.
       */
      ...(syncable.length
        ? [{
            kind: 'rows' as const,
            span: 5,
            title: 'Manual sync',
            subtitle: 'These pull on a schedule — use this to fetch right now',
            icon: RefreshCw,
            rows: syncable.map(key => ({
              title: key === 'gmail'
                ? 'Gmail'
                : (SERVICES.find(s => s.key === key)?.label ?? key),
              meta: key === 'gmail'
                ? 'Click to scan for new transaction alerts'
                : 'Click to sync now',
              tagLabel: 'Sync',
              tagColorKey: 'accent' as const,
              busy: sync.isPending && sync.variables === key,
            })),
            onRowClick: (i: number) => sync.mutate(syncable[i]),
          }]
        : []),
    ]
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [integrations, connect.isPending, disconnect.isPending, sync.isPending])

  return <ModuleGrid modules={modules} />
}
