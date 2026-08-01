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
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Button, PageHeader, Select } from '@ledgr/ui';
import { PageContainer, PageContent } from '@ct/shared/components/layout/PageLayout';
import { PageDivider } from '@ct/shared/components/layout/PageDivider';
import { DOMAIN_OPTIONS } from '@ct/shared/config/domains';
import { useAreaSection } from '@ct/shared/hooks/useAreaSection';
import { Settings, Target } from 'lucide-react';

import { GoalsSection } from '@/pages/GoalsPage';
import { MilestonesSection } from '@/pages/workspace/MilestonesSection';
import { ProjectsSection } from '@/pages/workspace/ProjectsPage';
import { SprintsSection } from '@/pages/workspace/SprintsPage';
import { TasksSection } from '@/pages/workspace/TasksPage';

type Entity = 'goals' | 'projects' | 'sprints' | 'milestones' | 'tasks';

const ENTITY_LABEL: Record<Entity, string> = {
  projects: 'Projects',
  goals: 'Goals',
  milestones: 'Milestones',
  sprints: 'Sprints',
  tasks: 'Tasks',
};

const ENTITY_SUBTITLE: Record<Entity, string> = {
  projects: 'Bodies of work, their timeline and how far along each one is',
  goals: 'The outcomes you are steering toward, across every life area',
  milestones: 'Dated checkpoints on the way to a goal',
  sprints: 'Time-boxed cycles and what shipped in each',
  tasks: 'Everything outstanding, grouped by project',
};

const DOMAIN_FILTER_OPTIONS = [{ label: 'All domains', value: 'all' }, ...DOMAIN_OPTIONS];

export function PlanPage() {
  const navigate = useNavigate();
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

  const renderContent = () => {
    switch (entity) {
      case 'goals': return <GoalsSection domainFilter={domainFilter} />;
      case 'projects': return <ProjectsSection domainFilter={domainFilter} />;
      case 'sprints': return <SprintsSection domainFilter={domainFilter} />;
      case 'tasks': return <TasksSection domainFilter={domainFilter} />;
      case 'milestones': return <MilestonesSection domainFilter={domainFilter} />;
      default: return <ProjectsSection domainFilter={domainFilter} />;
    }
  };

  return (
    <PageContainer>
      <PageContent>
          <PageHeader
            icon={<Target />}
            eyebrow="Workspace"
            title={ENTITY_LABEL[entity] ?? 'Workspace'}
            subtitle={ENTITY_SUBTITLE[entity] ?? 'Goals, projects, sprints and tasks across every life area'}
            actions={
              <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                <Select
                  size="sm"
                  fullWidth={false}
                  value={domainParam}
                  onChange={(v) => setParam('domain', String(v))}
                  options={DOMAIN_FILTER_OPTIONS}
                  aria-label="Filter by life area"
                />
                <Button variant="outline" size="sm" onClick={() => navigate('/app/settings')}>
                  <Settings size={14} style={{ marginRight: 6 }} /> Settings
                </Button>
              </div>
            }
          />
          <PageDivider />
          {renderContent()}
      </PageContent>
    </PageContainer>
  );
}
