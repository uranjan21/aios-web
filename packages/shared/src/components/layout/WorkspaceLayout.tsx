import { ReactNode } from "react";
import styled from "styled-components";
import { Card } from "@ledgr/ui";
import { LayoutDashboard } from "lucide-react";
import { SIDEBAR_WIDTH, TOPBAR_HEIGHT } from "@aios/shared/theme/layout";

interface WorkspaceLayoutProps {
  /**
   * Rail heading. The title used to be hardcoded to "Workspace / Workspace
   * tools & quick actions" for every consumer, so the Finance Projections rail
   * announced itself as "Workspace" above a set of what-if levers. Name the
   * rail for what it actually holds.
   */
  railTitle?: string;
  railSubtitle?: string;
  children: ReactNode;
  rail?: ReactNode;
}

interface RailHeadingProps {
  children: ReactNode;
}

const Root = styled.section`
  display: flex;
  flex-direction: column;
  gap: 24px;
  width: 100%;
  align-items: flex-start;

  @media (min-width: 1024px) {
    flex-direction: row;
    align-items: stretch;
  }
`;

const StyledRail = styled(Card)`
  width: 100%;
  flex-shrink: 0;
  align-self: flex-start;

  @media (min-width: 1024px) {
    width: ${SIDEBAR_WIDTH};
    position: sticky;
    top: 24px;
    max-height: calc(100dvh - ${TOPBAR_HEIGHT});
    overflow-y: auto;
  }
`;

const Main = styled.main`
  flex: 1;
  min-width: 0;
  width: 100%;

  display: flex;
  flex-direction: column;
  gap: 24px;
`;

export function WorkspaceLayout({ children, rail, railTitle, railSubtitle }: WorkspaceLayoutProps) {
  return (
    <Root>
      {rail && (
        <StyledRail
          title={railTitle ?? 'Workspace'}
          subtitle={railSubtitle ?? 'Workspace tools & quick actions'}
          icon={<LayoutDashboard size={16} />}
          // NOT glass: this rail holds data and lives inside the scrolling
          // content area, so a backdrop-filter would composite everything
          // behind it on every scroll frame. Measured at blur(24px) over a
          // 297x385 box inside MAIN#main-content. Glass is for overlay chrome
          // sitting above a static backdrop — dialogs, popovers, the top bar.
          variant="raised"
        >
          {rail}
        </StyledRail>
      )}

      <Main>{children}</Main>
    </Root>
  );
}

const RailHeadingRoot = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
  padding: 0 4px;
`;

const Dot = styled.span`
  width: 4px;
  height: 4px;
  flex-shrink: 0;
  border-radius: 999px;
  background: ${({ theme }) => theme.color.primary};
`;

const RailLabel = styled.span`
  flex-shrink: 0;

  font-size: 10.5px;
  font-weight: 600;
  line-height: 1;

  text-transform: uppercase;
  letter-spacing: 0.08em;

  color: ${({ theme }) => theme.color.mutedForeground};

  user-select: none;
`;

const RailLine = styled.div`
  flex: 1;
  min-width: 12px;
  height: 1px;

  background: ${({ theme }) => theme.color.border};
  opacity: 0.6;
`;

export function RailHeading({ children }: RailHeadingProps) {
  return (
    <RailHeadingRoot>
      <Dot />
      <RailLabel>{children}</RailLabel>
      <RailLine />
    </RailHeadingRoot>
  );
}
