import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Input, Select, Button } from '@ledgr/ui'
import { toast } from 'sonner'
import { careerApi } from '@aios/shared/api/areas'
import type { OpportunityStatus } from '@aios/shared/types'
import styled from 'styled-components'

const STATUS_ORDER: OpportunityStatus[] = ['prospect', 'applied', 'screening', 'interview', 'offer', 'rejected', 'closed']

const FormGrid2 = styled.div`
  display: grid;
  grid-template-columns: 1fr;
  gap: 12px;
  margin-bottom: 12px;
  @media (min-width: 640px) {
    grid-template-columns: 1fr 1fr;
  }
`

const FormField = styled.div`
  display: flex;
  flex-direction: column;
`

const FormLabel = styled.label`
  display: block;
  font-size: 11px;
  color: ${({ theme }) => theme.color.mutedForeground};
  margin-bottom: 4px;
`

const FormFooter = styled.div`
  display: flex;
  gap: 8px;
  justify-content: flex-end;
  width: 100%;
`

export function OpportunityForm({ onClose }: { onClose: () => void }) {
  const [company, setCompany] = useState('')
  const [role, setRole] = useState('')
  const [status, setStatus] = useState<OpportunityStatus>('prospect')
  const [url, setUrl] = useState('')
  const [notes, setNotes] = useState('')
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
      onClose()
    },
    onError: () => toast.error('Failed to add opportunity'),
  })

  return (
    <form onSubmit={e => { e.preventDefault(); mutate() }}>
      <FormGrid2>
        <FormField>
          <FormLabel htmlFor="opp-company">Company</FormLabel>
          <Input id="opp-company" placeholder="Stripe, Notion…" value={company} onChange={(e: any) => setCompany(e.target.value)} required />
        </FormField>
        <FormField>
          <FormLabel htmlFor="opp-role">Role</FormLabel>
          <Input id="opp-role" placeholder="Software Engineer" value={role} onChange={(e: any) => setRole(e.target.value)} required />
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
          <Input id="opp-url" placeholder="https://…" type="url" value={url} onChange={(e: any) => setUrl(e.target.value)} />
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
