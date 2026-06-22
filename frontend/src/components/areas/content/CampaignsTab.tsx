import { useEffect, useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Card, Dialog, Input, Textarea, Button, ConfirmDialog } from '@ledgr/ui'
import { Pencil, Trash2, Target, Layers } from 'lucide-react'
import { toast } from 'sonner'
import styled from 'styled-components'
import { contentApi } from '@/api/areas'
import { Skeleton } from '@/components/ui/skeleton'
import type { ContentCampaign } from '@/types'

const Grid = styled.div`
  display: grid;
  grid-template-columns: 1fr;
  gap: 16px;
  @media (min-width: 640px) { grid-template-columns: repeat(2, 1fr); }
  @media (min-width: 1100px) { grid-template-columns: repeat(3, 1fr); }
`
const CampaignCard = styled(Card)<{ $color: string }>`
  position: relative;
  overflow: hidden;
  &::before {
    content: '';
    position: absolute;
    left: 0; top: 0; bottom: 0;
    width: 5px;
    background: ${({ $color }) => $color};
  }
  &:hover .campaign-actions { opacity: 1; }
  && {
    padding: 18px 18px 14px 22px;
  }
`
const CampaignHead = styled.div`
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 8px;
`
const CampaignName = styled.h3`
  font-size: 15px;
  font-weight: 600;
  color: ${({ theme }) => theme.color.foreground};
  margin: 0;
`
const Goal = styled.p`
  font-size: 12.5px;
  color: ${({ theme }) => theme.color.mutedForeground};
  margin: 6px 0 0;
  line-height: 1.5;
`
const Footer = styled.div`
  display: flex;
  align-items: center;
  gap: 16px;
  margin-top: 14px;
  font-size: 12px;
  color: ${({ theme }) => theme.color.mutedForeground};
`
const FooterItem = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 5px;
  font-variant-numeric: tabular-nums;
`
const Actions = styled.div`
  display: flex;
  gap: 4px;
  opacity: 0;
  transition: opacity 120ms;
`
const IconBtn = styled.button<{ $danger?: boolean }>`
  border: none;
  background: none;
  cursor: pointer;
  padding: 5px;
  border-radius: 6px;
  color: ${({ theme }) => theme.color.mutedForeground};
  &:hover { background: ${({ theme }) => theme.color.muted}; color: ${({ theme, $danger }) => ($danger ? theme.color.destructive : theme.color.foreground)}; }
`
const FormGrid = styled.div`
  display: flex;
  flex-direction: column;
  gap: 14px;
  margin-top: 8px;
`
const Field = styled.div`
  display: flex;
  flex-direction: column;
  gap: 6px;
`
const Label = styled.label`
  font-size: 12px;
  font-weight: 600;
  color: ${({ theme }) => theme.color.mutedForeground};
`
const DateRow = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
`
const Swatches = styled.div`
  display: flex;
  gap: 8px;
`
const SwatchBtn = styled.button<{ $color: string; $active: boolean }>`
  width: 28px;
  height: 28px;
  border-radius: 8px;
  background: ${({ $color }) => $color};
  border: 2px solid ${({ theme, $active }) => ($active ? theme.color.foreground : 'transparent')};
  cursor: pointer;
`
const Empty = styled.div`
  text-align: center;
  padding: 40px;
  color: ${({ theme }) => theme.color.mutedForeground};
  font-size: 13px;
`

const COLORS = ['#CA8A04', '#0A66C2', '#7c3aed', '#16a34a', '#dc2626', '#0284c7']

const BLANK = { id: '', name: '', description: '', goal: '', color: COLORS[0], start_date: '', end_date: '' }

export function CampaignsTab({ onRegisterNew }: {
  /** Lets the shared page-level toolbar trigger this tab's "New Campaign" dialog. */
  onRegisterNew?: (open: () => void) => void
}) {
  const queryClient = useQueryClient()
  const { data: campaigns, isLoading } = useQuery({ queryKey: ['content', 'campaigns'], queryFn: contentApi.campaigns })

  const [dialog, setDialog] = useState<{ open: boolean; editing: boolean; form: typeof BLANK }>({ open: false, editing: false, form: BLANK })
  const [confirmDel, setConfirmDel] = useState<{ open: boolean; id: string }>({ open: false, id: '' })

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['content', 'campaigns'] })
    queryClient.invalidateQueries({ queryKey: ['content', 'items'] })
  }

  const save = useMutation({
    mutationFn: () => {
      const f = dialog.form
      const body = {
        name: f.name.trim(), description: f.description || null, goal: f.goal || null,
        color: f.color, start_date: f.start_date || null, end_date: f.end_date || null,
      }
      return dialog.editing ? contentApi.patchCampaign(f.id, body) : contentApi.createCampaign(body)
    },
    onSuccess: () => { invalidate(); toast.success(dialog.editing ? 'Campaign updated' : 'Campaign created'); setDialog(d => ({ ...d, open: false })) },
    onError: () => toast.error('Failed to save campaign'),
  })

  const remove = useMutation({
    mutationFn: (id: string) => contentApi.deleteCampaign(id),
    onSuccess: () => { invalidate(); toast.success('Campaign deleted') },
    onError: () => toast.error('Failed to delete'),
  })

  const openNew = () => setDialog({ open: true, editing: false, form: BLANK })
  const openEdit = (c: ContentCampaign) => setDialog({
    open: true, editing: true,
    form: { id: c.id, name: c.name, description: c.description ?? '', goal: c.goal ?? '', color: c.color, start_date: c.start_date ?? '', end_date: c.end_date ?? '' },
  })

  const setForm = (patch: Partial<typeof BLANK>) => setDialog(d => ({ ...d, form: { ...d.form, ...patch } }))

  // Expose the opener so the shared page-level toolbar's "New Campaign" can fire it.
  useEffect(() => { onRegisterNew?.(openNew) }, [onRegisterNew])

  return (
    <>
      {isLoading ? (
        <Grid>{[1, 2, 3].map(i => <Skeleton key={i} style={{ height: 140, borderRadius: 14 }} />)}</Grid>
      ) : !campaigns || campaigns.length === 0 ? (
        <Empty>No campaigns yet. Create one to organise your content into themed series.</Empty>
      ) : (
        <Grid>
          {campaigns.map(c => (
            <CampaignCard key={c.id} $color={c.color} size="none">
              <CampaignHead>
                <CampaignName>{c.name}</CampaignName>
                <Actions className="campaign-actions">
                  <IconBtn onClick={() => openEdit(c)} aria-label="Edit campaign"><Pencil size={14} /></IconBtn>
                  <IconBtn $danger onClick={() => setConfirmDel({ open: true, id: c.id })} aria-label="Delete campaign"><Trash2 size={14} /></IconBtn>
                </Actions>
              </CampaignHead>
              {c.goal && <Goal><Target size={12} style={{ verticalAlign: -1, marginRight: 4 }} />{c.goal}</Goal>}
              {c.description && <Goal>{c.description}</Goal>}
              <Footer>
                <FooterItem><Layers size={13} />{c.item_count} piece{c.item_count !== 1 ? 's' : ''}</FooterItem>
                {c.start_date && <FooterItem>{new Date(c.start_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}{c.end_date ? ` → ${new Date(c.end_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}` : ''}</FooterItem>}
              </Footer>
            </CampaignCard>
          ))}
        </Grid>
      )}

      <Dialog open={dialog.open} onOpenChange={(open) => setDialog(d => ({ ...d, open }))} title={dialog.editing ? 'Edit Campaign' : 'New Campaign'}>
        <FormGrid>
          <Field>
            <Label>Name</Label>
            <Input aria-label="Campaign name" placeholder="e.g. AI Explainer Series" value={dialog.form.name} onChange={e => setForm({ name: e.target.value })} />
          </Field>
          <Field>
            <Label>Goal</Label>
            <Input aria-label="Goal" placeholder="e.g. 10k followers from this series" value={dialog.form.goal} onChange={e => setForm({ goal: e.target.value })} />
          </Field>
          <Field>
            <Label>Description</Label>
            <Textarea aria-label="Description" placeholder="What's this campaign about?" value={dialog.form.description} onChange={e => setForm({ description: e.target.value })} rows={3} />
          </Field>
          <DateRow>
            <Field>
              <Label>Start date</Label>
              <Input aria-label="Start date" type="date" value={dialog.form.start_date} onChange={e => setForm({ start_date: e.target.value })} />
            </Field>
            <Field>
              <Label>End date</Label>
              <Input aria-label="End date" type="date" value={dialog.form.end_date} onChange={e => setForm({ end_date: e.target.value })} />
            </Field>
          </DateRow>
          <Field>
            <Label>Colour</Label>
            <Swatches>
              {COLORS.map(col => (
                <SwatchBtn key={col} type="button" $color={col} $active={dialog.form.color === col} onClick={() => setForm({ color: col })} aria-label={`Colour ${col}`} />
              ))}
            </Swatches>
          </Field>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 4 }}>
            <Button variant="ghost" onClick={() => setDialog(d => ({ ...d, open: false }))}>Cancel</Button>
            <Button variant="primary" loading={save.isPending} onClick={() => dialog.form.name.trim() ? save.mutate() : toast.error('Name is required')}>
              {dialog.editing ? 'Save' : 'Create'}
            </Button>
          </div>
        </FormGrid>
      </Dialog>

      <ConfirmDialog
        open={confirmDel.open}
        onOpenChange={(open) => setConfirmDel(d => ({ ...d, open }))}
        title="Delete this campaign?"
        description="Content in this campaign will be kept but un-grouped."
        destructive
        confirmLabel="Delete"
        onConfirm={() => { remove.mutate(confirmDel.id); setConfirmDel({ open: false, id: '' }) }}
      />
    </>
  )
}
