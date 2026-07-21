/**
 * DatePicker — themed calendar date picker.
 * Value format: "YYYY-MM-DD" (ISO date). Empty string = unset.
 */
import { useEffect, useRef, useState } from 'react';
import styled from 'styled-components';
import { Popover, PopoverTrigger, PopoverContent } from '../../interactive/Popover/Popover';
import { focusRing } from '../../utils/focusRing';

export interface DatePickerProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  required?: boolean;
  'aria-label'?: string;
  disabled?: boolean;
  /** ISO minimum date (inclusive). */
  min?: string;
  /** ISO maximum date (inclusive). */
  max?: string;
  className?: string;
}

const WEEK_DAYS = ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'];
const MONTH_LABELS = ['January','February','March','April','May','June','July','August','September','October','November','December'];

function parse(v: string): Date | null {
  if (!v) return null;
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(v);
  if (!m) return null;
  const d = new Date(parseInt(m[1]), parseInt(m[2]) - 1, parseInt(m[3]));
  return isNaN(d.getTime()) ? null : d;
}
function format(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
function formatDisplay(v: string) {
  const d = parse(v);
  if (!d) return '';
  return d.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
}
function startOfMonth(d: Date) { return new Date(d.getFullYear(), d.getMonth(), 1); }
function startOfWeek(d: Date) {
  const day = d.getDay(); // 0 Sun..6 Sat
  // Convert to Monday-start grid: 0 if Mon, 6 if Sun
  const offset = (day + 6) % 7;
  return new Date(d.getFullYear(), d.getMonth(), d.getDate() - offset);
}
function addDays(d: Date, n: number) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);
}

const Trigger = styled.button`
  display: inline-flex;
  width: 100%;
  align-items: center;
  justify-content: space-between;
  gap: ${({ theme }) => theme.spacing[2]};
  height: 36px;
  padding: 0 ${({ theme }) => theme.spacing[3]};
  font-family: ${({ theme }) => theme.typography.fontFamily.sans};
  font-size: ${({ theme }) => theme.typography.fontSize.base};
  color: ${({ theme }) => theme.color.foreground};
  background: ${({ theme }) => theme.color.card};
  border: 1px solid ${({ theme }) => theme.color.input};
  border-radius: ${({ theme }) => theme.radii.md};
  cursor: pointer;
  text-align: left;
  ${focusRing}
  &:hover:not(:disabled) { background: ${({ theme }) => theme.color.muted + '40'}; }
  &:disabled { opacity: 0.6; cursor: not-allowed; }
`;

const Placeholder = styled.span`
  color: ${({ theme }) => theme.color.mutedForeground};
`;

const Surface = styled.div`
  width: 288px;
`;

const Header = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: ${({ theme }) => theme.spacing[3]};
`;

const ArrowBtn = styled.button`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border-radius: ${({ theme }) => theme.radii.sm};
  color: ${({ theme }) => theme.color.mutedForeground};
  background: transparent;
  cursor: pointer;
  &:hover { background: ${({ theme }) => theme.color.muted}; color: ${({ theme }) => theme.color.foreground}; }
  &:focus-visible { outline: 2px solid ${({ theme }) => theme.color.ring}; outline-offset: 1px; }
  & svg { width: 14px; height: 14px; }
`;

const MonthLabel = styled.span`
  font-size: ${({ theme }) => theme.typography.fontSize.base};
  font-weight: ${({ theme }) => theme.typography.fontWeight.semibold};
`;

const WeekHeader = styled.div`
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: ${({ theme }) => `${theme.spacing[0.5]}`};
  margin-bottom: ${({ theme }) => theme.spacing[1]};
`;

const WeekCell = styled.div`
  text-align: center;
  font-size: ${({ theme }) => theme.typography.fontSize.xs};
  color: ${({ theme }) => theme.color.mutedForeground};
  font-weight: ${({ theme }) => theme.typography.fontWeight.medium};
`;

const DayGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: ${({ theme }) => `${theme.spacing[0.5]}`};
`;

const Day = styled.button<{ $selected: boolean; $today: boolean; $outside: boolean; $disabled: boolean }>`
  width: 100%;
  aspect-ratio: 1 / 1;
  font-size: ${({ theme }) => theme.typography.fontSize.xs};
  font-weight: ${({ theme }) => theme.typography.fontWeight.medium};
  color: ${({ theme, $selected, $outside }) =>
    $selected ? theme.color.primaryForeground : $outside ? theme.color.mutedForeground + '70' : theme.color.foreground};
  background: ${({ theme, $selected, $today }) =>
    $selected ? theme.color.primary : $today ? theme.color.muted : 'transparent'};
  border-radius: ${({ theme }) => theme.radii.sm};
  cursor: ${({ $disabled }) => ($disabled ? 'not-allowed' : 'pointer')};
  opacity: ${({ $disabled }) => ($disabled ? 0.4 : 1)};
  border: ${({ theme, $today, $selected }) =>
    !$selected && $today ? `1px solid ${theme.color.primary}40` : 'none'};
  &:hover:not(:disabled) {
    background: ${({ theme, $selected }) => ($selected ? theme.color.primaryHover : theme.color.muted)};
  }
  &:focus-visible { outline: 2px solid ${({ theme }) => theme.color.ring}; outline-offset: 1px; }
`;

const Footer = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: ${({ theme }) => theme.spacing[3]};
  padding-top: ${({ theme }) => theme.spacing[2]};
  border-top: 1px solid ${({ theme }) => theme.color.border};
`;

const TextBtn = styled.button`
  font-size: ${({ theme }) => theme.typography.fontSize.xs};
  font-weight: ${({ theme }) => theme.typography.fontWeight.medium};
  color: ${({ theme }) => theme.color.primary};
  background: transparent;
  cursor: pointer;
  padding: ${({ theme }) => theme.spacing[1]};
`;

const MutedTextBtn = styled(TextBtn)`
  color: ${({ theme }) => theme.color.mutedForeground};
  &:hover { color: ${({ theme }) => theme.color.foreground}; }
`;

const CalendarIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={{ width: 14, height: 14, flexShrink: 0 }}>
    <rect x="3" y="4" width="18" height="18" rx="2" ry="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" />
  </svg>
);
const ChevronLeftIcon = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><polyline points="15 18 9 12 15 6" /></svg>;
const ChevronRightIcon = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><polyline points="9 18 15 12 9 6" /></svg>;

export function DatePicker({
  value, onChange, placeholder = 'Select date',
  required = false, 'aria-label': ariaLabel = 'Date picker',
  disabled = false, min, max, className,
}: DatePickerProps) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const initial = parse(value);
  const [view, setView] = useState<Date>(initial ? startOfMonth(initial) : startOfMonth(today));
  const [open, setOpen] = useState(false);
  const lastValueRef = useRef(value);

  useEffect(() => {
    if (value !== lastValueRef.current) {
      lastValueRef.current = value;
      const p = parse(value);
      if (p) setView(startOfMonth(p));
    }
  }, [value]);

  const selected = parse(value);
  const display = formatDisplay(value);
  const minDate = min ? parse(min) : null;
  const maxDate = max ? parse(max) : null;

  const gridStart = startOfWeek(view);
  const days: Date[] = Array.from({ length: 42 }, (_, i) => addDays(gridStart, i));

  const pick = (d: Date) => {
    if ((minDate && d < minDate) || (maxDate && d > maxDate)) return;
    onChange(format(d));
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger>
        <Trigger type="button" disabled={disabled} aria-label={ariaLabel} className={className}>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
            <CalendarIcon />
            {display ? <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{display}</span> : <Placeholder>{placeholder}</Placeholder>}
          </span>
        </Trigger>
      </PopoverTrigger>
      <PopoverContent side="bottom" align="start" gap={6}>
        <Surface>
          <Header>
            <ArrowBtn type="button" onClick={() => setView(v => new Date(v.getFullYear(), v.getMonth() - 1, 1))} aria-label="Previous month"><ChevronLeftIcon /></ArrowBtn>
            <MonthLabel>{MONTH_LABELS[view.getMonth()]} {view.getFullYear()}</MonthLabel>
            <ArrowBtn type="button" onClick={() => setView(v => new Date(v.getFullYear(), v.getMonth() + 1, 1))} aria-label="Next month"><ChevronRightIcon /></ArrowBtn>
          </Header>
          <WeekHeader>
            {WEEK_DAYS.map(d => <WeekCell key={d}>{d}</WeekCell>)}
          </WeekHeader>
          <DayGrid>
            {days.map((d, i) => {
              const outside = d.getMonth() !== view.getMonth();
              const isSelected = !!selected && format(selected) === format(d);
              const isToday = format(today) === format(d);
              const isDisabled = (minDate && d < minDate) || (maxDate && d > maxDate) || false;
              return (
                <Day
                  key={i}
                  type="button"
                  $selected={isSelected}
                  $today={isToday}
                  $outside={outside}
                  $disabled={!!isDisabled}
                  onClick={() => pick(d)}
                  disabled={!!isDisabled}
                  aria-label={d.toLocaleDateString()}
                  aria-pressed={isSelected || undefined}
                >
                  {d.getDate()}
                </Day>
              );
            })}
          </DayGrid>
          <Footer>
            {required ? <span /> : (
              <MutedTextBtn type="button" onClick={() => { onChange(''); setOpen(false); }}>Clear</MutedTextBtn>
            )}
            <TextBtn type="button" onClick={() => { onChange(format(today)); setView(startOfMonth(today)); setOpen(false); }}>
              Today
            </TextBtn>
          </Footer>
        </Surface>
      </PopoverContent>
    </Popover>
  );
}
