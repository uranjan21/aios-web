import { GreetingHero } from "@/components/dashboard/GreetingHero";
import { OverviewInsightCard } from "@/components/dashboard/OverviewInsightCard";
import {
  FocusCard,
  HabitsCard,
  WeekActivityCard,
} from "@/components/dashboard/RelevantCards";
import { UnifiedSchedulePanel } from "@/components/dashboard/UnifiedSchedulePanel";
import { useState } from "react";
import { motion } from "framer-motion";
import { useMotion } from "@aios/shared/hooks/useMotion";
import styled, { keyframes } from "styled-components";
import { DiscoveriesFeed } from "@/components/dashboard/DiscoveriesFeed";
import { LifeHeatmap } from "@/components/dashboard/LifeHeatmap";
import { BriefingCard } from "@/components/dashboard/BriefingCard";
import { PulseRow } from "@/components/dashboard/PulseRow";
import { PageContainer, PageContent } from "@aios/shared/components/layout/PageLayout";
const DashboardGrid = styled.div`
  display: grid;
  grid-template-columns: 1fr;
  gap: 20px;
  align-items: start;
  @media (min-width: 1024px) {
    grid-template-columns: minmax(0, 1fr) 300px;
  }
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
  min-width: 0;
  width: 100%;
  max-width: 100%;
  @media (min-width: 1024px) {
    position: sticky;
    top: 16px;
    align-self: start;
    height: calc(100vh - 64px);
  }
`;

const ThreeRow = styled.div`
  display: grid;
  grid-template-columns: 1fr;
  gap: 20px;
  align-items: stretch;
  @media (min-width: 768px) {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
  @media (min-width: 1024px) {
    grid-template-columns: repeat(3, minmax(0, 1fr));
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

import { useQueryClient } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";

const spin = keyframes`
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
`;

const SpinningLoader = styled(Loader2)<{ $spinning?: boolean }>`
  animation: ${props => props.$spinning ? `${spin} 1s linear infinite` : 'none'};
`;

export function DashboardPage() {
  const [selectedDate, setSelectedDate] = useState<Date>(() => new Date());
  const queryClient = useQueryClient();
  const [startY, setStartY] = useState(0);
  const [pullDist, setPullDist] = useState(0);
  const [refreshing, setRefreshing] = useState(false);

  const handleTouchStart = (e: React.TouchEvent) => {
    if (window.scrollY === 0) setStartY(e.touches[0].clientY);
  };
  const handleTouchMove = (e: React.TouchEvent) => {
    if (startY > 0) {
      const dist = e.touches[0].clientY - startY;
      if (dist > 0) setPullDist(dist);
    }
  };
  const handleTouchEnd = async () => {
    if (pullDist > 80 && !refreshing) {
      setRefreshing(true);
      await queryClient.invalidateQueries();
      setTimeout(() => setRefreshing(false), 500);
    }
    setStartY(0);
    setPullDist(0);
  };

  const offset = refreshing ? 60 : Math.min(pullDist / 2, 60);
  // Staggered entrance. Routed through useMotion so `prefers-reduced-motion`
  // is honoured — framer-motion drives values in JS and is not reached by the
  // global CSS reduced-motion rule in GlobalStyles.
  const { stagger, child } = useMotion();

  return (
    <PageContainer onTouchStart={handleTouchStart} onTouchMove={handleTouchMove} onTouchEnd={handleTouchEnd}>
      <PageContent>
        {/* Pull to refresh indicator */}
        <div style={{ height: offset, display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', transition: pullDist === 0 ? 'height 0.2s' : 'none' }}>
          {(pullDist > 40 || refreshing) && <SpinningLoader $spinning={refreshing} style={{ transform: refreshing ? 'none' : `rotate(${pullDist * 2}deg)` }} size={20} color="var(--muted-foreground)" />}
        </div>
        
        <DashboardGrid>
          <LeftColumn as={motion.div} initial={stagger.initial} animate={stagger.animate} variants={stagger.variants}>
          <HeroBlock as={motion.div} variants={child.variants}>
            <GreetingHero />
            <BriefingCard />
            <OverviewInsightCard />
          </HeroBlock>

          <motion.div variants={child.variants}><PulseRow /></motion.div>
          <motion.div variants={child.variants}><DiscoveriesFeed /></motion.div>

          <ThreeRow as={motion.div} variants={child.variants}>
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

          <RowOnly as={motion.div} variants={child.variants}>
            <CardFill>
              <LifeHeatmap />
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
        </DashboardGrid>
      </PageContent>
    </PageContainer>
  );
}
