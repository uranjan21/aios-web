import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Button, Dialog, DialogFooter, Input } from '@ledgr/ui'
import { toast } from 'sonner'
import { FolderInput, Tag as TagIcon } from 'lucide-react'
import { financeApi } from '@/api/areas'
import { CategoryPicker } from '../CategoryPicker'
import type { Txn } from './types'

// ── Bulk: recategorize ───────────────────────────────────────────────────────

export function BulkCategorizeDialog({ open, onClose, targets, onDone }: { open: boolean; onClose: () => void; targets: Txn[]; onDone: () => void }) {
  const queryClient = useQueryClient()
  const { data: userCategories } = useQuery({ queryKey: ['finance', 'categories'], queryFn: () => financeApi.categories(), enabled: open })
  const [categoryId, setCategoryId] = useState<string | undefined>()

  const nonTransfer = targets.filter(t => t.type !== 'transfer')
  const kinds = new Set(nonTransfer.map(t => t.type))
  const kind: 'income' | 'expense' | null = kinds.size === 1 ? (nonTransfer[0].type as any) : null

  useEffect(() => { if (open) setCategoryId(undefined) }, [open])

  const { mutate, isPending } = useMutation({
    mutationFn: async () => {
      const results = await Promise.allSettled(nonTransfer.map(t =>
        t.type === 'income' ? financeApi.patchIncome(t.id, { category_id: categoryId })
          : financeApi.patchExpense(t.id, { category_id: categoryId })))
      return results.filter(r => r.status === 'rejected').length
    },
    onSuccess: (failed: number) => {
      queryClient.invalidateQueries({ queryKey: ['finance'] })
      if (failed > 0) toast.warning(`Recategorized ${nonTransfer.length - failed}, ${failed} failed`)
      else toast.success(`Recategorized ${nonTransfer.length} transaction${nonTransfer.length === 1 ? '' : 's'}`)
      onDone()
      onClose()
    },
    onError: () => toast.error('Failed to recategorize'),
  })

  return (
    <Dialog open={open} onOpenChange={(v: boolean) => { if (!v) onClose() }} title="Recategorize" icon={<FolderInput size={16} />}>
      <div style={{ paddingBottom: 8 }}>
        {kind === null ? (
          <div style={{ fontSize: 13, color: 'var(--muted-foreground)', padding: '8px 0 4px' }}>
            Select only expenses or only income to recategorize them together (income and expenses use separate category trees).
          </div>
        ) : (
          <>
            <div style={{ fontSize: 12, color: 'var(--muted-foreground)', marginBottom: 10 }}>
              Applying to <b style={{ color: 'var(--foreground)' }}>{nonTransfer.length}</b> {kind === 'income' ? 'income' : 'expense'} transaction{nonTransfer.length === 1 ? '' : 's'}.
            </div>
            <CategoryPicker
              kind={kind}
              categories={(userCategories ?? []) as any}
              value={categoryId}
              onChange={setCategoryId}
              label={kind === 'income' ? 'source' : 'category'}
            />
          </>
        )}
      </div>
      <DialogFooter>
        <Button variant="ghost" type="button" onClick={onClose} disabled={isPending}>Cancel</Button>
        {kind !== null && <Button variant="primary" type="button" loading={isPending} disabled={!categoryId} onClick={() => mutate()}>Apply</Button>}
      </DialogFooter>
    </Dialog>
  )
}

// ── Bulk: add tag ─────────────────────────────────────────────────────────────

export function BulkTagDialog({ open, onClose, targets, onDone }: { open: boolean; onClose: () => void; targets: Txn[]; onDone: () => void }) {
  const queryClient = useQueryClient()
  const [tag, setTag] = useState('')
  const nonTransfer = targets.filter(t => t.type !== 'transfer')

  useEffect(() => { if (open) setTag('') }, [open])

  const { mutate, isPending } = useMutation({
    mutationFn: async () => {
      const clean = tag.trim()
      const results = await Promise.allSettled(nonTransfer.map(t => {
        const existing = (t.tags ?? '').split(',').map(s => s.trim()).filter(Boolean)
        if (existing.includes(clean)) return Promise.resolve()
        const next = [...existing, clean].join(',')
        return t.type === 'income' ? financeApi.patchIncome(t.id, { tags: next }) : financeApi.patchExpense(t.id, { tags: next })
      }))
      return results.filter(r => r.status === 'rejected').length
    },
    onSuccess: (failed: number) => {
      queryClient.invalidateQueries({ queryKey: ['finance'] })
      if (failed > 0) toast.warning(`Tagged ${nonTransfer.length - failed}, ${failed} failed`)
      else toast.success(`Tagged ${nonTransfer.length} transaction${nonTransfer.length === 1 ? '' : 's'}`)
      onDone()
      onClose()
    },
    onError: () => toast.error('Failed to tag transactions'),
  })

  return (
    <Dialog open={open} onOpenChange={(v: boolean) => { if (!v) onClose() }} title="Add tag" icon={<TagIcon size={16} />}>
      <div style={{ paddingBottom: 8 }}>
        <div style={{ fontSize: 12, color: 'var(--muted-foreground)', marginBottom: 10 }}>
          Adds a tag to <b style={{ color: 'var(--foreground)' }}>{nonTransfer.length}</b> transaction{nonTransfer.length === 1 ? '' : 's'} (existing tags are kept).
        </div>
        <Input
          placeholder="e.g. reimbursable" value={tag} onChange={e => setTag(e.target.value)} autoFocus
          onKeyDown={e => { if (e.key === 'Enter' && tag.trim()) mutate() }}
        />
      </div>
      <DialogFooter>
        <Button variant="ghost" type="button" onClick={onClose} disabled={isPending}>Cancel</Button>
        <Button variant="primary" type="button" loading={isPending} disabled={!tag.trim()} onClick={() => mutate()}>Add tag</Button>
      </DialogFooter>
    </Dialog>
  )
}
