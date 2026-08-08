import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Button, Card, Select, SkeletonList } from '@ledgr/ui'
import { BookOpen, Plus } from 'lucide-react'
import { careerApi } from '@ct/shared/api/areas'
import type { SkillInventory } from '@ct/shared/types'
import { SkillForm, LEVEL_LABELS } from './SkillForm'
import { EmptyState } from '@ledgr/ui'
import styled from 'styled-components'

const Row = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: ${({ theme }) => `${theme.spacing[2.5]} ${theme.spacing[5]}`};
  border-bottom: 1px solid ${({ theme }) => theme.color.border}55;
  &:last-child { border-bottom: 0; }
`

const Name = styled.div`
  font-size: ${({ theme }) => theme.typography.fontSize.sm};
  font-weight: 500;
  color: ${({ theme }) => theme.color.foreground};
`

const Cat = styled.div`
  font-size: ${({ theme }) => theme.typography.fontSize.xs};
  color: ${({ theme }) => theme.color.mutedForeground};
`

const FormWrap = styled.div`
  padding: ${({ theme }) => `${theme.spacing[4]} ${theme.spacing[5]}`};
  border-bottom: 1px solid ${({ theme }) => theme.color.border};
`

const LoadingWrap = styled.div`
  padding: ${({ theme }) => `${theme.spacing[5]}`};
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => `${theme.spacing[2]}`};
`

export function SkillsManager() {
  const queryClient = useQueryClient()
  const [showForm, setShowForm] = useState(false)
  const { data: skills, isLoading } = useQuery({ queryKey: ['career', 'skills'], queryFn: careerApi.skills })

  const patch = useMutation({
    mutationFn: ({ id, level }: { id: string; level: SkillInventory['level'] }) => careerApi.updateSkill(id, { level }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['career', 'skills'] })
      queryClient.invalidateQueries({ queryKey: ['career', 'summary'] })
    },
    onError: () => toast.error('Failed to update skill'),
  })

  return (
    <Card
      title="Skills Inventory"
      subtitle="Every skill you're tracking and its proficiency level"
      icon={<BookOpen size={16} />}
      action={
        <Button size="sm" variant="primary" onClick={() => setShowForm(s => !s)}>
          <Plus size={12} style={{ marginRight: 4 }} /> Add Skill
        </Button>
      }
    >
      {showForm && (
        <FormWrap>
          <SkillForm onClose={() => setShowForm(false)} />
        </FormWrap>
      )}
      {isLoading ? (
        <LoadingWrap>
          <SkeletonList rows={3} leading={false} />
        </LoadingWrap>
      ) : !skills?.length ? (
        <EmptyState icon={<BookOpen size={24} />} title="No skills yet" description="Add a skill to start tracking your growth." action={<Button variant="secondary" size="sm" onClick={() => setShowForm(true)}>Add Skill</Button>} />
      ) : (
        skills.map(skill => (
          <Row key={skill.id}>
            <div>
              <Name>{skill.skill_name}</Name>
              <Cat>{skill.category}</Cat>
            </div>
            <Select
              value={skill.level}
              onChange={(level) => patch.mutate({ id: skill.id, level: level as SkillInventory['level'] })}
              options={(Object.keys(LEVEL_LABELS) as SkillInventory['level'][]).map(l => ({ value: l, label: LEVEL_LABELS[l] }))}
              size="sm"
              style={{ minWidth: 110 }}
              aria-label={`${skill.skill_name} level`}
            />
          </Row>
        ))
      )}
    </Card>
  )
}
