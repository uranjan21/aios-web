import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, Zap, Trash2 } from 'lucide-react'
import { Button, Card, EmptyState, Input, Dialog, Select } from '@ledgr/ui'
import { workspaceApi, Sprint } from '@/api/workspace'
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

const SprintGoals = styled.div`
  color: ${({ theme }) => theme.color.mutedForeground};
  font-size: 13px;
`

export function SprintsPage() {
  const queryClient = useQueryClient()
  const [isAddOpen, setIsAddOpen] = useState(false)
  const [name, setName] = useState('')
  const [projectId, setProjectId] = useState('')

  const { data: projects = [] } = useQuery({
    queryKey: ['workspace', 'projects'],
    queryFn: workspaceApi.getProjects,
  })

  const { data: sprints = [], isLoading } = useQuery({
    queryKey: ['workspace', 'sprints'],
    queryFn: () => workspaceApi.getSprints(),
  })

  const createMutation = useMutation({
    mutationFn: workspaceApi.createSprint,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workspace', 'sprints'] })
      setIsAddOpen(false)
      setName('')
      setProjectId('')
    },
  })

  const deleteMutation = useMutation({
    mutationFn: workspaceApi.deleteSprint,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workspace', 'sprints'] })
    },
  })

  return (
    <PageContainer>
      <PageContent>
        <PageHeader
          title="Sprints"
          subtitle="Manage your current sprint and upcoming work"
          actions={
            <Button variant="primary" size="sm" onClick={() => setIsAddOpen(true)}>
              <Plus size={14} style={{ marginRight: 6 }} /> New Sprint
            </Button>
          }
        />
      {!isLoading && sprints.length === 0 ? (
        <EmptyState
          icon={<Zap size={24} />}
          title="No sprints yet"
          description="Create a sprint to focus your tasks for a specific time period."
          action={
            <Button variant="primary" onClick={() => setIsAddOpen(true)}>
              Create Sprint
            </Button>
          }
        />
      ) : (
        <Grid>
          {sprints.map((s) => (
            <Card
              key={s.id}
              title={s.name}
              subtitle={projects.find(p => p.id === s.project_id)?.name || 'Unknown Project'}
              icon={<Zap size={16} />}
              action={
                <Button variant="ghost" size="sm" onClick={() => deleteMutation.mutate(s.id)} aria-label="Delete sprint">
                  <Trash2 size={14} />
                </Button>
              }
            >
              <SprintGoals>
                {s.goals || 'No goals provided.'}
              </SprintGoals>
            </Card>
          ))}
        </Grid>
      )}

      <Dialog open={isAddOpen} onOpenChange={setIsAddOpen} title="New Sprint">
        <FormGrid>
          <div>
            <label style={{ display: 'block', marginBottom: 6, fontSize: 13, fontWeight: 500 }}>Project</label>
            <Select
              value={projectId}
              onChange={(v) => setProjectId(v as string)}
              options={[
                { label: 'Select a project...', value: '' },
                ...projects.map(p => ({ label: p.name, value: p.id }))
              ]}
            />
          </div>
          <div>
            <label style={{ display: 'block', marginBottom: 6, fontSize: 13, fontWeight: 500 }}>Name</label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="E.g., Sprint 12" />
          </div>
          <Button
            variant="primary"
            disabled={!projectId || !name}
            loading={createMutation.isPending}
            onClick={() => createMutation.mutate({ name, project_id: projectId })}
          >
            Create
          </Button>
        </FormGrid>
      </Dialog>
      </PageContent>
    </PageContainer>
  )
}
