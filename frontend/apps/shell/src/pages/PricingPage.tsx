import { useState } from 'react'
import styled from 'styled-components'
import { motion } from 'framer-motion'
import { Link, useNavigate } from 'react-router-dom'
import { Button, focusRing } from '@ledgr/ui'
import { Check, Globe, Sparkles, Zap, Info } from 'lucide-react'
import { useAuthStore } from '@ct/shared/stores/authStore'
import { usePricingCurrency } from '@ct/shared/hooks/usePricingCurrency'
import { billingApi } from '@ct/shared/api/billing'
import {
  PRICING_MODULES, BUNDLE_PRICE, TOTAL_MODULES,
  FREE_BASE_BLURB, ALL_MODULE_KEYS, METERED_MODULES,
} from '@ct/shared/lib/pricing'

// ── Styled components ─────────────────────────────────────────────────────────

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
  font-family: ${({ theme }) => theme.typography.fontFamily.display};
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
  max-width: 1080px;
  margin: 0 auto;
  width: 100%;
`

const TitleSection = styled.div`
  text-align: center;
  margin-bottom: 3rem;

  h1 {
    font-family: ${({ theme }) => theme.typography.fontFamily.display};
    font-size: clamp(2.25rem, 5vw, 3.5rem);
    margin-bottom: 1rem;
  }
  p {
    font-size: 1.125rem;
    color: ${({ theme }) => theme.color.mutedForeground};
    max-width: 540px;
    margin: 0 auto;
  }
`

const CurrencyBadge = styled.div`
  display: inline-flex;
  align-items: center;
  gap: ${({ theme }) => `${theme.spacing[1.5]}`};
  font-size: ${({ theme }) => theme.typography.fontSize.sm};
  color: ${({ theme }) => theme.color.mutedForeground};
  background: ${({ theme }) => theme.color.muted};
  border: 1px solid ${({ theme }) => theme.color.border};
  border-radius: ${({ theme }) => theme.radii.sm};
  padding: ${({ theme }) => `${theme.spacing[1]} ${theme.spacing[3]}`};
  margin-top: ${({ theme }) => `${theme.spacing[3]}`};
`

const BetaBadge = styled.div`
  display: inline-flex;
  align-items: center;
  gap: ${({ theme }) => `${theme.spacing[1.5]}`};
  font-size: ${({ theme }) => theme.typography.fontSize.sm};
  font-weight: 500;
  color: ${({ theme }) => theme.color.foreground};
  background: ${({ theme }) => theme.color.accent}1A;
  border: 1px solid ${({ theme }) => theme.color.accent}40;
  border-radius: ${({ theme }) => theme.radii.sm};
  padding: ${({ theme }) => `${theme.spacing[1]} ${theme.spacing[3]}`};
  margin-bottom: ${({ theme }) => `${theme.spacing[3]}`};
`

const FreeBanner = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  flex-wrap: wrap;
  background: ${({ theme }) => theme.color.muted};
  border: 1px solid ${({ theme }) => theme.color.border};
  border-radius: ${({ theme }) => theme.radii.md};
  padding: 1.25rem 1.5rem;
  margin-bottom: 2rem;

  .lead { display: flex; align-items: center; gap: 0.75rem; }
  .lead strong { font-size: 1rem; }
  .lead span { font-size: ${({ theme }) => theme.typography.fontSize.sm}; color: ${({ theme }) => theme.color.mutedForeground}; }
`

const Layout = styled.div`
  display: grid;
  grid-template-columns: 1fr;
  gap: 1.5rem;
  align-items: start;

  @media ${({ theme }) => theme.media.lg} {
    grid-template-columns: 1.6fr 1fr;
  }
`

const Panel = styled.div`
  background: ${({ theme }) => theme.color.card};
  border: 1px solid ${({ theme }) => theme.color.border};
  border-radius: ${({ theme }) => theme.radii.md};
  padding: 1.75rem;
`

const GroupLabel = styled.div`
  font-size: ${({ theme }) => theme.typography.fontSize.sm};
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: ${({ theme }) => theme.color.mutedForeground};
  margin: 1.5rem 0 0.75rem;
  &:first-child { margin-top: 0; }
`

const ModuleGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 0.75rem;
`

const ModuleTile = styled.button<{ $selected: boolean }>`
  text-align: left;
  display: flex;
  gap: 0.75rem;
  padding: 0.875rem 1rem;
  border-radius: ${({ theme }) => theme.radii.md};
  cursor: pointer;
  background: ${({ theme, $selected }) => ($selected ? `${theme.color.accent}14` : theme.color.background)};
  border: 1.5px solid ${({ theme, $selected }) => ($selected ? theme.color.accent : theme.color.border)};
  transition: border-color 0.15s ease, background 0.15s ease;

  &:hover { border-color: ${({ theme }) => theme.color.accent}; }
  ${focusRing}

  .ico {
    width: 34px; height: 34px;
    flex-shrink: 0;
    border-radius: ${({ theme }) => theme.radii.sm};
    display: grid;
    place-items: center;
    background: ${({ theme, $selected }) => ($selected ? theme.color.accent : theme.color.muted)};
    color: ${({ theme, $selected }) => ($selected ? theme.color.accentForeground : theme.color.mutedForeground)};
  }
  .body { min-width: 0; flex: 1; }
  .row { display: flex; align-items: center; gap: ${({ theme }) => `${theme.spacing[1.5]}`}; }
  .name { font-weight: 600; font-size: ${({ theme }) => theme.typography.fontSize.base}; }
  .price { font-size: ${({ theme }) => theme.typography.fontSize.sm}; color: ${({ theme }) => theme.color.mutedForeground}; }
  .desc { font-size: ${({ theme }) => theme.typography.fontSize.sm}; color: ${({ theme }) => theme.color.mutedForeground}; margin-top: ${({ theme }) => `${theme.spacing[0.5]}`}; line-height: 1.35; }
  .meter { font-size: ${({ theme }) => theme.typography.fontSize.xs}; font-weight: 600; color: ${({ theme }) => theme.color.accent}; }
  .tick { color: ${({ theme }) => theme.color.accent}; flex-shrink: 0; opacity: ${({ $selected }) => ($selected ? 1 : 0)}; }
`

const Summary = styled.div`
  background: ${({ theme }) => theme.color.card};
  border: 2px solid ${({ theme }) => theme.color.accent};
  border-radius: ${({ theme }) => theme.radii.md};
  padding: 1.75rem;
  position: sticky;
  top: 1.5rem;
  box-shadow: ${({ theme }) => theme.shadow.lg};
`

const TotalRow = styled.div`
  display: flex;
  align-items: baseline;
  gap: 0.4rem;
  margin-bottom: 0.25rem;
  .amount {
    font-family: ${({ theme }) => theme.typography.fontFamily.display};
    font-size: 3rem;
    font-weight: 700;
    line-height: 1;
  }
  .per { font-size: 1rem; color: ${({ theme }) => theme.color.mutedForeground}; }
`

const UsdNote = styled.div`
  font-size: ${({ theme }) => theme.typography.fontSize.xs};
  color: ${({ theme }) => theme.color.mutedForeground};
  margin-bottom: 1rem;
  opacity: 0.8;
`

const SummaryMeta = styled.div`
  font-size: ${({ theme }) => theme.typography.fontSize.sm};
  color: ${({ theme }) => theme.color.mutedForeground};
  margin-bottom: 1rem;
`

const SaveHint = styled.div`
  display: inline-flex;
  align-items: center;
  gap: ${({ theme }) => `${theme.spacing[1.5]}`};
  font-size: ${({ theme }) => theme.typography.fontSize.sm};
  font-weight: 600;
  color: ${({ theme }) => theme.color.accent};
  background: ${({ theme }) => `${theme.color.accent}14`};
  border-radius: ${({ theme }) => theme.radii.sm};
  padding: ${({ theme }) => `${theme.spacing[1]} ${theme.spacing[2.5]}`};
  margin-bottom: 1rem;
`


const MeteredNote = styled.div`
  display: flex;
  gap: ${({ theme }) => `${theme.spacing[2]}`};
  font-size: ${({ theme }) => theme.typography.fontSize.sm};
  line-height: 1.45;
  color: ${({ theme }) => theme.color.mutedForeground};
  margin-top: 1rem;
  padding-top: 1rem;
  border-top: 1px solid ${({ theme }) => theme.color.border};
  svg { flex-shrink: 0; margin-top: 1px; color: ${({ theme }) => theme.color.accent}; }
`

const FootNote = styled.p`
  text-align: center;
  font-size: ${({ theme }) => theme.typography.fontSize.sm};
  color: ${({ theme }) => theme.color.mutedForeground};
  margin-top: 2.5rem;
`

// ── Page ─────────────────────────────────────────────────────────────────────


export function PricingPage() {
  const navigate = useNavigate()
  const isAuthenticated = useAuthStore(s => s.isAuthenticated)
  const { currency, loading, format } = usePricingCurrency()
  const isUSD = currency.code === 'USD'
  const [submitting, setSubmitting] = useState(false)

  /*
   * Everything grants every module. The per-module entitlement model is
   * untouched underneath — this just stops asking a visitor to assemble their
   * own plan out of six checkboxes whose arithmetic made five of them
   * irrational (see the note in lib/pricing.ts).
   */
  const handleUpgrade = async () => {
    if (!isAuthenticated) { navigate('/signup'); return }
    setSubmitting(true)
    try {
      const { checkout_url } = await billingApi.setModules([...ALL_MODULE_KEYS], true)
      if (checkout_url) { window.location.href = checkout_url; return }
      navigate('/app/settings?billing=success')
    } catch {
      navigate('/app/settings')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <PageWrapper>
      <Header>
        <Link to="/" style={{ textDecoration: 'none' }}>
          <Logo><span>control <span className="accent">tower</span></span></Logo>
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
          <BetaBadge><Sparkles size={13} /> Free during beta — everything below is a preview of pricing</BetaBadge>
          <h1>Two plans. That's the whole menu.</h1>
          <p>Control Tower is in free beta right now — everything is on us while we build. The prices below are the planned model so you can see how it&apos;ll work.</p>
          {!loading && !isUSD && currency.country && (
            <CurrencyBadge>
              <Globe size={13} />
              Showing prices in {currency.code} for {currency.country}
            </CurrencyBadge>
          )}
        </TitleSection>

        <Layout>
          <Panel>
            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
              <GroupLabel>Everything includes</GroupLabel>
              <ModuleGrid>
                {PRICING_MODULES.map(m => {
                  const Icon = m.icon
                  return (
                    /* $selected is fixed true: these are no longer choices, they
                       are the contents of the paid tier. */
                    <ModuleTile key={m.key} as="div" $selected>
                      <span className="ico"><Icon size={18} /></span>
                      <span className="body">
                        <span className="row"><span className="name">{m.label}</span></span>
                        <span className="desc">{m.desc}</span>
                        {m.metered && <span className="meter">+ metered AI</span>}
                      </span>
                      <Check size={16} className="tick" />
                    </ModuleTile>
                  )
                })}
              </ModuleGrid>
            </motion.div>
          </Panel>

          <Summary>
            <SummaryMeta>Free</SummaryMeta>
            <TotalRow>
              <span className="amount">{loading ? '$0' : format(0)}</span>
              <span className="per">/mo</span>
            </TotalRow>
            <FreeBanner>
              <div className="lead">
                <Check size={18} style={{ color: 'var(--accent)' }} />
                <div><span>{FREE_BASE_BLURB} · no card required</span></div>
              </div>
            </FreeBanner>
            <Button variant="outline" size="lg" fullWidth onClick={() => navigate('/signup')}>
              Start free
            </Button>

            <SummaryMeta style={{ marginTop: '2rem' }}>Everything</SummaryMeta>
            <TotalRow>
              <span className="amount">{loading ? `$${BUNDLE_PRICE}` : format(BUNDLE_PRICE)}</span>
              <span className="per">/mo</span>
            </TotalRow>
            {!isUSD && !loading && <UsdNote>≈ ${BUNDLE_PRICE} USD · billed in USD</UsdNote>}
            <SaveHint><Zap size={13} /> All {TOTAL_MODULES} modules, every area, both AI services</SaveHint>

            <Button variant="primary" size="lg" fullWidth onClick={handleUpgrade} loading={submitting} disabled={submitting}>
              {isAuthenticated ? 'Get Everything' : 'Start free · upgrade anytime'}
            </Button>

            <MeteredNote>
              <Info size={14} />
              <span>
                {METERED_MODULES.map(m => m.label).join(' & ')} include a free monthly usage
                cap. Heavy AI use is billed per token on top.
              </span>
            </MeteredNote>
          </Summary>
        </Layout>

        <FootNote>Upgrade or cancel anytime — changes are prorated.</FootNote>
      </Content>
    </PageWrapper>
  )
}
