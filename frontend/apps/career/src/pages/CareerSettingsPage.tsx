import { Briefcase, BookOpen } from 'lucide-react'
import { AreaSettingsPage } from '@ct/shared/components/layout/AreaSettingsPage'
import { SkillsManager } from '@ct/career/components/SkillsManager'

export function CareerSettingsPage() {
  return (
    <AreaSettingsPage
      icon={<Briefcase />}
      title="Career Settings"
      subtitle="Manage your skills inventory, used across the dashboard and radar."
      groups={[
        {
          label: 'Profile',
          items: [
            { key: 'skills', label: 'Skills', icon: <BookOpen size={15} />, content: <SkillsManager /> },
          ],
        },
      ]}
    />
  )
}
