/**
 * Workspace → Sprints.
 *
 * Phase 4 conversion to the canvas's `workspace:sprints` design — a status
 * filter, a New button, and a sprint table. The old collapsible card grid is
 * replaced; the dialog and its mutations are unchanged, a row click opens the
 * editor, and Delete moved into the dialog footer because a table row has no
 * action column to hang it off.
 */
import { useMemo, useState, type ReactNode } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Zap, Trash2 } from 'lucide-react'
import { Button, Card, EmptyState, Input, Dialog, DialogFooter, Select, Label } from '@ledgr/ui'
import styled from 'styled-components'
import { toast } from 'sonner'
import { workspaceApi, Sprint, SprintPayload } from '@ct/shared/api/workspace'
import { ModuleGrid, type ModuleSpec } from '@ct/shared/components/modules'
import { domainLabel } from '@ct/shared/config/domains'

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
  { label: 'Planned', value: 'planned' },
  { label: 'Active', value: 'active' },
  { label: 'Completed', value: 'completed' },
]

const STATUS_FILTER_OPTIONS = [{ label: 'All statuses', value: 'all' }, ...STATUS_OPTIONS]

const STATUS_KEY: Record<string, string> = {
  planned: 'info',
  active: 'accent',
  completed: 'success',
}

function fmtDate(d?: string) {
  if (!d) return null
  return new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })
}

export function SprintsSection({
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
  const [projectId, setProjectId] = useState('')
  const [goals, setGoals] = useState('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [status, setStatus] = useState('planned')
  const [capacity, setCapacity] = useState('')
  const [editingSprint, setEditingSprint] = useState<Sprint | null>(null)

  const { data: projects = [] } = useQuery({
    queryKey: ['workspace', 'projects'],
    queryFn: workspaceApi.getProjects,
    staleTime: 60_000,
  })

  const { data: sprints = [], isLoading } = useQuery({
    queryKey: ['workspace', 'sprints'],
    queryFn: () => workspaceApi.getSprints(),
    staleTime: 60_000,
  })

  const resetForm = () => {
    setName(''); setProjectId(''); setGoals('')
    setStartDate(''); setEndDate(''); setStatus('planned'); setCapacity('')
  }

  const openEdit = (s: Sprint) => {
    setEditingSprint(s)
    setName(s.name)
    setProjectId(s.project_id)
    setGoals(s.goals || '')
    setStartDate(s.start_date || '')
    setEndDate(s.end_date || '')
    setStatus(s.status || 'planned')
    setCapacity(s.capacity ? String(s.capacity) : '')
  }

  const createMutation = useMutation({
    mutationFn: workspaceApi.createSprint,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workspace', 'sprints'] })
      queryClient.invalidateQueries({ queryKey: ['workspace', 'stats'] })
      setIsAddOpen(false); resetForm()
      toast.success('Sprint created')
    },
    onError: () => toast.error('Could not create sprint'),
  })

  const updateMutation = useMutation({
    mutationFn: (data: SprintPayload) => workspaceApi.updateSprint(editingSprint!.id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workspace', 'sprints'] })
      setEditingSprint(null); resetForm()
      toast.success('Sprint updated')
    },
    onError: () => toast.error('Could not update sprint'),
  })

  const deleteMutation = useMutation({
    mutationFn: workspaceApi.deleteSprint,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workspace', 'sprints'] })
      queryClient.invalidateQueries({ queryKey: ['workspace', 'stats'] })
      toast.success('Sprint deleted')
    },
    onError: () => toast.error('Could not delete sprint'),
  })

  const handleSave = () => {
    if (editingSprint) {
      updateMutation.mutate({
        name,
        project_id: projectId,
        goals: goals || null,
        start_date: startDate || null,
        end_date: endDate || null,
        status,
        capacity: capacity ? parseInt(capacity, 10) : null,
      })
    } else {
      createMutation.mutate({
        name,
        project_id: projectId,
        goals: goals || undefined,
        start_date: startDate || undefined,
        end_date: endDate || undefined,
        status,
        capacity: capacity ? parseInt(capacity, 10) : undefined,
      })
    }
  }

  const handleDialogClose = (open: boolean) => {
    if (!open) { setIsAddOpen(false); setEditingSprint(null); resetForm() }
  }

  const isOpen = isAddOpen || !!editingSprint
  const projectOptions = [
    { label: 'Select a project…', value: '' },
    ...projects.map(p => ({ label: p.name, value: p.id })),
  ]

  const rows = useMemo(() => {
    /** A sprint inherits its area from the project it belongs to. */
    const domainOf = (s: Sprint) => projects.find(p => p.id === s.project_id)?.domain || 'general'
    const byDomain = domainFilter ? sprints.filter(s => domainOf(s) === domainFilter) : sprints
    return statusFilter === 'all' ? byDomain : byDomain.filter(s => s.status === statusFilter)
  }, [sprints, projects, domainFilter, statusFilter])

  const modules = useMemo<ModuleSpec[]>(() => [{
    kind: 'table',
    span: 12,
    // Both belong to this table — see ProjectsPage.
    actionNode: (
      <>
        {filterNode}
        <Select
          size="sm"
          fullWidth={false}
          aria-label="Filter sprints by status"
          value={statusFilter}
          onChange={v => setStatusFilter(v as string)}
          options={STATUS_FILTER_OPTIONS}
        />
      </>
    ),
    title: domainFilter ? `${domainLabel(domainFilter)} sprints` : 'All sprints',
    subtitle: `${rows.length} sprint${rows.length !== 1 ? 's' : ''} · click a row to edit`,
    icon: Zap,
    action: '+ New sprint',
    onAction: () => setIsAddOpen(true),
    gridCols: '1.6fr 1.3fr 1.4fr 0.8fr 1fr',
    cols: [
      { l: 'Sprint' },
      { l: 'Project' },
      { l: 'Dates' },
      { l: 'Capacity', a: 'right' },
      { l: 'Status', a: 'right' },
    ],
    rows: rows.map(s => [
      { t: s.name, bold: true },
      projects.find(p => p.id === s.project_id)?.name ?? 'Unknown project',
      s.start_date || s.end_date
        ? `${fmtDate(s.start_date) ?? '—'} → ${fmtDate(s.end_date) ?? '—'}`
        : 'No dates set',
      s.capacity ? `${s.capacity} pts` : '—',
      { t: s.status || 'planned', tag: true, colorKey: STATUS_KEY[s.status || 'planned'] ?? 'info' },
    ]),
    onRowClick: (i: number) => openEdit(rows[i]),
     
  }], [rows, projects, domainFilter, statusFilter, filterNode])

  return (
    <>
      {!isLoading && rows.length === 0 ? (
        /* Filters ride the empty state too — see ProjectsPage. */
        <Card
          icon={<Zap size={16} />}
          title={domainFilter ? `${domainLabel(domainFilter)} sprints` : 'All sprints'}
          subtitle="Nothing here yet"
          action={
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              {filterNode}
              <Select
                size="sm"
                fullWidth={false}
                aria-label="Filter sprints by status"
                value={statusFilter}
                onChange={v => setStatusFilter(v as string)}
                options={STATUS_FILTER_OPTIONS}
              />
            </div>
          }
        >
          <EmptyState
            icon={<Zap size={24} />}
            title="No sprints yet"
            description="Create a sprint to focus your tasks for a time period."
            action={<Button variant="primary" onClick={() => setIsAddOpen(true)}>Create sprint</Button>}
          />
        </Card>
      ) : (
        <ModuleGrid modules={modules} />
      )}

      <Dialog
        open={isOpen}
        onOpenChange={handleDialogClose}
        icon={<Zap size={16} />}
        eyebrow="Workspace"
        title={editingSprint ? 'Edit sprint' : 'New sprint'}
        description="Define the scope and timeline for this iteration."
        size="md"
      >
        <FormGrid>
          <div>
            <Label>Project</Label>
            <Select value={projectId} onChange={v => setProjectId(v as string)} options={projectOptions} />
          </div>
          <div>
            <Label htmlFor="sprint-name">Sprint name</Label>
            <Input id="sprint-name" value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Sprint 12 — Launch" />
          </div>
          <div>
            <Label htmlFor="sprint-goals">Sprint goal</Label>
            <Input id="sprint-goals" value={goals} onChange={e => setGoals(e.target.value)} placeholder="What does this sprint aim to deliver?" />
          </div>
          <TwoCol>
            <div>
              <Label htmlFor="sprint-start">Start date</Label>
              <Input id="sprint-start" type="date" value={startDate} onChange={e => setStartDate(e.target.value)} />
            </div>
            <div>
              <Label htmlFor="sprint-end">End date</Label>
              <Input id="sprint-end" type="date" value={endDate} onChange={e => setEndDate(e.target.value)} />
            </div>
          </TwoCol>
          <TwoCol>
            <div>
              <Label htmlFor="sprint-cap">Capacity (story pts)</Label>
              <Input id="sprint-cap" type="number" min="0" step="1" value={capacity} onChange={e => setCapacity(e.target.value)} placeholder="e.g. 40" />
            </div>
            {editingSprint && (
              <div>
                <Label>Status</Label>
                <Select value={status} onChange={v => setStatus(v as string)} options={STATUS_OPTIONS} />
              </div>
            )}
          </TwoCol>
          <DialogFooter>
            {editingSprint && (
              <Button
                variant="destructive"
                size="sm"
                loading={deleteMutation.isPending}
                onClick={() => {
                  deleteMutation.mutate(editingSprint.id)
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
              disabled={!projectId || !name.trim()}
              loading={createMutation.isPending || updateMutation.isPending}
              onClick={handleSave}
            >
              {editingSprint ? 'Save changes' : 'Create sprint'}
            </Button>
          </DialogFooter>
        </FormGrid>
      </Dialog>
    </>
  )
}
