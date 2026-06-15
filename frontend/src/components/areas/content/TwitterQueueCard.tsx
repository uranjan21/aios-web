import { useQuery } from '@tanstack/react-query'
import { Empty } from 'antd'
import { Twitter } from 'lucide-react'
import { contentApi } from '@/api/areas'
import { Skeleton } from '@/components/ui/skeleton'

/** Renders the vault's twitter-queue.md — list items become queue entries. */
export function TwitterQueueCard() {
  const { data, isLoading } = useQuery({
    queryKey: ['content', 'twitter-queue'],
    queryFn: contentApi.twitterQueue,
  })

  const raw: string = data?.raw_content ?? ''
  const entries = raw
    .split('\n')
    .map(l => l.trim())
    .filter(l => /^[-*]\s+|^\d+\.\s+/.test(l))
    .map(l => l.replace(/^[-*]\s+|^\d+\.\s+/, '').replace(/^\[[ x]\]\s*/i, ''))
    .filter(Boolean)

  return (
    <div className="bg-card border-0 rounded-2xl shadow-premium-sm p-4">
      <div className="flex items-center gap-2 mb-3">
        <Twitter size={14} className="text-sky-500" />
        <h2 className="text-[12px] font-semibold uppercase tracking-wide text-muted-foreground">Twitter Queue</h2>
        {entries.length > 0 && (
          <span className="ml-auto text-[11px] font-mono text-muted-foreground">{entries.length}</span>
        )}
      </div>
      {isLoading ? (
        <div className="space-y-2">
          <Skeleton className="h-8 w-full" />
          <Skeleton className="h-8 w-full" />
        </div>
      ) : entries.length === 0 ? (
        <Empty description="Queue empty — add items to twitter-queue.md in the vault" image={Empty.PRESENTED_IMAGE_SIMPLE} />
      ) : (
        <div className="max-h-[300px] overflow-y-auto pr-1">
          {entries.map((e, i) => (
            <div key={i} className="flex items-start gap-3 py-2.5 border-b border-border/30 last:border-0 hover:bg-muted/20 hover:rounded-xl px-2 transition-all">
              <span className="text-[11px] font-mono text-muted-foreground shrink-0 mt-0.5">{i + 1}.</span>
              <span className="text-[12px] text-foreground leading-snug flex-1">{e}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
