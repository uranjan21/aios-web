import type { ReactNode } from 'react';
import styled from 'styled-components';

export interface AppShellProps {
  sidebar?: ReactNode;
  header?: ReactNode;
  /** Mobile bottom-nav slot. */
  mobileNav?: ReactNode;
  /** Optional floating action (e.g. AI chat). */
  floatingAction?: ReactNode;
  children: ReactNode;
}

const Root = styled.div`
  display: flex;
  min-height: 100vh;
  width: 100%;
  background: ${({ theme }) => theme.color.background};
  color: ${({ theme }) => theme.color.foreground};
`;

const Aside = styled.aside`
  flex-shrink: 0;
  position: sticky;
  top: 0;
  height: 100vh;
  z-index: ${({ theme }) => theme.zIndex.sticky};
  /* Hide on mobile — pass a Sheet-based mobile menu if needed. */
  @media (max-width: ${({ theme }) => theme.breakpoint.md}) {
    display: none;
  }
`;

const Main = styled.div`
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
`;

const Content = styled.main`
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  /* Bottom padding so MobileBottomNav doesn't cover content. */
  @media (max-width: ${({ theme }) => theme.breakpoint.md}) {
    padding-bottom: 56px;
  }
`;

export function AppShell({ sidebar, header, mobileNav, floatingAction, children }: AppShellProps) {
  return (
    <Root>
      {sidebar && <Aside>{sidebar}</Aside>}
      <Main>
        {header}
        <Content>{children}</Content>
      </Main>
      {mobileNav}
      {floatingAction}
    </Root>
  );
}

/**
 * Convenience page-shell wrapper: applies consistent horizontal/vertical padding
 * + max width for any page rendered inside <AppShell>.
 */
export const PageShell = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.spacing[5]};
  padding: ${({ theme }) => `${theme.spacing[5]} ${theme.spacing[5]}`};

  @media (min-width: ${({ theme }) => theme.breakpoint.sm}) {
    padding: ${({ theme }) => `${theme.spacing[6]} ${theme.spacing[6]}`};
    gap: ${({ theme }) => theme.spacing[6]};
  }
  @media (min-width: ${({ theme }) => theme.breakpoint.lg}) {
    padding: ${({ theme }) => `${theme.spacing[8]} ${theme.spacing[8]}`};
  }
`;
