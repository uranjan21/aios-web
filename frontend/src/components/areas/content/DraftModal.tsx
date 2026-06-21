import { useEffect } from 'react'
import { useMutation } from '@tanstack/react-query'
import { Dialog, Button } from '@ledgr/ui'
import { toast } from 'sonner'
import { Copy, RefreshCw, Sparkles } from 'lucide-react'
import { aiApi } from '@/api/areas'
import { Skeleton } from '@/components/ui/skeleton'
import styled from 'styled-components'

const IdeaLabel = styled.div`
  font-size: 12px;
  color: ${({ theme }) => theme.color.mutedForeground};
  margin-bottom: 12px;
`

const DraftText = styled.div`
  font-size: 13px;
  color: ${({ theme }) => theme.color.foreground};
  line-height: 1.6;
  white-space: pre-wrap;
  max-height: 50vh;
  overflow-y: auto;
`

const SkeletonStack = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 4px 0;
`

const InitialState = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  padding: 24px 0 8px;
  text-align: center;
`

const InitialHint = styled.p`
  margin: 0;
  font-size: 12.5px;
  color: ${({ theme }) => theme.color.mutedForeground};
  line-height: 1.5;
  max-width: 320px;
`

const Footer = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 16px;
  padding-top: 12px;
  border-top: 1px solid ${({ theme }) => theme.color.border};
`

const FooterRight = styled.div`
  display: flex;
  gap: 8px;
`

/** AI content draft — user triggers generation explicitly, then can regenerate or copy. */
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

  // Reset draft when modal closes so next open starts fresh
  useEffect(() => {
    if (!open) reset()
  }, [open, reset])

  const copy = async () => {
    if (!data?.text) return
    await navigator.clipboard.writeText(data.text)
    toast.success('Draft copied')
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose() }} title="AI Draft" size="lg">
      <IdeaLabel>Idea: <strong>{title}</strong> · {platform}</IdeaLabel>

      {isPending ? (
        <SkeletonStack>
          {[90, 75, 85, 60, 80].map((w, i) => (
            <Skeleton key={i} style={{ height: 14, width: `${w}%` }} />
          ))}
        </SkeletonStack>
      ) : data ? (
        <DraftText>{data.text}</DraftText>
      ) : (
        <InitialState>
          <Sparkles size={28} style={{ opacity: 0.4 }} />
          <InitialHint>
            Click <strong>Generate</strong> to draft a {platform} post for this idea using your content context.
          </InitialHint>
          <Button variant="primary" startIcon={<Sparkles size={13} />} onClick={() => mutate()}>
            Generate Draft
          </Button>
        </InitialState>
      )}

      <Footer>
        {data ? (
          <Button variant="outline" size="sm" startIcon={<RefreshCw size={12} />} loading={isPending} onClick={() => mutate()}>
            Regenerate
          </Button>
        ) : <span />}
        <FooterRight>
          <Button variant="ghost" size="sm" onClick={onClose}>Close</Button>
          {data && (
            <Button variant="primary" size="sm" startIcon={<Copy size={12} />} onClick={copy}>
              Copy
            </Button>
          )}
        </FooterRight>
      </Footer>
    </Dialog>
  )
}
