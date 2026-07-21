import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Input, Select, Button } from '@ledgr/ui'
import { toast } from 'sonner'
import { careerApi } from '@aios/shared/api/areas'
import type { SkillInventory } from '@aios/shared/types'
import styled from 'styled-components'

export const LEVEL_LABELS: Record<SkillInventory['level'], string> = {
  day_0: 'Day 0', beginner: 'Beginner', practitioner: 'Practitioner',
  competent: 'Competent', proficient: 'Proficient', expert: 'Expert',
}

const HalfGrid = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
  margin-bottom: 16px;
  @media ${({ theme }) => theme.media.belowXs} {
    grid-template-columns: 1fr;
  }
`

const TwoColGrid = styled.div`
  display: grid;
  grid-template-columns: 1fr 2fr;
  gap: 16px;
  margin-bottom: 16px;
  @media ${({ theme }) => theme.media.belowXs} {
    grid-template-columns: 1fr;
  }
`

const FormFooter = styled.div`
  display: flex;
  gap: 8px;
  width: 100%;
  justify-content: flex-end;
`

export function SkillForm({ onClose }: { onClose: () => void }) {
  const queryClient = useQueryClient()
  const [skillName, setSkillName] = useState('')
  const [category, setCategory] = useState('')
  const [level, setLevel] = useState<SkillInventory['level']>('beginner')
  const [notes, setNotes] = useState('')

  const { mutate, isPending } = useMutation({
    mutationFn: () => careerApi.upsertSkill({
      skill_name: skillName.trim(),
      category: category.trim(),
      level,
      notes: notes?.trim() || undefined,
    }),
    onSuccess: () => {
      toast.success('Skill saved')
      queryClient.invalidateQueries({ queryKey: ['career', 'skills'] })
      queryClient.invalidateQueries({ queryKey: ['career', 'summary'] })
      setSkillName(''); setCategory(''); setLevel('beginner'); setNotes('')
      onClose()
    },
    onError: () => toast.error('Failed to save skill'),
  })

  return (
    <form onSubmit={e => { e.preventDefault(); mutate() }}>
      <HalfGrid>
        <Input placeholder="Skill name" value={skillName} onChange={(e: any) => setSkillName(e.target.value)} required aria-label="Skill name" />
        <Input placeholder="Category (e.g. technical, soft skill)" value={category} onChange={(e: any) => setCategory(e.target.value)} required aria-label="Skill category" />
      </HalfGrid>
      <TwoColGrid>
        <Select
          value={level}
          onChange={(val) => setLevel(val as SkillInventory['level'])}
          options={(Object.keys(LEVEL_LABELS) as SkillInventory['level'][]).map(l => ({ value: l, label: LEVEL_LABELS[l] }))}
          placeholder="Choose proficiency level…"
          aria-label="Skill proficiency level"
        />
        <Input placeholder="Notes (optional)" value={notes} onChange={(e: any) => setNotes(e.target.value)} aria-label="Notes" />
      </TwoColGrid>
      <FormFooter>
        <Button variant="outline" type="button" onClick={onClose}>Cancel</Button>
        <Button variant="primary" type="submit" loading={isPending}>Save Skill</Button>
      </FormFooter>
    </form>
  )
}
