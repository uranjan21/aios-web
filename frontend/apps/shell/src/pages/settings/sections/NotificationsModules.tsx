/**
 * Settings → Notifications.
 *
 * Phase 4 conversion to the canvas's `settings:notifications` composition —
 * three `controls` modules: Channels, Alert rules, Quiet hours. It absorbs the
 * old Briefing and Automations sections, which the 2026-08-01 IA folded in
 * here, so every switch below writes to a real endpoint.
 *
 * ONE DEPARTURE: the canvas's Quiet hours module has an on/off toggle and a
 * window picker. Nothing stores a quiet window, but the briefing DOES store a
 * delivery time and timezone, which is the same "when may we reach you"
 * question — so that module is the briefing schedule.
 *
 * BACKEND FOLLOW-UP: a quiet-hours window on the briefing preferences (or a
 * notification-preferences table) would let this render the canvas exactly.
 */
import { useMemo } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Bell, Moon, Zap } from 'lucide-react'
import { api } from '@ct/shared/api/client'
import { insightsApi } from '@ct/shared/api/insights'
import { useWebPush } from '@ct/shared/hooks/useWebPush'
import { ModuleGrid, type ModuleSpec } from '@ct/shared/components/modules'

/* `template_key`, NOT `key`. The API has always returned `template_key`
   (AutomationResponse in api/automations.py); this interface said `key`, so
   `RULE_LABELS[r.key]` was a lookup on `undefined` and the filter below dropped
   every rule. The Alert rules card read "No automation rules configured yet"
   for every user regardless of what they had enabled. Fixed 2026-08-23. */
interface AutomationRule { template_key: string; enabled: boolean }

/** The automation rules that are really notification preferences. */
const RULE_LABELS: Record<string, { title: string; meta: string }> = {
  budget_80_push: { title: 'Budget warning', meta: 'Push when a category passes 80% of its limit' },
  bill_reminder_3d: { title: 'Bill due reminder', meta: 'Three days before a bill is due' },
  streak_save_evening: { title: 'Habit nudge', meta: 'Evening reminder when a streak is at risk' },
  weekly_review_sunday: { title: 'Weekly review prompt', meta: 'Sunday evening' },
  idle_goal_nudge_7d: { title: 'Idle goal nudge', meta: 'When a goal has not moved in a week' },
  payday_snapshot: { title: 'Payday snapshot', meta: 'Captures a finance snapshot on payday' },
}

const DELIVERY_TIMES = ['06:00', '07:00', '08:00', '09:00']

export function NotificationsModules() {
  const qc = useQueryClient()
  const push = useWebPush()

  const { data: prefs } = useQuery({
    queryKey: ['insights', 'briefing', 'preferences'],
    queryFn: insightsApi.briefingPreferences,
  })
  const { data: rules } = useQuery({
    queryKey: ['automations'],
    queryFn: () => api.get<AutomationRule[]>('/automations/').then(r => r.data),
  })

  const saveBriefing = useMutation({
    mutationFn: insightsApi.updateBriefingPreferences,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['insights', 'briefing', 'preferences'] })
      toast.success('Briefing preferences saved')
    },
    onError: () => toast.error('Could not save preferences'),
  })

  const saveRule = useMutation({
    mutationFn: ({ key, enabled }: { key: string; enabled: boolean }) =>
      api.put(`/automations/${key}`, { enabled, params: {} }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['automations'] })
      toast.success('Alert rule updated')
    },
    onError: () => toast.error('Could not update that rule'),
  })

  /**
   * Push is two things at once: a stored preference and a live browser
   * subscription. Flip both together, and only record the preference if the
   * browser actually granted permission — otherwise the channel would read as
   * on while delivering nothing.
   */
  const togglePush = async (next: boolean) => {
    if (!push.supported) {
      toast.error('This browser cannot receive push notifications')
      return
    }
    const ok = next ? await push.subscribe() : await push.unsubscribe()
    if (!ok) {
      toast.error(next ? 'Could not enable push — permission denied?' : 'Could not disable push')
      return
    }
    patchBriefing({ channels: { ...(prefs?.channels ?? {}), push: next } })
  }

  const patchBriefing = (patch: Record<string, unknown>) => {
    if (!prefs) return
    saveBriefing.mutate({
      enabled: prefs.enabled,
      deliver_at: prefs.deliver_at,
      channels: prefs.channels ?? {},
      tz: prefs.tz || Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC',
      ...patch,
    } as typeof prefs)
  }

  const modules = useMemo<ModuleSpec[]>(() => {
    /* Render EVERY template, not just the ones with a row already. A rule row
       is created on first toggle (the PUT upserts), so filtering to existing
       rows meant a user with none could never enable their first one — the card
       offered nothing to click. `enabled` defaults false for a template the
       user has never touched. */
    const ruleRows = Object.keys(RULE_LABELS).map(key => ({
      template_key: key,
      enabled: (rules ?? []).find(r => r.template_key === key)?.enabled ?? false,
    }))
    const channels = prefs?.channels ?? {}
    // deliver_at may come back as HH:MM or HH:MM:SS.
    const deliverAt = (prefs?.deliver_at ?? '07:00').slice(0, 5)

    return [
      {
        kind: 'controls',
        span: 12,
        title: 'Channels',
        subtitle: 'How Control Tower reaches you',
        icon: Bell,
        rows: [
          {
            title: 'Daily briefing',
            meta: 'A morning recap of yesterday plus today',
            control: 'toggle',
            on: !!prefs?.enabled,
            busy: saveBriefing.isPending,
          },
          {
            title: 'Push notifications',
            meta: !push.supported
              ? 'This browser cannot receive push'
              : push.subscribed
                ? 'This browser is subscribed'
                : 'Browser push for briefings and alerts',
            control: 'toggle',
            // Both halves must be true: the preference AND a live browser
            // subscription. A flag on its own delivers nothing.
            on: !!channels.push && push.subscribed,
            busy: saveBriefing.isPending || push.busy,
          },
          {
            title: 'Email',
            meta: 'The same briefing in your inbox',
            control: 'toggle',
            on: !!channels.email,
            busy: saveBriefing.isPending,
          },
        ],
        onToggle: (i: number, next: boolean) => {
          if (i === 0) patchBriefing({ enabled: next })
          if (i === 1) void togglePush(next)
          if (i === 2) patchBriefing({ channels: { ...channels, email: next } })
        },
      },
      {
        kind: 'controls',
        span: 6,
        title: 'Alert rules',
        subtitle: 'What is worth interrupting you for',
        icon: Zap,
        rows: ruleRows.map(r => ({
          title: RULE_LABELS[r.template_key].title,
          meta: RULE_LABELS[r.template_key].meta,
          control: 'toggle' as const,
          on: r.enabled,
          busy: saveRule.isPending && saveRule.variables?.key === r.template_key,
        })),
        onToggle: (i: number, next: boolean) =>
          saveRule.mutate({ key: ruleRows[i].template_key, enabled: next }),
      },
      {
        kind: 'controls',
        span: 6,
        title: 'Delivery window',
        subtitle: 'When the morning briefing arrives',
        icon: Moon,
        rows: [
          {
            title: 'Deliver at',
            meta: `Your local time · ${prefs?.tz || 'timezone not set'}`,
            control: 'segment',
            options: DELIVERY_TIMES,
            value: DELIVERY_TIMES.includes(deliverAt) ? deliverAt : DELIVERY_TIMES[1],
            busy: saveBriefing.isPending,
          },
        ],
        onSelect: (i: number, value: string) => {
          if (i === 0) {
            patchBriefing({
              deliver_at: value,
              // Capture the browser's zone on save, the same way the old
              // Briefing section did — the server schedules against it.
              tz: Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC',
            })
          }
        },
      },
    ]
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [prefs, rules, saveBriefing.isPending, saveRule.isPending, push.supported, push.subscribed, push.busy])

  return <ModuleGrid modules={modules} />
}
