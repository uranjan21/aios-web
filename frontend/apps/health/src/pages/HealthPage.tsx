import { useState } from 'react'

import { OverviewSection } from '@ct/health/components/sections/OverviewSection'
import { WorkoutsSection } from '@ct/health/components/sections/WorkoutsSection'
import { NutritionSection } from '@ct/health/components/sections/NutritionSection'
import { BodySection } from '@ct/health/components/sections/BodySection'
import { SleepSection } from '@ct/health/components/sections/SleepSection'
import { HabitsSection } from '@ct/health/components/sections/HabitsSection'
import { HealthLogModal } from '@ct/health/components/HealthLogModal'
import { PageContainer, PageContent } from '@ct/shared/components/layout/PageLayout'
import { useAreaSection } from '@ct/shared/hooks/useAreaSection'

/**
 * Health is a thin route host after the Phase 4 conversion: every section is a
 * module composition of its own under `components/sections/`.
 *
 * Health's old dashboard key was the numeric '1'; `water` and `history` were
 * dropped from the IA by the redesign and now redirect to Overview. The water
 * endpoint (`/health/water/today`) is untouched on the backend, and the daily
 * water target moved onto the Nutrition page's "Daily targets" module.
 */
export function HealthPage() {
  const section = useAreaSection('/app/health', 'overview', {
    '1': 'overview',
    water: 'overview',
    history: 'overview',
  })

  const [isLogModalOpen, setIsLogModalOpen] = useState(false)

  const renderContent = () => {
    switch (section) {
      case 'workouts':  return <WorkoutsSection />
      case 'nutrition': return <NutritionSection />
      case 'body':      return <BodySection />
      case 'sleep':     return <SleepSection />
      case 'habits':    return <HabitsSection />
      case 'overview':
      default:          return <OverviewSection />
    }
  }

  return (
    <PageContainer>
      <PageContent>
        {/* No header block and nothing page-scoped — Health Targets is a nav
            destination now (2026-08-03). See FinancePage. */}
        {renderContent()}
        <HealthLogModal open={isLogModalOpen} onClose={() => setIsLogModalOpen(false)} />
      </PageContent>
    </PageContainer>
  )
}
