import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, FolderKanban, Trash2 } from 'lucide-react'
import { Button, Card, EmptyState, Input, Dialog, Select } from '@ledgr/ui'
import { workspaceApi, Project } from '@/api/workspace'
import { goalsApi } from '@/api/goals'
import { PageContainer, PageContent } from '@/components/layout/PageLayout'
import { PageHeader } from '@ledgr/ui'
import styled from 'styled-components'

const Grid = styled.div`
  display: grid;
  gap: 16px;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  padding: 24px;
`

const FormGrid = styled.div`
  display: flex;
  flex-direction: column;
  gap: 16px;
  padding: 16px 0;
`

const ProjectDesc = styled.div`
  color: ${({ theme }) => theme.color.mutedForeground};
  font-size: 13px;
`

export function ProjectsPage() {
  const queryClient = useQueryClient()
  const [isAddOpen, setIsAddOpen] = useState(false)
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [domain, setDomain] = useState('general')
  const [goalId, setGoalId] = useState<string>('')

  const { data: projects = [], isLoading } = useQuery({
    queryKey: ['workspace', 'projects'],
    queryFn: workspaceApi.getProjects,
  })

  const { data: goals = [] } = useQuery({
    queryKey: ['goals'],
    queryFn: goalsApi.list,
  })

  const createMutation = useMutation({
    mutationFn: workspaceApi.createProject,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workspace', 'projects'] })
      setIsAddOpen(false)
      setName('')
      setDescription('')
      setDomain('general')
      setGoalId('')
    },
  })

  const deleteMutation = useMutation({
    mutationFn: workspaceApi.deleteProject,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workspace', 'projects'] })
    },
  })

  return (
    <PageContainer>
      <PageContent>
        <PageHeader
          title="Projects"
          subtitle="Manage cross-domain projects"
          actions={
            <Button variant="primary" size="sm" onClick={() => setIsAddOpen(true)}>
              <Plus size={14} style={{ marginRight: 6 }} /> New Project
            </Button>
          }
        />
      {!isLoading && projects.length === 0 ? (
        <EmptyState
          icon={<FolderKanban size={24} />}
          title="No projects yet"
          description="Create a project to organize your sprints and tasks."
          action={
            <Button variant="primary" onClick={() => setIsAddOpen(true)}>
              Create Project
            </Button>
          }
        />
      ) : (
        <Grid>
          {projects.map((p) => (
            <Card
              key={p.id}
              title={p.name}
              subtitle={p.domain ? `Domain: ${p.domain}` : 'No domain'}
              icon={<FolderKanban size={16} />}
              action={
                <Button variant="ghost" size="sm" onClick={() => deleteMutation.mutate(p.id)} aria-label="Delete project">
                  <Trash2 size={14} />
                </Button>
              }
            >
              <ProjectDesc>
                {p.description || 'No description provided.'}
              </ProjectDesc>
            </Card>
          ))}
        </Grid>
      )}

      <Dialog open={isAddOpen} onOpenChange={setIsAddOpen} title="New Project">
        <FormGrid>
          <div>
            <label style={{ display: 'block', marginBottom: 6, fontSize: 13, fontWeight: 500 }}>Name</label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="E.g., Q3 Marketing" />
          </div>
          <div>
            <label style={{ display: 'block', marginBottom: 6, fontSize: 13, fontWeight: 500 }}>Domain</label>
            <Select
              value={domain}
              onChange={(v) => setDomain(v as string)}
              options={[
                { label: 'General', value: 'general' },
                { label: 'Finance', value: 'finance' },
                { label: 'Health', value: 'health' },
                { label: 'Career', value: 'career' },
                { label: 'Business', value: 'business' },
                { label: 'Content', value: 'content' },
              ]}
            />
          </div>
          <div>
            <label style={{ display: 'block', marginBottom: 6, fontSize: 13, fontWeight: 500 }}>Description</label>
            <Input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Brief description..." />
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
          <Button
            variant="primary"
            loading={createMutation.isPending}
            onClick={() => createMutation.mutate({ name, description, domain, goal_id: goalId || undefined })}
          >
            Create
          </Button>
        </FormGrid>
      </Dialog>
      </PageContent>
    </PageContainer>
  )
}
