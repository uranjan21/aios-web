/**
 * Workspace — one page for Goals, Projects, Sprints, Milestones and Tasks.
 *
 * This replaces four separate pages that each carried the identical six-tab
 * strip (Overview + one tab per life domain). That was 24 tabs implementing
 * what are really four instances of one dropdown filter, and every tab was a
 * verbatim copy of `renderTabContent(domain)` with a different string.
 *
 * The four pages are now section components with a `domainFilter` prop; this
 * page owns the shared domain filter, which stays in the URL so a view is
 * linkable and survives a refresh.
 *
 * 2026-08-01: the entity switcher moved OUT of this page. It was a per-page
 * `ModuleSidebar` driven by `?view=`; the five entities are now routes under
 * /app/workspace/* in the global nav tree. Mounted at BOTH /app/workspace/:section
 * and the legacy /app/plan, which keeps working until Phase 5 turns /app/plan
 * into the week time-blocking planner.
 */
import { useSearchParams } from 'react-router-dom';
import { Select } from '@ledgr/ui';
import { PageContainer, PageContent } from '@ct/shared/components/layout/PageLayout';
import { DOMAIN_OPTIONS } from '@ct/shared/config/domains';
import { useAreaSection } from '@ct/shared/hooks/useAreaSection';

import { GoalsSection } from '@/pages/GoalsPage';
import { MilestonesSection } from '@/pages/workspace/MilestonesSection';
import { ProjectsSection } from '@/pages/workspace/ProjectsPage';
import { SprintsSection } from '@/pages/workspace/SprintsPage';
import { TasksSection } from '@/pages/workspace/TasksPage';

type Entity = 'goals' | 'projects' | 'sprints' | 'milestones' | 'tasks';

/*
 * The per-entity title and subtitle were dropped with the PageHeader on
 * 2026-08-02. Which entity you are looking at is the last breadcrumb in the
 * TopBar, which is where the redesign puts it.
 */
const DOMAIN_FILTER_OPTIONS = [{ label: 'All domains', value: 'all' }, ...DOMAIN_OPTIONS];

export function PlanPage() {
  const [params, setParams] = useSearchParams();

  // `?view=` is the legacy spelling; useAreaSection redirects it to the route.
  const entity = useAreaSection('/app/workspace', 'projects') as Entity;
  const domainParam = params.get('domain') ?? 'all';
  const domainFilter = domainParam === 'all' ? undefined : domainParam;

  const setParam = (key: string, value: string) => {
    const next = new URLSearchParams(params);
    if (value === 'all' || (key === 'view' && value === 'goals')) next.delete(key);
    else next.set(key, value);
    setParams(next, { replace: true });
  };

  /*
   * The domain filter is owned here — it survives an entity switch and lives in
   * the URL — but it RENDERS inside each section's primary card header, passed
   * down as `filterNode` (2026-08-03). It used to portal into a page header
   * block, and it was the last thing in the app keeping one alive.
   *
   * One element, five consumers: each section drops it into its own card's
   * `actionNode` next to that entity's status filter and New button, so the
   * controls a card responds to are all in that card's header.
   */
  const filterNode = (
    <Select
      size="sm"
      fullWidth={false}
      value={domainParam}
      onChange={(v) => setParam('domain', String(v))}
      options={DOMAIN_FILTER_OPTIONS}
      aria-label="Filter by life area"
    />
  );

  const renderContent = () => {
    switch (entity) {
      case 'goals': return <GoalsSection domainFilter={domainFilter} filterNode={filterNode} />;
      case 'projects': return <ProjectsSection domainFilter={domainFilter} filterNode={filterNode} />;
      case 'sprints': return <SprintsSection domainFilter={domainFilter} filterNode={filterNode} />;
      case 'tasks': return <TasksSection domainFilter={domainFilter} filterNode={filterNode} />;
      case 'milestones': return <MilestonesSection domainFilter={domainFilter} filterNode={filterNode} />;
      default: return <ProjectsSection domainFilter={domainFilter} filterNode={filterNode} />;
    }
  };

  return (
    <PageContainer>
      <PageContent>
          {renderContent()}
      </PageContent>
    </PageContainer>
  );
}
