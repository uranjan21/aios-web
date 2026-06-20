import type { ReactNode } from 'react'
import styled from 'styled-components'

const Root = styled.div`
  display: flex;
  flex-direction: column;
  gap: 16px;
  align-items: flex-start;
  width: 100%;

  @media (min-width: 1024px) {
    flex-direction: row;
    align-items: stretch;
  }
`

const Rail = styled.div`
  width: 100%;
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  gap: 16px;
  border-radius: ${({ theme }) => theme.radii['2xl']};
  border: 1px solid ${({ theme }) => theme.color.border};
  background: ${({ theme }) => theme.color.card};
  box-shadow: ${({ theme }) => theme.shadow.xs};
  padding: 16px;

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
  gap: 16px;
`

export function WorkspaceLayout({ children, rail }: { children: ReactNode; rail?: ReactNode }) {
  return (
    <Root>
      {rail && <Rail>{rail}</Rail>}
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
