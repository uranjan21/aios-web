import { useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import { Button, Input } from 'antd'
import { toast } from 'sonner'
import { Sparkles, Target } from 'lucide-react'
import { aiApi } from '@/api/areas'
import { Skeleton } from '@/components/ui/skeleton'

/** AI skill-gap analysis — target role vs logged skills → strengths / gaps / 90-day plan. */
export function SkillGapCard() {
  const [role, setRole] = useState('')

  const { mutate, data, isPending } = useMutation({
    mutationFn: () => aiApi.skillGap(role.trim()),
    onError: () => toast.error('AI temporarily unavailable'),
  })

  return (
    <div className="bg-card border border-border rounded-xl shadow-sm p-4">
      <div className="flex items-center gap-2 mb-3">
        <Target size={14} className="text-violet-400" />
        <h2 className="text-[12px] font-semibold uppercase tracking-wide text-muted-foreground">AI Skill-Gap Analysis</h2>
      </div>
      <div className="flex gap-2 mb-3">
        <Input
          placeholder="Target role — e.g. Senior Fullstack Engineer, AI Engineer…"
          value={role}
          onChange={e => setRole(e.target.value)}
          onPressEnter={() => role.trim() && mutate()}
        />
        <Button type="primary" icon={<Sparkles size={13} />} disabled={!role.trim()} loading={isPending} onClick={() => mutate()}>
          Analyse
        </Button>
      </div>
      {isPending ? (
        <div className="space-y-2">
          <Skeleton className="h-3.5 w-full" />
          <Skeleton className="h-3.5 w-5/6" />
          <Skeleton className="h-3.5 w-4/6" />
        </div>
      ) : data ? (
        <div className="text-[13px] text-foreground leading-relaxed whitespace-pre-wrap">{data.text}</div>
      ) : (
        <p className="text-[12px] text-muted-foreground">Compares your logged skills against a target role — strengths, gaps, and a 90-day plan.</p>
      )}
    </div>
  )
}
