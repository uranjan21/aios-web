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
import { useQuery } from '@tanstack/react-query'
import { Activity, BookOpen, Briefcase } from 'lucide-react'
import { PageContainer, PageContent } from '@ct/shared/components/layout/PageLayout'
import { ErrorState, KpiCard, KpiGrid, SkeletonKpiRow } from '@ledgr/ui'
import { useAreaSection } from '@ct/shared/hooks/useAreaSection'
import { JournalSection } from '@ct/career/components/JournalSection'
import { OpportunitiesSection } from '@ct/career/components/sections/OpportunitiesSection'
import { SkillsSection } from '@ct/career/components/sections/SkillsSection'
import { LearningSection } from '@ct/career/components/sections/LearningSection'
import { ExperienceSection } from '@ct/career/components/sections/ExperienceSection'
import { careerApi } from '@ct/shared/api/areas'

export function CareerPage() {
  // Career gained a two-page IA on 2026-08-01: Journal (Phase 5 — no model
  // yet) and Opportunities. Journal is the area's landing page in the design,
  // so /app/career resolves to it.
  const section = useAreaSection('/app/career', 'journal')

  /*
   * Handled in place below rather than thrown to the route (F1) — see App.tsx.
   * These two drive the KPI strip, so a failed request used to render "0 active
   * pipeline / 0 in play": a confident, wrong answer about someone's job search.
   */
  const skillsQ = useQuery({
    queryKey: ['career', 'skills'],
    queryFn: careerApi.skills,
    meta: { inlineError: true },
  })
  const opportunitiesQ = useQuery({
    queryKey: ['career', 'opportunities'],
    queryFn: careerApi.opportunities,
    meta: { inlineError: true },
  })

  const skills = skillsQ.data
  const opportunities = opportunitiesQ.data
  const kpisFailed = skillsQ.isError || opportunitiesQ.isError
  const kpisLoading = skillsQ.isLoading || opportunitiesQ.isLoading

  const activeOpps = opportunities?.filter(o => !['rejected', 'closed'].includes(o.status)) ?? []
  const inPlay = opportunities?.filter(o => ['interview', 'offer'].includes(o.status)).length ?? 0

  return (
    <PageContainer>
      <PageContent>
        {/* No header block and nothing page-scoped (2026-08-03). Career
            Preferences is a nav destination now.

            "Log entry" was unmounted with it. It wrote through
            `careerApi.createEvent` to `/areas/career/events` — a table with no
            reader left in the app since the 2026-07-21 redesign deleted both
            timelines that rendered it (see the file header above). Saving the
            form changed nothing on screen. `CareerLogModal.tsx` is kept on disk,
            unreferenced; mount it again behind a card that actually shows career
            events if that surface comes back. */}

        {/*
          TWO DESTINATIONS, NOT FIVE (2026-08-23).

          Career carried journal / skills / learning / experience /
          opportunities — five nav rows for what is entirely manual text entry,
          making it the thinnest area holding the most navigation weight while
          19 of the app's 31 destinations were already per-domain CRUD. The
          content is unchanged; it is grouped by the question being asked
          rather than by table:

            Journal  — the record: what happened, and where you worked.
            Growth   — the gap and how it closes: skills, learning, pipeline.

          The old paths redirect (see router.tsx), so bookmarks survive.
        */}
        {section === 'growth' ? (
          <>
            {/* The KPI strip alone reports the failure — OpportunitiesSection
                owns its own request and stays mounted, so one dead endpoint
                does not take the pipeline down with it. */}
            {kpisFailed ? (
              <ErrorState
                title="We couldn't load your pipeline summary"
                description="Nothing has been lost — the request behind these figures failed."
                onRetry={() => { void skillsQ.refetch(); void opportunitiesQ.refetch() }}
              />
            ) : kpisLoading ? (
              <SkeletonKpiRow count={3} />
            ) : (
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
            )}

            <SkillsSection />
            <LearningSection />
            <OpportunitiesSection />
          </>
        ) : (
          <>
            <JournalSection />
            <ExperienceSection />
          </>
        )}
      </PageContent>
    </PageContainer>
  )
}
