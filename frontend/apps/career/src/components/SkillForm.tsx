import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Input, Select, Button } from '@ledgr/ui'
import { toast } from 'sonner'
import { careerApi } from '@ct/shared/api/areas'
import type { SkillInventory } from '@ct/shared/types'
import { FieldError, useFieldErrors } from '@ct/shared/components/forms/fieldErrors'
import styled from 'styled-components'

export const LEVEL_LABELS: Record<SkillInventory['level'], string> = {
  day_0: 'Day 0', beginner: 'Beginner', practitioner: 'Practitioner',
  competent: 'Competent', proficient: 'Proficient', expert: 'Expert',
}

const HalfGrid = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: ${({ theme }) => `${theme.spacing[4]}`};
  margin-bottom: ${({ theme }) => `${theme.spacing[4]}`};
  @media ${({ theme }) => theme.media.belowXs} {
    grid-template-columns: 1fr;
  }
`

const TwoColGrid = styled.div`
  display: grid;
  grid-template-columns: 1fr 2fr;
  gap: ${({ theme }) => `${theme.spacing[4]}`};
  margin-bottom: ${({ theme }) => `${theme.spacing[4]}`};
  @media ${({ theme }) => theme.media.belowXs} {
    grid-template-columns: 1fr;
  }
`

const FormFooter = styled.div`
  display: flex;
  gap: ${({ theme }) => `${theme.spacing[2]}`};
  width: 100%;
  justify-content: flex-end;
`

export function SkillForm({ onClose }: { onClose: () => void }) {
  const queryClient = useQueryClient()
  const [skillName, setSkillName] = useState('')
  const [category, setCategory] = useState('')
  const [level, setLevel] = useState<SkillInventory['level']>('beginner')
  const [notes, setNotes] = useState('')
  const f = useFieldErrors<'skill_name' | 'category'>('skill')

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
      f.reset()
      onClose()
    },
    onError: () => toast.error('Failed to save skill'),
  })

  /* `SkillUpsert` requires both `skill_name` and `category` — and `skill_name`
     is the key the upsert matches on, so a blank one would collide with every
     other blank-named skill rather than create a new row. `required` used to
     be the only guard, which surfaced as the browser's own bubble. */
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const ok = f.submit({
      skill_name: skillName.trim() ? undefined : 'Name the skill.',
      category: category.trim() ? undefined : 'Give it a category, e.g. technical.',
    })
    if (ok) mutate()
  }

  return (
    <form noValidate onSubmit={handleSubmit}>
      <HalfGrid>
        <div>
          <Input placeholder="Skill name" value={skillName} {...f.fieldProps('skill_name')} onChange={(e: any) => { f.clearField('skill_name'); setSkillName(e.target.value) }} aria-label="Skill name" />
          <FieldError id={f.errorId('skill_name')}>{f.errors.skill_name}</FieldError>
        </div>
        <div>
          <Input placeholder="Category (e.g. technical, soft skill)" value={category} {...f.fieldProps('category')} onChange={(e: any) => { f.clearField('category'); setCategory(e.target.value) }} aria-label="Skill category" />
          <FieldError id={f.errorId('category')}>{f.errors.category}</FieldError>
        </div>
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
