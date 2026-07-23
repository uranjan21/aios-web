import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { api } from '@ct/shared/api/client'
import { Switch } from '@ledgr/ui'
import { RowRoot, RowLabel, Section } from '../shared'

// ── Automations ───────────────────────────────────────────────────────────────

const AUTOMATION_TEMPLATES = [
  { key: 'bill_reminder_3d', title: 'Bill Reminder (3 Days)', description: 'Push when a bill is due in 3 days.', defaultOn: false },
  { key: 'budget_80_push', title: 'Budget 80% Warning', description: 'Push notification when a budget passes 80%.', defaultOn: true },
  { key: 'streak_save_evening', title: 'Evening Streak Saver', description: 'Evening nudge when nothing is logged yet that day.', defaultOn: false },
  { key: 'weekly_review_sunday', title: 'Sunday Weekly Review', description: 'Sunday-evening prompt to run your weekly review.', defaultOn: false },
  { key: 'payday_snapshot', title: 'Payday Snapshot', description: 'Records a take-home snapshot when salary income lands.', defaultOn: false },
  { key: 'idle_goal_nudge_7d', title: 'Idle Goal Nudge', description: 'Reminds you of goals with no check-in for 7 days.', defaultOn: false },
]

export function AutomationsSection() {
  const queryClient = useQueryClient()
  const { data: rules } = useQuery({
    queryKey: ['automations'],
    queryFn: () => api.get('/automations/').then(r => r.data)
  })

  const toggleMutation = useMutation({
    mutationFn: async ({ key, enabled }: { key: string, enabled: boolean }) => {
      const { data } = await api.put(`/automations/${key}`, { enabled, params: {} })
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['automations'] })
      toast.success('Automation updated')
    },
    onError: () => toast.error('Could not update automation'),
  })

  return (
    <Section title="Automations">
      <div style={{ padding: '0 20px 20px' }}>
        <p style={{ fontSize: 13, color: 'var(--muted-foreground)', marginBottom: 20 }}>
          Enable or disable curated automation rules.
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {AUTOMATION_TEMPLATES.map(tpl => {
            const rule = rules?.find((r: any) => r.template_key === tpl.key)
            // budget_80_push is on by default server-side; the rest are opt-in.
            const isEnabled = rule?.enabled ?? tpl.defaultOn
            return (
              <RowRoot key={tpl.key} style={{ padding: 0 }}>
                <div>
                  <RowLabel>{tpl.title}</RowLabel>
                  <div style={{ fontSize: 12, color: 'var(--muted-foreground)' }}>{tpl.description}</div>
                </div>
                <Switch
                  checked={isEnabled}
                  onChange={() => toggleMutation.mutate({ key: tpl.key, enabled: !isEnabled })}
                  aria-label={`Toggle ${tpl.title}`}
                />
              </RowRoot>
            )
          })}
        </div>
      </div>
    </Section>
  )
}
