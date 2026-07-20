import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Card } from '@ledgr/ui'
import { Heart, Trash2, Quote } from 'lucide-react'
import styled from 'styled-components'
import { quotesApi, type SavedQuote } from '@aios/shared/api/quotes'
import { toast } from 'sonner'

const List = styled.div`
  display: flex;
  flex-direction: column;
  gap: 12px;
`

const Row = styled.div`
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 12px 0;
  border-bottom: 1px solid ${({ theme }) => theme.color.border}60;

  &:last-child {
    border-bottom: none;
    padding-bottom: 0;
  }

  &:first-child {
    padding-top: 0;
  }
`

const QuoteIcon = styled.div`
  flex-shrink: 0;
  margin-top: 2px;
  color: ${({ theme }) => theme.color.mutedForeground};
  opacity: 0.4;
`

const Body = styled.div`
  flex: 1;
  min-width: 0;
`

const Text = styled.p`
  margin: 0;
  font-size: 13px;
  line-height: 1.5;
  color: ${({ theme }) => theme.color.foreground};
`

const Author = styled.span`
  display: block;
  margin-top: 4px;
  font-size: 11px;
  color: ${({ theme }) => theme.color.mutedForeground};
`

const Actions = styled.div`
  display: flex;
  align-items: center;
  gap: 4px;
  flex-shrink: 0;
`

const IconBtn = styled.button.attrs({ type: 'button' })<{ $active?: boolean }>`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border: none;
  border-radius: ${({ theme }) => theme.radii.sm};
  background: transparent;
  cursor: pointer;
  color: ${({ $active, theme }) =>
    $active ? theme.color.accent : theme.color.mutedForeground};
  transition: background-color 120ms, color 120ms;

  &:hover {
    background: ${({ theme }) => theme.color.muted};
    color: ${({ $active, theme }) =>
      $active ? theme.color.accent : theme.color.foreground};
  }

  &:focus-visible {
    outline: 2px solid ${({ theme }) => theme.color.primary};
    outline-offset: 2px;
  }
`

const Empty = styled.div`
  padding: 24px 0;
  text-align: center;
  font-size: 13px;
  color: ${({ theme }) => theme.color.mutedForeground};
`

const ShowMore = styled.button.attrs({ type: 'button' })`
  width: 100%;
  margin-top: 4px;
  padding: 8px;
  border: none;
  background: transparent;
  border-radius: ${({ theme }) => theme.radii.sm};
  font-size: 12px;
  color: ${({ theme }) => theme.color.mutedForeground};
  cursor: pointer;
  transition: background-color 120ms, color 120ms;

  &:hover {
    background: ${({ theme }) => theme.color.muted};
    color: ${({ theme }) => theme.color.foreground};
  }
`

const INITIAL_COUNT = 5

export function SavedQuotesCard() {
  const [showAll, setShowAll] = useState(false)
  const qc = useQueryClient()

  const { data: quotes = [], isLoading } = useQuery({
    queryKey: ['quotes'],
    queryFn: quotesApi.list,
    staleTime: 60_000,
  })

  const toggleFavorite = useMutation({
    mutationFn: ({ id, favorite }: { id: string; favorite: boolean }) =>
      quotesApi.update(id, { favorite }),
    onMutate: async ({ id, favorite }) => {
      await qc.cancelQueries({ queryKey: ['quotes'] })
      const prev = qc.getQueryData<SavedQuote[]>(['quotes'])
      qc.setQueryData<SavedQuote[]>(['quotes'], (old = []) =>
        old.map(q => (q.id === id ? { ...q, favorite } : q))
      )
      return { prev }
    },
    onError: (_e, _v, ctx) => {
      if (ctx?.prev) qc.setQueryData(['quotes'], ctx.prev)
    },
    onSettled: () => qc.invalidateQueries({ queryKey: ['quotes'] }),
  })

  const remove = useMutation({
    mutationFn: (id: string) => quotesApi.remove(id),
    onMutate: async id => {
      await qc.cancelQueries({ queryKey: ['quotes'] })
      const prev = qc.getQueryData<SavedQuote[]>(['quotes'])
      qc.setQueryData<SavedQuote[]>(['quotes'], (old = []) =>
        old.filter(q => q.id !== id)
      )
      return { prev }
    },
    onError: (_e, _v, ctx) => {
      if (ctx?.prev) qc.setQueryData(['quotes'], ctx.prev)
      toast.error('Failed to remove quote')
    },
    onSettled: () => qc.invalidateQueries({ queryKey: ['quotes'] }),
  })

  const visible = showAll ? quotes : quotes.slice(0, INITIAL_COUNT)
  const hasMore = quotes.length > INITIAL_COUNT

  return (
    <Card
      icon={<Quote size={16} />}
      title="Saved Quotes"
      subtitle={quotes.length > 0 ? `${quotes.length} saved` : undefined}
    >
      {isLoading ? null : quotes.length === 0 ? (
        <Empty>No saved quotes yet — tap the heart on the daily quote to save one.</Empty>
      ) : (
        <>
          <List>
            {visible.map(q => (
              <Row key={q.id}>
                <QuoteIcon>
                  <Quote size={12} />
                </QuoteIcon>
                <Body>
                  <Text>"{q.text}"</Text>
                  {q.author && <Author>— {q.author}</Author>}
                </Body>
                <Actions>
                  <IconBtn
                    $active={q.favorite}
                    aria-label={q.favorite ? 'Unfavorite' : 'Favorite'}
                    onClick={() =>
                      toggleFavorite.mutate({ id: q.id, favorite: !q.favorite })
                    }
                  >
                    <Heart size={14} fill={q.favorite ? 'currentColor' : 'none'} />
                  </IconBtn>
                  <IconBtn
                    aria-label="Remove quote"
                    onClick={() => remove.mutate(q.id)}
                  >
                    <Trash2 size={14} />
                  </IconBtn>
                </Actions>
              </Row>
            ))}
          </List>

          {hasMore && (
            <ShowMore onClick={() => setShowAll(v => !v)}>
              {showAll
                ? 'Show less'
                : `Show ${quotes.length - INITIAL_COUNT} more`}
            </ShowMore>
          )}
        </>
      )}
    </Card>
  )
}
