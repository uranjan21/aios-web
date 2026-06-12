import { useEffect } from 'react'
import { useMutation } from '@tanstack/react-query'
import { Modal, Button } from 'antd'
import { toast } from 'sonner'
import { Copy, RefreshCw, Sparkles } from 'lucide-react'
import { aiApi } from '@/api/areas'
import { Skeleton } from '@/components/ui/skeleton'

/** AI content draft — platform-aware thread/post/outline from an idea title. */
export function DraftModal({ open, onClose, title, platform }: {
  open: boolean
  onClose: () => void
  title: string
  platform: string
}) {
  const { mutate, data, isPending, reset } = useMutation({
    mutationFn: () => aiApi.draft(title, platform),
    onError: () => toast.error('AI temporarily unavailable'),
  })

  useEffect(() => {
    if (open && title.trim()) {
      reset()
      mutate()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  const copy = async () => {
    if (!data?.text) return
    await navigator.clipboard.writeText(data.text)
    toast.success('Draft copied')
  }

  return (
    <Modal
      open={open}
      onCancel={onClose}
      width={640}
      title={
        <span className="flex items-center gap-2">
          <Sparkles size={14} className="text-violet-400" />
          AI Draft — {platform.charAt(0).toUpperCase() + platform.slice(1)}
        </span>
      }
      footer={
        <div className="flex justify-between">
          <Button icon={<RefreshCw size={13} />} loading={isPending} onClick={() => mutate()}>Regenerate</Button>
          <div className="flex gap-2">
            <Button onClick={onClose}>Close</Button>
            <Button type="primary" icon={<Copy size={13} />} disabled={!data?.text} onClick={copy}>Copy</Button>
          </div>
        </div>
      }
    >
      <div className="text-[12px] text-muted-foreground mb-2">Idea: {title}</div>
      {isPending ? (
        <div className="space-y-2 py-2">
          {[1, 2, 3, 4, 5].map(i => <Skeleton key={i} className="h-3.5 w-full" />)}
        </div>
      ) : data ? (
        <div className="text-[13px] text-foreground leading-relaxed whitespace-pre-wrap max-h-[50vh] overflow-y-auto">{data.text}</div>
      ) : (
        <p className="text-[12px] text-muted-foreground py-4">Generating…</p>
      )}
    </Modal>
  )
}
