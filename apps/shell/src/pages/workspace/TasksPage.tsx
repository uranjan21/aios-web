import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Plus, ListTodo, LayoutGrid, List, LayoutDashboard, IndianRupee, Heart, Briefcase, Settings
} from 'lucide-react'
import {
  Button, Card, EmptyState, Input, Dialog, DialogFooter,
  Select, Label, SegmentedControl, PageHeader,
} from '@ledgr/ui'
import { workspaceApi, Task, TaskPayload } from '@aios/shared/api/workspace'
import { goalsApi } from '@aios/shared/api/goals'
import { PageContainer, PageContent } from '@aios/shared/components/layout/PageLayout'
import { AreaTabs } from '@aios/shared/components/ui/AreaTabs'
import { toast } from 'sonner'

import { PRIORITY_OPTIONS, STATUS_OPTIONS, STATUS_FILTER_OPTIONS, DOMAIN_OPTIONS, domainLabel } from './tasks/constants'
import { ViewToggle, FormGrid, TwoCol } from './tasks/TasksPage.styles'
import { TaskCard } from './tasks/TaskCard'
import { TaskRowItem } from './tasks/TaskRowItem'
import { TaskGroup } from './tasks/TaskGroup'

/* ── Main page ─────────────────────────────────────────────────────── */

export function TasksPage() {
  const queryClient = useQueryClient()
  const navigate = useNavigate()
  const [isAddOpen, setIsAddOpen] = useState(false)
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [projectId, setProjectId] = useState('')
  const [sprintId, setSprintId] = useState('')
  const [goalId, setGoalId] = useState('')
  const [priority, setPriority] = useState('medium')
  const [status, setStatus] = useState('todo')
  const [dueDate, setDueDate] = useState('')
  const [domain, setDomain] = useState('general')
  const [labels, setLabels] = useState('')
  const [editingTask, setEditingTask] = useState<Task | null>(null)
  const [statusFilter, setStatusFilter] = useState('all')
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list')
  const [activeTab, setActiveTab] = useState('overview')

  const { data: projects = [] } = useQuery({ queryKey: ['workspace', 'projects'], queryFn: workspaceApi.getProjects, staleTime: 60_000 })
  const { data: sprints = [] } = useQuery({ queryKey: ['workspace', 'sprints'], queryFn: () => workspaceApi.getSprints(), staleTime: 60_000 })
  const { data: goals = [] } = useQuery({ queryKey: ['goals'], queryFn: goalsApi.list, staleTime: 60_000 })
  const { data: tasks = [], isLoading } = useQuery({ queryKey: ['workspace', 'tasks'], queryFn: () => workspaceApi.getTasks(), staleTime: 60_000 })

  const filteredGoals = useMemo(() => goals.filter(g => g.category === domain), [goals, domain])

  const filteredProjects = useMemo(() => {
    return projects.filter(p => (p.domain || 'general') === domain)
  }, [projects, domain])

  const filteredSprints = useMemo(() => {
    if (!projectId) {
      const domainProjectIds = filteredProjects.map(p => p.id)
      return sprints.filter(s => domainProjectIds.includes(s.project_id))
    }
    return sprints.filter(s => s.project_id === projectId)
  }, [sprints, projectId, filteredProjects])

  const handleDomainChange = (newDomain: string) => {
    setDomain(newDomain)
    if (!goals.some(g => g.id === goalId && g.category === newDomain)) setGoalId('')
    if (!projects.some(p => p.id === projectId && p.domain === newDomain)) {
      setProjectId('')
      setSprintId('')
    }
  }

  const handleProjectChange = (projId: string) => {
    setProjectId(projId)
    if (projId) {
      const proj = projects.find(p => p.id === projId)
      if (proj?.domain) {
        setDomain(proj.domain)
        if (!goals.some(g => g.id === goalId && g.category === proj.domain)) setGoalId('')
      }
    }
    if (!sprints.some(s => s.id === sprintId && s.project_id === projId)) setSprintId('')
  }

  const handleSprintChange = (sprId: string) => {
    setSprintId(sprId)
    if (sprId) {
      const sprint = sprints.find(s => s.id === sprId)
      if (sprint) {
        setProjectId(sprint.project_id)
        const proj = projects.find(p => p.id === sprint.project_id)
        if (proj?.domain) {
          setDomain(proj.domain)
          if (!goals.some(g => g.id === goalId && g.category === proj.domain)) setGoalId('')
        }
      }
    }
  }

  const resetForm = () => {
    setTitle(''); setDescription(''); setProjectId(''); setSprintId('')
    setGoalId(''); setPriority('medium'); setStatus('todo'); setDueDate(''); setDomain('general'); setLabels('')
  }

  const openEdit = (t: Task) => {
    setEditingTask(t)
    setTitle(t.title); setDescription(t.description || '')
    setProjectId(t.project_id || ''); setSprintId(t.sprint_id || '')
    setGoalId(t.goal_id || ''); setPriority(t.priority || 'medium')
    setStatus(t.status || 'todo'); setDueDate(t.due_date || '')
    setDomain(t.domain || 'general'); setLabels(t.labels || '')
  }

  const createMutation = useMutation({
    mutationFn: workspaceApi.createTask,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workspace', 'tasks'] })
      queryClient.invalidateQueries({ queryKey: ['workspace', 'stats'] })
      setIsAddOpen(false); resetForm()
      toast.success('Task created')
    },
    onError: () => toast.error('Could not create task'),
  })

  const updateStatusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) => workspaceApi.updateTask(id, { status }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workspace', 'tasks'] })
      queryClient.invalidateQueries({ queryKey: ['workspace', 'stats'] })
    },
    onError: () => toast.error('Could not update task'),
  })

  const updateMutation = useMutation({
    mutationFn: (data: TaskPayload) => workspaceApi.updateTask(editingTask!.id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workspace', 'tasks'] })
      setEditingTask(null); resetForm()
      toast.success('Task updated')
    },
    onError: () => toast.error('Could not update task'),
  })

  const deleteMutation = useMutation({
    mutationFn: workspaceApi.deleteTask,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workspace', 'tasks'] })
      queryClient.invalidateQueries({ queryKey: ['workspace', 'stats'] })
      toast.success('Task deleted')
    },
    onError: () => toast.error('Could not delete task'),
  })

  const handleSave = () => {
    if (editingTask) {
      updateMutation.mutate({
        title, description: description || null,
        project_id: projectId || null, sprint_id: sprintId || null,
        goal_id: goalId || null, priority, status,
        due_date: dueDate || null, domain,
        labels: labels || null,
      })
    } else {
      createMutation.mutate({
        title, description: description || undefined,
        project_id: projectId || undefined, sprint_id: sprintId || undefined,
        goal_id: goalId || undefined, priority, status,
        due_date: dueDate || undefined, domain,
        labels: labels || undefined,
      })
    }
  }

  const handleDialogClose = (open: boolean) => {
    if (!open) { setIsAddOpen(false); setEditingTask(null); resetForm() }
  }

  const toggle = (t: Task) => updateStatusMutation.mutate({ id: t.id, status: t.status === 'done' ? 'todo' : 'done' })

  const projectOptions = useMemo(() => [
    { label: 'None', value: '' }, ...filteredProjects.map(p => ({ label: p.name, value: p.id }))
  ], [filteredProjects])

  const sprintOptions = useMemo(() => [
    { label: 'None', value: '' }, ...filteredSprints.map(s => ({ label: s.name, value: s.id }))
  ], [filteredSprints])

  const goalOptions = useMemo(() => [
    { label: 'None', value: '' }, ...filteredGoals.map(g => ({ label: g.title, value: g.id }))
  ], [filteredGoals])

  function renderTask(t: Task) {
    const props = {
      t, sprints, projects,
      onToggle: () => toggle(t),
      onEdit: () => openEdit(t),
      onDelete: () => deleteMutation.mutate(t.id),
    }
    if (viewMode === 'grid') return <TaskCard key={t.id} {...props} />
    return <TaskRowItem key={t.id} {...props} />
  }

  const renderTabContent = (domainFilter?: string) => {
    const domainTasks = domainFilter
      ? tasks.filter(t => t.domain === domainFilter)
      : tasks

    const statusFilteredTasks = statusFilter === 'all'
      ? domainTasks
      : domainTasks.filter(t => t.status === statusFilter)

    const hasTasks = domainTasks.length > 0
    const count = statusFilteredTasks.length
    const cardTitle = domainFilter
      ? `${domainLabel(domainFilter)} Tasks`
      : 'All Tasks'

    const content = !isLoading && !hasTasks ? (
      <EmptyState
        icon={<ListTodo size={24} />}
        title="No tasks yet"
        description="Create a task to start tracking your work."
        action={<Button variant="primary" onClick={() => setIsAddOpen(true)}>Create Task</Button>}
      />
    ) : (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
        {projects
          .filter(p => statusFilteredTasks.some(t => t.project_id === p.id))
          .map(p => {
            const ptasks = statusFilteredTasks.filter(t => t.project_id === p.id)
            return (
              <TaskGroup
                key={p.id}
                sectionId={`tasks-${domainFilter || 'all'}-project-${p.id}`}
                label={p.name}
                tasks={ptasks}
                isGrid={viewMode === 'grid'}
                renderItem={renderTask}
              />
            )
          })}
        {statusFilteredTasks.filter(t => !t.project_id).length > 0 && (
          <TaskGroup
            sectionId={`tasks-${domainFilter || 'all'}-project-unassigned`}
            label="No Project"
            tasks={statusFilteredTasks.filter(t => !t.project_id)}
            isGrid={viewMode === 'grid'}
            renderItem={renderTask}
          />
        )}
        {statusFilteredTasks.length === 0 && domainTasks.length > 0 && (
          <div style={{ textAlign: 'center', padding: '24px 0', color: 'var(--muted-foreground)', fontSize: 13 }}>
            No {statusFilter === 'all' ? '' : statusFilter.replace('_', ' ')} tasks.
          </div>
        )}
      </div>
    )

    return (
      <Card
        icon={<ListTodo size={16} />}
        title={cardTitle}
        subtitle={`${count} task${count !== 1 ? 's' : ''}`}
        action={
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <SegmentedControl
              value={statusFilter}
              onChange={setStatusFilter}
              options={STATUS_FILTER_OPTIONS}
              size="sm"
            />
            <ViewToggle>
              <Button
                variant={viewMode === 'list' ? 'primary' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('list')}
                aria-label="List view"
              >
                <List size={14} />
              </Button>
              <Button
                variant={viewMode === 'grid' ? 'primary' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('grid')}
                aria-label="Grid view"
              >
                <LayoutGrid size={14} />
              </Button>
            </ViewToggle>
            <Button variant="primary" size="sm" onClick={() => setIsAddOpen(true)}>
              <Plus size={14} style={{ marginRight: 6 }} /> New Task
            </Button>
          </div>
        }
      >
        {content}
      </Card>
    )
  }

  return (
    <PageContainer>
      <PageContent>
        <PageHeader
          icon={<ListTodo />}
          eyebrow="Workspace"
          title="Tasks"
          subtitle="Track your work across projects, sprints, and life areas"
          actions={
            <Button variant="outline" size="sm" onClick={() => navigate('/app/settings')}>
              <Settings size={14} style={{ marginRight: 6 }} /> Settings
            </Button>
          }
        />
        <AreaTabs
          activeKey={activeTab}
          onChange={setActiveTab}
          items={[
            {
              key: 'overview',
              label: <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}><LayoutDashboard size={14} /> Overview</span>,
              children: renderTabContent()
            },
            {
              key: 'finance',
              label: <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}><IndianRupee size={14} /> Finance</span>,
              children: renderTabContent('finance')
            },
            {
              key: 'health',
              label: <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}><Heart size={14} /> Health</span>,
              children: renderTabContent('health')
            },
            {
              key: 'career',
              label: <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}><Briefcase size={14} /> Career</span>,
              children: renderTabContent('career')
            }
          ]}
        />

        <Dialog
          open={isAddOpen || !!editingTask}
          onOpenChange={handleDialogClose}
          icon={<ListTodo size={16} />}
          eyebrow="Workspace"
          title={editingTask ? 'Edit Task' : 'New Task'}
          description="Assign to a project, sprint, and life area so it shows up in the right views."
          size="md"
        >
          <FormGrid>
            <div>
              <Label htmlFor="task-title">Task title</Label>
              <Input id="task-title" value={title} onChange={e => setTitle(e.target.value)} placeholder="What needs to be done?" autoFocus />
            </div>
            <div>
              <Label htmlFor="task-desc">Description (optional)</Label>
              <Input id="task-desc" value={description} onChange={e => setDescription(e.target.value)} placeholder="Context or acceptance criteria…" />
            </div>

            <TwoCol>
              <div>
                <Label>Priority</Label>
                <Select value={priority} onChange={v => setPriority(v as string)} options={PRIORITY_OPTIONS} />
              </div>
              <div>
                <Label>Status</Label>
                <Select value={status} onChange={v => setStatus(v as string)} options={STATUS_OPTIONS} />
              </div>
            </TwoCol>

            <TwoCol>
              <div>
                <Label>Area / Domain</Label>
                <Select value={domain} onChange={v => handleDomainChange(v as string)} options={DOMAIN_OPTIONS} />
              </div>
              <div>
                <Label htmlFor="task-due">Due date</Label>
                <Input id="task-due" type="date" value={dueDate} onChange={e => setDueDate(e.target.value)} />
              </div>
            </TwoCol>

            <div>
              <Label>Project (optional)</Label>
              <Select value={projectId} onChange={v => handleProjectChange(v as string)} options={projectOptions} />
            </div>

            <div>
              <Label>Sprint (optional)</Label>
              <Select value={sprintId} onChange={v => handleSprintChange(v as string)} options={sprintOptions} />
            </div>

            <div>
              <Label>Linked Goal (optional)</Label>
              <Select value={goalId} onChange={v => setGoalId(v as string)} options={goalOptions} />
            </div>

            <div>
              <Label htmlFor="task-labels">Labels (comma-separated)</Label>
              <Input id="task-labels" value={labels} onChange={e => setLabels(e.target.value)} placeholder="bug, frontend, backend" />
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => handleDialogClose(false)}>Cancel</Button>
              <Button
                variant="primary"
                disabled={!title.trim()}
                loading={createMutation.isPending || updateMutation.isPending}
                onClick={handleSave}
              >
                {editingTask ? 'Save Changes' : 'Create Task'}
              </Button>
            </DialogFooter>
          </FormGrid>
        </Dialog>
      </PageContent>
    </PageContainer>
  )
}
