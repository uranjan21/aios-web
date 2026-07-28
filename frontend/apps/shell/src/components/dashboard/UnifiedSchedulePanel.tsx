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
  padding: ${({ theme }) => `0 0 ${theme.spacing[3]}`};
`;

const TimelineSection = styled(Section)`
  flex: 1 1 auto;
  min-height: 0;
  overflow-y: auto;
  padding: ${({ theme }) => `${theme.spacing[3]} 0 0`};
`;

const StyledCard = styled(Card)`
  position: relative;
  overflow: hidden;
  border: 1px solid ${({ theme }) =>
    theme.mode === 'dark' ? 'rgba(255, 255, 255, 0.1)' : theme.color.border};
  background: ${({ theme }) =>
    theme.mode === 'dark'
      ? 'rgba(20, 24, 34, 0.85)'
      : 'rgba(255, 255, 255, 0.85)'};
  backdrop-filter: blur(16px);
  border-radius: ${({ theme }) => theme.radii.xl};
  box-shadow: 0 8px 30px -6px rgba(0, 0, 0, 0.05);
`;

export function UnifiedSchedulePanel({
  selectedDate,
  onSelectDate,
}: UnifiedSchedulePanelProps) {
  return (
    <StyledCard 
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
    </StyledCard>
  );
}
