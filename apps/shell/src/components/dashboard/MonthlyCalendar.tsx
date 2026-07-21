import { focusRing } from '@ledgr/ui'
import {
  fmtDateKey,
  parseLocalDate,
  useDayEventsStore,
  type DayEvent,
  type EventCategory,
} from "@aios/shared/stores/dayEventsStore";
import { Button, Dialog, Input, Select, Textarea } from "@ledgr/ui";
import { ChevronLeft, ChevronRight, Plus, X } from "lucide-react";
import { useMemo, useState } from "react";
import styled, { css } from "styled-components";

const CATEGORIES: Array<{ label: string; value: EventCategory }> = [
  { label: "Work", value: "work" },
  { label: "Personal", value: "personal" },
  { label: "Health", value: "health" },
  { label: "Finance", value: "finance" },
  { label: "Business", value: "business" },
  { label: "Learning", value: "learning" },
];

// Category -> colour now lives in theme/domains.ts (categoryColor) so it
// resolves through theme.domain and stays correct in dark mode.

const MONTH_NAMES = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];
const DOW = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

interface MonthlyCalendarProps {
  selectedDate: Date;
  onSelectDate: (d: Date) => void;
}

const Header = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: ${({ theme }) => `${theme.spacing[2]}`};
  margin-bottom: ${({ theme }) => `${theme.spacing[3]}`};
`;

const MonthTitle = styled.h3`
  margin: 0;
  font-size: ${({ theme }) => theme.typography.fontSize.base};
  font-weight: 600;
  color: ${({ theme }) => theme.color.foreground};
`;

const NavBtns = styled.div`
  display: flex;
  gap: ${({ theme }) => `${theme.spacing[1]}`};
  align-items: center;
`;

const IconBtn = styled.button`
  width: 28px;
  height: 28px;
  border-radius: ${({ theme }) => theme.radii.md};
  border: 1px solid ${({ theme }) => theme.color.border};
  background: ${({ theme }) => theme.color.card};
  color: ${({ theme }) => theme.color.foreground};
  display: inline-flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: background 120ms;
  &:hover {
    background: ${({ theme }) => theme.color.muted};
  }
  ${focusRing}
`;

const DowGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: ${({ theme }) => `${theme.spacing[0.5]}`};
  margin-bottom: ${({ theme }) => `${theme.spacing[1]}`};
`;

const DowCell = styled.div`
  text-align: center;
  font-size: ${({ theme }) => theme.typography.fontSize.xs};
  font-weight: 600;
  color: ${({ theme }) => theme.color.mutedForeground};
  text-transform: uppercase;
  letter-spacing: 0.06em;
  padding: ${({ theme }) => `${theme.spacing[1]} 0`};
`;

const DaysGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: ${({ theme }) => `${theme.spacing[1]}`};
`;

const Cell = styled.button<{
  $today?: boolean;
  $selected?: boolean;
  $outside?: boolean;
  $hasEvents?: boolean;
}>`
  position: relative;
  aspect-ratio: 1 / 1;
  border: 1px solid transparent;
  background: ${({ theme, $selected }) =>
    $selected ? theme.color.primary : theme.color.background};
  color: ${({ theme, $selected, $outside }) =>
    $selected
      ? theme.color.primaryForeground
      : $outside
        ? theme.color.mutedForeground + "AA"
        : theme.color.foreground};
  border-radius: ${({ theme }) => theme.radii.md};
  font-size: ${({ theme }) => theme.typography.fontSize.sm};
  font-weight: 500;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  padding: 0;
  transition:
    transform 120ms,
    background 120ms,
    border-color 120ms;
  ${({ $today, theme, $selected }) =>
    $today &&
    !$selected &&
    css`
      border-color: ${theme.color.accent};
      color: ${theme.color.accent};
      font-weight: 700;
    `}
  &:hover {
    transform: scale(1.05);
    border-color: ${({ theme, $selected }) =>
      $selected ? "transparent" : theme.color.border};
  }
  ${focusRing}
`;

const DayNum = styled.span`
  line-height: 1;
`;

const EventDot = styled.span<{ $selected?: boolean }>`
  width: 4px;
  height: 4px;
  border-radius: 50%;
  flex-shrink: 0;
  background: ${({ theme, $selected }) =>
    $selected ? theme.color.primaryForeground : theme.color.accent};
`;

const EventDots = styled.span`
  position: absolute;
  bottom: 4px;
  display: flex;
  gap: ${({ theme }) => `${theme.spacing[0.5]}`};
`;

const AddEventRow = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: ${({ theme }) => `${theme.spacing[3]}`};
  gap: ${({ theme }) => `${theme.spacing[2]}`};
`;

const SelectedLabel = styled.span`
  font-size: ${({ theme }) => theme.typography.fontSize.xs};
  color: ${({ theme }) => theme.color.mutedForeground};
`;

const DialogBody = styled.div`
  padding: ${({ theme }) => `${theme.spacing[5]}`};
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => `${theme.spacing[3.5]}`};
`;

const FieldRow = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: ${({ theme }) => `${theme.spacing[3]}`};
`;

const Label = styled.label`
  font-size: ${({ theme }) => theme.typography.fontSize.xs};
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: ${({ theme }) => theme.color.mutedForeground};
  display: block;
  margin-bottom: ${({ theme }) => `${theme.spacing[1.5]}`};
`;

const DialogFooter = styled.div`
  display: flex;
  justify-content: flex-end;
  gap: ${({ theme }) => `${theme.spacing[2]}`};
  padding: ${({ theme }) => `${theme.spacing[3]} ${theme.spacing[5]} ${theme.spacing[4]}`};
  border-top: 1px solid ${({ theme }) => theme.color.border};
  background: ${({ theme }) => theme.color.muted}50;
`;

function buildMonthGrid(
  viewMonth: Date,
): Array<{ date: Date; outside: boolean }> {
  const year = viewMonth.getFullYear();
  const month = viewMonth.getMonth();
  const firstOfMonth = new Date(year, month, 1);
  const startWeekday = firstOfMonth.getDay();
  const start = new Date(year, month, 1 - startWeekday);
  const cells: Array<{ date: Date; outside: boolean }> = [];
  for (let i = 0; i < 42; i++) {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    cells.push({ date: d, outside: d.getMonth() !== month });
  }
  return cells;
}

export function MonthlyCalendar({
  selectedDate,
  onSelectDate,
}: MonthlyCalendarProps) {
  const [viewMonth, setViewMonth] = useState(
    () => new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1),
  );
  const [dialogOpen, setDialogOpen] = useState(false);
  const [draft, setDraft] = useState<Partial<DayEvent>>({});

  const addEvent = useDayEventsStore((s) => s.addEvent);
  const events = useDayEventsStore((s) => s.events);

  const countsByDate = useMemo(() => {
    const map: Record<string, number> = {};
    for (const event of events) {
      map[event.date] = (map[event.date] ?? 0) + 1;
    }
    return map;
  }, [events]);

  const cells = useMemo(() => buildMonthGrid(viewMonth), [viewMonth]);
  const todayKey = fmtDateKey(new Date());
  const selectedKey = fmtDateKey(selectedDate);
  const monthLabel = `${MONTH_NAMES[viewMonth.getMonth()]} ${viewMonth.getFullYear()}`;

  const goPrev = () =>
    setViewMonth(
      new Date(viewMonth.getFullYear(), viewMonth.getMonth() - 1, 1),
    );
  const goNext = () =>
    setViewMonth(
      new Date(viewMonth.getFullYear(), viewMonth.getMonth() + 1, 1),
    );
  const goToday = () => {
    const t = new Date();
    setViewMonth(new Date(t.getFullYear(), t.getMonth(), 1));
    onSelectDate(t);
  };

  const openAdd = () => {
    setDraft({ date: selectedKey, category: "personal", durationMin: 30 });
    setDialogOpen(true);
  };

  const submit = () => {
    if (!draft.title?.trim() || !draft.date || !draft.category) return;
    addEvent({
      title: draft.title.trim(),
      date: draft.date,
      time: draft.time || undefined,
      durationMin: draft.durationMin || undefined,
      category: draft.category,
      notes: draft.notes?.trim() || undefined,
    });
    setDialogOpen(false);
    setDraft({});
  };

  return (
    <>
      <Header>
        <MonthTitle>{monthLabel}</MonthTitle>
        <NavBtns>
          <IconBtn
            onClick={goToday}
            aria-label="Today"
            title="Today"
            style={{ width: "auto", padding: "0 8px", fontSize: "11px" }}
          >
            Today
          </IconBtn>
          <IconBtn onClick={goPrev} aria-label="Previous month">
            <ChevronLeft size={14} />
          </IconBtn>
          <IconBtn onClick={goNext} aria-label="Next month">
            <ChevronRight size={14} />
          </IconBtn>
        </NavBtns>
      </Header>

      <DowGrid>
        {DOW.map((d) => (
          <DowCell key={d}>{d}</DowCell>
        ))}
      </DowGrid>

      <DaysGrid>
        {cells.map(({ date, outside }) => {
          const key = fmtDateKey(date);
          const count = countsByDate[key] ?? 0;
          const isToday = key === todayKey;
          const isSelected = key === selectedKey;
          return (
            <Cell
              key={key}
              $today={isToday}
              $selected={isSelected}
              $outside={outside}
              $hasEvents={count > 0}
              onClick={() => {
                onSelectDate(new Date(date));
                if (outside) setViewMonth(new Date(date.getFullYear(), date.getMonth(), 1));
              }}
              aria-label={`${MONTH_NAMES[date.getMonth()]} ${date.getDate()}${count ? `, ${count} event${count > 1 ? "s" : ""}` : ""}`}
            >
              <DayNum>{date.getDate()}</DayNum>
              {count > 0 && (
                <EventDots>
                  {Array.from({ length: Math.min(count, 3) }).map((_, i) => (
                    <EventDot key={i} $selected={isSelected} />
                  ))}
                </EventDots>
              )}
            </Cell>
          );
        })}
      </DaysGrid>

      <AddEventRow>
        <SelectedLabel>
          {parseLocalDate(selectedKey).toLocaleDateString("en-IN", {
            weekday: "short",
            day: "numeric",
            month: "short",
          })}
        </SelectedLabel>
        <Button
          size="sm"
          variant="ghost"
          startIcon={<Plus size={12} />}
          onClick={openAdd}
        >
          Add event
        </Button>
      </AddEventRow>

      <Dialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        title="New event"
        size="sm"
        hideCloseButton
      >
        <DialogBody>
          <div>
            <Label htmlFor="evt-title">Title</Label>
            <Input
              id="evt-title"
              autoFocus
              placeholder="Gym, dentist, deep work…"
              value={draft.title || ""}
              onChange={(e) =>
                setDraft((d) => ({ ...d, title: e.target.value }))
              }
              onKeyDown={(e) => {
                if (e.key === "Enter") submit();
              }}
            />
          </div>

          <FieldRow>
            <div>
              <Label htmlFor="evt-date">Date</Label>
              <Input
                id="evt-date"
                type="date"
                value={draft.date || selectedKey}
                onChange={(e) =>
                  setDraft((d) => ({ ...d, date: e.target.value }))
                }
              />
            </div>
            <div>
              <Label htmlFor="evt-time">Time</Label>
              <Input
                id="evt-time"
                type="time"
                value={draft.time || ""}
                onChange={(e) =>
                  setDraft((d) => ({ ...d, time: e.target.value }))
                }
              />
            </div>
          </FieldRow>

          <FieldRow>
            <div>
              <Label htmlFor="evt-category">Category</Label>
              <Select
                id="evt-category"
                fullWidth
                options={CATEGORIES}
                value={draft.category || "personal"}
                onChange={(v) =>
                  setDraft((d) => ({ ...d, category: v as EventCategory }))
                }
              />
            </div>
            <div>
              <Label htmlFor="evt-duration">Duration (min)</Label>
              <Input
                id="evt-duration"
                type="number"
                min={0}
                step={5}
                value={draft.durationMin ?? ""}
                onChange={(e) =>
                  setDraft((d) => ({
                    ...d,
                    durationMin: e.target.value
                      ? Number(e.target.value)
                      : undefined,
                  }))
                }
              />
            </div>
          </FieldRow>

          <div>
            <Label htmlFor="evt-notes">Notes</Label>
            <Textarea
              id="evt-notes"
              rows={2}
              placeholder="Optional"
              value={draft.notes || ""}
              onChange={(e) =>
                setDraft((d) => ({ ...d, notes: e.target.value }))
              }
            />
          </div>
        </DialogBody>
        <DialogFooter>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => setDialogOpen(false)}
            startIcon={<X size={12} />}
          >
            Cancel
          </Button>
          <Button
            size="sm"
            variant="primary"
            onClick={submit}
            disabled={!draft.title?.trim()}
          >
            Save
          </Button>
        </DialogFooter>
      </Dialog>
    </>
  );
}

