/**
 * FilterBar — the single unified toolbar that sits directly under the AreaTabs
 * tab bar (see AreaTabs `toolbar` slot), mirroring the reference layout:
 *
 *   [ 🔍 search …………… ] [ Label value ▾ ] [ Label value ▾ ] ········· [ 📅 period ▾ ] [ + Primary ]
 *
 * Left group = search + filter dropdowns. Right group (pushed via margin-left:auto)
 * = period selector + primary action. Rendered on the canonical Card surface so it
 * matches every other card. Colours/effects come from the AIOS theme tokens.
 */
import type { ReactNode } from 'react'
import styled from 'styled-components'
import { Search, ChevronDown, Calendar } from 'lucide-react'

const Bar = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
  width: 100%;
  padding: 10px 12px;
  margin-bottom: 16px;
  background: ${({ theme }) => theme.color.card};
  border: 1px solid ${({ theme }) => theme.color.border};
  border-radius: ${({ theme }) => theme.radii.xl};
  box-shadow: ${({ theme }) => theme.shadow.xs};
  overflow-x: auto;
  scrollbar-width: none;
  &::-webkit-scrollbar { display: none; }
`

const SearchWrap = styled.div`
  position: relative;
  flex: 1 1 auto;
  min-width: 200px;
  max-width: 460px;

  svg.icon {
    position: absolute;
    left: 14px;
    top: 50%;
    transform: translateY(-50%);
    width: 16px;
    height: 16px;
    color: ${({ theme }) => theme.color.mutedForeground};
    pointer-events: none;
  }

  input {
    width: 100%;
    height: 40px;
    padding: 0 14px 0 40px;
    border: 1px solid ${({ theme }) => theme.color.input};
    border-radius: ${({ theme }) => theme.radii.full};
    background: ${({ theme }) => theme.color.background};
    color: ${({ theme }) => theme.color.foreground};
    font-size: 14px;
    &:focus {
      outline: none;
      border-color: ${({ theme }) => theme.color.ring};
      box-shadow: 0 0 0 3px ${({ theme }) => theme.color.ring}33;
    }
    &::placeholder { color: ${({ theme }) => theme.color.mutedForeground}; }
  }
`

/** Pill that wraps a label + a borderless native <select> + chevron. */
const Pill = styled.div`
  position: relative;
  display: flex;
  align-items: center;
  gap: 6px;
  flex-shrink: 0;
  height: 40px;
  padding: 0 30px 0 14px;
  border: 1px solid ${({ theme }) => theme.color.border};
  border-radius: ${({ theme }) => theme.radii.full};
  background: ${({ theme }) => theme.color.card};
  transition: border-color 120ms;

  &:hover { border-color: ${({ theme }) => theme.color.mutedForeground}; }
  &:focus-within {
    border-color: ${({ theme }) => theme.color.ring};
    box-shadow: 0 0 0 3px ${({ theme }) => theme.color.ring}33;
  }

  .lbl {
    font-size: 14px;
    color: ${({ theme }) => theme.color.mutedForeground};
    white-space: nowrap;
  }

  .lead {
    width: 16px;
    height: 16px;
    color: ${({ theme }) => theme.color.mutedForeground};
    flex-shrink: 0;
  }

  .chev {
    position: absolute;
    right: 10px;
    top: 50%;
    transform: translateY(-50%);
    width: 14px;
    height: 14px;
    color: ${({ theme }) => theme.color.mutedForeground};
    pointer-events: none;
  }

  select {
    appearance: none;
    -webkit-appearance: none;
    border: none;
    background: transparent;
    color: ${({ theme }) => theme.color.foreground};
    font-size: 14px;
    font-weight: 600;
    cursor: pointer;
    padding: 0;
    margin: 0;
    &:focus { outline: none; }
  }
`

const Right = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
  margin-left: auto;
  flex-shrink: 0;
`

export interface ToolbarFilter {
  id: string
  label: string
  value: string
  onChange: (v: string) => void
  options: { value: string; label: string }[]
}

export interface FilterBarProps {
  search?: { value: string; onChange: (v: string) => void; placeholder?: string }
  filters?: ToolbarFilter[]
  /** Right-side period selector (use <PeriodSelect/>). */
  period?: ReactNode
  /** Right-side primary action(s). */
  actions?: ReactNode
  className?: string
}

export function FilterBar({ search, filters, period, actions, className }: FilterBarProps) {
  return (
    <Bar className={className} role="toolbar" aria-label="Filters">
      {search && (
        <SearchWrap>
          <Search className="icon" />
          <input
            type="text"
            value={search.value}
            onChange={(e) => search.onChange(e.target.value)}
            placeholder={search.placeholder ?? 'Search…'}
          />
        </SearchWrap>
      )}

      {filters?.map((f) => (
        <Pill key={f.id}>
          <span className="lbl">{f.label}</span>
          <select aria-label={f.label} value={f.value} onChange={(e) => f.onChange(e.target.value)}>
            {f.options.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
          <ChevronDown className="chev" />
        </Pill>
      ))}

      {(period || actions) && (
        <Right>
          {period}
          {actions}
        </Right>
      )}
    </Bar>
  )
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

/** Period pill: 📅 Monthly · <Month Year ▾> — value format "YYYY-MM". */
export function PeriodSelect({ value, onChange, year = 2026 }: {
  value: string
  onChange: (v: string) => void
  year?: number
}) {
  return (
    <Pill>
      <Calendar className="lead" />
      <span className="lbl">Monthly ·</span>
      <select aria-label="Period" value={value} onChange={(e) => onChange(e.target.value)}>
        {MONTHS.map((m, i) => {
          const v = `${year}-${String(i + 1).padStart(2, '0')}`
          return <option key={v} value={v}>{`${m} ${year}`}</option>
        })}
      </select>
      <ChevronDown className="chev" />
    </Pill>
  )
}
