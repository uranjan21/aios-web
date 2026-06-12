import styled from 'styled-components'
import dayjs, { Dayjs } from 'dayjs'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { formatCurrency } from '@/lib/utils'

interface DayData { date: string; income: number; expense: number }

interface Props {
  month: Dayjs
  byDay: DayData[]
  selectedDate: string | null
  onSelectDate: (date: string) => void
  onMonthChange: (delta: number) => void
}

const Grid = styled.div`
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 4px;
`

const DayCell = styled.div<{ $dim: boolean; $selected: boolean }>`
  min-height: 56px;
  border-radius: 8px;
  padding: 4px 6px;
  cursor: pointer;
  border: 1px solid ${p => p.$selected ? 'hsl(var(--primary))' : 'hsl(var(--border) / 0.5)'};
  background: ${p => p.$selected ? 'hsl(var(--primary) / 0.08)' : 'hsl(var(--card))'};
  opacity: ${p => p.$dim ? 0.35 : 1};
  transition: border-color 0.15s, background 0.15s;

  &:hover {
    border-color: hsl(var(--primary) / 0.5);
  }
`

export function TransactionCalendar({ month, byDay, selectedDate, onSelectDate, onMonthChange }: Props) {
  const dayMap = new Map(byDay.map(d => [d.date, d]))
  const startOfMonth = month.startOf('month')
  const startDayOfWeek = startOfMonth.day() // 0 = Sun
  const daysInMonth = month.daysInMonth()
  const today = dayjs().format('YYYY-MM-DD')

  const cells: Dayjs[] = []
  for (let i = startDayOfWeek; i > 0; i--) cells.push(startOfMonth.subtract(i, 'day'))
  for (let d = 0; d < daysInMonth; d++) cells.push(startOfMonth.add(d, 'day'))
  while (cells.length % 7 !== 0) cells.push(cells[cells.length - 1].add(1, 'day'))

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <button onClick={() => onMonthChange(-1)} className="p-1 rounded hover:bg-muted text-muted-foreground transition-colors">
          <ChevronLeft size={16} />
        </button>
        <div className="text-sm font-semibold text-foreground">{month.format('MMMM YYYY')}</div>
        <button onClick={() => onMonthChange(1)} className="p-1 rounded hover:bg-muted text-muted-foreground transition-colors">
          <ChevronRight size={16} />
        </button>
      </div>
      <Grid>
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => (
          <div key={d} className="text-center text-[10px] font-medium text-muted-foreground uppercase pb-1">{d}</div>
        ))}
        {cells.map(c => {
          const key = c.format('YYYY-MM-DD')
          const data = dayMap.get(key)
          return (
            <DayCell
              key={key}
              $dim={c.month() !== month.month()}
              $selected={key === selectedDate}
              onClick={() => onSelectDate(key)}
            >
              <div className={`text-[11px] font-medium ${key === today ? 'text-primary' : 'text-foreground'}`}>{c.date()}</div>
              {data && (data.income > 0 || data.expense > 0) && (
                <div className="mt-1 space-y-0.5">
                  {data.income > 0 && <div className="text-[9px] leading-tight text-emerald-500 font-medium truncate">+{formatCurrency(data.income)}</div>}
                  {data.expense > 0 && <div className="text-[9px] leading-tight text-red-400 font-medium truncate">-{formatCurrency(data.expense)}</div>}
                </div>
              )}
            </DayCell>
          )
        })}
      </Grid>
    </div>
  )
}
