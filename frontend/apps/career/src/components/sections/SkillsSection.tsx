/**
 * Career → Skills.
 *
 * Promoted out of Career Settings on 2026-08-03. `SkillInventory` has existed
 * since the first schema and the only way to SEE the list was a tab inside
 * Settings; the Career landing page showed a bare "Skills tracked: 7" count.
 * A skill inventory is not a setting — it is the substance of the area.
 *
 * The page is built around the SKILL GAP, which is the question the model was
 * shaped for: `day_0` is a real level in the enum, meaning "want to learn, not
 * started". Everything above it is something you have at some depth. So the
 * page separates "learning" from "have" rather than rendering one flat list
 * sorted alphabetically, which is what Settings did.
 */
import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import styled from 'styled-components'
import { Button, Card, Dialog, EmptyState, Input, SegmentedControl, Select, SkeletonPage } from '@ledgr/ui'
import { BookOpen, GraduationCap, Layers, Sparkles, Trash2 } from 'lucide-react'
import { careerApi } from '@ct/shared/api/areas'
import { ModuleGrid, type ModuleSpec } from '@ct/shared/components/modules'
import type { SkillInventory } from '@ct/shared/types'
import { LEVEL_LABELS } from '../SkillForm'

const Root = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.spacing[5]};
`

const FormContainer = styled.form`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.spacing[3]};
  margin-top: ${({ theme }) => theme.spacing[3]};
`

const FormGroup = styled.div``

const Label = styled.label`
  font-size: ${({ theme }) => theme.typography.fontSize.xs};
  color: ${({ theme }) => theme.color.mutedForeground};
  margin-bottom: ${({ theme }) => theme.spacing[1]};
  display: block;
`

const ActionsContainer = styled.div`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing[2]};
  padding-top: ${({ theme }) => theme.spacing[2]};
`

type Level = SkillInventory['level']

/** Ordered weakest → strongest. `day_0` is "want to learn", not a proficiency. */
const LEVEL_ORDER: Level[] = ['day_0', 'beginner', 'practitioner', 'competent', 'proficient', 'expert']

/** Track fill per level. `day_0` is deliberately 0 — nothing has been built yet. */
const LEVEL_PCT: Record<Level, number> = {
  day_0: 0, beginner: 20, practitioner: 40, competent: 60, proficient: 80, expert: 100,
}

const LEVEL_KEY: Record<Level, string> = {
  day_0: 'mutedFg', beginner: 'warning', practitioner: 'warning',
  competent: 'info', proficient: 'career', expert: 'success',
}

/*
 * `SkillInventory.level` is an UNCONSTRAINED string server-side — the model
 * declares `level: str` with no enum and the upsert route does not validate it.
 * So a row can legitimately carry a value outside LEVEL_ORDER (an older client,
 * a direct API call), and looking it up blind renders "undefined" and a NaN
 * bar width. Everything below goes through these accessors instead.
 */
const isLevel = (v: string): v is Level => (LEVEL_ORDER as string[]).includes(v)
const levelLabel = (v: string) => (isLevel(v) ? LEVEL_LABELS[v] : v)
const levelPct = (v: string) => (isLevel(v) ? LEVEL_PCT[v] : 0)
const levelKey = (v: string) => (isLevel(v) ? LEVEL_KEY[v] : 'mutedFg')
const levelRank = (v: string) => (isLevel(v) ? LEVEL_ORDER.indexOf(v) : LEVEL_ORDER.length)

type Filter = 'all' | 'learning' | 'have'

export function SkillsSection() {
  const queryClient = useQueryClient()
  const [filter, setFilter] = useState<Filter>('all')
  const [editing, setEditing] = useState<SkillInventory | null>(null)
  const [form, setForm] = useState({ skill_name: '', category: '', level: 'day_0' as Level, notes: '' })

  const { data: skills, isLoading } = useQuery({
    queryKey: ['career', 'skills'],
    queryFn: careerApi.skills,
    staleTime: 60_000,
  })

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['career', 'skills'] })
    queryClient.invalidateQueries({ queryKey: ['career', 'summary'] })
  }

  const upsert = useMutation({
    mutationFn: (d: { skill_name: string; category: string; level: Level; notes?: string }) =>
      careerApi.upsertSkill(d),
    onSuccess: () => {
      invalidate()
      toast.success('Skill saved')
      setEditing(null)
    },
    onError: (e: any) => toast.error(e?.response?.data?.detail || 'Failed to save skill'),
  })

  /* A skill could be added and re-levelled but never removed — the row stayed
     in the inventory (and in the radar) forever. */
  const remove = useMutation({
    mutationFn: (id: string) => careerApi.deleteSkill(id),
    onSuccess: () => {
      invalidate()
      toast.success('Skill removed')
      setEditing(null)
    },
    onError: (e: any) => toast.error(e?.response?.data?.detail || 'Failed to remove skill'),
  })

  const all = useMemo(() => skills ?? [], [skills])

  const visible = useMemo(() => {
    if (filter === 'learning') return all.filter(s => s.level === 'day_0')
    if (filter === 'have') return all.filter(s => s.level !== 'day_0')
    return all
  }, [all, filter])

  const openEdit = (s: SkillInventory) => {
    setEditing(s)
    setForm({
      skill_name: s.skill_name,
      category: s.category ?? '',
      level: s.level,
      notes: s.notes ?? '',
    })
  }

  const filterNode = (
    <SegmentedControl
      size="sm"
      aria-label="Filter skills"
      value={filter}
      onChange={(v: any) => setFilter(v as Filter)}
      options={[
        { label: 'All', value: 'all' },
        { label: 'Learning', value: 'learning' },
        { label: 'Have', value: 'have' },
      ]}
    />
  )

  const modules = useMemo<ModuleSpec[]>(() => {
    if (!all.length) return []

    const wantToLearn = all.filter(s => s.level === 'day_0')
    const working = all.filter(s => ['beginner', 'practitioner', 'competent'].includes(s.level))
    const strong = all.filter(s => ['proficient', 'expert'].includes(s.level))

    const byCategory = all.reduce<Record<string, number>>((acc, s) => {
      const k = (s.category || 'Uncategorised').trim() || 'Uncategorised'
      acc[k] = (acc[k] ?? 0) + 1
      return acc
    }, {})
    const categories = Object.entries(byCategory).sort((a, b) => b[1] - a[1]).slice(0, 8)

    /* Built from the levels actually PRESENT, not from LEVEL_ORDER — an
       out-of-enum value would otherwise vanish from the donut and the slices
       would not sum to the headline count. */
    const levelCounts = all.reduce<Record<string, number>>((acc, s) => {
      acc[s.level] = (acc[s.level] ?? 0) + 1
      return acc
    }, {})
    const byLevel = Object.entries(levelCounts)
      .map(([level, n]) => ({ level, n }))
      .sort((a, b) => levelRank(a.level) - levelRank(b.level))

    return [
      {
        kind: 'tiles',
        span: 12,
        tiles: [
          { label: 'Tracked', value: String(all.length), sub: `${categories.length} categor${categories.length === 1 ? 'y' : 'ies'}` },
          {
            label: 'Want to learn',
            value: String(wantToLearn.length),
            sub: wantToLearn.length ? 'Sitting at Day 0' : 'Nothing queued to learn',
            subKey: wantToLearn.length ? 'warning' : 'mutedFg',
            dotKey: wantToLearn.length ? 'warning' : undefined,
          },
          { label: 'Building', value: String(working.length), sub: 'Beginner through competent' },
          {
            label: 'Strong',
            value: String(strong.length),
            sub: 'Proficient or expert',
            subKey: strong.length ? 'success' : 'mutedFg',
          },
        ],
      },
      {
        kind: 'bars',
        span: 7,
        title: 'Where your skills sit',
        subtitle: 'Count by category',
        icon: Layers,
        bars: categories.map(([name, n]) => ({
          label: name.length > 12 ? `${name.slice(0, 11)}…` : name,
          v: n,
          t: String(n),
          colorKey: 'career',
        })),
      },
      {
        kind: 'donut',
        span: 5,
        title: 'Depth',
        subtitle: 'How far along each one is',
        icon: Sparkles,
        centerValue: String(all.length),
        centerLabel: 'Skills',
        slices: byLevel.map(x => ({
          label: levelLabel(x.level),
          pct: Math.round((x.n / all.length) * 100),
          value: String(x.n),
          colorKey: levelKey(x.level),
        })),
      },
      {
        kind: 'progress',
        span: 12,
        title: filter === 'learning' ? 'Learning queue' : filter === 'have' ? 'What you have' : 'Skill inventory',
        subtitle: visible.length === 0
          ? 'Nothing matches this filter'
          : `${visible.length} skill${visible.length === 1 ? '' : 's'} · click one to change its level`,
        icon: BookOpen,
        /* This card owns the filter, so the control lives in its header — and
           it stays mounted on an empty result so the filter can be cleared. */
        actionNode: filterNode,
        onRowClick: (i: number) => openEdit(visible[i]),
        rows: [...visible]
          .sort((a, b) => levelRank(a.level) - levelRank(b.level))
          .map(s => ({
            title: s.skill_name,
            meta: s.category || 'Uncategorised',
            /* Day 0 gets a word, not an empty bar — "0%" would read as failure
               when it actually means "not started, on purpose". */
            value: s.level === 'day_0' ? 'Day 0 — to learn' : levelLabel(s.level),
            valueKey: levelKey(s.level),
            pct: levelPct(s.level),
            colorKey: levelKey(s.level),
          })),
      },
    ]
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [all, visible, filter, filterNode])

  if (isLoading) return <SkeletonPage kpis={4} modules={[7, 5, 12]} />

  return (
    <Root>
      {all.length === 0 ? (
        <Card title="Skills" subtitle="What you have, and what you want to learn" icon={<GraduationCap size={16} />}>
          <EmptyState
            icon={<GraduationCap size={20} />}
            title="No skills tracked yet"
            description="Add a skill at Day 0 to queue it for learning, or at your current level to record what you already have."
          />
        </Card>
      ) : (
        <ModuleGrid modules={modules} />
      )}

      <Dialog
        open={!!editing}
        icon={<GraduationCap size={18} />}
        eyebrow="Career"
        title={editing ? `Edit — ${editing.skill_name}` : 'Edit skill'}
        onOpenChange={(o) => { if (!o) setEditing(null) }}
        size="sm"
      >
        <FormContainer
          onSubmit={e => {
            e.preventDefault()
            if (!form.skill_name.trim()) { toast.error('Skill name is required'); return }
            upsert.mutate({
              skill_name: form.skill_name.trim(),
              category: form.category.trim() || 'Uncategorised',
              level: form.level,
              notes: form.notes.trim() || undefined,
            })
          }}
        >
          <FormGroup>
            <Label>Skill</Label>
            <Input
              value={form.skill_name}
              onChange={(e: any) => setForm(f => ({ ...f, skill_name: e.target.value }))}
              required
            />
          </FormGroup>
          <FormGroup>
            <Label>Category</Label>
            <Input
              value={form.category}
              onChange={(e: any) => setForm(f => ({ ...f, category: e.target.value }))}
              placeholder="e.g. backend, system design"
            />
          </FormGroup>
          <FormGroup>
            <Label>Level</Label>
            <Select
              fullWidth
              value={form.level}
              onChange={(v: any) => setForm(f => ({ ...f, level: v as Level }))}
              options={LEVEL_ORDER.map(l => ({ value: l, label: LEVEL_LABELS[l] }))}
            />
          </FormGroup>
          <FormGroup>
            <Label>Notes</Label>
            <Input
              value={form.notes}
              onChange={(e: any) => setForm(f => ({ ...f, notes: e.target.value }))}
              placeholder="Optional"
            />
          </FormGroup>
          <ActionsContainer>
            {editing && (
              <Button
                variant="destructive"
                type="button"
                style={{ marginRight: 'auto' }}
                loading={remove.isPending}
                onClick={() => remove.mutate(editing.id)}
              >
                <Trash2 size={14} style={{ marginRight: 4 }} /> Delete
              </Button>
            )}
            <Button variant="primary" type="submit" loading={upsert.isPending}>Save</Button>
            <Button variant="ghost" type="button" onClick={() => setEditing(null)}>Cancel</Button>
          </ActionsContainer>
        </FormContainer>
      </Dialog>
    </Root>
  )
}
