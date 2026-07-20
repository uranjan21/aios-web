/**
 * MonthPicker — themed, branded month/year picker.
 * Value format: "YYYY-MM" (ISO month). Empty string = unset.
 */
import { useEffect, useRef, useState } from 'react';
import styled from 'styled-components';
import { Popover, PopoverTrigger, PopoverContent } from '../../interactive/Popover/Popover';
import { focusRing } from '../../utils/focusRing';

export interface MonthPickerProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  /** Hide the "Clear" footer button — useful for required fields. */
  required?: boolean;
  'aria-label'?: string;
  disabled?: boolean;
  className?: string;
}

const MONTHS_SHORT = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const MONTHS_LONG = ['January','February','March','April','May','June','July','August','September','October','November','December'];

function parseValue(v: string): { year: number; month: number } | null {
  if (!v) return null;
  const m = /^(\d{4})-(\d{2})$/.exec(v);
  if (!m) return null;
  const year = parseInt(m[1], 10);
  const month = parseInt(m[2], 10);
  return month >= 1 && month <= 12 ? { year, month } : null;
}

function formatValue(year: number, month: number) {
  return `${year}-${String(month).padStart(2, '0')}`;
}

function formatDisplay(v: string) {
  const p = parseValue(v);
  return p ? `${MONTHS_LONG[p.month - 1]} ${p.year}` : '';
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
  width: 260px;
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

const YearLabel = styled.span`
  font-size: ${({ theme }) => theme.typography.fontSize.base};
  font-weight: ${({ theme }) => theme.typography.fontWeight.semibold};
  font-variant-numeric: tabular-nums;
`;

const Grid = styled.div`
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: ${({ theme }) => theme.spacing[1]};
`;

const Cell = styled.button<{ $selected: boolean; $current: boolean }>`
  height: 32px;
  font-size: ${({ theme }) => theme.typography.fontSize.xs};
  font-weight: ${({ theme }) => theme.typography.fontWeight.medium};
  color: ${({ theme, $selected }) => ($selected ? theme.color.primaryForeground : theme.color.foreground)};
  background: ${({ theme, $selected, $current }) =>
    $selected ? theme.color.primary : $current ? theme.color.muted : 'transparent'};
  border: ${({ theme, $current, $selected }) =>
    !$selected && $current ? `1px solid ${theme.color.primary}40` : 'none'};
  border-radius: ${({ theme }) => theme.radii.sm};
  cursor: pointer;
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
  &:hover { color: ${({ theme }) => theme.color.primaryHover}; }
`;

const MutedTextBtn = styled(TextBtn)`
  color: ${({ theme }) => theme.color.mutedForeground};
  &:hover { color: ${({ theme }) => theme.color.foreground}; }
`;

const CalendarIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={{ width: 14, height: 14, flexShrink: 0 }}>
    <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
    <line x1="16" y1="2" x2="16" y2="6" />
    <line x1="8" y1="2" x2="8" y2="6" />
    <line x1="3" y1="10" x2="21" y2="10" />
  </svg>
);

const ChevronLeftIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><polyline points="15 18 9 12 15 6" /></svg>
);
const ChevronRightIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><polyline points="9 18 15 12 9 6" /></svg>
);

export function MonthPicker({
  value,
  onChange,
  placeholder = 'Select month',
  required = false,
  'aria-label': ariaLabel = 'Month picker',
  disabled = false,
  className,
}: MonthPickerProps) {
  const today = new Date();
  const initial = parseValue(value);
  const [viewYear, setViewYear] = useState(initial?.year ?? today.getFullYear());
  const [open, setOpen] = useState(false);
  const lastValueRef = useRef(value);

  useEffect(() => {
    if (value !== lastValueRef.current) {
      lastValueRef.current = value;
      const p = parseValue(value);
      if (p) setViewYear(p.year);
    }
  }, [value]);

  const selected = parseValue(value);
  const display = formatDisplay(value);
  const currentY = today.getFullYear();
  const currentM = today.getMonth() + 1;

  const pick = (m: number) => {
    onChange(formatValue(viewYear, m));
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
            <ArrowBtn type="button" onClick={() => setViewYear(y => y - 1)} aria-label="Previous year"><ChevronLeftIcon /></ArrowBtn>
            <YearLabel>{viewYear}</YearLabel>
            <ArrowBtn type="button" onClick={() => setViewYear(y => y + 1)} aria-label="Next year"><ChevronRightIcon /></ArrowBtn>
          </Header>
          <Grid>
            {MONTHS_SHORT.map((label, idx) => {
              const m = idx + 1;
              const isSelected = !!selected && selected.year === viewYear && selected.month === m;
              const isCurrent = viewYear === currentY && m === currentM;
              return (
                <Cell
                  key={label}
                  type="button"
                  $selected={isSelected}
                  $current={isCurrent}
                  onClick={() => pick(m)}
                  aria-label={`${MONTHS_LONG[idx]} ${viewYear}`}
                  aria-pressed={isSelected || undefined}
                >
                  {label}
                </Cell>
              );
            })}
          </Grid>
          <Footer>
            {required ? <span /> : (
              <MutedTextBtn type="button" onClick={() => { onChange(''); setOpen(false); }}>Clear</MutedTextBtn>
            )}
            <TextBtn type="button" onClick={() => { setViewYear(currentY); onChange(formatValue(currentY, currentM)); setOpen(false); }}>
              This month
            </TextBtn>
          </Footer>
        </Surface>
      </PopoverContent>
    </Popover>
  );
}
