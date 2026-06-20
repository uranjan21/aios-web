// @ts-nocheck
import { useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import { Button, Input } from '@ledgr/ui'
import { toast } from 'sonner'
import { Sparkles, Target } from 'lucide-react'
import { aiApi } from '@/api/areas'
import { Skeleton } from '@/components/ui/skeleton'
import styled from 'styled-components'

import { Card } from '@ledgr/ui'



const InputRow = styled.div`
  display: flex;
  gap: 8px;
  margin-bottom: 12px;
`

const SkeletonStack = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
`

const SkeletonLineFull = styled(Skeleton)`
  height: 14px;
  width: 100%;
`

const SkeletonLineLong = styled(Skeleton)`
  height: 14px;
  width: 83.333333%;
`

const SkeletonLineMed = styled(Skeleton)`
  height: 14px;
  width: 66.666667%;
`

const ResultText = styled.div`
  font-size: 13px;
  color: ${({ theme }) => theme.color.foreground};
  line-height: 1.6;
  white-space: pre-wrap;
`

const Hint = styled.p`
  font-size: 12px;
  color: ${({ theme }) => theme.color.mutedForeground};
  margin: 0;
`

const StyledTarget = styled(Target)`
  color: ${({ theme }) => theme.color.accent};
`

/** AI skill-gap analysis — target role vs logged skills → strengths / gaps / 90-day plan. */
export function SkillGapCard() {
  const [role, setRole] = useState('')

  const { mutate, data, isPending } = useMutation({
    mutationFn: () => aiApi.skillGap(role.trim()),
    onError: () => toast.error('AI temporarily unavailable'),
  })

  return (
    <Card
      title="AI Skill-Gap Analysis"
      subtitle="Compare your skills against a target role to see what's missing"
      size="md"
      icon={<StyledTarget size={14} />}
      action={
        <Button
          size="sm"
          variant="primary"
          disabled={!role.trim() || isPending}
          onClick={(e: any) => {
            e.stopPropagation()
            mutate()
          }}
          startIcon={<Sparkles size={13} />}
        >
          Analyse
        </Button>
      }
    >
      <InputRow>
        <Input
          placeholder="Target role — e.g. Senior Fullstack Engineer, AI Engineer…"
          value={role}
          onChange={(e: any) => setRole(e.target.value)}
          onKeyDown={(e: any) => {
            if (e.key === 'Enter' && role.trim()) {
              e.preventDefault()
              mutate()
            }
          }}
        />
      </InputRow>
      {isPending ? (
        <SkeletonStack>
          <SkeletonLineFull />
          <SkeletonLineLong />
          <SkeletonLineMed />
        </SkeletonStack>
      ) : data ? (
        <ResultText>{data.text}</ResultText>
      ) : (
        <Hint>Compares your logged skills against a target role — strengths, gaps, and a 90-day plan.</Hint>
      )}
    </Card>
  )
}
