import { Link, Outlet } from 'react-router-dom'
import styled from 'styled-components'

const Root = styled.div`
  min-height: 100dvh;
  display: flex;
  flex-direction: column;
  background: ${({ theme }) => theme.color.background};
  color: ${({ theme }) => theme.color.foreground};
`

const Header = styled.header`
  padding: 24px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-bottom: 1px solid ${({ theme }) => theme.color.border};
`

const LogoLink = styled(Link)`
  text-decoration: none;
  display: flex;
  align-items: center;
  gap: 12px;
`

const LogoBadge = styled.div`
  width: 40px;
  height: 40px;
  border-radius: 12px;
  background: linear-gradient(135deg, ${({ theme }) => theme.color.primary}, ${({ theme }) => theme.color.accent});
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: ${({ theme }) => theme.shadow.sm};
`

const LogoBadgeText = styled.span`
  font-family: ${({ theme }) => theme.typography.fontFamily.sans};
  font-size: 14px;
  font-weight: 700;
  color: ${({ theme }) => theme.color.primaryForeground};
  letter-spacing: -0.02em;
`

const BrandText = styled.span`
  font-family: ${({ theme }) => theme.typography.fontFamily.sans};
  font-size: 24px;
  font-weight: 700;
  color: ${({ theme }) => theme.color.foreground};
`

const NavLink = styled(Link)`
  font-size: 14px;
  font-weight: 500;
  color: ${({ theme }) => theme.color.mutedForeground};
  text-decoration: none;
  transition: color 150ms;
  &:hover {
    color: ${({ theme }) => theme.color.foreground};
  }
`

const Main = styled.main`
  flex: 1;
  padding: 48px 24px;
  max-width: 800px;
  margin: 0 auto;
  width: 100%;
`

const Footer = styled.footer`
  padding: 48px 24px;
  text-align: center;
  border-top: 1px solid ${({ theme }) => theme.color.border};
`

const FooterNav = styled.div`
  display: flex;
  justify-content: center;
  gap: 24px;
  margin-bottom: 24px;
  flex-wrap: wrap;
`

const Copyright = styled.p`
  font-size: 13px;
  color: ${({ theme }) => theme.color.mutedForeground};
  margin: 0;
`

export function LegalLayout() {
  return (
    <Root>
      <Header>
        <LogoLink to="/login">
          <LogoBadge>
            <LogoBadgeText>AI</LogoBadgeText>
          </LogoBadge>
          <BrandText>aios</BrandText>
        </LogoLink>
        <NavLink to="/login">Back to Login</NavLink>
      </Header>
      
      <Main>
        <Outlet />
      </Main>

      <Footer>
        <FooterNav>
          <NavLink to="/privacy-policy">Privacy Policy</NavLink>
          <NavLink to="/terms-of-service">Terms of Service</NavLink>
          <NavLink to="/support">Support</NavLink>
        </FooterNav>
        <Copyright>© {new Date().getFullYear()} aios. All rights reserved.</Copyright>
      </Footer>
    </Root>
  )
}
