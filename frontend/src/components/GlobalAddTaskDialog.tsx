import { useState, useMemo, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { ListTodo } from 'lucide-react'
import {
  Button, Dialog, DialogFooter,
  Select, Label, Input,
} from '@ledgr/ui'
import { workspaceApi } from '@/api/workspace'
import { goalsApi } from '@/api/goals'
import { useUIStore } from '@/stores/uiStore'
import styled from 'styled-components'
import { toast } from 'sonner'

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

const PRIORITY_OPTIONS = [
  { label: 'Low', value: 'low' },
  { label: 'Medium', value: 'medium' },
  { label: 'High', value: 'high' },
  { label: 'Urgent', value: 'urgent' },
]

const STATUS_OPTIONS = [
  { label: 'To Do', value: 'todo' },
  { label: 'In Progress', value: 'in_progress' },
  { label: 'Done', value: 'done' },
]

const DOMAIN_OPTIONS = [
  { label: 'General', value: 'general' },
  { label: 'Finance', value: 'finance' },
  { label: 'Health', value: 'health' },
  { label: 'Career', value: 'career' },
  { label: 'Business', value: 'business' },
  { label: 'Content', value: 'content' },
]

export function GlobalAddTaskDialog() {
  const queryClient = useQueryClient()
  const { addTaskModalOpen, addTaskDefaultProjectId, addTaskDefaultSprintId, setAddTaskModalOpen } = useUIStore()

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

  const { data: projects = [] } = useQuery({
    queryKey: ['workspace', 'projects'],
    queryFn: workspaceApi.getProjects,
    enabled: addTaskModalOpen,
    staleTime: 60_000,
  })
  
  const { data: sprints = [] } = useQuery({
    queryKey: ['workspace', 'sprints'],
    queryFn: () => workspaceApi.getSprints(),
    enabled: addTaskModalOpen,
    staleTime: 60_000,
  })

  const { data: goals = [] } = useQuery({
    queryKey: ['goals'],
    queryFn: goalsApi.list,
    enabled: addTaskModalOpen,
    staleTime: 60_000,
  })

  useEffect(() => {
    if (addTaskModalOpen) {
      setTitle('')
      setDescription('')
      setGoalId('')
      setPriority('medium')
      setStatus('todo')
      setDueDate('')
      setDomain('general')
      setLabels('')

      if (addTaskDefaultSprintId) {
        setSprintId(addTaskDefaultSprintId)
        const sprint = sprints.find(s => s.id === addTaskDefaultSprintId)
        if (sprint) {
          setProjectId(sprint.project_id)
          const proj = projects.find(p => p.id === sprint.project_id)
          if (proj && proj.domain) {
            setDomain(proj.domain)
          }
        }
      } else if (addTaskDefaultProjectId) {
        setProjectId(addTaskDefaultProjectId)
        setSprintId('')
        const proj = projects.find(p => p.id === addTaskDefaultProjectId)
        if (proj && proj.domain) {
          setDomain(proj.domain)
        }
      } else {
        setProjectId('')
        setSprintId('')
      }
    }
  }, [addTaskModalOpen, addTaskDefaultProjectId, addTaskDefaultSprintId, projects, sprints])

  const filteredGoals = useMemo(() => {
    return goals.filter(g => g.category === domain)
  }, [goals, domain])

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
    const isGoalValid = goals.some(g => g.id === goalId && g.category === newDomain)
    if (!isGoalValid) setGoalId('')

    const isProjectValid = projects.some(p => p.id === projectId && p.domain === newDomain)
    if (!isProjectValid) {
      setProjectId('')
      setSprintId('')
    }
  }

  const handleProjectChange = (projId: string) => {
    setProjectId(projId)
    if (projId) {
      const proj = projects.find(p => p.id === projId)
      if (proj && proj.domain) {
        setDomain(proj.domain)
        const isGoalValid = goals.some(g => g.id === goalId && g.category === proj.domain)
        if (!isGoalValid) setGoalId('')
      }
    }
    const isSprintValid = sprints.some(s => s.id === sprintId && s.project_id === projId)
    if (!isSprintValid) setSprintId('')
  }

  const handleSprintChange = (sprId: string) => {
    setSprintId(sprId)
    if (sprId) {
      const sprint = sprints.find(s => s.id === sprId)
      if (sprint) {
        setProjectId(sprint.project_id)
        const proj = projects.find(p => p.id === sprint.project_id)
        if (proj && proj.domain) {
          setDomain(proj.domain)
          const isGoalValid = goals.some(g => g.id === goalId && g.category === proj.domain)
          if (!isGoalValid) setGoalId('')
        }
      }
    }
  }

  const createMutation = useMutation({
    mutationFn: workspaceApi.createTask,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workspace', 'tasks'] })
      queryClient.invalidateQueries({ queryKey: ['workspace', 'stats'] })
      setAddTaskModalOpen(false)
      toast.success('Task created')
    },
    onError: () => toast.error('Could not create task'),
  })

  const handleSave = () => {
    createMutation.mutate({
      title,
      description: description || undefined,
      project_id: projectId || undefined,
      sprint_id: sprintId || undefined,
      goal_id: goalId || undefined,
      priority,
      status,
      due_date: dueDate || undefined,
      domain,
      labels: labels || undefined,
    })
  }

  const projectOptions = useMemo(() => {
    return [{ label: 'None', value: '' }, ...filteredProjects.map(p => ({ label: p.name, value: p.id }))]
  }, [filteredProjects])

  const sprintOptions = useMemo(() => {
    return [{ label: 'None', value: '' }, ...filteredSprints.map(s => ({ label: s.name, value: s.id }))]
  }, [filteredSprints])

  const goalOptions = useMemo(() => {
    return [{ label: 'None', value: '' }, ...filteredGoals.map(g => ({ label: g.title, value: g.id }))]
  }, [filteredGoals])

  return (
    <Dialog
      open={addTaskModalOpen}
      onOpenChange={open => { if (!open) setAddTaskModalOpen(false) }}
      icon={<ListTodo size={16} />}
      eyebrow="Workspace"
      title="New Task"
      description="Assign to a project, sprint, and life area so it shows up in the right views."
      size="md"
    >
      <FormGrid>
        <div>
          <Label htmlFor="global-task-title">Task title</Label>
          <Input id="global-task-title" value={title} onChange={e => setTitle(e.target.value)} placeholder="What needs to be done?" autoFocus />
        </div>
        <div>
          <Label htmlFor="global-task-desc">Description (optional)</Label>
          <Input id="global-task-desc" value={description} onChange={e => setDescription(e.target.value)} placeholder="Context or acceptance criteria…" />
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
            <Label htmlFor="global-task-due">Due date</Label>
            <Input id="global-task-due" type="date" value={dueDate} onChange={e => setDueDate(e.target.value)} />
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
          <Label htmlFor="global-task-labels">Labels (comma-separated)</Label>
          <Input id="global-task-labels" value={labels} onChange={e => setLabels(e.target.value)} placeholder="bug, frontend, backend" />
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setAddTaskModalOpen(false)}>Cancel</Button>
          <Button
            variant="primary"
            disabled={!title.trim()}
            loading={createMutation.isPending}
            onClick={handleSave}
          >
            Create Task
          </Button>
        </DialogFooter>
      </FormGrid>
    </Dialog>
  )
}
