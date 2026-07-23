import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Card, Select, Switch } from '@ledgr/ui'
import { Inbox } from 'lucide-react'
import { financeApi } from '@ct/shared/api/areas'

const HOUR_OPTIONS = [
  { label: 'After 6 hours', value: '6' },
  { label: 'After 12 hours', value: '12' },
  { label: 'After 24 hours', value: '24' },
  { label: 'After 48 hours', value: '48' },
  { label: 'After 72 hours', value: '72' },
]

export function InboxSettingsTab() {
  const queryClient = useQueryClient()
  const { data } = useQuery({
    queryKey: ['finance', 'settings'],
    queryFn: financeApi.settings,
    staleTime: 60_000,
  })
  const hours = data?.auto_commit_hours ?? null

  const mutation = useMutation({
    mutationFn: (auto_commit_hours: number | null) => financeApi.updateSettings({ auto_commit_hours }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['finance', 'settings'] })
      toast.success('Inbox review setting updated')
    },
    onError: () => toast.error('Could not update the setting'),
  })

  return (
    <Card
      icon={<Inbox size={16} />}
      title="Inbox review"
      subtitle="How transactions found in your email reach the ledger."
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16 }}>
        <div>
          <div style={{ fontSize: 13, fontWeight: 500 }}>Auto-commit unreviewed transactions</div>
          <div style={{ fontSize: 12, color: 'var(--ui-text-tertiary)', marginTop: 2 }}>
            Off (recommended): everything waits in the Inbox until you approve it.
            On: unreviewed items are committed automatically after the delay below.
          </div>
        </div>
        <Switch
          checked={hours != null}
          onChange={() => mutation.mutate(hours != null ? null : 24)}
          aria-label="Toggle auto-commit"
        />
      </div>
      {hours != null && (
        <div style={{ marginTop: 16, maxWidth: 220 }}>
          <Select
            fullWidth={false}
            options={HOUR_OPTIONS}
            value={String(hours)}
            onChange={(v: string | number) => mutation.mutate(Number(v))}
            placeholder="Auto-commit delay"
          />
        </div>
      )}
    </Card>
  )
}
