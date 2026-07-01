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

const HeaderWrapper = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 0.75rem;
`

const IconButton = styled.button`
  padding: 0.25rem;
  border-radius: 0.25rem;
  color: ${({ theme }) => theme.color.mutedForeground};
  transition: background-color 0.2s, color 0.2s;
  border: none;
  background: transparent;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;

  &:hover {
    background-color: ${({ theme }) => theme.color.muted};
  }
  
  &:focus-visible {
    outline: none;
    box-shadow: 0 0 0 2px ${({ theme }) => theme.color.primary};
  }
`

const MonthTitle = styled.div`
  font-size: 0.875rem;
  font-weight: 600;
  color: ${({ theme }) => theme.color.foreground};
`

const Grid = styled.div`
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 4px;
`

const DayHeader = styled.div`
  text-align: center;
  font-size: 10px;
  font-weight: 500;
  color: ${({ theme }) => theme.color.mutedForeground};
  text-transform: uppercase;
  padding-bottom: 0.25rem;
`

const DayCell = styled.div<{ $dim: boolean; $selected: boolean }>`
  min-height: 56px;
  border-radius: 8px;
  padding: 4px 6px;
  cursor: pointer;
  border: 1px solid ${({ $selected, theme }) => $selected ? theme.color.primary : `${theme.color.border}80`};
  background: ${({ $selected, theme }) => $selected ? `${theme.color.primary}14` : theme.color.card};
  opacity: ${({ $dim }) => $dim ? 0.35 : 1};
  transition: border-color 0.15s, background 0.15s;

  &:hover {
    border-color: ${({ theme }) => theme.color.primary}80;
  }
`

const DateNumber = styled.div<{ $isToday: boolean }>`
  font-size: 11px;
  font-weight: 500;
  color: ${({ $isToday, theme }) => $isToday ? theme.color.primary : theme.color.foreground};
`

const ValuesWrap = styled.div`
  margin-top: 0.25rem;
  display: flex;
  flex-direction: column;
  gap: 0.125rem;
`

const ValueText = styled.div<{ $type: 'income' | 'expense' }>`
  font-size: 9px;
  line-height: 1.25;
  font-weight: 500;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  color: ${({ $type }) => $type === 'income' ? 'var(--success, #16a34a)' : 'var(--destructive)'};
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
      <HeaderWrapper>
        <IconButton onClick={() => onMonthChange(-1)} aria-label="Previous month">
          <ChevronLeft size={16} />
        </IconButton>
        <MonthTitle>{month.format('MMMM YYYY')}</MonthTitle>
        <IconButton onClick={() => onMonthChange(1)} aria-label="Next month">
          <ChevronRight size={16} />
        </IconButton>
      </HeaderWrapper>
      <Grid>
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => (
          <DayHeader key={d}>{d}</DayHeader>
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
              <DateNumber $isToday={key === today}>{c.date()}</DateNumber>
              {data && (data.income > 0 || data.expense > 0) && (
                <ValuesWrap>
                  {data.income > 0 && <ValueText $type="income">+{formatCurrency(data.income)}</ValueText>}
                  {data.expense > 0 && <ValueText $type="expense">-{formatCurrency(data.expense)}</ValueText>}
                </ValuesWrap>
              )}
            </DayCell>
          )
        })}
      </Grid>
    </div>
  )
}
