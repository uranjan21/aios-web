import { focusRing } from '@ledgr/ui'
import {
  fmtDateKey,
  parseLocalDate,
  useDayEventsStore,
  type DayEvent,
} from "@ct/shared/stores/dayEventsStore";
import { CalendarDays, Check, Clock, Trash2 } from "lucide-react";
import { useMemo } from "react";
import styled, { css, useTheme } from "styled-components";
import { categoryColor } from "@ct/shared/theme/domains";

interface TodaysTimelineProps {
  date: Date;
}

const HeaderRow = styled.div`
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: ${({ theme }) => `${theme.spacing[2]}`};
  margin-bottom: ${({ theme }) => `${theme.spacing[3.5]}`};
`;

const DateLabel = styled.h3`
  margin: 0;
  font-size: ${({ theme }) => theme.typography.fontSize.base};
  font-weight: 600;
  color: ${({ theme }) => theme.color.foreground};
`;

const Counter = styled.span`
  font-size: ${({ theme }) => theme.typography.fontSize.xs};
  color: ${({ theme }) => theme.color.mutedForeground};
`;

const Track = styled.ol`
  position: relative;
  margin: 0;
  padding: ${({ theme }) => `0 0 0 ${theme.spacing[7]}`};
  list-style: none;
  &::before {
    content: "";
    position: absolute;
    left: 9px;
    top: 4px;
    bottom: 4px;
    width: 2px;
    background: ${({ theme }) => theme.color.border};
    border-radius: ${({ theme }) => theme.radii.xs};
  }
`;

const Item = styled.li<{ $done?: boolean }>`
  position: relative;
  padding-bottom: ${({ theme }) => `${theme.spacing[3.5]}`};
  &:last-child {
    padding-bottom: 0;
  }
  ${({ $done }) =>
    $done &&
    css`
      opacity: 0.55;
    `}
`;

const Dot = styled.span<{ $color: string }>`
  position: absolute;
  left: -23px;
  top: 4px;
  width: 12px;
  height: 12px;
  border-radius: 50%;
  background: ${({ theme }) => theme.color.background};
  border: 2px solid ${({ $color }) => $color};
  box-shadow: 0 0 0 3px ${({ theme }) => theme.color.background}, 0 0 8px ${({ $color }) => $color}80;
  transition: all 0.2s ease;
  
  &:hover {
    box-shadow: 0 0 0 3px ${({ theme }) => theme.color.background}, 0 0 12px ${({ $color }) => $color};
    transform: scale(1.2);
  }
`;

const Time = styled.div`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => `${theme.spacing[1]}`};
  font-size: ${({ theme }) => theme.typography.fontSize.xs};
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: ${({ theme }) => theme.color.mutedForeground};
  margin-bottom: ${({ theme }) => `${theme.spacing[0.5]}`};
`;

const Title = styled.div<{ $done?: boolean }>`
  font-size: ${({ theme }) => theme.typography.fontSize.sm};
  font-weight: 600;
  color: ${({ theme }) => theme.color.foreground};
  ${({ $done }) =>
    $done &&
    css`
      text-decoration: line-through;
    `}
`;

const Meta = styled.div`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => `${theme.spacing[2]}`};
  margin-top: ${({ theme }) => `${theme.spacing[1]}`};
`;

const CategoryChip = styled.span<{ $color: string }>`
  font-size: ${({ theme }) => theme.typography.fontSize.xs};
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: ${({ $color }) => $color};
  background: ${({ $color }) => $color}1A;
  padding: ${({ theme }) => `${theme.spacing[0.5]} ${theme.spacing[2]}`};
  border-radius: ${({ theme }) => theme.radii.sm};
`;

const Notes = styled.p`
  margin: ${({ theme }) => `${theme.spacing[1]} 0 0 0`};
  font-size: ${({ theme }) => theme.typography.fontSize.sm};
  color: ${({ theme }) => theme.color.mutedForeground};
  line-height: 1.4;
`;

const ItemRow = styled.div`
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: ${({ theme }) => `${theme.spacing[2]}`};
`;

const ItemBody = styled.div`
  flex: 1;
  min-width: 0;
`;

const Actions = styled.div`
  display: flex;
  gap: ${({ theme }) => `${theme.spacing[0.5]}`};
  flex-shrink: 0;
`;

const ActionBtn = styled.button`
  width: 24px;
  height: 24px;
  border-radius: ${({ theme }) => theme.radii.sm};
  border: none;
  background: transparent;
  color: ${({ theme }) => theme.color.mutedForeground};
  display: inline-flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition:
    background 120ms,
    color 120ms;
  &:hover {
    background: ${({ theme }) => theme.color.muted};
    color: ${({ theme }) => theme.color.foreground};
  }
  ${focusRing}
`;

const Empty = styled.div`
  text-align: center;
  padding: ${({ theme }) => `${theme.spacing[7]} ${theme.spacing[4]} ${theme.spacing[3]}`};
  color: ${({ theme }) => theme.color.mutedForeground};
  font-size: ${({ theme }) => theme.typography.fontSize.sm};
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: ${({ theme }) => `${theme.spacing[2]}`};
`;

function fmtTime(t?: string): string {
  if (!t) return "All day";
  const [h, m] = t.split(":").map(Number);
  const ampm = h >= 12 ? "PM" : "AM";
  const hr = ((h + 11) % 12) + 1;
  return `${hr}:${String(m).padStart(2, "0")} ${ampm}`;
}

function endTime(e: DayEvent): string | null {
  if (!e.time || !e.durationMin) return null;
  const [h, m] = e.time.split(":").map(Number);
  const total = h * 60 + m + e.durationMin;
  const endH = Math.floor(total / 60) % 24;
  const endM = total % 60;
  return fmtTime(
    `${String(endH).padStart(2, "0")}:${String(endM).padStart(2, "0")}`,
  );
}

export function TodaysTimeline({ date }: TodaysTimelineProps) {
  const theme = useTheme();
  const key = fmtDateKey(date);
  const today = fmtDateKey(new Date());
  const isToday = key === today;

  const allEvents = useDayEventsStore((s) => s.events);
  const toggleDone = useDayEventsStore((s) => s.toggleDone);
  const removeEvent = useDayEventsStore((s) => s.removeEvent);

  const events = useMemo(
    () =>
      allEvents
        .filter((event) => event.date === key)
        .sort((a, b) => {
          if (!a.time && !b.time) return 0;
          if (!a.time) return -1;
          if (!b.time) return 1;
          return a.time.localeCompare(b.time);
        }),
    [allEvents, key],
  );

  const label = isToday
    ? `Today's tasks`
    : parseLocalDate(key).toLocaleDateString("en-IN", {
        weekday: "long",
        day: "numeric",
        month: "short",
      });

  return (
    <>
      <HeaderRow>
        <DateLabel>{label}</DateLabel>
        <Counter>
          {events.length} {events.length === 1 ? "item" : "items"}
        </Counter>
      </HeaderRow>

      {events.length === 0 ? (
        <Empty>
          <CalendarDays size={24} opacity={0.5} />
          <span>No events scheduled.</span>
          <span style={{ fontSize: 11 }}>
            Click <strong>Add event</strong> on the calendar above.
          </span>
        </Empty>
      ) : (
        <Track>
          {events.map((e) => {
            const color = categoryColor(e.category, theme);
            const end = endTime(e);
            return (
              <Item key={e.id} $done={!!e.done}>
                <Dot $color={color} />
                <Time>
                  {e.time && <Clock size={10} />} {fmtTime(e.time)}
                  {end ? ` – ${end}` : ""}
                </Time>
                <ItemRow>
                  <ItemBody>
                    <Title $done={!!e.done}>{e.title}</Title>
                    <Meta>
                      <CategoryChip $color={color}>{e.category}</CategoryChip>
                    </Meta>
                    {e.notes && <Notes>{e.notes}</Notes>}
                  </ItemBody>
                  <Actions>
                    <ActionBtn
                      aria-label={e.done ? "Mark not done" : "Mark done"}
                      onClick={() => toggleDone(e.id)}
                    >
                      <Check size={13} />
                    </ActionBtn>
                    <ActionBtn
                      aria-label="Delete event"
                      onClick={() => removeEvent(e.id)}
                    >
                      <Trash2 size={13} />
                    </ActionBtn>
                  </Actions>
                </ItemRow>
              </Item>
            );
          })}
        </Track>
      )}
    </>
  );
}
