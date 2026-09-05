import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Input, Select, Button } from '@ledgr/ui'
import { toast } from 'sonner'
import { careerApi } from '@ct/shared/api/areas'
import type { OpportunityStatus } from '@ct/shared/types'
import { FieldError, useFieldErrors } from '@ct/shared/components/forms/fieldErrors'
import styled from 'styled-components'

const STATUS_ORDER: OpportunityStatus[] = ['prospect', 'applied', 'screening', 'interview', 'offer', 'rejected', 'closed']

const FormGrid2 = styled.div`
  display: grid;
  grid-template-columns: 1fr;
  gap: ${({ theme }) => `${theme.spacing[3]}`};
  margin-bottom: ${({ theme }) => `${theme.spacing[3]}`};
  @media ${({ theme }) => theme.media.sm} {
    grid-template-columns: 1fr 1fr;
  }
`

const FormField = styled.div`
  display: flex;
  flex-direction: column;
`

const FormLabel = styled.label`
  display: block;
  font-size: ${({ theme }) => theme.typography.fontSize.xs};
  color: ${({ theme }) => theme.color.mutedForeground};
  margin-bottom: ${({ theme }) => `${theme.spacing[1]}`};
`

const FormFooter = styled.div`
  display: flex;
  gap: ${({ theme }) => `${theme.spacing[2]}`};
  justify-content: flex-end;
  width: 100%;
`

export function OpportunityForm({ onClose }: { onClose: () => void }) {
  const [company, setCompany] = useState('')
  const [role, setRole] = useState('')
  const [status, setStatus] = useState<OpportunityStatus>('prospect')
  const [url, setUrl] = useState('')
  const [notes, setNotes] = useState('')
  const f = useFieldErrors<'company' | 'role' | 'url'>('opportunity')
  const queryClient = useQueryClient()

  const { mutate, isPending } = useMutation({
    mutationFn: () => careerApi.createOpportunity({
      company: company.trim(), role: role.trim(),
      status: status || 'prospect',
      url: url?.trim() || undefined,
      notes: notes?.trim() || undefined,
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['career', 'opportunities'] })
      toast.success('Opportunity added')
      setCompany(''); setRole(''); setStatus('prospect'); setUrl(''); setNotes('')
      f.reset()
      onClose()
    },
    onError: () => toast.error('Failed to add opportunity'),
  })

  /* `OpportunityCreate` requires `company` and `role`. `url` is optional and
     free-form server-side — but `type="url"` stops enforcing anything once the
     form is `noValidate`, so a typed value is checked here or not at all. */
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const link = url.trim()
    const ok = f.submit({
      company: company.trim() ? undefined : 'Name the company.',
      role: role.trim() ? undefined : 'Name the role.',
      url: link === '' || /^https?:\/\/\S+$/.test(link)
        ? undefined
        : 'Enter a full http:// or https:// link, or leave this blank.',
    })
    if (ok) mutate()
  }

  return (
    <form noValidate onSubmit={handleSubmit}>
      <FormGrid2>
        <FormField>
          <FormLabel htmlFor="opp-company">Company</FormLabel>
          <Input id="opp-company" placeholder="Stripe, Notion…" value={company} {...f.fieldProps('company')} onChange={(e: any) => { f.clearField('company'); setCompany(e.target.value) }} />
          <FieldError id={f.errorId('company')}>{f.errors.company}</FieldError>
        </FormField>
        <FormField>
          <FormLabel htmlFor="opp-role">Role</FormLabel>
          <Input id="opp-role" placeholder="Software Engineer" value={role} {...f.fieldProps('role')} onChange={(e: any) => { f.clearField('role'); setRole(e.target.value) }} />
          <FieldError id={f.errorId('role')}>{f.errors.role}</FieldError>
        </FormField>
      </FormGrid2>
      <FormGrid2>
        <FormField>
          <FormLabel htmlFor="opp-status">Status</FormLabel>
          <Select
            id="opp-status"
            value={status}
            onChange={(val) => setStatus(val as OpportunityStatus)}
            options={STATUS_ORDER.map(s => ({ value: s, label: s.charAt(0).toUpperCase() + s.slice(1) }))}
            placeholder="Choose status…"
            aria-label="Opportunity status"
          />
        </FormField>
        <FormField>
          <FormLabel htmlFor="opp-url">URL</FormLabel>
          <Input id="opp-url" placeholder="https://…" type="url" value={url} {...f.fieldProps('url')} onChange={(e: any) => { f.clearField('url'); setUrl(e.target.value) }} />
          <FieldError id={f.errorId('url')}>{f.errors.url}</FieldError>
        </FormField>
      </FormGrid2>
      <div style={{ marginBottom: 12 }}>
        <FormLabel htmlFor="opp-notes">Notes</FormLabel>
        <Input id="opp-notes" placeholder="Referral via X, recruiter name…" value={notes} onChange={(e: any) => setNotes(e.target.value)} />
      </div>
      <FormFooter>
        <Button variant="ghost" type="button" onClick={onClose} size="sm">Cancel</Button>
        <Button variant="primary" type="submit" loading={isPending} size="sm">Add Opportunity</Button>
      </FormFooter>
    </form>
  )
}
