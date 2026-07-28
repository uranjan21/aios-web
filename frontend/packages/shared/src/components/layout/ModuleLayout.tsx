import { ReactNode } from 'react'
import styled from 'styled-components'
import { PageContainer, PageContent } from './PageLayout'

export const Shell = styled.div`
  display: flex;
  align-items: flex-start;
  gap: ${({ theme }) => `${theme.spacing[6]}`};
  width: 100%;

  @media ${({ theme }) => theme.media.belowLg} {
    flex-direction: column;
  }
`

export const ContentPane = styled.main`
  flex: 1;
  min-width: 0;
  width: 100%;

  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => `${theme.spacing[6]}`};
`

export interface ModuleLayoutProps {
  sidebar: ReactNode
  children: ReactNode
  header?: ReactNode
}

export function ModuleLayout({ sidebar, children, header }: ModuleLayoutProps) {
  return (
    <PageContainer>
      <PageContent>
        {header}
        <Shell>
          {sidebar}
          <ContentPane>{children}</ContentPane>
        </Shell>
      </PageContent>
    </PageContainer>
  )
}
