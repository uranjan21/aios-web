import { Fragment } from 'react'
import { motion } from 'framer-motion'
import { useTheme } from 'styled-components'
import { Link, useNavigate } from 'react-router-dom'
import { Button } from '@ledgr/ui'
import {
  Zap, ChevronRight, Bot, Check, Star, ArrowRight, Globe, Lock, Layers,
} from 'lucide-react'
import { useAuthStore } from '@ct/shared/stores/authStore'
import { DOMAINS, AI_FEATURES, COMPARE_ROWS, STATS, fade } from './landing/landing.data'
import {
  PageWrapper, Header, Logo, HeaderNav,
  HeroSection, HeroEyebrow, HeroTitle, HeroSubtitle, CTARow, TrustBar, TrustItem,
  StatsStrip, StatItem, StatNum, StatLabel,
  SectionWrap, SectionLabel, SectionTitle, SectionSubtitle,
  DomainGrid, DomainCard, DomainIcon, DomainName, DomainDesc, DomainFeatures, DomainFeat,
  AiSection, AiTitle, AiSubtitle, AiGrid, AiCard, AiCardTitle, AiCardDesc,
  CompareSection, CompareTable, CompareHeader, CompareRow,
  PricingWrap, PriceCards, PriceCard, PriceBadge, PriceName, PriceAmount, PricePer, PriceFeats, PriceFeat,
  FinalCTA, FinalTitle, FinalSub, Footer,
} from './landing/landing.styles'

export function LandingPage() {
  const navigate = useNavigate()
  const isAuthenticated = useAuthStore(s => s.isAuthenticated)
  const theme = useTheme()

  return (
    <PageWrapper>
      {/* ── Header ── */}
      <Header>
        <Logo to="/">control <span className="accent">tower</span></Logo>
        <HeaderNav>
          <Link className="secondary" to="/support">Support</Link>
          <Link className="secondary" to="/support">Support</Link>
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
          <Zap size={13} /> Your money, health & career — one AI workspace
        </HeroEyebrow>
        <HeroTitle initial="hidden" animate="show" variants={fade} transition={{ duration: 0.55, delay: 0.1 }}>
          Your spending, tracked<br /><span className="gold">the moment it happens.</span>
        </HeroTitle>
        <HeroSubtitle initial="hidden" animate="show" variants={fade} transition={{ duration: 0.55, delay: 0.2 }}>
          Connect Gmail and Control Tower turns your UPI and bank alerts into a reviewed ledger automatically — then adds health, career and AI agents that actually know your data. No manual entry, no Plaid.
        </HeroSubtitle>
        <CTARow initial="hidden" animate="show" variants={fade} transition={{ duration: 0.55, delay: 0.3 }}>
          <Button variant="primary" size="lg" onClick={() => navigate('/signup')}>
            <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              Start for free <ChevronRight size={16} />
            </span>
          </Button>
          <Button variant="outline" size="lg" onClick={() => navigate('/signup')}>
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
        {STATS.map(s => (
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
          Stop juggling separate apps. Control Tower gives you a unified workspace with deep, purpose-built tools for every major life domain.
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
          <SectionLabel style={{ color: `${theme.color.primaryForeground}80`, textAlign: 'center' }}>AI-first</SectionLabel>
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

      {/* ── Free + BYOK ── */}
      <PricingWrap>
        <SectionLabel>Pricing</SectionLabel>
        <SectionTitle>Free. All of it.</SectionTitle>
        <PriceCards>
          <PriceCard $featured>
            <PriceBadge>No catch</PriceBadge>
            <PriceName style={{ color: `${theme.color.primaryForeground}B3` }}>Everything</PriceName>
            <PriceAmount>$0</PriceAmount>
            <PricePer>forever · no card, no trial, no tiers</PricePer>
            <PriceFeats>
              {[
                'Every area — Finance, Health, Career',
                'AI chat, agents and integrations included',
                'Self-host it or run it as-is',
                'Your data stays yours — export or delete anytime',
              ].map(f => (
                <PriceFeat key={f}><Check size={13} style={{ color: 'var(--accent)' }} />{f}</PriceFeat>
              ))}
            </PriceFeats>
            <Button variant="secondary" fullWidth onClick={() => navigate('/signup')}>
              <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>Create your account <ArrowRight size={14} /></span>
            </Button>
          </PriceCard>
          <PriceCard>
            <PriceName>You bring the AI key</PriceName>
            <PriceAmount>Your usage</PriceAmount>
            <PricePer>billed by OpenAI or Anthropic, direct to you</PricePer>
            <PriceFeats>
              {[
                'Paste your own API key in Settings',
                'Encrypted at rest — we never see your usage',
                'No credits, no caps, no metering',
                'Everything except AI works without a key',
              ].map(f => (
                <PriceFeat key={f}><Check size={13} style={{ color: 'var(--accent)' }} />{f}</PriceFeat>
              ))}
            </PriceFeats>
            <Button variant="outline" fullWidth onClick={() => navigate('/signup')}>Get started</Button>
          </PriceCard>
        </PriceCards>
        <div style={{ marginTop: '1.5rem', fontSize: 13, color: 'var(--muted-foreground)' }}>
          There is no paid plan. The app costs nothing to use — AI features run on
          a provider key you supply, so your usage is billed to you at cost.
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
        <div>© {new Date().getFullYear()} Control Tower · Built for humans, powered by AI.</div>
        <div className="links">
          <Link to="/privacy-policy">Privacy</Link>
          <Link to="/terms-of-service">Terms</Link>
          <Link to="/support">Support</Link>
        </div>
      </Footer>
    </PageWrapper>
  )
}
