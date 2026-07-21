import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, FolderKanban, Trash2, PencilLine, CalendarDays, Tag, LayoutDashboard, IndianRupee, Heart, Briefcase, Rocket, PenLine, Settings } from 'lucide-react'
import { Button, Card, EmptyState, Input, Dialog, DialogFooter, Select, Label } from '@ledgr/ui'
import { workspaceApi, Project, ProjectPayload } from '@aios/shared/api/workspace'
import { goalsApi } from '@aios/shared/api/goals'
import { PageContainer, PageContent } from '@aios/shared/components/layout/PageLayout'
import { PageDivider } from '@aios/shared/components/layout/PageDivider'
import { PageHeader } from '@ledgr/ui'
import styled from 'styled-components'
import { toast } from 'sonner'
import { AreaTabs } from '@aios/shared/components/ui/AreaTabs'
import { DOMAIN_OPTIONS, domainLabel } from '@aios/shared/config/domains'
import { CollapsibleSection } from '@aios/shared/components/workspace/CollapsibleSection'

const Grid = styled.div`
  display: grid;
  gap: 16px;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
`

const FormGrid = styled.div`
  display: flex;
  flex-direction: column;
  gap: 14px;
`

const TwoCol = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
`

const ProjectDesc = styled.div`
  color: ${({ theme }) => theme.color.mutedForeground};
  font-size: 13px;
  margin-bottom: 10px;
`

const CardMeta = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-top: 8px;
`

const MetaChip = styled.span<{ $tone?: 'accent' | 'warn' | 'default' }>`
  display: inline-flex;
  align-items: center;
  gap: 3px;
  font-size: 10px;
  font-weight: 600;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  padding: 2px 7px;
  border-radius: ${({ theme }) => theme.radii.sm};
  background: ${({ theme, $tone }) =>
    $tone === 'accent' ? `${theme.color.accent}18`
    : $tone === 'warn' ? `${theme.color.destructive}14`
    : `${theme.color.muted}`};
  color: ${({ theme, $tone }) =>
    $tone === 'accent' ? theme.color.accent
    : $tone === 'warn' ? theme.color.destructive
    : theme.color.mutedForeground};
`

const ColorDot = styled.span<{ $color: string }>`
  display: inline-block;
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: ${({ $color }) => $color};
  flex-shrink: 0;
`



const STATUS_OPTIONS = [
  { label: 'Active', value: 'active' },
  { label: 'Paused', value: 'paused' },
  { label: 'Completed', value: 'completed' },
  { label: 'Archived', value: 'archived' },
]

const STATUS_FILTER_OPTIONS = [
  { label: 'All statuses', value: 'all' },
  { label: 'Active', value: 'active' },
  { label: 'Paused', value: 'paused' },
  { label: 'Completed', value: 'completed' },
  { label: 'Archived', value: 'archived' },
]

const PRIORITY_OPTIONS = [
  { label: 'Low', value: 'low' },
  { label: 'Medium', value: 'medium' },
  { label: 'High', value: 'high' },
  { label: 'Urgent', value: 'urgent' },
]

const COLOR_OPTIONS = [
  { label: 'None', value: '' },
  { label: 'Amber', value: '#CA8A04' },
  { label: 'Teal', value: '#0D9488' },
  { label: 'Blue', value: '#3B82F6' },
  { label: 'Rose', value: '#F43F5E' },
  { label: 'Violet', value: '#8B5CF6' },
  { label: 'Slate', value: '#64748B' },
]

const PRIORITY_TONE: Record<string, 'accent' | 'warn' | 'default'> = {
  urgent: 'warn',
  high: 'accent',
  medium: 'default',
  low: 'default',
}

export function ProjectsPage() {
  const queryClient = useQueryClient()
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState('overview')
  const [statusFilter, setStatusFilter] = useState('all')
  const [isAddOpen, setIsAddOpen] = useState(false)
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [domain, setDomain] = useState('general')
  const [goalId, setGoalId] = useState<string>('')
  const [status, setStatus] = useState('active')
  const [priority, setPriority] = useState('medium')
  const [color, setColor] = useState('')
  const [dueDate, setDueDate] = useState('')
  const [labels, setLabels] = useState('')
  const [editingProject, setEditingProject] = useState<Project | null>(null)

  const { data: projects = [], isLoading } = useQuery({
    queryKey: ['workspace', 'projects'],
    queryFn: workspaceApi.getProjects,
    staleTime: 60_000,
  })

  const { data: goals = [] } = useQuery({
    queryKey: ['goals'],
    queryFn: goalsApi.list,
    staleTime: 60_000,
  })

  const filteredGoals = useMemo(() => {
    return goals.filter(g => g.category === domain)
  }, [goals, domain])

  const handleDomainChange = (newDomain: string) => {
    setDomain(newDomain)
    const isGoalValid = goals.some(g => g.id === goalId && g.category === newDomain)
    if (!isGoalValid) setGoalId('')
  }

  const resetForm = () => {
    setName(''); setDescription(''); setDomain('general'); setGoalId('')
    setStatus('active'); setPriority('medium'); setColor(''); setDueDate(''); setLabels('')
  }

  const openEdit = (p: Project) => {
    setEditingProject(p)
    setName(p.name)
    setDescription(p.description || '')
    setDomain(p.domain || 'general')
    setGoalId(p.goal_id || '')
    setStatus(p.status || 'active')
    setPriority(p.priority || 'medium')
    setColor(p.color || '')
    setDueDate(p.due_date || '')
    setLabels(p.labels || '')
  }

  const createMutation = useMutation({
    mutationFn: workspaceApi.createProject,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workspace', 'projects'] })
      queryClient.invalidateQueries({ queryKey: ['workspace', 'stats'] })
      setIsAddOpen(false); resetForm()
      toast.success('Project created')
    },
    onError: () => toast.error('Could not create project'),
  })

  const updateMutation = useMutation({
    mutationFn: (data: ProjectPayload) => workspaceApi.updateProject(editingProject!.id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workspace', 'projects'] })
      setEditingProject(null); resetForm()
      toast.success('Project updated')
    },
    onError: () => toast.error('Could not update project'),
  })

  const deleteMutation = useMutation({
    mutationFn: workspaceApi.deleteProject,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workspace', 'projects'] })
      queryClient.invalidateQueries({ queryKey: ['workspace', 'stats'] })
      toast.success('Project deleted')
    },
    onError: () => toast.error('Could not delete project'),
  })

  const handleSave = () => {
    if (editingProject) {
      updateMutation.mutate({
        name, description: description || null, domain, status, priority,
        color: color || null,
        due_date: dueDate || null,
        labels: labels || null,
        goal_id: goalId || null,
      })
    } else {
      createMutation.mutate({
        name, description: description || undefined, domain, status, priority,
        color: color || undefined,
        due_date: dueDate || undefined,
        labels: labels || undefined,
        goal_id: goalId || undefined,
      })
    }
  }

  const handleDialogClose = (open: boolean) => {
    if (!open) { setIsAddOpen(false); setEditingProject(null); resetForm() }
  }

  const isOpen = isAddOpen || !!editingProject

  const renderProjectsList = (list: Project[], loading: boolean) => {
    if (!loading && list.length === 0) {
      return (
        <EmptyState
          icon={<FolderKanban size={24} />}
          title="No projects yet"
          description="Create a project to organise your sprints and tasks."
          action={<Button variant="primary" onClick={() => setIsAddOpen(true)}>Create Project</Button>}
        />
      )
    }

    const active = list.filter(p => p.status === 'active' || !p.status)
    const paused = list.filter(p => p.status === 'paused')
    const completed = list.filter(p => p.status === 'completed')
    const archived = list.filter(p => p.status === 'archived')

    const renderSection = (statusKey: string, label: string, items: Project[]) => {
      if (items.length === 0) return null
      return (
        <CollapsibleSection
          key={statusKey}
          sectionId={`projects-${activeTab}-${statusKey}`}
          label={label}
          count={`${items.length} project${items.length !== 1 ? 's' : ''}`}
        >
          <Grid>
            {items.map((p) => (
              <Card
                key={p.id}
                title={p.name}
                subtitle={p.domain ? p.domain.charAt(0).toUpperCase() + p.domain.slice(1) : 'General'}
                icon={p.color ? <ColorDot $color={p.color} /> : <FolderKanban size={14} />}
                action={
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <MetaChip $tone={p.status === 'active' ? 'accent' : 'default'}>
                      {p.status}
                    </MetaChip>
                    <Button variant="ghost" size="sm" onClick={() => openEdit(p)} aria-label="Edit">
                      <PencilLine size={14} />
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => deleteMutation.mutate(p.id)} aria-label="Delete">
                      <Trash2 size={14} />
                    </Button>
                  </div>
                }
              >
                <ProjectDesc>{p.description || 'No description provided.'}</ProjectDesc>
                <CardMeta>
                  {(p.priority === 'high' || p.priority === 'urgent') && (
                    <MetaChip $tone={PRIORITY_TONE[p.priority || 'medium']}>
                      {p.priority}
                    </MetaChip>
                  )}
                  {p.due_date && (
                    <MetaChip>
                      <CalendarDays size={10} /> {new Date(p.due_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                    </MetaChip>
                  )}
                  {p.labels && p.labels.split(',').filter(Boolean).slice(0, 3).map(l => (
                    <MetaChip key={l}><Tag size={9} /> {l.trim()}</MetaChip>
                  ))}
                </CardMeta>
              </Card>
            ))}
          </Grid>
        </CollapsibleSection>
      )
    }

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
        {renderSection('active', 'Active', active)}
        {renderSection('paused', 'Paused', paused)}
        {renderSection('completed', 'Completed', completed)}
        {renderSection('archived', 'Archived', archived)}
      </div>
    )
  }

  const renderTabContent = (domainFilter?: string) => {
    const byDomain = domainFilter
      ? projects.filter(p => p.domain === domainFilter)
      : projects
    const byStatus = statusFilter === 'all'
      ? byDomain
      : byDomain.filter(p => p.status === statusFilter)

    const cardTitle = domainFilter
      ? `${domainLabel(domainFilter)} Projects`
      : 'All Projects'
    const count = byStatus.length
    const subtitle = `${count} project${count !== 1 ? 's' : ''}`

    return (
      <Card
        icon={<FolderKanban size={16} />}
        title={cardTitle}
        subtitle={subtitle}
        action={
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Select
              size="sm"
              fullWidth={false}
              value={statusFilter}
              onChange={v => setStatusFilter(v as string)}
              options={STATUS_FILTER_OPTIONS}
            />
            <Button variant="primary" size="sm" onClick={() => setIsAddOpen(true)}>
              <Plus size={14} style={{ marginRight: 6 }} /> New Project
            </Button>
          </div>
        }
      >
        {renderProjectsList(byStatus, isLoading)}
      </Card>
    )
  }

  return (
    <PageContainer>
      <PageContent>
        <PageHeader
          icon={<FolderKanban />}
          eyebrow="Workspace"
          title="Projects"
          subtitle="Cross-domain projects linked to your goals and sprints"
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
          open={isOpen}
          onOpenChange={handleDialogClose}
          icon={<FolderKanban size={16} />}
          eyebrow="Workspace"
          title={editingProject ? 'Edit Project' : 'New Project'}
          description="Organise work linked to goals, sprints, and tasks."
          size="md"
        >
          <FormGrid>
            <div>
              <Label htmlFor="proj-name">Project name</Label>
              <Input id="proj-name" value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Q3 Marketing Push" autoFocus />
            </div>
            <div>
              <Label htmlFor="proj-desc">Description</Label>
              <Input id="proj-desc" value={description} onChange={e => setDescription(e.target.value)} placeholder="What is this project about?" />
            </div>

            <TwoCol>
              <div>
                <Label>Domain / Area</Label>
                <Select value={domain} onChange={v => handleDomainChange(v as string)} options={DOMAIN_OPTIONS} />
              </div>
              <div>
                <Label>Priority</Label>
                <Select value={priority} onChange={v => setPriority(v as string)} options={PRIORITY_OPTIONS} />
              </div>
            </TwoCol>

            <TwoCol>
              <div>
                <Label htmlFor="proj-due">Due date</Label>
                <Input id="proj-due" type="date" value={dueDate} onChange={e => setDueDate(e.target.value)} />
              </div>
              <div>
                <Label>Color tag</Label>
                <Select value={color} onChange={v => setColor(v as string)} options={COLOR_OPTIONS} />
              </div>
            </TwoCol>

            <div>
              <Label>Linked Goal (optional)</Label>
              <Select
                value={goalId}
                onChange={v => setGoalId(v as string)}
                options={[{ label: 'None', value: '' }, ...filteredGoals.map(g => ({ label: g.title, value: g.id }))]}
              />
            </div>

            <div>
              <Label htmlFor="proj-labels">Labels (comma-separated)</Label>
              <Input id="proj-labels" value={labels} onChange={e => setLabels(e.target.value)} placeholder="mvp, q3, frontend" />
            </div>

            {editingProject && (
              <div>
                <Label>Status</Label>
                <Select value={status} onChange={v => setStatus(v as string)} options={STATUS_OPTIONS} />
              </div>
            )}

            <DialogFooter>
              <Button variant="outline" onClick={() => handleDialogClose(false)}>Cancel</Button>
              <Button
                variant="primary"
                disabled={!name.trim()}
                loading={createMutation.isPending || updateMutation.isPending}
                onClick={handleSave}
              >
                {editingProject ? 'Save Changes' : 'Create Project'}
              </Button>
            </DialogFooter>
          </FormGrid>
        </Dialog>
      </PageContent>
    </PageContainer>
  )
}
