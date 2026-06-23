import { Fragment } from 'react'
import styled, { keyframes } from 'styled-components'
import { motion } from 'framer-motion'
import { Link, useNavigate } from 'react-router-dom'
import { Button } from '@ledgr/ui'
import {
  Zap, ChevronRight, TrendingUp, Activity, Briefcase, Building2, PenTool,
  Bot, Shield, BarChart3, Check, Star, ArrowRight, Globe, Lock, Layers,
} from 'lucide-react'
import { useAuthStore } from '@/stores/authStore'
import { usePricingCurrency } from '@/hooks/usePricingCurrency'
import { MODULE_PRICE, BUNDLE_PRICE, TOTAL_MODULES, FREE_BASE_BLURB } from '@/lib/pricing'

// ── Animations ───────────────────────────────────────────────────────────────

const shimmer = keyframes`
  0% { background-position: -200% 0; }
  100% { background-position: 200% 0; }
`

const float = keyframes`
  0%, 100% { transform: translateY(0px); }
  50% { transform: translateY(-8px); }
`

// ── Layout ───────────────────────────────────────────────────────────────────

const PageWrapper = styled.div`
  min-height: 100vh;
  background-color: ${({ theme }) => theme.color.background};
  color: ${({ theme }) => theme.color.foreground};
  display: flex;
  flex-direction: column;
  font-family: ${({ theme }) => theme.typography.fontFamily.sans};
`

// ── Header ───────────────────────────────────────────────────────────────────

const Header = styled.header`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 1.25rem 2rem;
  border-bottom: 1px solid ${({ theme }) => theme.color.border};
  background: color-mix(in srgb, ${({ theme }) => theme.color.background} 85%, transparent);
  backdrop-filter: blur(12px);
  position: sticky;
  top: 0;
  z-index: 50;
`

const Logo = styled(Link)`
  font-family: ${({ theme }) => theme.typography.fontFamily.serif};
  font-size: 1.5rem;
  font-weight: 700;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  color: ${({ theme }) => theme.color.foreground};
  text-decoration: none;
  .accent { color: ${({ theme }) => theme.color.accent}; }
`

const HeaderNav = styled.nav`
  display: flex;
  gap: 1.5rem;
  align-items: center;
  a {
    font-size: 14px;
    font-weight: 500;
    color: ${({ theme }) => theme.color.mutedForeground};
    text-decoration: none;
    transition: color 0.2s;
    &:hover { color: ${({ theme }) => theme.color.foreground}; }
  }
`

// ── Hero ─────────────────────────────────────────────────────────────────────

const HeroSection = styled.section`
  padding: 7rem 2rem 5rem;
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  position: relative;
  overflow: hidden;
  &::before {
    content: '';
    position: absolute;
    top: -10%;
    left: 50%;
    transform: translateX(-50%);
    width: 700px;
    height: 700px;
    background: radial-gradient(circle, ${({ theme }) => theme.color.accent}18, transparent 65%);
    pointer-events: none;
  }
`

const HeroEyebrow = styled(motion.div)`
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 12px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  color: ${({ theme }) => theme.color.accent};
  padding: 0.35rem 1rem;
  border-radius: 9999px;
  border: 1px solid ${({ theme }) => theme.color.accent}40;
  background: ${({ theme }) => theme.color.accent}0d;
  margin-bottom: 2rem;
`

const HeroTitle = styled(motion.h1)`
  font-family: ${({ theme }) => theme.typography.fontFamily.serif};
  font-size: clamp(2.5rem, 6vw, 4.5rem);
  font-weight: 700;
  line-height: 1.1;
  margin-bottom: 1.5rem;
  max-width: 840px;
  span.gold {
    background: linear-gradient(135deg, ${({ theme }) => theme.color.accent}, #f59e0b, ${({ theme }) => theme.color.accent});
    background-size: 200% auto;
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
    animation: ${shimmer} 3s linear infinite;
  }
`

const HeroSubtitle = styled(motion.p)`
  font-size: 1.2rem;
  line-height: 1.65;
  color: ${({ theme }) => theme.color.mutedForeground};
  margin-bottom: 2.5rem;
  max-width: 580px;
`

const CTARow = styled(motion.div)`
  display: flex;
  gap: 1rem;
  justify-content: center;
  flex-wrap: wrap;
`

const TrustBar = styled(motion.div)`
  display: flex;
  align-items: center;
  gap: 1.5rem;
  margin-top: 2.5rem;
  flex-wrap: wrap;
  justify-content: center;
  font-size: 12px;
  color: ${({ theme }) => theme.color.mutedForeground};
`

const TrustItem = styled.div`
  display: flex;
  align-items: center;
  gap: 5px;
  font-weight: 500;
  svg { color: ${({ theme }) => theme.color.accent}; }
`

// ── Stats strip ───────────────────────────────────────────────────────────────

const StatsStrip = styled.section`
  border-top: 1px solid ${({ theme }) => theme.color.border};
  border-bottom: 1px solid ${({ theme }) => theme.color.border};
  padding: 2rem;
  display: flex;
  justify-content: center;
  gap: 0;
`

const StatItem = styled.div`
  flex: 1;
  max-width: 200px;
  text-align: center;
  padding: 0 2rem;
  border-right: 1px solid ${({ theme }) => theme.color.border};
  &:last-child { border-right: none; }
  @media (max-width: 640px) { min-width: 120px; padding: 0 1rem; }
`

const StatNum = styled.div`
  font-family: ${({ theme }) => theme.typography.fontFamily.serif};
  font-size: 2rem;
  font-weight: 700;
  color: ${({ theme }) => theme.color.foreground};
`

const StatLabel = styled.div`
  font-size: 12px;
  color: ${({ theme }) => theme.color.mutedForeground};
  margin-top: 2px;
`

// ── Domains ───────────────────────────────────────────────────────────────────

const SectionWrap = styled.section`
  max-width: 1200px;
  margin: 0 auto;
  padding: 5rem 2rem;
  width: 100%;
`

const SectionLabel = styled.div`
  font-size: 12px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  color: ${({ theme }) => theme.color.accent};
  margin-bottom: 0.75rem;
`

const SectionTitle = styled.h2`
  font-family: ${({ theme }) => theme.typography.fontFamily.serif};
  font-size: clamp(1.75rem, 4vw, 2.75rem);
  font-weight: 700;
  margin-bottom: 1rem;
  line-height: 1.2;
`

const SectionSubtitle = styled.p`
  font-size: 1.05rem;
  color: ${({ theme }) => theme.color.mutedForeground};
  max-width: 560px;
  line-height: 1.6;
  margin-bottom: 3rem;
`

const DomainGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
  gap: 1.25rem;
`

const DomainCard = styled(motion.div)`
  background: ${({ theme }) => theme.color.card};
  border: 1px solid ${({ theme }) => theme.color.border};
  border-radius: 16px;
  padding: 1.75rem;
  display: flex;
  flex-direction: column;
  gap: 0.875rem;
  transition: border-color 0.2s, box-shadow 0.2s;
  &:hover {
    border-color: ${({ theme }) => theme.color.accent}60;
    box-shadow: 0 0 0 3px ${({ theme }) => theme.color.accent}0d;
  }
`

const DomainIcon = styled.div`
  width: 44px;
  height: 44px;
  border-radius: 10px;
  background: ${({ theme }) => theme.color.accent}12;
  color: ${({ theme }) => theme.color.accent};
  display: flex;
  align-items: center;
  justify-content: center;
  animation: ${float} 4s ease-in-out infinite;
`

const DomainName = styled.div`
  font-size: 15px;
  font-weight: 600;
  color: ${({ theme }) => theme.color.foreground};
`

const DomainDesc = styled.div`
  font-size: 13px;
  color: ${({ theme }) => theme.color.mutedForeground};
  line-height: 1.55;
`

const DomainFeatures = styled.ul`
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 5px;
`

const DomainFeat = styled.li`
  font-size: 12px;
  color: ${({ theme }) => theme.color.mutedForeground};
  display: flex;
  align-items: center;
  gap: 6px;
  svg { color: ${({ theme }) => theme.color.accent}; flex-shrink: 0; }
`

// ── AI Section ────────────────────────────────────────────────────────────────

const AiSection = styled.section`
  background: ${({ theme }) => theme.color.primary};
  padding: 5rem 2rem;
  text-align: center;
  position: relative;
  overflow: hidden;
  &::before {
    content: '';
    position: absolute;
    bottom: -30%;
    right: -10%;
    width: 500px;
    height: 500px;
    background: radial-gradient(circle, ${({ theme }) => theme.color.accent}20, transparent 70%);
    pointer-events: none;
  }
`

const AiTitle = styled.h2`
  font-family: ${({ theme }) => theme.typography.fontFamily.serif};
  font-size: clamp(1.75rem, 4vw, 2.75rem);
  font-weight: 700;
  color: #fff;
  margin-bottom: 1rem;
  max-width: 700px;
  margin-inline: auto;
`

const AiSubtitle = styled.p`
  font-size: 1.05rem;
  color: rgba(255,255,255,0.65);
  max-width: 520px;
  margin: 0 auto 2.5rem;
  line-height: 1.65;
`

const AiGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
  gap: 1rem;
  max-width: 1100px;
  margin: 0 auto;
`

const AiCard = styled.div`
  background: rgba(255,255,255,0.06);
  border: 1px solid rgba(255,255,255,0.1);
  border-radius: 14px;
  padding: 1.5rem;
  text-align: left;
`

const AiCardTitle = styled.div`
  font-size: 14px;
  font-weight: 600;
  color: #fff;
  margin-bottom: 6px;
  display: flex;
  align-items: center;
  gap: 8px;
  svg { color: ${({ theme }) => theme.color.accent}; }
`

const AiCardDesc = styled.div`
  font-size: 13px;
  color: rgba(255,255,255,0.55);
  line-height: 1.55;
`

// ── Comparison table ──────────────────────────────────────────────────────────

const CompareSection = styled(SectionWrap)`
  text-align: center;
`

const CompareTable = styled.div`
  display: grid;
  grid-template-columns: 2fr 1fr 1fr;
  border: 1px solid ${({ theme }) => theme.color.border};
  border-radius: 16px;
  overflow: hidden;
  text-align: left;
  margin-top: 2rem;
  @media (max-width: 640px) { grid-template-columns: 1fr; }
`

const CompareHeader = styled.div<{ $highlight?: boolean }>`
  padding: 1.5rem;
  background: ${({ theme, $highlight }) => $highlight ? theme.color.primary : theme.color.card};
  color: ${({ $highlight }) => $highlight ? '#fff' : 'inherit'};
  border-bottom: 1px solid ${({ theme }) => theme.color.border};
  font-weight: 700;
  font-size: 15px;
`

const CompareRow = styled.div<{ $highlight?: boolean }>`
  padding: 0.875rem 1.5rem;
  background: ${({ theme, $highlight }) => $highlight ? `${theme.color.primary}08` : 'transparent'};
  border-bottom: 1px solid ${({ theme }) => theme.color.border}60;
  font-size: 13px;
  display: flex;
  align-items: center;
  gap: 8px;
  &:last-child { border-bottom: none; }
  .yes { color: ${({ theme }) => theme.color.accent}; }
  .no { color: ${({ theme }) => theme.color.mutedForeground}; }
`

// ── Pricing preview ───────────────────────────────────────────────────────────

const PricingWrap = styled.section`
  background: ${({ theme }) => theme.color.muted};
  padding: 5rem 2rem;
  text-align: center;
`

const PriceCards = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
  gap: 1.5rem;
  max-width: 1100px;
  margin: 2rem auto 0;
`

const PriceCard = styled.div<{ $featured?: boolean }>`
  background: ${({ theme, $featured }) => $featured ? theme.color.primary : theme.color.card};
  color: ${({ $featured }) => $featured ? '#fff' : 'inherit'};
  border: 1px solid ${({ theme, $featured }) => $featured ? 'transparent' : theme.color.border};
  border-radius: 16px;
  padding: 2rem;
  text-align: left;
  position: relative;
`

const PriceBadge = styled.div`
  position: absolute;
  top: -12px;
  left: 50%;
  transform: translateX(-50%);
  background: ${({ theme }) => theme.color.accent};
  color: #fff;
  font-size: 11px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  padding: 3px 12px;
  border-radius: 9999px;
`

const PriceName = styled.div`
  font-size: 14px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  margin-bottom: 0.5rem;
  opacity: 0.8;
`

const PriceAmount = styled.div`
  font-family: ${({ theme }) => theme.typography.fontFamily.serif};
  font-size: 2.5rem;
  font-weight: 700;
  line-height: 1;
  margin-bottom: 0.25rem;
`

const PricePer = styled.div`
  font-size: 12px;
  opacity: 0.6;
  margin-bottom: 1.5rem;
`

const PriceFeats = styled.ul`
  list-style: none;
  padding: 0;
  margin: 0 0 1.5rem;
  display: flex;
  flex-direction: column;
  gap: 8px;
`

const PriceFeat = styled.li`
  font-size: 13px;
  display: flex;
  align-items: flex-start;
  gap: 8px;
  line-height: 1.4;
  opacity: 0.9;
  svg { flex-shrink: 0; margin-top: 2px; }
`

const PriceUsdNote = styled.div`
  font-size: 11px;
  opacity: 0.6;
  margin-bottom: 1.5rem;
`

// ── Final CTA ─────────────────────────────────────────────────────────────────

const FinalCTA = styled.section`
  padding: 6rem 2rem;
  text-align: center;
  background: ${({ theme }) => theme.color.background};
`

const FinalTitle = styled.h2`
  font-family: ${({ theme }) => theme.typography.fontFamily.serif};
  font-size: clamp(2rem, 5vw, 3.5rem);
  font-weight: 700;
  margin-bottom: 1rem;
`

const FinalSub = styled.p`
  font-size: 1.1rem;
  color: ${({ theme }) => theme.color.mutedForeground};
  margin-bottom: 2rem;
`

// ── Footer ────────────────────────────────────────────────────────────────────

const Footer = styled.footer`
  padding: 2rem;
  border-top: 1px solid ${({ theme }) => theme.color.border};
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 13px;
  color: ${({ theme }) => theme.color.mutedForeground};
  flex-wrap: wrap;
  gap: 1rem;
  .links { display: flex; gap: 1.5rem; }
  a { color: inherit; text-decoration: none; &:hover { color: ${({ theme }) => theme.color.foreground}; } }
`

// ── Data ──────────────────────────────────────────────────────────────────────

const DOMAINS = [
  {
    icon: <TrendingUp size={22} />,
    name: 'Finance',
    desc: 'Your complete money command center.',
    feats: ['Transactions & split bills', 'Budgets & spending alerts', 'Investment portfolio', 'Loan EMI tracker', 'Goals & savings plans'],
  },
  {
    icon: <Activity size={22} />,
    name: 'Health',
    desc: 'Everything wellness in one timeline.',
    feats: ['Workout & gym logging', 'Weight & body metrics', 'Nutrition & calorie tracking', 'Sleep & water habits', 'Streak analytics'],
  },
  {
    icon: <Briefcase size={22} />,
    name: 'Career',
    desc: 'Own your professional trajectory.',
    feats: ['Job application tracker', 'AI skill-gap analysis', 'Career roadmap planner', 'Interview prep notes', 'Salary progression'],
  },
  {
    icon: <Building2 size={22} />,
    name: 'Business',
    desc: 'Run your side hustle or startup.',
    feats: ['Clients & contacts CRM', 'Revenue & expense view', 'Project milestones', 'Business journal', 'Event calendar'],
  },
  {
    icon: <PenTool size={22} />,
    name: 'Content',
    desc: 'Manage your creator pipeline.',
    feats: ['Kanban idea board', 'AI draft generation', 'Published archive', 'Twitter / X queue', 'Content calendar'],
  },
]

const AI_FEATURES = [
  { title: 'Daily AI Brief', desc: 'Wake up to a personalised summary of your finances, health stats, and upcoming priorities.' },
  { title: 'Spending Anomaly Detection', desc: 'AI flags unusual transactions or overspend before they become a problem.' },
  { title: 'Skill Gap Analysis', desc: 'Upload your CV; get a precise breakdown of skills to learn next for your target role.' },
  { title: 'Smart Chat Assistant', desc: 'Ask anything about your data — "how much did I spend on food last month?" — and get a real answer.' },
  { title: 'Autonomous Agents', desc: 'Schedule AI tasks that run in the background: weekly digests, budget reviews, health check-ins.' },
  { title: 'AI Content Drafts', desc: 'Turn bullet points into polished LinkedIn posts, tweets, or blog articles in seconds.' },
]

const COMPARE_ROWS = [
  { label: 'Dashboard + 1 area of your choice', free: true, paid: true },
  { label: 'All 5 life areas (Finance, Health, Career, Business, Content)', free: false, paid: true },
  { label: 'Unlimited entries & bank connections', free: false, paid: true },
  { label: 'AI Chat Assistant', free: false, paid: true },
  { label: 'Autonomous Agents', free: false, paid: true },
  { label: 'Integrations (Google, banks & syncs)', free: false, paid: true },
  { label: 'Pay only for the modules you enable', free: false, paid: true },
  { label: 'Switch modules anytime — prorated', free: false, paid: true },
]

// ── Page ──────────────────────────────────────────────────────────────────────

const fade = { hidden: { opacity: 0, y: 20 }, show: { opacity: 1, y: 0 } }

export function LandingPage() {
  const navigate = useNavigate()
  const isAuthenticated = useAuthStore(s => s.isAuthenticated)
  const { currency, loading, format } = usePricingCurrency()
  const isUSD = currency.code === 'USD'

  return (
    <PageWrapper>
      {/* ── Header ── */}
      <Header>
        <Logo to="/">ai<span className="accent">os</span></Logo>
        <HeaderNav>
          <Link to="/pricing">Pricing</Link>
          <Link to="/app/guide">Guide</Link>
          {isAuthenticated ? (
            <Button variant="primary" onClick={() => navigate('/app')}>Go to App</Button>
          ) : (
            <>
              <Link to="/login">Sign in</Link>
              <Button variant="primary" onClick={() => navigate('/signup')}>Start Free</Button>
            </>
          )}
        </HeaderNav>
      </Header>

      {/* ── Hero ── */}
      <HeroSection>
        <HeroEyebrow initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
          <Zap size={13} /> Your AI-powered life OS
        </HeroEyebrow>
        <HeroTitle initial="hidden" animate="show" variants={fade} transition={{ duration: 0.55, delay: 0.1 }}>
          Every area of your life,<br /><span className="gold">mastered by AI.</span>
        </HeroTitle>
        <HeroSubtitle initial="hidden" animate="show" variants={fade} transition={{ duration: 0.55, delay: 0.2 }}>
          Finance, health, career, business, and content — all in one premium workspace, orchestrated by intelligent agents that actually know your data.
        </HeroSubtitle>
        <CTARow initial="hidden" animate="show" variants={fade} transition={{ duration: 0.55, delay: 0.3 }}>
          <Button variant="primary" size="lg" onClick={() => navigate('/signup')}>
            <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              Start for free <ChevronRight size={16} />
            </span>
          </Button>
          <Button variant="outline" size="lg" onClick={() => navigate('/pricing')}>
            View plans
          </Button>
        </CTARow>
        <TrustBar initial="hidden" animate="show" variants={fade} transition={{ duration: 0.55, delay: 0.45 }}>
          <TrustItem><Check size={13} /> Free forever plan</TrustItem>
          <TrustItem><Lock size={13} /> End-to-end isolated data</TrustItem>
          <TrustItem><Globe size={13} /> Self-hostable</TrustItem>
          <TrustItem><Star size={13} /> No credit card required</TrustItem>
        </TrustBar>
      </HeroSection>

      {/* ── Stats strip ── */}
      <StatsStrip>
        {[
          { num: '5', label: 'Life domains' },
          { num: '36+', label: 'Data tables tracked' },
          { num: '6', label: 'AI agent types' },
          { num: '100%', label: 'Data isolation' },
        ].map(s => (
          <StatItem key={s.label}>
            <StatNum>{s.num}</StatNum>
            <StatLabel>{s.label}</StatLabel>
          </StatItem>
        ))}
      </StatsStrip>

      {/* ── Domains ── */}
      <SectionWrap>
        <SectionLabel>Domains</SectionLabel>
        <SectionTitle>Everything in one place. Finally.</SectionTitle>
        <SectionSubtitle>
          Stop juggling five apps. AIOS gives you a unified workspace with deep, purpose-built tools for every major life domain.
        </SectionSubtitle>
        <DomainGrid>
          {DOMAINS.map((d, i) => (
            <DomainCard
              key={d.name}
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.08, duration: 0.45 }}
            >
              <DomainIcon style={{ animationDelay: `${i * 0.4}s` }}>{d.icon}</DomainIcon>
              <DomainName>{d.name}</DomainName>
              <DomainDesc>{d.desc}</DomainDesc>
              <DomainFeatures>
                {d.feats.map(f => (
                  <DomainFeat key={f}><Check size={11} /> {f}</DomainFeat>
                ))}
              </DomainFeatures>
            </DomainCard>
          ))}
        </DomainGrid>
      </SectionWrap>

      {/* ── AI Section ── */}
      <AiSection>
        <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.5 }}>
          <SectionLabel style={{ color: 'rgba(255,255,255,0.5)', textAlign: 'center' }}>AI-first</SectionLabel>
          <AiTitle>Not just a dashboard. An AI co-pilot for your life.</AiTitle>
          <AiSubtitle>
            Agents that analyse your real data, run on a schedule, and surface insights you'd never find on your own.
          </AiSubtitle>
        </motion.div>
        <AiGrid>
          {AI_FEATURES.map((f, i) => (
            <motion.div key={f.title} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.07, duration: 0.4 }}>
              <AiCard>
                <AiCardTitle><Bot size={15} /> {f.title}</AiCardTitle>
                <AiCardDesc>{f.desc}</AiCardDesc>
              </AiCard>
            </motion.div>
          ))}
        </AiGrid>
      </AiSection>

      {/* ── Feature comparison ── */}
      <CompareSection>
        <SectionLabel>Plans</SectionLabel>
        <SectionTitle>Free is genuinely useful. Everything is life-changing.</SectionTitle>
        <SectionSubtitle style={{ margin: '0 auto 0' }}>
          Start free with one area, then add only the modules you want.
        </SectionSubtitle>
        <CompareTable>
          <CompareHeader>Feature</CompareHeader>
          <CompareHeader>Free</CompareHeader>
          <CompareHeader $highlight>Everything</CompareHeader>
          {COMPARE_ROWS.map(r => (
            <Fragment key={r.label}>
              <CompareRow><Layers size={13} style={{ opacity: 0.5 }} />{r.label}</CompareRow>
              <CompareRow>{r.free ? <Check size={14} className="yes" /> : <span className="no">—</span>}</CompareRow>
              <CompareRow $highlight>{r.paid ? <Check size={14} className="yes" /> : <span className="no">—</span>}</CompareRow>
            </Fragment>
          ))}
        </CompareTable>
      </CompareSection>

      {/* ── Pricing preview ── */}
      <PricingWrap>
        <SectionLabel>Pricing</SectionLabel>
        <SectionTitle>Pay only for what you use.</SectionTitle>
        <PriceCards>
          <PriceCard>
            <PriceName>Free</PriceName>
            <PriceAmount>{loading ? '$0' : format(0)}</PriceAmount>
            <PricePer>forever · no card required</PricePer>
            <PriceFeats>
              {[FREE_BASE_BLURB, 'Core tracking & logging', 'Upgrade a module anytime'].map(f => (
                <PriceFeat key={f}><Check size={13} style={{ color: 'var(--accent)' }} />{f}</PriceFeat>
              ))}
            </PriceFeats>
            <Button variant="outline" fullWidth onClick={() => navigate('/signup')}>Get started</Button>
          </PriceCard>
          <PriceCard>
            <PriceName style={{ color: 'rgba(255,255,255,0.7)' }}>Per module</PriceName>
            <PriceAmount>{loading ? `$${MODULE_PRICE}` : format(MODULE_PRICE)}</PriceAmount>
            {!isUSD && !loading
              ? <PriceUsdNote>≈ ${MODULE_PRICE} USD · per module / mo</PriceUsdNote>
              : <PricePer>per module · per month</PricePer>}
            <PriceFeats>
              {['Enable any of 8 modules', 'Areas + AI Chat, Agents, Integrations', 'Switch anytime — prorated', 'Metered AI on top of usage'].map(f => (
                <PriceFeat key={f}><Check size={13} style={{ color: 'var(--accent)' }} />{f}</PriceFeat>
              ))}
            </PriceFeats>
            <Button variant="secondary" fullWidth onClick={() => navigate('/pricing')}>
              <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>Build your plan <ArrowRight size={14} /></span>
            </Button>
          </PriceCard>
          <PriceCard $featured>
            <PriceBadge>Best value</PriceBadge>
            <PriceName style={{ color: 'rgba(255,255,255,0.7)' }}>Everything</PriceName>
            <PriceAmount>{loading ? `$${BUNDLE_PRICE}` : format(BUNDLE_PRICE)}</PriceAmount>
            {!isUSD && !loading
              ? <PriceUsdNote>≈ ${BUNDLE_PRICE} USD · per month</PriceUsdNote>
              : <PricePer>per month</PricePer>}
            <PriceFeats>
              {[`All ${TOTAL_MODULES} modules unlocked`, 'Every life area + AI services', 'Cheaper than 6 modules à la carte', 'Free monthly AI usage cap included'].map(f => (
                <PriceFeat key={f}><Check size={13} style={{ color: 'var(--accent)' }} />{f}</PriceFeat>
              ))}
            </PriceFeats>
            <Button variant="secondary" fullWidth onClick={() => navigate('/signup')}>
              <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>Start free trial <ArrowRight size={14} /></span>
            </Button>
          </PriceCard>
        </PriceCards>
        <div style={{ marginTop: '1.5rem', fontSize: 13, color: 'var(--muted-foreground)' }}>
          <Link to="/pricing" style={{ color: 'var(--accent)', textDecoration: 'none', fontWeight: 600 }}>
            Build your plan & see all modules →
          </Link>
        </div>
      </PricingWrap>

      {/* ── Final CTA ── */}
      <FinalCTA>
        <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.5 }}>
          <FinalTitle>Your life, finally under control.</FinalTitle>
          <FinalSub>Join and start tracking what matters — free, no card required.</FinalSub>
          <Button variant="primary" size="lg" onClick={() => navigate('/signup')}>
            <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              Create your free account <ChevronRight size={16} />
            </span>
          </Button>
          <div style={{ marginTop: '1rem', fontSize: 13, color: 'var(--muted-foreground)' }}>
            Already have an account? <Link to="/login" style={{ color: 'var(--accent)', textDecoration: 'none', fontWeight: 600 }}>Sign in</Link>
          </div>
        </motion.div>
      </FinalCTA>

      {/* ── Footer ── */}
      <Footer>
        <div>© {new Date().getFullYear()} AIOS Web · Built for humans, powered by AI.</div>
        <div className="links">
          <Link to="/pricing">Pricing</Link>
          <Link to="/privacy-policy">Privacy</Link>
          <Link to="/terms-of-service">Terms</Link>
          <Link to="/support">Support</Link>
        </div>
      </Footer>
    </PageWrapper>
  )
}
