import { useEffect } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { Settings, Palette, Bell, CreditCard, Lock, Cpu, SlidersHorizontal } from 'lucide-react'
import { toast } from 'sonner'
import { useAuthStore } from '@ct/shared/stores/authStore'
import { useFeatures } from '@ct/shared/hooks/useFeatures'
import { AreaSettingsPage } from '@ct/shared/components/layout/AreaSettingsPage'
import { useNavigate } from 'react-router-dom'
import { useAreaSection } from '@ct/shared/hooks/useAreaSection'
import { AppearanceSection } from './settings/sections/AppearanceSection'
import { AiUsageSection } from './settings/sections/AiUsageSection'
import { ProfileSection } from './settings/sections/ProfileSection'
import { SecuritySection } from './settings/sections/SecuritySection'
import { BillingSection } from './settings/sections/BillingSection'
import { AccountSection } from './settings/sections/AccountSection'
import { BriefingSection } from './settings/sections/BriefingSection'
import { AutomationsSection } from './settings/sections/AutomationsSection'
import { KnowledgeSection } from './settings/sections/KnowledgeSection'
import { AiConfigSection } from './settings/sections/AiConfigSection'
import { ConnectionsSection } from './settings/sections/ConnectionsSection'

// ── Page ──────────────────────────────────────────────────────────────────────

export function SettingsPage() {
  const queryClient = useQueryClient()
  const user = useAuthStore(s => s.user)
  const { billing_enabled: billingEnabled } = useFeatures()
  const navigate = useNavigate()
  const section = useAreaSection('/app/settings', 'general', {
    profile: 'general', account: 'general', connections: 'general',
    briefing: 'notifications', automations: 'notifications',
    'ai-config': 'ai', knowledge: 'ai',
    'ai-usage': 'billing',
    shortcuts: 'general', status: 'general', admin: 'general',
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

  /*
   * ── Settings IA, 2026-08-01 ───────────────────────────────────────────
   * The redesign specifies exactly six sections, and they are now routes in
   * the global nav tree. Fourteen sections collapsed into them — mostly by
   * ABSORPTION, not deletion:
   *
   *   general       <- Profile + Account + Connections (the Google OAuth flow
   *                    has no other home in the new IA; the Transaction
   *                    Tracker agent depends on it, so it is not droppable)
   *   appearance    <- Appearance
   *   notifications <- Briefing (channels, delivery time) + Automations
   *                    (alert rules) — the design's "Channels / Alert rules /
   *                    Quiet hours" is exactly this content
   *   billing       <- Billing & modules + AI usage (the design puts usage on
   *                    the billing page as "Usage this cycle")
   *   ai            <- AI config + Knowledge base (the design's "Data access")
   *   security      <- Security
   *
   * Genuinely removed: Shortcuts and System status (no slot in the design).
   * Admin Panel moved to its own /app/admin destination.
   */
  const groups = [
    {
      label: 'Settings',
      items: [
        {
          key: 'general', label: 'General', icon: <SlidersHorizontal size={15} />,
          content: <><ProfileSection /><ConnectionsSection /><AccountSection /></>,
        },
        { key: 'appearance', label: 'Appearance', icon: <Palette size={15} />, content: <AppearanceSection /> },
        {
          key: 'notifications', label: 'Notifications', icon: <Bell size={15} />,
          content: <><BriefingSection /><AutomationsSection /></>,
        },
        ...(billingEnabled
          ? [{ key: 'billing', label: 'Billing', icon: <CreditCard size={15} />, content: <><BillingSection /><AiUsageSection /></> }]
          : [{ key: 'billing', label: 'Billing', icon: <CreditCard size={15} />, content: <AiUsageSection /> }]),
        { key: 'ai', label: 'AI configuration', icon: <Cpu size={15} />, content: <><AiConfigSection /><KnowledgeSection /></> },
        ...(user?.auth_provider === 'email'
          ? [{ key: 'security', label: 'Security', icon: <Lock size={15} />, content: <SecuritySection /> }]
          : []),
      ],
    },
  ]

  return (
    <AreaSettingsPage
      icon={<Settings />}
      eyebrow="System"
      title="Settings"
      subtitle="Preferences, integrations and account management."
      backTo="/app"
      groups={groups}
      activeKey={section}
      onSelect={(key) => navigate(key === 'general' ? '/app/settings' : `/app/settings/${key}`)}
    />
  )
}
