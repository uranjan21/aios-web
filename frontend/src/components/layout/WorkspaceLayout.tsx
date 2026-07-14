import { ReactNode } from "react";
import styled from "styled-components";
import { Card } from "@ledgr/ui";
import { LayoutDashboard } from "lucide-react";
import { SIDEBAR_WIDTH, TOPBAR_HEIGHT } from "@/theme/layout";

interface WorkspaceLayoutProps {
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

export function WorkspaceLayout({ children, rail }: WorkspaceLayoutProps) {
  return (
    <Root>
      {rail && (
        <StyledRail
          title="Workspace"
          subtitle="Workspace tools & quick actions"
          icon={<LayoutDashboard size={16} />}
          variant="glass"
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
