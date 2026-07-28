/**
 * Plan — one page for Goals, Projects, Sprints and Tasks.
 *
 * This replaces four separate pages that each carried the identical six-tab
 * strip (Overview + one tab per life domain). That was 24 tabs implementing
 * what are really four instances of one dropdown filter, and every tab was a
 * verbatim copy of `renderTabContent(domain)` with a different string.
 *
 * The four pages are now section components with a `domainFilter` prop; this
 * page owns the entity switcher and the single shared domain filter. Both live
 * in the URL so a view is linkable and survives a refresh — the old tab state
 * was component-local and reset on every navigation.
 */
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Button, PageHeader, Select } from '@ledgr/ui';
import { ModuleLayout } from '@ct/shared/components/layout/ModuleLayout';
import { ModuleSidebar } from '@ct/shared/components/layout/ModuleSidebar';
import { PageDivider } from '@ct/shared/components/layout/PageDivider';
import { DOMAIN_OPTIONS } from '@ct/shared/config/domains';
import { Settings, Target, Briefcase, Activity, ListChecks } from 'lucide-react';

import { GoalsSection } from '@/pages/GoalsPage';
import { ProjectsSection } from '@/pages/workspace/ProjectsPage';
import { SprintsSection } from '@/pages/workspace/SprintsPage';
import { TasksSection } from '@/pages/workspace/TasksPage';

type Entity = 'goals' | 'projects' | 'sprints' | 'tasks';

const DOMAIN_FILTER_OPTIONS = [{ label: 'All domains', value: 'all' }, ...DOMAIN_OPTIONS];

export function PlanPage() {
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();

  const entity = (params.get('view') ?? 'goals') as Entity;
  const domainParam = params.get('domain') ?? 'all';
  const domainFilter = domainParam === 'all' ? undefined : domainParam;

  const setParam = (key: string, value: string) => {
    const next = new URLSearchParams(params);
    if (value === 'all' || (key === 'view' && value === 'goals')) next.delete(key);
    else next.set(key, value);
    setParams(next, { replace: true });
  };

  const groups = [
    {
      label: 'Planning',
      items: [
        { key: 'goals', label: 'Goals', icon: <Target size={14} /> },
        { key: 'projects', label: 'Projects', icon: <Briefcase size={14} /> },
        { key: 'sprints', label: 'Sprints', icon: <Activity size={14} /> },
        { key: 'tasks', label: 'Tasks', icon: <ListChecks size={14} /> },
      ]
    }
  ]

  const renderContent = () => {
    switch (entity) {
      case 'goals': return <GoalsSection domainFilter={domainFilter} />;
      case 'projects': return <ProjectsSection domainFilter={domainFilter} />;
      case 'sprints': return <SprintsSection domainFilter={domainFilter} />;
      case 'tasks': return <TasksSection domainFilter={domainFilter} />;
      default: return <GoalsSection domainFilter={domainFilter} />;
    }
  };

  return (
    <ModuleLayout
      header={
        <>
          <PageHeader
            icon={<Target />}
            eyebrow="Workspace"
            title="Plan"
            subtitle="Goals, projects, sprints and tasks across every life area"
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
        </>
      }
      sidebar={
        <ModuleSidebar
          groups={groups}
          activeKey={entity}
          onChange={(key) => setParam('view', key)}
        />
      }
    >
      {renderContent()}
    </ModuleLayout>
  );
}
