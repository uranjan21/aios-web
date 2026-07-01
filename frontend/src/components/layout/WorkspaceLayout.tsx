import { ReactNode } from 'react'
import styled from 'styled-components'
import { Card } from '@ledgr/ui'
import { LayoutDashboard } from 'lucide-react'

const Root = styled.div`
  display: flex;
  flex-direction: column;
  gap: 24px;
  align-items: flex-start;
  width: 100%;

  @media (min-width: 1024px) {
    flex-direction: row;
    align-items: stretch;
  }
`

const StyledRail = styled(Card)`
  width: 100%;
  flex-shrink: 0;

  @media (min-width: 1024px) {
    width: 280px;
  }
`

const Main = styled.div`
  flex: 1;
  min-width: 0;
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: 12px;
`

export function WorkspaceLayout({ children, rail }: { children: ReactNode; rail?: ReactNode }) {
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
  )
}

const RailHeadingRoot = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 0 4px;
`

const Dot = styled.span`
  width: 4px;
  height: 4px;
  border-radius: 50%;
  background: ${({ theme }) => theme.color.primary};
  flex-shrink: 0;
`

const RailLabel = styled.span`
  font-size: 10.5px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: ${({ theme }) => theme.color.mutedForeground};
`

const RailLine = styled.div`
  flex: 1;
  height: 1px;
  background: ${({ theme }) => theme.color.border};
  opacity: 0.6;
`

export function RailHeading({ children }: { children: ReactNode }) {
  return (
    <RailHeadingRoot>
      <Dot />
      <RailLabel>{children}</RailLabel>
      <RailLine />
    </RailHeadingRoot>
  )
}
