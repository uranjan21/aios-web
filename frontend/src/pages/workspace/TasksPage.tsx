import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, ListTodo, Trash2, CheckCircle2, Circle } from 'lucide-react'
import { Button, Card, EmptyState, Input, Dialog, Select, Badge } from '@ledgr/ui'
import { workspaceApi } from '@/api/workspace'
import { goalsApi } from '@/api/goals'
import { PageContainer, PageContent } from '@/components/layout/PageLayout'
import { PageHeader } from '@ledgr/ui'
import styled, { useTheme } from 'styled-components'

const TaskList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 24px;
`

const FormGrid = styled.div`
  display: flex;
  flex-direction: column;
  gap: 16px;
  padding: 16px 0;
`

export function TasksPage() {
  const theme = useTheme()
  const queryClient = useQueryClient()
  const [isAddOpen, setIsAddOpen] = useState(false)
  const [title, setTitle] = useState('')
  const [projectId, setProjectId] = useState('')
  const [goalId, setGoalId] = useState('')
  const [priority, setPriority] = useState('medium')

  const { data: projects = [] } = useQuery({
    queryKey: ['workspace', 'projects'],
    queryFn: workspaceApi.getProjects,
  })

  const { data: goals = [] } = useQuery({
    queryKey: ['goals'],
    queryFn: goalsApi.list,
  })

  const { data: tasks = [], isLoading } = useQuery({
    queryKey: ['workspace', 'tasks'],
    queryFn: () => workspaceApi.getTasks(),
  })

  const createMutation = useMutation({
    mutationFn: workspaceApi.createTask,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workspace', 'tasks'] })
      setIsAddOpen(false)
      setTitle('')
      setProjectId('')
      setGoalId('')
      setPriority('medium')
    },
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, status }: { id: string, status: string }) => workspaceApi.updateTask(id, { status }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workspace', 'tasks'] })
    },
  })

  const deleteMutation = useMutation({
    mutationFn: workspaceApi.deleteTask,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workspace', 'tasks'] })
    },
  })

  return (
    <PageContainer>
      <PageContent>
        <PageHeader
          title="Tasks"
          subtitle="Track your daily to-dos and project tasks"
          actions={
            <Button variant="primary" size="sm" onClick={() => setIsAddOpen(true)}>
              <Plus size={14} style={{ marginRight: 6 }} /> New Task
            </Button>
          }
        />
      {!isLoading && tasks.length === 0 ? (
        <EmptyState
          icon={<ListTodo size={24} />}
          title="No tasks yet"
          description="Create a task to start tracking your work."
          action={
            <Button variant="primary" onClick={() => setIsAddOpen(true)}>
              Create Task
            </Button>
          }
        />
      ) : (
        <TaskList>
          {tasks.map((t) => (
            <Card
              key={t.id}
              style={{ padding: '12px 16px', display: 'flex', alignItems: 'center', gap: '16px' }}
            >
              <div 
                style={{ cursor: 'pointer', color: t.status === 'done' ? theme.color.primary : theme.color.mutedForeground }}
                onClick={() => updateMutation.mutate({ id: t.id, status: t.status === 'done' ? 'todo' : 'done' })}
              >
                {t.status === 'done' ? <CheckCircle2 size={20} /> : <Circle size={20} />}
              </div>
              
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                <span style={{ 
                  fontWeight: 500, 
                  textDecoration: t.status === 'done' ? 'line-through' : 'none',
                  color: t.status === 'done' ? theme.color.mutedForeground : 'inherit'
                }}>
                  {t.title}
                </span>
                <div style={{ display: 'flex', gap: '8px', marginTop: '4px' }}>
                  {t.project_id && (
                    <Badge>{projects.find(p => p.id === t.project_id)?.name || 'Project'}</Badge>
                  )}
                  {t.goal_id && (
                    <Badge>{goals.find(g => g.id === t.goal_id)?.title || 'Goal'}</Badge>
                  )}
                  {t.priority !== 'medium' && (
                    t.priority === 'high' || t.priority === 'urgent' ? (
                      <Badge style={{ background: theme.color.destructive, color: 'white' }}>{t.priority}</Badge>
                    ) : (
                      <Badge>{t.priority}</Badge>
                    )
                  )}
                </div>
              </div>

              <Button variant="ghost" size="sm" onClick={() => deleteMutation.mutate(t.id)} aria-label="Delete task">
                <Trash2 size={14} />
              </Button>
            </Card>
          ))}
        </TaskList>
      )}

      <Dialog open={isAddOpen} onOpenChange={setIsAddOpen} title="New Task">
        <FormGrid>
          <div>
            <label style={{ display: 'block', marginBottom: 6, fontSize: 13, fontWeight: 500 }}>Title</label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="What needs to be done?" />
          </div>
          <div>
            <label style={{ display: 'block', marginBottom: 6, fontSize: 13, fontWeight: 500 }}>Project (Optional)</label>
            <Select
              value={projectId}
              onChange={(v) => setProjectId(v as string)}
              options={[
                { label: 'None', value: '' },
                ...projects.map(p => ({ label: p.name, value: p.id }))
              ]}
            />
          </div>
          <div>
            <label style={{ display: 'block', marginBottom: 6, fontSize: 13, fontWeight: 500 }}>Linked Goal (Optional)</label>
            <Select
              value={goalId}
              onChange={(v) => setGoalId(v as string)}
              options={[
                { label: 'None', value: '' },
                ...goals.map(g => ({ label: g.title, value: g.id }))
              ]}
            />
          </div>
          <div>
            <label style={{ display: 'block', marginBottom: 6, fontSize: 13, fontWeight: 500 }}>Priority</label>
            <Select
              value={priority}
              onChange={(v) => setPriority(v as string)}
              options={[
                { label: 'Low', value: 'low' },
                { label: 'Medium', value: 'medium' },
                { label: 'High', value: 'high' },
                { label: 'Urgent', value: 'urgent' },
              ]}
            />
          </div>
          <Button
            variant="primary"
            disabled={!title}
            loading={createMutation.isPending}
            onClick={() => createMutation.mutate({ 
              title, 
              project_id: projectId || undefined,
              goal_id: goalId || undefined,
              priority 
            })}
          >
            Create
          </Button>
        </FormGrid>
      </Dialog>
      </PageContent>
    </PageContainer>
  )
}
