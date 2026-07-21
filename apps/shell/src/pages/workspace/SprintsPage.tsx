import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, Zap, Trash2, PencilLine, CalendarRange, Target } from 'lucide-react'
import { Button, Card, EmptyState, Input, Dialog, DialogFooter, Select, Label } from '@ledgr/ui'
import { workspaceApi, Sprint, SprintPayload } from '@aios/shared/api/workspace'
import styled from 'styled-components'
import { toast } from 'sonner'
import { domainLabel } from '@aios/shared/config/domains'
import { CollapsibleSection } from '@aios/shared/components/workspace/CollapsibleSection'

const Grid = styled.div`
  display: grid;
  gap: ${({ theme }) => `${theme.spacing[4]}`};
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
`

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

const SprintGoals = styled.p`
  margin: ${({ theme }) => `0 0 ${theme.spacing[2]}`};
  font-size: ${({ theme }) => theme.typography.fontSize.sm};
  line-height: 1.5;
  color: ${({ theme }) => theme.color.mutedForeground};
`

const SprintMeta = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: ${({ theme }) => `${theme.spacing[2]}`};
  margin-top: ${({ theme }) => `${theme.spacing[2]}`};
`

const MetaItem = styled.span`
  display: inline-flex;
  align-items: center;
  gap: ${({ theme }) => `${theme.spacing[1]}`};
  font-size: ${({ theme }) => theme.typography.fontSize.xs};
  color: ${({ theme }) => theme.color.mutedForeground};
`

const MetaChip = styled.span<{ $tone?: 'accent' | 'default' }>`
  display: inline-flex;
  align-items: center;
  gap: ${({ theme }) => `${theme.spacing[0.5]}`};
  font-size: ${({ theme }) => theme.typography.fontSize.xs};
  font-weight: 600;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  padding: ${({ theme }) => `${theme.spacing[0.5]} ${theme.spacing[1.5]}`};
  border-radius: ${({ theme }) => theme.radii.sm};
  background: ${({ theme, $tone }) => $tone === 'accent' ? `${theme.color.accent}18` : theme.color.muted};
  color: ${({ theme, $tone }) => $tone === 'accent' ? theme.color.accent : theme.color.mutedForeground};
`

const STATUS_OPTIONS = [
  { label: 'Planned', value: 'planned' },
  { label: 'Active', value: 'active' },
  { label: 'Completed', value: 'completed' },
]

const STATUS_FILTER_OPTIONS = [
  { label: 'All statuses', value: 'all' },
  { label: 'Planned', value: 'planned' },
  { label: 'Active', value: 'active' },
  { label: 'Completed', value: 'completed' },
]



function fmtDate(d?: string) {
  if (!d) return null
  return new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })
}

export function SprintsSection({ domainFilter }: { domainFilter?: string }) {
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

  const getSprintDomain = (sprint: Sprint) => {
    const project = projects.find(p => p.id === sprint.project_id)
    return project?.domain || 'general'
  }

  const renderSprintsList = (list: Sprint[], loading: boolean) => {
    if (!loading && list.length === 0) {
      return (
        <EmptyState
          icon={<Zap size={24} />}
          title="No sprints yet"
          description="Create a sprint to focus your tasks for a time period."
          action={<Button variant="primary" onClick={() => setIsAddOpen(true)}>Create Sprint</Button>}
        />
      )
    }

    const active = list.filter(s => s.status === 'active')
    const planned = list.filter(s => s.status === 'planned' || !s.status)
    const completed = list.filter(s => s.status === 'completed')

    const renderSection = (statusKey: string, label: string, items: Sprint[]) => {
      if (items.length === 0) return null
      return (
        <CollapsibleSection
          key={statusKey}
          sectionId={`sprints-${domainFilter ?? 'all'}-${statusKey}`}
          label={label}
          count={`${items.length} sprint${items.length !== 1 ? 's' : ''}`}
        >
          <Grid>
            {items.map((s) => {
              const projectName = projects.find(p => p.id === s.project_id)?.name
              return (
                <Card
                  key={s.id}
                  title={s.name}
                  subtitle={projectName || 'Unknown Project'}
                  icon={<Zap size={14} />}
                  action={
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <MetaChip $tone={s.status === 'active' ? 'accent' : 'default'}>{s.status}</MetaChip>
                      <Button variant="ghost" size="sm" onClick={() => openEdit(s)} aria-label="Edit">
                        <PencilLine size={14} />
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => deleteMutation.mutate(s.id)} aria-label="Delete">
                        <Trash2 size={14} />
                      </Button>
                    </div>
                  }
                >
                  {s.goals && <SprintGoals>{s.goals}</SprintGoals>}
                  <SprintMeta>
                    {(s.start_date || s.end_date) && (
                      <MetaItem>
                        <CalendarRange size={11} />
                        {fmtDate(s.start_date) || '—'} → {fmtDate(s.end_date) || '—'}
                      </MetaItem>
                    )}
                    {s.capacity && (
                      <MetaItem>
                        <Target size={11} />
                        {s.capacity} pts
                      </MetaItem>
                    )}
                    {!s.goals && !s.start_date && !s.end_date && (
                      <MetaItem style={{ fontStyle: 'italic' }}>No goal or dates set</MetaItem>
                    )}
                  </SprintMeta>
                </Card>
              )
            })}
          </Grid>
        </CollapsibleSection>
      )
    }

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
        {renderSection('active', 'Active', active)}
        {renderSection('planned', 'Planned', planned)}
        {renderSection('completed', 'Completed', completed)}
      </div>
    )
  }

  const renderTabContent = (domainFilter?: string) => {
    const byDomain = domainFilter
      ? sprints.filter(s => getSprintDomain(s) === domainFilter)
      : sprints
    const byStatus = statusFilter === 'all'
      ? byDomain
      : byDomain.filter(s => s.status === statusFilter)

    const cardTitle = domainFilter
      ? `${domainLabel(domainFilter)} Sprints`
      : 'All Sprints'
    const count = byStatus.length
    const subtitle = `${count} sprint${count !== 1 ? 's' : ''}`

    return (
      <Card
        icon={<Zap size={16} />}
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
              <Plus size={14} style={{ marginRight: 6 }} /> New Sprint
            </Button>
          </div>
        }
      >
        {renderSprintsList(byStatus, isLoading)}
      </Card>
    )
  }

  return (
    <>
      {renderTabContent(domainFilter)}

        <Dialog
          open={isOpen}
          onOpenChange={handleDialogClose}
          icon={<Zap size={16} />}
          eyebrow="Workspace"
          title={editingSprint ? 'Edit Sprint' : 'New Sprint'}
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
              <Button variant="outline" onClick={() => handleDialogClose(false)}>Cancel</Button>
              <Button
                variant="primary"
                disabled={!projectId || !name.trim()}
                loading={createMutation.isPending || updateMutation.isPending}
                onClick={handleSave}
              >
                {editingSprint ? 'Save Changes' : 'Create Sprint'}
              </Button>
            </DialogFooter>
          </FormGrid>
        </Dialog>
    </>
  )
}
