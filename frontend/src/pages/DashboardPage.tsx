import { GreetingHero } from "@/components/dashboard/GreetingHero";
import { OverviewInsightCard } from "@/components/dashboard/OverviewInsightCard";
import {
  DomainPulseCard,
  FocusCard,
  HabitsCard,
  RecentActivityCard,
  WeekActivityCard,
} from "@/components/dashboard/RelevantCards";
import { UnifiedSchedulePanel } from "@/components/dashboard/UnifiedSchedulePanel";
import { useState } from "react";
import styled from "styled-components";

const Container = styled.div`
  min-height: 100vh;
  background: ${({ theme }) => theme.color.background};
  padding: 16px;
  @media (min-width: 768px) {
    padding: 24px;
  }
`;

const Inner = styled.div`
  max-width: 1440px;
  margin: 0 auto;
  display: grid;
  grid-template-columns: minmax(0, 80%) minmax(280px, 20%);
  gap: 20px;
  align-items: start;
`;

const HeroBlock = styled.div`
  display: flex;
  flex-direction: column;
  gap: 16px;
  align-items: stretch;
`;

const LeftColumn = styled.div`
  display: flex;
  flex-direction: column;
  gap: 20px;
  min-width: 0;
  align-self: stretch;
`;

const RightColumn = styled.aside`
  position: sticky;
  top: 16px;
  align-self: start;
  min-width: 0;
  width: 100%;
  max-width: 100%;
  height: calc(100vh - 32px);
`;

const ThreeRow = styled.div`
  display: grid;
  grid-template-columns: 1fr;
  gap: 20px;
  align-items: stretch;
  grid-auto-rows: 1fr;
  @media (min-width: 768px) {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
  @media (min-width: 1024px) {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }
`;

const TwoRow = styled.div`
  display: grid;
  grid-template-columns: 1fr;
  gap: 20px;
  align-items: stretch;
  grid-auto-rows: 1fr;
  @media (min-width: 768px) {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
`;

const RowOnly = styled.div`
  display: grid;
  grid-template-columns: 1fr;
  gap: 20px;
  align-items: stretch;
`;

const CardFill = styled.div`
  height: 100%;
  width: 100%;
  display: flex;
  align-items: stretch;
  & > * {
    width: 100%;
    height: 100%;
    min-height: 100%;
  }
`;

const RightCardFill = styled(CardFill)`
  height: 100%;
  align-items: stretch;
  & > * {
    min-height: 0;
    height: 100%;
  }
`;

export function DashboardPage() {
  const [selectedDate, setSelectedDate] = useState<Date>(() => new Date());

  return (
    <Container>
      <Inner>
        <LeftColumn>
          <HeroBlock>
            <GreetingHero />
            <OverviewInsightCard />
          </HeroBlock>

          {/* Row 3 — 3 relevant cards */}
          <ThreeRow>
            <CardFill>
              <HabitsCard />
            </CardFill>
            <CardFill>
              <WeekActivityCard />
            </CardFill>
            <CardFill>
              <FocusCard />
            </CardFill>
          </ThreeRow>

          {/* Row 4 */}
          <RowOnly>
            <CardFill>
              <DomainPulseCard />
            </CardFill>
          </RowOnly>

          {/* Row 5 */}
          <RowOnly>
            <CardFill>
              <RecentActivityCard />
            </CardFill>
          </RowOnly>
        </LeftColumn>

        <RightColumn>
          <RightCardFill>
            <UnifiedSchedulePanel
              selectedDate={selectedDate}
              onSelectDate={setSelectedDate}
            />
          </RightCardFill>
        </RightColumn>
      </Inner>
    </Container>
  );
}
