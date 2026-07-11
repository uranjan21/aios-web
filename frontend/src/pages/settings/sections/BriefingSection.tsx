import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { api } from '@/api/client'
import { Switch, Input } from '@ledgr/ui'
import { RowRoot, RowLabel, Section } from '../shared'

// ── Daily Briefing ────────────────────────────────────────────────────────────

export function BriefingSection() {
  const queryClient = useQueryClient()
  const { data: prefs } = useQuery({
    queryKey: ['insights', 'briefing', 'preferences'],
    queryFn: () => api.get('/insights/briefing/preferences').then(r => r.data),
  })

  const saveMutation = useMutation({
    mutationFn: (next: any) => api.post('/insights/briefing/preferences', next).then(r => r.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['insights', 'briefing', 'preferences'] })
      toast.success('Briefing preferences saved')
    },
    onError: () => toast.error('Could not save preferences'),
  })

  if (!prefs) return null

  const save = (patch: Record<string, unknown>) =>
    saveMutation.mutate({
      enabled: prefs.enabled,
      deliver_at: prefs.deliver_at,
      channels: prefs.channels ?? {},
      tz: prefs.tz || Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC',
      ...patch,
    })

  return (
    <Section title="Daily Briefing">
      <div style={{ padding: '0 20px 20px' }}>
        <p style={{ fontSize: 13, color: 'var(--muted-foreground)', marginBottom: 20 }}>
          A morning recap of yesterday plus today's outlook, delivered at your chosen time.
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <RowRoot style={{ padding: 0 }}>
            <div>
              <RowLabel>Enabled</RowLabel>
              <div style={{ fontSize: 12, color: 'var(--muted-foreground)' }}>Generate a briefing every morning</div>
            </div>
            <Switch
              checked={prefs.enabled}
              onChange={() => save({ enabled: !prefs.enabled })}
              aria-label="Toggle daily briefing"
            />
          </RowRoot>
          <RowRoot style={{ padding: 0 }}>
            <div>
              <RowLabel>Delivery time</RowLabel>
              <div style={{ fontSize: 12, color: 'var(--muted-foreground)' }}>
                Local time ({prefs.tz || Intl.DateTimeFormat().resolvedOptions().timeZone})
              </div>
            </div>
            <Input
              type="time"
              size="sm"
              fullWidth={false}
              defaultValue={(prefs.deliver_at || '08:00:00').slice(0, 5)}
              onBlur={e => e.target.value && save({
                deliver_at: `${e.target.value}:00`,
                tz: Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC',
              })}
              aria-label="Briefing delivery time"
            />
          </RowRoot>
          <RowRoot style={{ padding: 0 }}>
            <div>
              <RowLabel>Push notification</RowLabel>
              <div style={{ fontSize: 12, color: 'var(--muted-foreground)' }}>Notify when the briefing is ready</div>
            </div>
            <Switch
              checked={prefs.channels?.push ?? true}
              onChange={() => save({ channels: { ...prefs.channels, push: !(prefs.channels?.push ?? true) } })}
              aria-label="Toggle briefing push notification"
            />
          </RowRoot>
        </div>
      </div>
    </Section>
  )
}
