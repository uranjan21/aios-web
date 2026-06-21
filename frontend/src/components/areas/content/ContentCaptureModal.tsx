// @ts-nocheck
import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Dialog, Input, Select, SelectItem, Button } from '@ledgr/ui'
import { toast } from 'sonner'
import { contentApi } from '@/api/areas'
import { Plus, WandSparkles } from 'lucide-react'
import { DraftModal } from '@/components/areas/content/DraftModal'
import type { ContentItem } from '@/types'
import styled from 'styled-components'

const ErrorMessage = styled.span`
  font-size: 11px;
  color: ${({ theme }) => theme.color.destructive};
  padding-left: 4px;
`

export function ContentCaptureModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const queryClient = useQueryClient()
  const [form, setForm] = useState({ title: '', platform: 'linkedin', status: 'idea' as ContentItem['status'] })
  const [titleError, setTitleError] = useState('')
  const [draftOpen, setDraftOpen] = useState(false)

  const handleOpenChange = (visible: boolean) => {
    if (visible) {
      setForm({ title: '', platform: 'linkedin', status: 'idea' })
      setTitleError('')
    } else {
      onClose()
    }
  }

  const addItem = useMutation({
    mutationFn: () => contentApi.createItem({ title: form.title, platform: form.platform }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['content', 'items'] })
      setForm(f => ({ ...f, title: '' }))
      setTitleError('')
      toast.success('Idea added to pipeline')
      onClose()
    },
    onError: () => toast.error('Failed to add idea'),
  })

  const handleAdd = () => {
    if (!form.title.trim()) { setTitleError('Title is required'); return }
    setTitleError('')
    addItem.mutate()
  }

  return (
    <>
      <Dialog open={open} onOpenChange={handleOpenChange} title="Quick Capture">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16, marginTop: 8 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <Input
              aria-label="Idea title"
              placeholder="What's your next big idea?"
              value={form.title}
              onChange={e => { setForm(f => ({ ...f, title: e.target.value })); setTitleError('') }}
              onKeyDown={e => e.key === 'Enter' && handleAdd()}
              invalid={!!titleError}
              size="lg"
            />
            {titleError && (
              <ErrorMessage>
                {titleError}
              </ErrorMessage>
            )}
          </div>

          <Select
            aria-label="Target platform"
            value={form.platform}
            onChange={v => setForm(f => ({ ...f, platform: v }))}
            size="lg"
          >
            {['linkedin', 'twitter', 'instagram', 'youtube', 'blog'].map(p => (
              <SelectItem key={p} value={p}>{p.charAt(0).toUpperCase() + p.slice(1)}</SelectItem>
            ))}
          </Select>

          <div style={{ display: 'flex', width: '100%', justifyContent: 'flex-end', marginTop: 8, gap: 8 }}>
            <Button
              variant="outline"
              startIcon={<WandSparkles size={14} />}
              onClick={() => form.title.trim() ? setDraftOpen(true) : setTitleError('Type an idea first')}
            >
              Draft with AI
            </Button>
            <Button variant="primary" onClick={handleAdd} loading={addItem.isPending} startIcon={<Plus size={14} />}>
              Add Idea
            </Button>
          </div>
        </div>
      </Dialog>

      <DraftModal
        open={draftOpen}
        onClose={() => {
          setDraftOpen(false)
          onClose()
        }}
        title={form.title}
        platform={form.platform}
      />
    </>
  )
}
