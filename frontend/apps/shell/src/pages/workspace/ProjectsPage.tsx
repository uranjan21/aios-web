/**
 * Workspace → Projects.
 *
 * Phase 4 conversion to the canvas's `workspace:projects` design — a status
 * filter, a New button, and a five-column table. The old collapsible card grid
 * is replaced; the dialog and its mutations are unchanged, a row click opens
 * the editor, and Delete moved into the dialog footer because a table row has
 * no action column to hang it off.
 */
import { useMemo, useState, type ReactNode } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { FolderKanban, Trash2 } from 'lucide-react'
import { Button, Card, EmptyState, Input, Dialog, DialogFooter, Select, Label } from '@ledgr/ui'
import styled from 'styled-components'
import { toast } from 'sonner'
import { SWATCH_COLORS } from '@ct/shared/config/swatches'
import { workspaceApi, Project, ProjectPayload } from '@ct/shared/api/workspace'
import { goalsApi } from '@ct/shared/api/goals'
import { ModuleGrid, type ModuleSpec } from '@ct/shared/components/modules'
import { DOMAIN_OPTIONS, domainLabel } from '@ct/shared/config/domains'

const FormGrid = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => `${theme.spacing[3.5]}`};
`

const TwoCol = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: ${({ theme }) => `${theme.spacing[3]}`};
`

const STATUS_OPTIONS = [
  { label: 'Active', value: 'active' },
  { label: 'Paused', value: 'paused' },
  { label: 'Completed', value: 'completed' },
  { label: 'Archived', value: 'archived' },
]

const STATUS_FILTER_OPTIONS = [
  { label: 'All statuses', value: 'all' },
  ...STATUS_OPTIONS,
]

const PRIORITY_OPTIONS = [
  { label: 'Low', value: 'low' },
  { label: 'Medium', value: 'medium' },
  { label: 'High', value: 'high' },
  { label: 'Urgent', value: 'urgent' },
]

const COLOR_OPTIONS = SWATCH_COLORS

const STATUS_KEY: Record<string, string> = {
  active: 'accent',
  paused: 'warning',
  completed: 'success',
  archived: 'mutedFg',
}

const PRIORITY_KEY: Record<string, string> = {
  urgent: 'destructive',
  high: 'destructive',
  medium: 'info',
  low: 'mutedFg',
}

export function ProjectsSection({
  domainFilter,
  filterNode,
}: {
  domainFilter?: string
  /** PlanPage's shared domain filter, rendered in this card's header. */
  filterNode?: ReactNode
}) {
  const queryClient = useQueryClient()
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

  const filteredGoals = useMemo(() => goals.filter(g => g.category === domain), [goals, domain])

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

  const rows = useMemo(() => {
    const byDomain = domainFilter ? projects.filter(p => p.domain === domainFilter) : projects
    return statusFilter === 'all' ? byDomain : byDomain.filter(p => p.status === statusFilter)
  }, [projects, domainFilter, statusFilter])

  const modules = useMemo<ModuleSpec[]>(() => [{
    kind: 'table',
    span: 12,
    // Both filters belong to this table, so they ride in its own card header —
    // the status one used to float unanchored above the card, and the domain
    // one used to portal into a page header block.
    actionNode: (
      <>
        {filterNode}
        <Select
          size="sm"
          fullWidth={false}
          aria-label="Filter projects by status"
          value={statusFilter}
          onChange={v => setStatusFilter(v as string)}
          options={STATUS_FILTER_OPTIONS}
        />
      </>
    ),
    title: domainFilter ? `${domainLabel(domainFilter)} projects` : 'All projects',
    subtitle: `${rows.length} project${rows.length !== 1 ? 's' : ''} · click a row to edit`,
    icon: FolderKanban,
    action: '+ New project',
    onAction: () => setIsAddOpen(true),
    gridCols: '1.8fr 1fr 1.1fr 1fr 1.1fr',
    cols: [
      { l: 'Project' },
      { l: 'Area' },
      { l: 'Status' },
      { l: 'Priority' },
      { l: 'Due', a: 'right' },
    ],
    rows: rows.map(p => [
      { t: p.name, bold: true },
      domainLabel(p.domain || 'general'),
      { t: p.status || 'active', tag: true, colorKey: STATUS_KEY[p.status || 'active'] ?? 'accent' },
      { t: p.priority || 'medium', tag: true, colorKey: PRIORITY_KEY[p.priority || 'medium'] ?? 'info' },
      p.due_date
        ? new Date(p.due_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })
        : '—',
    ]),
    onRowClick: (i: number) => openEdit(rows[i]),
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }], [rows, domainFilter, statusFilter, filterNode])

  return (
    <>
      {!isLoading && rows.length === 0 ? (
        /* The filters ride the empty state too: without them, filtering to a
           combination that matches nothing unmounts the controls that caused it
           and the filter can never be cleared. */
        <Card
          icon={<FolderKanban size={16} />}
          title={domainFilter ? `${domainLabel(domainFilter)} projects` : 'All projects'}
          subtitle="Nothing here yet"
          action={
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              {filterNode}
              <Select
                size="sm"
                fullWidth={false}
                aria-label="Filter projects by status"
                value={statusFilter}
                onChange={v => setStatusFilter(v as string)}
                options={STATUS_FILTER_OPTIONS}
              />
            </div>
          }
        >
          <EmptyState
            icon={<FolderKanban size={24} />}
            title="No projects yet"
            description="Create a project to organise your sprints and tasks."
            action={<Button variant="primary" onClick={() => setIsAddOpen(true)}>Create project</Button>}
          />
        </Card>
      ) : (
        <ModuleGrid modules={modules} />
      )}

      <Dialog
        open={isOpen}
        onOpenChange={handleDialogClose}
        icon={<FolderKanban size={16} />}
        eyebrow="Workspace"
        title={editingProject ? 'Edit project' : 'New project'}
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
            <Label>Linked goal (optional)</Label>
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
            {editingProject && (
              <Button
                variant="destructive"
                size="sm"
                loading={deleteMutation.isPending}
                onClick={() => {
                  deleteMutation.mutate(editingProject.id)
                  handleDialogClose(false)
                }}
                style={{ marginRight: 'auto' }}
              >
                <Trash2 size={14} style={{ marginRight: 4 }} /> Delete
              </Button>
            )}
            <Button variant="outline" onClick={() => handleDialogClose(false)}>Cancel</Button>
            <Button
              variant="primary"
              disabled={!name.trim()}
              loading={createMutation.isPending || updateMutation.isPending}
              onClick={handleSave}
            >
              {editingProject ? 'Save changes' : 'Create project'}
            </Button>
          </DialogFooter>
        </FormGrid>
      </Dialog>
    </>
  )
}
