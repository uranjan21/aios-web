// @ts-nocheck
import { useEffect } from 'react'
import { useMutation } from '@tanstack/react-query'
import { Dialog, Button } from '@ledgr/ui'
import { toast } from 'sonner'
import { Copy, RefreshCw } from 'lucide-react'
import { aiApi } from '@/api/areas'
import { Skeleton } from '@/components/ui/skeleton'
import styled from 'styled-components'

const IdeaLabel = styled.div`
  font-size: 12px;
  color: ${({ theme }) => theme.color.mutedForeground};
  margin-bottom: 8px;
`

const DraftText = styled.div`
  font-size: 13px;
  color: ${({ theme }) => theme.color.foreground};
  line-height: 1.6;
  white-space: pre-wrap;
  max-height: 50vh;
  overflow-y: auto;
`

const GeneratingLabel = styled.p`
  font-size: 12px;
  color: ${({ theme }) => theme.color.mutedForeground};
  padding: 16px 0;
  margin: 0;
`

const SkeletonStack = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 8px 0;
`

const DraftSkeleton = styled(Skeleton)`
  height: 14px;
  width: 100%;
`

const Footer = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 16px;
`

const FooterRight = styled.div`
  display: flex;
  gap: 8px;
`

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
    <Dialog open={open} onOpenChange={(visible) => { if (!visible) onClose() }}>
      <IdeaLabel>Idea: {title}</IdeaLabel>
      {isPending ? (
        <SkeletonStack>
          {[1, 2, 3, 4, 5].map(i => <DraftSkeleton key={i} />)}
        </SkeletonStack>
      ) : data ? (
        <DraftText>{data.text}</DraftText>
      ) : (
        <GeneratingLabel>Generating…</GeneratingLabel>
      )}
      <Footer>
        <Button variant="outline" startIcon={<RefreshCw size={13} />} loading={isPending} onClick={() => mutate()}>
          Regenerate
        </Button>
        <FooterRight>
          <Button variant="ghost" onClick={onClose}>Close</Button>
          <Button variant="primary" startIcon={<Copy size={13} />} disabled={!data?.text} onClick={copy}>
            Copy
          </Button>
        </FooterRight>
      </Footer>
    </Dialog>
  )
}
