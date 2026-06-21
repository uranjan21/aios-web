import styled from 'styled-components'
import { motion } from 'framer-motion'
import { Link, useNavigate } from 'react-router-dom'
import { Button } from '@ledgr/ui'
import { Check, Shield, Zap } from 'lucide-react'
import { useAuthStore } from '@/stores/authStore'

const PageWrapper = styled.div`
  min-height: 100vh;
  background-color: ${({ theme }) => theme.color.background};
  color: ${({ theme }) => theme.color.foreground};
  display: flex;
  flex-direction: column;
`

const Header = styled.header`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 1.5rem 2rem;
  border-bottom: 1px solid ${({ theme }) => theme.color.border};
`

const Logo = styled.div`
  font-family: ${({ theme }) => theme.typography.fontFamily.serif};
  font-size: 1.5rem;
  font-weight: 700;
  display: flex;
  align-items: center;
  gap: 0.5rem;

  .accent { color: ${({ theme }) => theme.color.accent}; }
`

const Content = styled.main`
  flex: 1;
  padding: 4rem 2rem;
  max-width: 1000px;
  margin: 0 auto;
  width: 100%;
`

const TitleSection = styled.div`
  text-align: center;
  margin-bottom: 4rem;

  h1 {
    font-family: ${({ theme }) => theme.typography.fontFamily.serif};
    font-size: 3.5rem;
    margin-bottom: 1rem;
  }

  p {
    font-size: 1.25rem;
    color: ${({ theme }) => theme.color.mutedForeground};
  }
`

const PricingGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 2rem;
  align-items: flex-start;
`

const PricingCard = styled(motion.div)<{ $highlight?: boolean }>`
  background-color: ${({ theme }) => theme.color.card};
  border: 2px solid ${({ theme, $highlight }) => $highlight ? theme.color.accent : theme.color.border};
  border-radius: 24px;
  padding: 3rem 2rem;
  display: flex;
  flex-direction: column;
  position: relative;
  box-shadow: ${({ theme, $highlight }) => $highlight ? theme.shadow.lg : theme.shadow.sm};

  ${({ $highlight, theme }) => $highlight && `
    &::before {
      content: 'Most Popular';
      position: absolute;
      top: -12px;
      left: 50%;
      transform: translateX(-50%);
      background-color: ${theme.color.accent};
      color: #fff;
      padding: 4px 12px;
      border-radius: 9999px;
      font-size: 12px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }
  `}
`

const PlanName = styled.h3`
  font-size: 1.5rem;
  font-weight: 600;
  margin-bottom: 0.5rem;
`

const PlanPrice = styled.div`
  font-size: 3.5rem;
  font-weight: 700;
  font-family: ${({ theme }) => theme.typography.fontFamily.serif};
  margin-bottom: 1rem;
  display: flex;
  align-items: baseline;

  span {
    font-size: 1rem;
    font-family: ${({ theme }) => theme.typography.fontFamily.sans};
    color: ${({ theme }) => theme.color.mutedForeground};
    font-weight: 400;
  }
`

const PlanDesc = styled.p`
  color: ${({ theme }) => theme.color.mutedForeground};
  margin-bottom: 2rem;
  line-height: 1.5;
`

const FeatureList = styled.ul`
  list-style: none;
  padding: 0;
  margin: 0 0 2rem 0;
  display: flex;
  flex-direction: column;
  gap: 1rem;

  li {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    font-size: 0.9375rem;

    svg {
      color: ${({ theme }) => theme.color.accent};
      flex-shrink: 0;
    }
  }
`

export function PricingPage() {
  const navigate = useNavigate()
  const isAuthenticated = useAuthStore(s => s.isAuthenticated)

  return (
    <PageWrapper>
      <Header>
        <Link to="/" style={{ textDecoration: 'none' }}>
          <Logo><span>ai<span className="accent">os</span></span></Logo>
        </Link>
        <div style={{ display: 'flex', gap: '1rem' }}>
          {isAuthenticated ? (
            <Button variant="primary" onClick={() => navigate('/app')}>Go to App</Button>
          ) : (
            <Button variant="outline" onClick={() => navigate('/login')}>Sign in</Button>
          )}
        </div>
      </Header>

      <Content>
        <TitleSection>
          <h1>Simple, transparent pricing</h1>
          <p>Invest in the operating system for your life.</p>
        </TitleSection>

        <PricingGrid>
          <PricingCard initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <PlanName>Starter</PlanName>
            <PlanPrice>$0<span>/mo</span></PlanPrice>
            <PlanDesc>Perfect for getting started with life management.</PlanDesc>
            <FeatureList>
              <li><Check size={16} /> Basic Finance Tracking</li>
              <li><Check size={16} /> Health Logs</li>
              <li><Check size={16} /> Up to 50 items/month</li>
              <li><Check size={16} /> 1 Connected Bank Account</li>
            </FeatureList>
            <Button variant="outline" size="lg" style={{ marginTop: 'auto' }} onClick={() => navigate('/login')}>
              Get Started for Free
            </Button>
          </PricingCard>

          <PricingCard $highlight initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
            <PlanName>Pro</PlanName>
            <PlanPrice>$12<span>/mo</span></PlanPrice>
            <PlanDesc>Everything you need to master your wealth, health, and business.</PlanDesc>
            <FeatureList>
              <li><Check size={16} /> Unlimited Finance Tracking</li>
              <li><Check size={16} /> Advanced AI Agent Access</li>
              <li><Check size={16} /> Unlimited Bank Connections</li>
              <li><Check size={16} /> Business & Career Modules</li>
              <li><Check size={16} /> Custom AI Prompts</li>
            </FeatureList>
            <Button variant="primary" size="lg" style={{ marginTop: 'auto' }} onClick={() => navigate('/login')}>
              Start 14-Day Free Trial
            </Button>
          </PricingCard>
        </PricingGrid>
      </Content>
    </PageWrapper>
  )
}
