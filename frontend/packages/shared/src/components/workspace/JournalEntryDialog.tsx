/**
 * Edit or delete one career journal entry.
 *
 * Shared because two surfaces show the same rows and both need to correct
 * them: Career → Journal (the composer's own timeline) and Today → Weekly
 * review ("Written this week", where the review's reflection lands). Entries
 * were append-only until 2026-08-06 — `updateJournalEntry`/`deleteJournalEntry`
 * existed in the API client with no caller anywhere.
 */
import { useEffect, useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { NotebookPen, Trash2 } from 'lucide-react'
import { Button, Dialog, DialogFooter, Input, Label, Textarea } from '@ledgr/ui'
import { careerApi, type JournalEntry } from '@ct/shared/api/areas'

export function JournalEntryDialog({
  entry,
  onClose,
}: {
  /** Non-null opens the dialog on that entry. */
  entry: JournalEntry | null
  onClose: () => void
}) {
  const qc = useQueryClient()
  const [draft, setDraft] = useState({ title: '', body: '', entry_date: '' })

  /* ledgr-ui Dialog fires onOpenChange on CLOSE only, so the prefill has to
     run off the prop rather than an open handler. */
  useEffect(() => {
    if (entry) {
      setDraft({
        title: entry.title ?? '',
        body: entry.body,
        entry_date: entry.entry_date.slice(0, 10),
      })
    }
  }, [entry])

  const invalidate = () => qc.invalidateQueries({ queryKey: ['career', 'journal'] })

  const update = useMutation({
    mutationFn: () =>
      careerApi.updateJournalEntry(entry!.id, {
        title: draft.title.trim() || undefined,
        body: draft.body.trim(),
        entry_date: draft.entry_date,
      }),
    onSuccess: () => {
      invalidate()
      onClose()
      toast.success('Entry updated')
    },
    onError: () => toast.error('Could not update that entry'),
  })

  const remove = useMutation({
    mutationFn: () => careerApi.deleteJournalEntry(entry!.id),
    onSuccess: () => {
      invalidate()
      onClose()
      toast.success('Entry deleted')
    },
    onError: () => toast.error('Could not delete that entry'),
  })

  return (
    <Dialog
      open={!!entry}
      onOpenChange={(o) => { if (!o) onClose() }}
      icon={<NotebookPen size={18} />}
      eyebrow="Journal"
      title="Edit entry"
      description="Tags and word count are re-derived from the body on save."
      size="md"
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div>
          <Label htmlFor="journal-title">Title (optional)</Label>
          <Input
            id="journal-title"
            value={draft.title}
            onChange={(e) => setDraft({ ...draft, title: e.target.value })}
            placeholder="Leave blank to use the first line"
          />
        </div>
        <div>
          <Label htmlFor="journal-date">Date</Label>
          <Input
            id="journal-date"
            type="date"
            value={draft.entry_date}
            onChange={(e) => setDraft({ ...draft, entry_date: e.target.value })}
          />
        </div>
        <div>
          <Label htmlFor="journal-body">Entry</Label>
          <Textarea
            id="journal-body"
            rows={10}
            value={draft.body}
            onChange={(e) => setDraft({ ...draft, body: e.target.value })}
          />
        </div>
        <DialogFooter>
          <Button
            variant="destructive"
            size="sm"
            style={{ marginRight: 'auto' }}
            loading={remove.isPending}
            onClick={() => remove.mutate()}
          >
            <Trash2 size={14} style={{ marginRight: 4 }} /> Delete
          </Button>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button
            variant="primary"
            disabled={!draft.body.trim()}
            loading={update.isPending}
            onClick={() => update.mutate()}
          >
            Save changes
          </Button>
        </DialogFooter>
      </div>
    </Dialog>
  )
}
