/**
 * Career — a single surface, not an area.
 *
 * The 2026-07-21 redesign demoted Career from a three-tab area to one page.
 * What was removed and why:
 *   - Dashboard tab: its "Career Timeline" card duplicated the one in the
 *     Roadmap tab — both read `careerApi.events` and rendered the same rows.
 *   - Roadmap tab: that duplicate timeline plus SkillGapCard.
 *   - Skills radar: the app's last Highcharts consumer, a spider chart of
 *     self-rated levels that no decision depended on. Skills are still
 *     tracked and edited in Career settings.
 *   - WorkspaceStatsWidget: the same four workspace counts appeared on all
 *     five domain pages and are the entire subject of the workspace pages.
 *
 * What survives is the part that does real work: the opportunity pipeline.
 */
import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Activity, BookOpen, Briefcase, Plus, Settings } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { PageContainer, PageContent } from '@ct/shared/components/layout/PageLayout'
import { Button, KpiCard, KpiGrid, PageHeader } from '@ledgr/ui'
import { OpportunitiesTab } from '@ct/career/components/OpportunitiesTab'
import { CareerLogModal } from '@ct/career/components/CareerLogModal'
import { careerApi } from '@ct/shared/api/areas'

export function CareerPage() {
  const [isLogModalOpen, setIsLogModalOpen] = useState(false)
  const navigate = useNavigate()

  const { data: skills } = useQuery({ queryKey: ['career', 'skills'], queryFn: careerApi.skills })
  const { data: opportunities } = useQuery({
    queryKey: ['career', 'opportunities'],
    queryFn: careerApi.opportunities,
  })

  const activeOpps = opportunities?.filter(o => !['rejected', 'closed'].includes(o.status)) ?? []
  const inPlay = opportunities?.filter(o => ['interview', 'offer'].includes(o.status)).length ?? 0

  return (
    <PageContainer>
      <PageContent>
        <PageHeader
          icon={<Briefcase />}
          eyebrow="Growth"
          title="Career"
          subtitle="Track the roles you're pursuing and where each one stands."
          actions={
            <>
              <Button variant="secondary" size="sm" onClick={() => setIsLogModalOpen(true)}>
                <Plus size={14} style={{ marginRight: 6 }} /> Log entry
              </Button>
              <Button variant="outline" size="sm" onClick={() => navigate('/app/career/settings')}>
                <Settings size={14} style={{ marginRight: 6 }} /> Settings
              </Button>
            </>
          }
        />

        <KpiGrid>
          <KpiCard label="Active pipeline" value={String(activeOpps.length)} color="primary" icon={Briefcase} />
          <KpiCard
            label="In play"
            value={String(inPlay)}
            color={inPlay > 0 ? 'emerald' : undefined}
            icon={Activity}
          />
          <KpiCard label="Skills tracked" value={String(skills?.length ?? 0)} icon={BookOpen} />
        </KpiGrid>

        <OpportunitiesTab />

        <CareerLogModal open={isLogModalOpen} onClose={() => setIsLogModalOpen(false)} />
      </PageContent>
    </PageContainer>
  )
}
