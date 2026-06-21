import styled from 'styled-components'
import { motion } from 'framer-motion'
import { Link, useNavigate } from 'react-router-dom'
import { Button } from '@ledgr/ui'
import { Rocket, Shield, Activity, TrendingUp, Zap, ChevronRight } from 'lucide-react'
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
  background-color: rgba(250, 250, 249, 0.8);
  backdrop-filter: blur(12px);
  position: sticky;
  top: 0;
  z-index: 50;

  @media (prefers-color-scheme: dark) {
    background-color: rgba(12, 10, 9, 0.8);
  }
`

const Logo = styled.div`
  font-family: ${({ theme }) => theme.typography.fontFamily.serif};
  font-size: 1.5rem;
  font-weight: 700;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  color: ${({ theme }) => theme.color.foreground};

  .accent {
    color: ${({ theme }) => theme.color.accent};
  }
`

const HeaderNav = styled.div`
  display: flex;
  gap: 1.5rem;
  align-items: center;

  a {
    font-size: 14px;
    font-weight: 500;
    color: ${({ theme }) => theme.color.mutedForeground};
    text-decoration: none;
    transition: color 0.2s;

    &:hover {
      color: ${({ theme }) => theme.color.foreground};
    }
  }
`

const HeroSection = styled.section`
  padding: 6rem 2rem;
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  position: relative;
  overflow: hidden;

  &::before {
    content: '';
    position: absolute;
    top: -20%;
    left: 50%;
    transform: translateX(-50%);
    width: 600px;
    height: 600px;
    background: radial-gradient(circle, ${({ theme }) => theme.color.accent}15, transparent 70%);
    pointer-events: none;
    z-index: 0;
  }
`

const HeroContent = styled(motion.div)`
  max-width: 800px;
  z-index: 1;
`

const HeroEyebrow = styled.div`
  font-size: 12px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  color: ${({ theme }) => theme.color.accent};
  margin-bottom: 1.5rem;
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.25rem 0.75rem;
  border-radius: 9999px;
  background-color: ${({ theme }) => theme.color.accent}15;
`

const HeroTitle = styled.h1`
  font-family: ${({ theme }) => theme.typography.fontFamily.serif};
  font-size: 4rem;
  font-weight: 700;
  line-height: 1.1;
  margin-bottom: 1.5rem;
  color: ${({ theme }) => theme.color.foreground};

  @media (max-width: 768px) {
    font-size: 2.5rem;
  }
`

const HeroSubtitle = styled.p`
  font-size: 1.25rem;
  line-height: 1.6;
  color: ${({ theme }) => theme.color.mutedForeground};
  margin-bottom: 2.5rem;
  max-width: 600px;
  margin-inline: auto;
`

const ButtonGroup = styled.div`
  display: flex;
  gap: 1rem;
  justify-content: center;
`

const FeatureGrid = styled.section`
  padding: 4rem 2rem;
  max-width: 1200px;
  margin: 0 auto;
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 2rem;
`

const FeatureCard = styled(motion.div)`
  background-color: ${({ theme }) => theme.color.card};
  border: 1px solid ${({ theme }) => theme.color.border};
  border-radius: 16px;
  padding: 2rem;
  display: flex;
  flex-direction: column;
  gap: 1rem;
  box-shadow: ${({ theme }) => theme.shadow.sm};
  transition: transform 0.2s, box-shadow 0.2s;

  &:hover {
    transform: translateY(-4px);
    box-shadow: ${({ theme }) => theme.shadow.md};
  }
`

const FeatureIcon = styled.div`
  width: 48px;
  height: 48px;
  border-radius: 12px;
  background-color: ${({ theme }) => theme.color.accent}15;
  color: ${({ theme }) => theme.color.accent};
  display: flex;
  align-items: center;
  justify-content: center;
`

const FeatureTitle = styled.h3`
  font-size: 1.25rem;
  font-weight: 600;
  margin: 0;
`

const FeatureDesc = styled.p`
  font-size: 0.9375rem;
  line-height: 1.6;
  color: ${({ theme }) => theme.color.mutedForeground};
  margin: 0;
`

const Footer = styled.footer`
  margin-top: auto;
  padding: 2rem;
  border-top: 1px solid ${({ theme }) => theme.color.border};
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 14px;
  color: ${({ theme }) => theme.color.mutedForeground};

  .links {
    display: flex;
    gap: 1.5rem;
  }

  a {
    color: inherit;
    text-decoration: none;
    &:hover { color: ${({ theme }) => theme.color.foreground}; }
  }
`

export function LandingPage() {
  const navigate = useNavigate()
  const isAuthenticated = useAuthStore(s => s.isAuthenticated)

  return (
    <PageWrapper>
      <Header>
        <Logo>
          <span>ai<span className="accent">os</span></span>
        </Logo>
        <HeaderNav>
          <Link to="/pricing">Pricing</Link>
          {isAuthenticated ? (
            <Button variant="primary" onClick={() => navigate('/app')}>Go to App</Button>
          ) : (
            <>
              <Link to="/login">Sign in</Link>
              <Button variant="primary" onClick={() => navigate('/login')}>Get Started</Button>
            </>
          )}
        </HeaderNav>
      </Header>

      <HeroSection>
        <HeroContent
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <HeroEyebrow>
            <Zap size={14} /> The operating system for your life
          </HeroEyebrow>
          <HeroTitle>Manage everything. <br/> Without the chaos.</HeroTitle>
          <HeroSubtitle>
            Finance, health, career, and business — orchestrated by AI agents in one premium, unified workspace. 
          </HeroSubtitle>
          <ButtonGroup>
            <Button variant="primary" size="lg" onClick={() => navigate('/login')}>
              <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                Start your journey <ChevronRight size={16} />
              </span>
            </Button>
            <Button variant="outline" size="lg" onClick={() => navigate('/pricing')}>
              View Pricing
            </Button>
          </ButtonGroup>
        </HeroContent>
      </HeroSection>

      <FeatureGrid>
        <FeatureCard initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          <FeatureIcon><TrendingUp size={24} /></FeatureIcon>
          <FeatureTitle>Wealth Mastery</FeatureTitle>
          <FeatureDesc>Track every penny. Auto-categorize transactions, manage split bills, and project your cash flow with institutional-grade analytics.</FeatureDesc>
        </FeatureCard>
        
        <FeatureCard initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
          <FeatureIcon><Activity size={24} /></FeatureIcon>
          <FeatureTitle>Health & Longevity</FeatureTitle>
          <FeatureDesc>Log workouts, track macronutrients, and monitor your vital streaks. Stay accountable to your fitness goals.</FeatureDesc>
        </FeatureCard>

        <FeatureCard initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
          <FeatureIcon><Shield size={24} /></FeatureIcon>
          <FeatureTitle>Total Privacy</FeatureTitle>
          <FeatureDesc>Multi-tenant architecture ensuring your data is completely isolated. Built with bank-grade security standards.</FeatureDesc>
        </FeatureCard>
      </FeatureGrid>

      <Footer>
        <div>© {new Date().getFullYear()} AIOS Web. All rights reserved.</div>
        <div className="links">
          <Link to="/privacy-policy">Privacy</Link>
          <Link to="/terms-of-service">Terms</Link>
          <Link to="/support">Support</Link>
        </div>
      </Footer>
    </PageWrapper>
  )
}
