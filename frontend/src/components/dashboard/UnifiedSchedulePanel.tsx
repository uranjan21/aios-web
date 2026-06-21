import { Card } from "@ledgr/ui";
import styled from "styled-components";
import { MonthlyCalendar } from "./MonthlyCalendar";
import { TodaysTimeline } from "./TodaysTimeline";
import { Calendar } from "lucide-react";

interface UnifiedSchedulePanelProps {
  selectedDate: Date;
  onSelectDate: (d: Date) => void;
}

const PanelBody = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0;
  height: 100%;
`;

const Section = styled.section`
  display: flex;
  flex-direction: column;
  width: 100%;
  min-height: 0;
  &:not(:first-child) {
    border-top: 1px solid ${({ theme }) => theme.color.border};
  }
`;

const CalendarSection = styled(Section)`
  flex: 0 0 auto;
  padding: 0 0 12px;
`;

const TimelineSection = styled(Section)`
  flex: 1 1 auto;
  min-height: 0;
  overflow-y: auto;
  padding: 12px 0 0;
`;

export function UnifiedSchedulePanel({
  selectedDate,
  onSelectDate,
}: UnifiedSchedulePanelProps) {
  return (
    <Card 
      title="Schedule" 
      subtitle="Monthly calendar and daily agenda" 
      icon={<Calendar size={14} />} 
      size="md"
    >
      <PanelBody>
        <CalendarSection>
          <MonthlyCalendar
            selectedDate={selectedDate}
            onSelectDate={onSelectDate}
          />
        </CalendarSection>
        <TimelineSection>
          <TodaysTimeline date={selectedDate} />
        </TimelineSection>
      </PanelBody>
    </Card>
  );
}
