import { useEffect } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { Settings, Palette, Activity, Sparkles, Keyboard, User, CreditCard, Lock, Zap, Sunrise, BookOpen, Shield } from 'lucide-react'
import { toast } from 'sonner'
import { useAuthStore } from '@/stores/authStore'
import { useFeatures } from '@/hooks/useFeatures'
import { AreaSettingsPage } from '@/components/layout/AreaSettingsPage'
import { AppearanceSection } from './settings/sections/AppearanceSection'
import { SystemStatusSection } from './settings/sections/SystemStatusSection'
import { AiUsageSection } from './settings/sections/AiUsageSection'
import { ShortcutsSection } from './settings/sections/ShortcutsSection'
import { ProfileSection } from './settings/sections/ProfileSection'
import { SecuritySection } from './settings/sections/SecuritySection'
import { BillingSection } from './settings/sections/BillingSection'
import { AccountSection } from './settings/sections/AccountSection'
import { AdminPanelSection } from './settings/sections/AdminPanelSection'
import { BriefingSection } from './settings/sections/BriefingSection'
import { AutomationsSection } from './settings/sections/AutomationsSection'
import { KnowledgeSection } from './settings/sections/KnowledgeSection'
import { AiConfigSection } from './settings/sections/AiConfigSection'

// ── Page ──────────────────────────────────────────────────────────────────────

export function SettingsPage() {
  const queryClient = useQueryClient()
  const user = useAuthStore(s => s.user)
  const { billing_enabled: billingEnabled } = useFeatures()

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
      label: 'Preferences',
      items: [
        { key: 'appearance', label: 'Appearance', icon: <Palette size={15} />, content: <AppearanceSection /> },
        { key: 'briefing', label: 'Briefing', icon: <Sunrise size={15} />, content: <BriefingSection /> },
        { key: 'knowledge', label: 'Knowledge Base', icon: <BookOpen size={15} />, content: <KnowledgeSection /> },
        { key: 'ai-config', label: 'AI Config', icon: <Sparkles size={15} />, content: <AiConfigSection /> },
        { key: 'automations', label: 'Automations', icon: <Zap size={15} />, content: <AutomationsSection /> },
        { key: 'shortcuts', label: 'Shortcuts', icon: <Keyboard size={15} />, content: <ShortcutsSection /> },
      ],
    },
    {
      label: 'System',
      items: [
        { key: 'status', label: 'Status', icon: <Activity size={15} />, content: <SystemStatusSection /> },
        { key: 'ai-usage', label: 'AI Usage', icon: <Sparkles size={15} />, content: <AiUsageSection /> },
        ...(billingEnabled ? [{ key: 'billing', label: 'Billing & modules', icon: <CreditCard size={15} />, content: <BillingSection /> }] : []),
      ],
    },
    {
      label: 'Account',
      items: [
        { key: 'profile', label: 'Profile', icon: <User size={15} />, content: <ProfileSection /> },
        ...(user?.auth_provider === 'email' ? [{ key: 'security', label: 'Security', icon: <Lock size={15} />, content: <SecuritySection /> }] : []),
        { key: 'account', label: 'Account', icon: <User size={15} />, content: <AccountSection /> },
      ],
    },
    ...(user?.is_admin ? [{
      label: 'Admin',
      items: [{ key: 'admin', label: 'Admin Panel', icon: <Shield size={15} />, content: <AdminPanelSection /> }],
    }] : []),
  ]

  return (
    <AreaSettingsPage
      icon={<Settings />}
      eyebrow="System"
      title="Settings"
      subtitle="Preferences, integrations and account management."
      backTo="/app"
      groups={groups}
    />
  )
}
