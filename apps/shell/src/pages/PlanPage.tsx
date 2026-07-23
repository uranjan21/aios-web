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
import styled from 'styled-components';
import { Button, PageHeader, SegmentedControl, Select } from '@ledgr/ui';
import { PageContainer, PageContent } from '@ct/shared/components/layout/PageLayout';
import { PageDivider } from '@ct/shared/components/layout/PageDivider';
import { DOMAIN_OPTIONS } from '@ct/shared/config/domains';
import { Settings, Target } from 'lucide-react';

import { GoalsSection } from '@/pages/GoalsPage';
import { ProjectsSection } from '@/pages/workspace/ProjectsPage';
import { SprintsSection } from '@/pages/workspace/SprintsPage';
import { TasksSection } from '@/pages/workspace/TasksPage';

const ENTITIES = [
  { label: 'Goals', value: 'goals' },
  { label: 'Projects', value: 'projects' },
  { label: 'Sprints', value: 'sprints' },
  { label: 'Tasks', value: 'tasks' },
] as const;

type Entity = (typeof ENTITIES)[number]['value'];

/** "All domains" is the absence of a filter, not a domain of its own. */
const DOMAIN_FILTER_OPTIONS = [{ label: 'All domains', value: 'all' }, ...DOMAIN_OPTIONS];

const Toolbar = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: ${({ theme }) => theme.spacing[3]};
  flex-wrap: wrap;
  margin-bottom: ${({ theme }) => theme.spacing[5]};
`;

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

  const current = ENTITIES.find((e) => e.value === entity) ?? ENTITIES[0];

  return (
    <PageContainer>
      <PageContent>
        <PageHeader
          icon={<Target />}
          eyebrow="Workspace"
          title="Plan"
          subtitle="Goals, projects, sprints and tasks across every life area"
          actions={
            <Button variant="outline" size="sm" onClick={() => navigate('/app/settings')}>
              <Settings size={14} style={{ marginRight: 6 }} /> Settings
            </Button>
          }
        />
        <PageDivider />

        <Toolbar>
          <SegmentedControl
            size="sm"
            value={current.value}
            onChange={(v) => setParam('view', String(v))}
            options={ENTITIES.map((e) => ({ label: e.label, value: e.value }))}
          />
          <Select
            size="sm"
            fullWidth={false}
            value={domainParam}
            onChange={(v) => setParam('domain', String(v))}
            options={DOMAIN_FILTER_OPTIONS}
            aria-label="Filter by life area"
          />
        </Toolbar>

        {entity === 'goals' && <GoalsSection domainFilter={domainFilter} />}
        {entity === 'projects' && <ProjectsSection domainFilter={domainFilter} />}
        {entity === 'sprints' && <SprintsSection domainFilter={domainFilter} />}
        {entity === 'tasks' && <TasksSection domainFilter={domainFilter} />}
      </PageContent>
    </PageContainer>
  );
}
