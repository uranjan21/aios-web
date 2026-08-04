import { useEffect } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { Bell, CreditCard, Cpu, Link2, Palette, Settings, Shield, UserCircle } from 'lucide-react'
import { toast } from 'sonner'
import { AreaSettingsPage } from '@ct/shared/components/layout/AreaSettingsPage'
import { useNavigate } from 'react-router-dom'
import { useAreaSection } from '@ct/shared/hooks/useAreaSection'
import { AppearanceSection } from './settings/sections/AppearanceSection'
import { ProfileModules } from './settings/sections/ProfileModules'
import { ConnectionsModules } from './settings/sections/ConnectionsModules'
import { NotificationsModules } from './settings/sections/NotificationsModules'
import { PlanModules } from './settings/sections/PlanModules'
import { AiModules } from './settings/sections/AiModules'
import { SecurityModules } from './settings/sections/SecurityModules'

/*
 * ── Settings IA, 2026-08-03 ───────────────────────────────────────────────
 *
 * TWO PROBLEMS, one fix.
 *
 * 1. The section list was rendered TWICE. `navigation.ts` gave Settings six
 *    `subs`, so the global sidebar expanded them; this page then handed the
 *    same six to `AreaSettingsPage`, which drew them again in its rail beside
 *    the content. The subs are gone from the nav tree — the rail below is the
 *    only second level now. Routes are unchanged: every tab is still its own
 *    URL and still bookmarkable.
 *
 * 2. Six sections became SEVEN, because the old set had one grab-bag and a lot
 *    of repetition. `general` held the display-name form, the Gmail account
 *    list and account deletion; meanwhile `security` re-listed connected apps,
 *    `ai` re-listed entitlements and credits that `billing` already showed
 *    twice, and three sections drew `control: 'select'` rows — a chip with a
 *    chevron and no handler, so they read as dropdowns and could not be
 *    opened. Every one of those is gone.
 *
 *   profile        <- the identity half of `general`
 *   appearance     <- appearance, minus the two modules that reported derived
 *                     state (collapsed-section count, OS reduce-motion) rather
 *                     than offering a setting
 *   notifications  <- unchanged; briefing channels, alert rules, delivery time
 *   connections    <- NEW. The Gmail list from `general` and the connected-apps
 *                     list from `security` were two views of one thing, and
 *                     neither could connect gcal/gfit/notion/github even though
 *                     the endpoints exist for all five
 *   ai             <- model + keys, plus knowledge-source CRUD, which had no UI
 *                     at all (`knowledgeApi.save`/`.remove` had no caller)
 *   plan           <- billing + usage, plus the module and free-area pickers.
 *                     `billingApi.setFreeArea` had no caller anywhere
 *   security       <- password, verification, sign-out, and account deletion,
 *                     moved out of `general` to sit with the other credential
 *                     actions rather than beside the display-name field
 *
 * Admin stayed at its own `/app/admin` destination.
 */
export function SettingsPage() {
  const queryClient = useQueryClient()
  const navigate = useNavigate()

  /*
   * The legacy map keeps every old deep link working — `AccountMenu` and
   * `OAuthCallbackPage` still send `?section=profile|billing|connections`, and
   * the 2026-08-01 keys (`general`, `billing`) are themselves legacy now.
   */
  const section = useAreaSection('/app/settings', 'profile', {
    general: 'profile', account: 'security', shortcuts: 'profile',
    status: 'profile', admin: 'profile',
    briefing: 'notifications', automations: 'notifications',
    'ai-config': 'ai', knowledge: 'ai',
    billing: 'plan', 'ai-usage': 'plan',
  })

  // Returning from Stripe Checkout — confirm and refresh the subscription.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    if (params.get('billing') === 'success') {
      toast.success('Subscription active — welcome to Pro!')
      queryClient.invalidateQueries({ queryKey: ['billing', 'subscription'] })
      window.history.replaceState({}, '', window.location.pathname)
    }
  }, [queryClient])

  const groups = [
    {
      label: 'Account',
      items: [
        { key: 'profile', label: 'Profile', icon: <UserCircle size={15} />, content: <ProfileModules /> },
        { key: 'security', label: 'Security & privacy', icon: <Shield size={15} />, content: <SecurityModules /> },
        { key: 'plan', label: 'Plan & usage', icon: <CreditCard size={15} />, content: <PlanModules /> },
      ],
    },
    {
      label: 'Workspace',
      items: [
        { key: 'appearance', label: 'Appearance', icon: <Palette size={15} />, content: <AppearanceSection /> },
        { key: 'notifications', label: 'Notifications', icon: <Bell size={15} />, content: <NotificationsModules /> },
      ],
    },
    {
      label: 'Data & AI',
      items: [
        { key: 'connections', label: 'Connections', icon: <Link2 size={15} />, content: <ConnectionsModules /> },
        { key: 'ai', label: 'AI & knowledge', icon: <Cpu size={15} />, content: <AiModules /> },
      ],
    },
  ]

  return (
    <AreaSettingsPage
      icon={<Settings />}
      eyebrow="System"
      title="Settings"
      subtitle="Preferences, integrations and account management."
      groups={groups}
      activeKey={section}
      onSelect={(key) => navigate(key === 'profile' ? '/app/settings' : `/app/settings/${key}`)}
    />
  )
}
