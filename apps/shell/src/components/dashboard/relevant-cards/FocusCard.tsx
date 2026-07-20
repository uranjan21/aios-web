import { useMemo } from 'react'
import styled, { useTheme } from 'styled-components'
import { Target, Clock } from 'lucide-react'
import { Card } from '@ledgr/ui'
import { useDayEventsStore, fmtDateKey, parseLocalDate } from '@aios/shared/stores/dayEventsStore'
import { categoryColor } from '@aios/shared/theme/domains'
import { Empty } from './shared'

/* ─────────────────── 3. FocusCard ─────────────────── */

const FocusItem = styled.li<{ $color: string }>`
  display: flex;
  align-items: flex-start;
  gap: 10px;
  padding: 8px 0;
  &:not(:last-child) {
    border-bottom: 1px solid ${({ theme }) => theme.color.border};
  }
`

const FocusNum = styled.span<{ $color: string }>`
  flex-shrink: 0;
  width: 22px;
  height: 22px;
  border-radius: 50%;
  background: ${({ $color }) => $color}1F;
  color: ${({ $color }) => $color};
  font-size: 11px;
  font-weight: 700;
  display: inline-flex;
  align-items: center;
  justify-content: center;
`

const FocusBody = styled.div`
  flex: 1;
  min-width: 0;
`

const FocusTitle = styled.div`
  font-size: 13px;
  font-weight: 600;
  color: ${({ theme }) => theme.color.foreground};
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`

const FocusMeta = styled.div`
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 11px;
  color: ${({ theme }) => theme.color.mutedForeground};
  margin-top: 2px;
`

export function FocusCard() {
  const theme = useTheme()
  const todayKey = fmtDateKey(new Date())
  const events = useDayEventsStore((s) => s.events)

  const top3 = useMemo(() => {
    return events
      .filter((e) => e.date >= todayKey && !e.done)
      .sort((a, b) => {
        if (a.date !== b.date) return a.date.localeCompare(b.date)
        if (!a.time && !b.time) return 0
        if (!a.time) return -1
        if (!b.time) return 1
        return a.time.localeCompare(b.time)
      })
      .slice(0, 3)
  }, [events, todayKey])

  return (
    <Card title="Focus" subtitle="Next 3 things on deck" icon={<Target size={14} style={{ color: theme.color.destructive }} />}>
      {top3.length === 0 ? (
        <Empty>Nothing scheduled yet. Add an event on the calendar to set your focus.</Empty>
      ) : (
        <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
          {top3.map((e, i) => {
            const color = categoryColor(e.category, theme)
            const dateLabel = e.date === todayKey
              ? 'Today'
              : parseLocalDate(e.date).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric' })
            return (
              <FocusItem key={e.id} $color={color}>
                <FocusNum $color={color}>{i + 1}</FocusNum>
                <FocusBody>
                  <FocusTitle>{e.title}</FocusTitle>
                  <FocusMeta>
                    <Clock size={10} /> {dateLabel}{e.time ? ` · ${e.time}` : ''}
                    <span style={{ color, fontWeight: 600 }}>· {e.category}</span>
                  </FocusMeta>
                </FocusBody>
              </FocusItem>
            )
          })}
        </ul>
      )}
    </Card>
  )
}
