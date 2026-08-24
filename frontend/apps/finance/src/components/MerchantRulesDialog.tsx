/**
 * Create and delete merchant rules.
 *
 * `financeApi.rules` and `.patchRule` were wired into InboxTab from the start,
 * so the rules card could LIST rules and toggle them — but `createRule` and
 * `deleteRule` had no caller anywhere in the app. A user could therefore see a
 * rules card, read "No rules yet", and have no way to add one, while
 * `FEATURES.md` advertised auto-categorisation as a shipped feature. Found by
 * `test_api_members_are_reachable` on 2026-08-23.
 *
 * Rules matter more than their size suggests: they run BEFORE anything reaches
 * the review inbox, so they are the multiplier on the Gmail ingestion pipeline.
 */
import { useMemo, useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import styled from 'styled-components'
import { toast } from 'sonner'
import { Trash2 } from 'lucide-react'
import { Button, Dialog, Input, Select, textRole } from '@ledgr/ui'

import { financeApi, type MerchantRuleItem } from '@ct/shared/api/areas'

const Stack = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.spacing[4]};
`

const Form = styled.form`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.spacing[3]};
`

const Field = styled.label`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.spacing[1]};
`

const FieldLabel = styled.span`
  ${textRole('body-s')};
  font-weight: ${({ theme }) => theme.typography.fontWeight.medium};
  color: ${({ theme }) => theme.color.foreground};
`

const Hint = styled.span`
  ${textRole('body-s')};
  color: ${({ theme }) => theme.color.mutedForeground};
`

const ErrorText = styled.span`
  ${textRole('body-s')};
  color: ${({ theme }) => theme.color.destructive};
`

const Row2 = styled.div`
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
  gap: ${({ theme }) => theme.spacing[3]};
`

const SectionTitle = styled.div`
  ${textRole('body-s')};
  font-weight: ${({ theme }) => theme.typography.fontWeight.semibold};
  color: ${({ theme }) => theme.color.mutedForeground};
`

const RuleRow = styled.div`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing[3]};
  padding: ${({ theme }) => `${theme.spacing[2]} 0`};
  border-bottom: 1px solid ${({ theme }) => theme.color.border};

  &:last-child { border-bottom: none; }
`

const RuleBody = styled.div`
  flex: 1;
  min-width: 0;
`

const RulePattern = styled.div`
  ${textRole('body-m')};
  color: ${({ theme }) => theme.color.foreground};
  overflow-wrap: anywhere;
`

const RuleMeta = styled.div`
  ${textRole('body-s')};
  color: ${({ theme }) => theme.color.mutedForeground};
`

const MATCH_TYPES = [
  { label: 'Contains', value: 'contains' },
  { label: 'Equals', value: 'equals' },
  { label: 'Regex', value: 'regex' },
]

export interface MerchantRulesDialogProps {
  open: boolean
  onClose: () => void
  rules: MerchantRuleItem[]
  categories: Array<{ id: string; name: string }>
  categoryName: (id: string | null) => string | null
}

export function MerchantRulesDialog({
  open, onClose, rules, categories, categoryName,
}: MerchantRulesDialogProps) {
  const qc = useQueryClient()
  const [matchType, setMatchType] = useState('contains')
  const [pattern, setPattern] = useState('')
  const [categoryId, setCategoryId] = useState('')
  const [error, setError] = useState<string | null>(null)

  const categoryOptions = useMemo(
    () => [{ label: 'No category', value: '' }, ...categories.map((c) => ({ label: c.name, value: c.id }))],
    [categories],
  )

  const invalidate = () => qc.invalidateQueries({ queryKey: ['finance', 'rules'] })

  const createRule = useMutation({
    mutationFn: () => financeApi.createRule({
      match_type: matchType,
      pattern: pattern.trim(),
      category_id: categoryId || null,
      is_active: true,
    }),
    onSuccess: () => {
      setPattern('')
      setCategoryId('')
      setError(null)
      void invalidate()
      toast.success('Rule created')
    },
    onError: () => toast.error('Could not create that rule'),
  })

  const deleteRule = useMutation({
    mutationFn: (id: string) => financeApi.deleteRule(id),
    onSuccess: () => { void invalidate(); toast.success('Rule deleted') },
    onError: () => toast.error('Could not delete that rule'),
  })

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    const trimmed = pattern.trim()
    if (!trimmed) {
      setError('Enter something to match against the merchant name.')
      return
    }
    if (matchType === 'regex') {
      /* Validated here because the pattern is compiled server-side against
         every incoming transaction — an invalid one would fail silently on
         ingestion, long after the user left this dialog. */
      try {
        new RegExp(trimmed)
      } catch {
        setError('That is not a valid regular expression.')
        return
      }
    }
    setError(null)
    createRule.mutate()
  }

  return (
    <Dialog title="Auto-categorization rules" open={open} onOpenChange={(v) => { if (!v) onClose() }} size="sm">
      <Stack>
        <Form onSubmit={submit}>
          <Row2>
            <Field>
              <FieldLabel>Match</FieldLabel>
              <Select options={MATCH_TYPES} value={matchType} onChange={(v) => setMatchType(String(v))} />
            </Field>
            <Field>
              <FieldLabel>Category</FieldLabel>
              <Select
                options={categoryOptions}
                value={categoryId}
                onChange={(v) => setCategoryId(String(v))}
                placeholder="No category"
              />
            </Field>
          </Row2>

          <Field>
            <FieldLabel>Pattern</FieldLabel>
            <Input
              value={pattern}
              onChange={(e) => { setPattern(e.target.value); if (error) setError(null) }}
              placeholder={matchType === 'regex' ? '^SWIGGY.*' : 'swiggy'}
              {...(error ? { invalid: true } : {})}
            />
            {error ? <ErrorText>{error}</ErrorText> : (
              <Hint>Matched against the merchant name before a transaction reaches your inbox.</Hint>
            )}
          </Field>

          <Button type="submit" loading={createRule.isPending}>Add rule</Button>
        </Form>

        <div>
          <SectionTitle>
            {rules.length ? `${rules.length} existing` : 'No rules yet'}
          </SectionTitle>
          {rules.map((r) => (
            <RuleRow key={r.id}>
              <RuleBody>
                <RulePattern>{r.pattern}</RulePattern>
                <RuleMeta>
                  {r.match_type} · {categoryName(r.category_id ?? null) ?? 'no category'}
                  {!r.is_active && ' · off'}
                </RuleMeta>
              </RuleBody>
              <Button
                variant="ghost"
                size="sm"
                aria-label={`Delete rule ${r.pattern}`}
                loading={deleteRule.isPending && deleteRule.variables === r.id}
                onClick={() => deleteRule.mutate(r.id)}
              >
                <Trash2 size={15} />
              </Button>
            </RuleRow>
          ))}
        </div>
      </Stack>
    </Dialog>
  )
}
