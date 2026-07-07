import { useMemo } from 'react'
import dayjs, { Dayjs } from 'dayjs'
import { Card as SectionCard } from '@ledgr/ui'
import { CalendarDays } from 'lucide-react'
import styled from 'styled-components'
import type { ContentItem } from '@/types'
import { PLATFORM_META } from './contentMeta'

const Weekdays = styled.div`
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 6px;
  margin-bottom: 6px;
`
const Weekday = styled.div`
  font-size: 11px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: ${({ theme }) => theme.color.mutedForeground};
  text-align: center;
  padding: 4px 0;
`
const Days = styled.div`
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 6px;
`
const Cell = styled.div<{ $muted: boolean; $today: boolean }>`
  min-height: 96px;
  border: 1px solid ${({ theme, $today }) => ($today ? theme.color.accent : theme.color.border)};
  border-radius: 10px;
  padding: 6px;
  background: ${({ theme, $muted }) => ($muted ? `${theme.color.muted}40` : theme.color.card)};
  opacity: ${({ $muted }) => ($muted ? 0.55 : 1)};
  display: flex;
  flex-direction: column;
  gap: 4px;
  overflow: hidden;
`
const DayNum = styled.span<{ $today: boolean }>`
  font-size: 11px;
  font-weight: ${({ $today }) => ($today ? 700 : 500)};
  color: ${({ theme, $today }) => ($today ? theme.color.accent : theme.color.mutedForeground)};
`
const Pill = styled.button<{ $color: string; $bg: string; $dim?: boolean }>`
  display: block;
  width: 100%;
  text-align: left;
  font-size: 10.5px;
  font-weight: 600;
  color: ${({ $color }) => $color};
  background: ${({ $bg }) => $bg};
  border: none;
  border-radius: 5px;
  padding: 2px 6px;
  cursor: pointer;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  opacity: ${({ $dim }) => ($dim ? 0.6 : 1)};
  &:hover { filter: brightness(0.95); }
`
const Legend = styled.div`
  display: flex;
  gap: 16px;
  margin-top: 12px;
  font-size: 11px;
  color: ${({ theme }) => theme.color.mutedForeground};
`
const LegendItem = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 6px;
`
const Swatch = styled.span<{ $solid?: boolean }>`
  width: 10px;
  height: 10px;
  border-radius: 3px;
  background: ${({ theme }) => theme.color.accent};
  opacity: ${({ $solid }) => ($solid ? 1 : 0.55)};
`

export function CalendarTab({ items, cursor, onEdit }: {
  items: ContentItem[]
  cursor: Dayjs
  onEdit: (item: ContentItem) => void
}) {
  const byDate = useMemo(() => {
    const map: Record<string, ContentItem[]> = {}
    for (const it of items) {
      const key = it.publish_date || (it.scheduled_at ? dayjs(it.scheduled_at).format('YYYY-MM-DD') : null)
      if (!key) continue
      ;(map[key] ??= []).push(it)
    }
    return map
  }, [items])

  const cells = useMemo(() => {
    const start = cursor.startOf('month').startOf('week')
    const end = cursor.endOf('month').endOf('week')
    const out: dayjs.Dayjs[] = []
    let d = start
    while (d.isBefore(end) || d.isSame(end, 'day')) {
      out.push(d)
      d = d.add(1, 'day')
    }
    return out
  }, [cursor])

  const today = dayjs()

  return (
    <>
      <SectionCard
        title="Content Calendar"
        subtitle="Scheduled and published content by date"
        icon={<CalendarDays size={16} />}
      >
      <Weekdays>
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => <Weekday key={d}>{d}</Weekday>)}
      </Weekdays>
      <Days>
        {cells.map(d => {
          const key = d.format('YYYY-MM-DD')
          const dayItems = byDate[key] ?? []
          const muted = d.month() !== cursor.month()
          const isToday = d.isSame(today, 'day')
          return (
            <Cell key={key} $muted={muted} $today={isToday}>
              <DayNum $today={isToday}>{d.date()}</DayNum>
              {dayItems.slice(0, 3).map(it => {
                const p = PLATFORM_META[it.platform] ?? { color: 'var(--muted-foreground)', bg: 'var(--muted)' }
                return (
                  <Pill key={it.id} $color={p.color} $bg={p.bg} $dim={it.status !== 'published'} onClick={() => onEdit(it)} title={it.title}>
                    {it.title}
                  </Pill>
                )
              })}
              {dayItems.length > 3 && <DayNum $today={false}>+{dayItems.length - 3} more</DayNum>}
            </Cell>
          )
        })}
      </Days>

      <Legend>
        <LegendItem><Swatch $solid /> Published</LegendItem>
        <LegendItem><Swatch /> Scheduled</LegendItem>
      </Legend>
      </SectionCard>
    </>
  )
}
