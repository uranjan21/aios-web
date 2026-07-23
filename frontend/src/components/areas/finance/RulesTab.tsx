import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Card, Button, Input, Select, Switch, DataTable } from '@ledgr/ui'
import { Wand2, Trash2, Plus } from 'lucide-react'
import styled from 'styled-components'
import { financeApi, type MerchantRuleItem } from '@/api/areas'
import { Popconfirm } from '@/components/ui/Popconfirm'
import { Skeleton } from '@/components/ui/skeleton'

const FormRow = styled.form`
  display: flex;
  flex-wrap: wrap;
  align-items: flex-end;
  gap: 8px;
  background: ${({ theme }) => theme.color.muted}66;
  border-radius: ${({ theme }) => theme.radii.md};
  padding: 12px;
  margin-bottom: 16px;
`
const Field = styled.div<{ $w?: number }>`
  display: flex;
  flex-direction: column;
  gap: 4px;
  min-width: ${({ $w }) => $w ?? 130}px;
  flex: ${({ $w }) => ($w ? '0 0 auto' : 1)};
`
const FieldLabel = styled.label`
  font-size: 11px;
  font-weight: 600;
  color: ${({ theme }) => theme.color.mutedForeground};
`
const Mono = styled.span`
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  font-size: 13px;
`

const MATCH_OPTIONS = [
  { value: 'contains', label: 'contains' },
  { value: 'equals', label: 'equals' },
  { value: 'regex', label: 'regex' },
]

export function RulesTab() {
  const queryClient = useQueryClient()
  const [pattern, setPattern] = useState('')
  const [matchType, setMatchType] = useState('contains')
  const [categoryId, setCategoryId] = useState<string>('')
  const [accountId, setAccountId] = useState<string>('')

  const { data: rules, isLoading } = useQuery({ queryKey: ['finance', 'rules'], queryFn: financeApi.rules })
  const { data: categories } = useQuery({
    queryKey: ['finance', 'categories'],
    queryFn: () => financeApi.categories('expense'),
    staleTime: 60_000,
  })
  const { data: accounts } = useQuery({ queryKey: ['finance', 'accounts'], queryFn: financeApi.accounts, staleTime: 60_000 })

  const catName = new Map((categories ?? []).map((c) => [c.id, c.name]))
  const accName = new Map((accounts ?? []).map((a) => [a.id, a.name]))

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['finance', 'rules'] })

  const createMutation = useMutation({
    mutationFn: () =>
      financeApi.createRule({
        match_type: matchType,
        pattern,
        category_id: categoryId || null,
        account_id: accountId || null,
      }),
    onSuccess: () => {
      invalidate()
      toast.success('Rule added')
      setPattern(''); setCategoryId(''); setAccountId('')
    },
    onError: () => toast.error('Failed to add rule'),
  })

  const toggleMutation = useMutation({
    mutationFn: (r: MerchantRuleItem) => financeApi.patchRule(r.id, { is_active: !r.is_active }),
    onSuccess: invalidate,
    onError: () => toast.error('Failed to update rule'),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => financeApi.deleteRule(id),
    onSuccess: () => { invalidate(); toast.success('Rule removed') },
    onError: () => toast.error('Failed to delete rule'),
  })

  const columns = [
    { id: 'match', header: 'When payee', cell: (r: MerchantRuleItem) => <span>{r.match_type} <Mono>{r.pattern}</Mono></span> },
    { id: 'category', header: 'Set category', cell: (r: MerchantRuleItem) => <span>{r.category_id ? catName.get(r.category_id) ?? '—' : '—'}</span> },
    { id: 'account', header: 'Set account', cell: (r: MerchantRuleItem) => <span>{r.account_id ? accName.get(r.account_id) ?? '—' : '—'}</span> },
    {
      id: 'active', header: 'Active',
      cell: (r: MerchantRuleItem) => (
        <Switch checked={r.is_active} onChange={() => toggleMutation.mutate(r)} aria-label="Toggle rule active" />
      ),
    },
    {
      id: 'action', header: '',
      cell: (r: MerchantRuleItem) => (
        <Popconfirm title="Delete this rule?" onConfirm={() => deleteMutation.mutate(r.id)} okText="Delete" cancelText="Cancel" okButtonProps={{ danger: true }}>
          <Button variant="destructive" size="icon"><Trash2 size={14} /></Button>
        </Popconfirm>
      ),
    },
  ]

  if (isLoading) return <Skeleton style={{ height: 280 }} />

  return (
    <Card
      title="Auto-categorisation rules"
      subtitle="When an ingested transaction's payee matches, apply a category and account automatically"
      icon={<Wand2 size={16} />}
    >
      <FormRow onSubmit={(e) => { e.preventDefault(); if (pattern.trim()) createMutation.mutate() }}>
        <Field $w={130}>
          <FieldLabel>Match</FieldLabel>
          <Select fullWidth={false} value={matchType} onChange={(v: any) => setMatchType(String(v))} options={MATCH_OPTIONS} />
        </Field>
        <Field>
          <FieldLabel>Payee pattern</FieldLabel>
          <Input value={pattern} placeholder="e.g. SWIGGY" onChange={(e) => setPattern(e.target.value)} required />
        </Field>
        <Field $w={160}>
          <FieldLabel>Category</FieldLabel>
          <Select
            fullWidth={false}
            value={categoryId}
            onChange={(v: any) => setCategoryId(String(v))}
            placeholder="Category"
            options={[{ value: '', label: 'None' }, ...(categories ?? []).map((c) => ({ value: c.id, label: c.name }))]}
          />
        </Field>
        <Field $w={160}>
          <FieldLabel>Account</FieldLabel>
          <Select
            fullWidth={false}
            value={accountId}
            onChange={(v: any) => setAccountId(String(v))}
            placeholder="Account"
            options={[{ value: '', label: 'None' }, ...(accounts ?? []).map((a) => ({ value: a.id, label: a.name }))]}
          />
        </Field>
        <Button type="submit" variant="primary" size="sm" loading={createMutation.isPending}>
          <Plus size={12} style={{ marginRight: 4 }} /> Add rule
        </Button>
      </FormRow>

      <DataTable
        rows={rules ?? []}
        columns={columns}
        getRowKey={(r) => r.id}
        empty={{ icon: <Wand2 size={20} />, title: 'No rules yet', description: 'Add a rule so matching transactions get categorised automatically at ingestion.' }}
      />
    </Card>
  )
}
