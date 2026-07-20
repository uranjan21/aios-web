import React from 'react';
import styled from 'styled-components';

const Container = styled.div`
  display: flex;
  flex-direction: row;
  align-items: center;
  flex-wrap: wrap;
  gap: 12px;
  font-family: ${({ theme }) => theme.typography?.fontFamily?.mono || 'monospace'};
  color: ${({ theme }) => theme.color?.foreground || '#000'};
`;

const Group = styled.div`
  display: flex;
  align-items: center;
  gap: 4px;
`;

const Label = styled.span`
  font-weight: 600;
  font-size: 9px;
  color: ${({ theme }) => theme.color?.mutedForeground || theme.color?.muted || '#666'};
  text-transform: uppercase;
  letter-spacing: 0.5px;
`;

const SelectBox = styled.select`
  appearance: none;
  background: ${({ theme }) => theme.color?.muted || 'rgba(0,0,0,0.05)'};
  border: 1px solid ${({ theme }) => theme.color?.border || 'rgba(0,0,0,0.1)'};
  color: ${({ theme }) => theme.color?.foreground || '#000'};
  border-radius: ${({ theme }) => theme.radii?.sm || '4px'};
  padding: 2px 18px 2px 6px;
  font-size: 11px;
  font-weight: 500;
  cursor: pointer;
  text-align: center;
  outline: none;
  
  /* Add custom chevron since appearance: none removes default arrow */
  background-image: url("data:image/svg+xml;charset=US-ASCII,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%22292.4%22%20height%3D%22292.4%22%3E%3Cpath%20fill%3D%22%23777%22%20d%3D%22M287%2069.4a17.6%2017.6%200%200%200-13-5.4H18.4c-5%200-9.3%201.8-12.9%205.4A17.6%2017.6%200%200%200%200%2082.2c0%205%201.8%209.3%205.4%2012.9l128%20127.9c3.6%203.6%207.8%205.4%2012.8%205.4s9.2-1.8%2012.8-5.4L287%2095c3.5-3.5%205.4-7.8%205.4-12.8%200-5-1.9-9.2-5.5-12.8z%22%2F%3E%3C%2Fsvg%3E");
  background-repeat: no-repeat;
  background-position: right 6px center;
  background-size: 8px auto;

  &:hover, &:focus {
    border-color: ${({ theme }) => theme.color?.primary || '#333'};
    box-shadow: 0 0 0 1px ${({ theme }) => theme.color?.primary || '#333'};
  }
`;

const Colon = styled.span`
  font-weight: bold;
  font-size: 11px;
  color: ${({ theme }) => theme.color?.foreground || '#000'};
`;

export interface DigitalCronInputProps {
  /** The standard cron expression (e.g. '0 19 * * 5') */
  value: string;
  /** Fires whenever the user changes time or day */
  onChange: (value: string) => void;
  className?: string;
}

const DAYS = [
  { label: 'Every Day', value: '*' },
  { label: 'Sunday', value: '0' },
  { label: 'Monday', value: '1' },
  { label: 'Tuesday', value: '2' },
  { label: 'Wednesday', value: '3' },
  { label: 'Thursday', value: '4' },
  { label: 'Friday', value: '5' },
  { label: 'Saturday', value: '6' },
];
const HOURS = Array.from({ length: 12 }, (_, i) => i + 1);
const MINUTES = ['00', '15', '30', '45'];

export function DigitalCronInput({ value, onChange, className }: DigitalCronInputProps) {
  // Safe defaults if empty string is passed
  const parts = (value || '0 19 * * 5').split(' ');
  const minute = parts[0] || '0';
  const hour = parseInt(parts[1] || '19', 10);
  const dom = parts[2] || '*';
  const mon = parts[3] || '*';
  const dow = parts[4] || '5';

  const isPM = hour >= 12;
  let displayHour = hour % 12;
  if (displayHour === 0) displayHour = 12;

  const handleUpdate = (updates: { h?: number; m?: string; pm?: boolean; d?: string }) => {
    const nextH = updates.h ?? displayHour;
    const nextM = updates.m ?? minute;
    const nextPM = updates.pm ?? isPM;
    const nextD = updates.d ?? dow;

    let newHour24 = nextPM ? (nextH === 12 ? 12 : nextH + 12) : (nextH === 12 ? 0 : nextH);
    onChange(`${nextM} ${newHour24} ${dom} ${mon} ${nextD}`);
  };

  return (
    <Container className={className}>
      <Group>
        <Label>Time</Label>
        <SelectBox 
          value={displayHour} 
          onChange={(e) => handleUpdate({ h: parseInt(e.target.value, 10) })}
        >
          {HOURS.map(h => (
            <option key={h} value={h}>{h.toString().padStart(2, '0')}</option>
          ))}
        </SelectBox>
        <Colon>:</Colon>
        <SelectBox 
          value={minute.padStart(2, '0')} 
          onChange={(e) => handleUpdate({ m: parseInt(e.target.value, 10).toString() })}
        >
          {MINUTES.map(m => (
            <option key={m} value={m}>{m}</option>
          ))}
        </SelectBox>
        <SelectBox 
          value={isPM ? 'PM' : 'AM'} 
          onChange={(e) => handleUpdate({ pm: e.target.value === 'PM' })}
        >
          <option value="AM">AM</option>
          <option value="PM">PM</option>
        </SelectBox>
      </Group>

      <Group>
        <Label>Day</Label>
        <SelectBox 
          value={dow} 
          onChange={(e) => handleUpdate({ d: e.target.value })}
        >
          {DAYS.map((day) => (
            <option key={day.value} value={day.value}>{day.label}</option>
          ))}
        </SelectBox>
      </Group>
    </Container>
  );
}
