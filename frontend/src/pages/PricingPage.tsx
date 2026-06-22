import { useEffect, useState } from 'react'
import styled from 'styled-components'
import { motion } from 'framer-motion'
import { Link, useNavigate } from 'react-router-dom'
import { Button } from '@ledgr/ui'
import { Check, Shield, Zap, Globe } from 'lucide-react'
import { useAuthStore } from '@/stores/authStore'
import { useFeatures } from '@/hooks/useFeatures'
import { billingApi } from '@/api/billing'

// ── Currency detection ────────────────────────────────────────────────────────

interface CurrencyInfo {
  code: string
  rate: number
  country: string
  locale: string
}

const USD: CurrencyInfo = { code: 'USD', rate: 1, country: '', locale: 'en-US' }
const SESSION_KEY = 'aios_pricing_currency'

const LOCALE_MAP: Record<string, string> = {
  USD: 'en-US', EUR: 'en-DE', GBP: 'en-GB', INR: 'en-IN', JPY: 'ja-JP',
  CAD: 'en-CA', AUD: 'en-AU', CHF: 'de-CH', CNY: 'zh-CN', BRL: 'pt-BR',
  MXN: 'es-MX', SGD: 'en-SG', HKD: 'zh-HK', KRW: 'ko-KR', SEK: 'sv-SE',
  NOK: 'nb-NO', DKK: 'da-DK', PLN: 'pl-PL', AED: 'ar-AE', SAR: 'ar-SA',
  ZAR: 'en-ZA', NGN: 'en-NG', PKR: 'ur-PK', BDT: 'bn-BD', IDR: 'id-ID',
  MYR: 'ms-MY', PHP: 'fil-PH', THB: 'th-TH', VND: 'vi-VN', TRY: 'tr-TR',
  ILS: 'he-IL', CLP: 'es-CL', COP: 'es-CO', PEN: 'es-PE', ARS: 'es-AR',
}

function usePricingCurrency() {
  const [currency, setCurrency] = useState<CurrencyInfo>(USD)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Serve from cache if fresh (1 hour TTL)
    try {
      const raw = sessionStorage.getItem(SESSION_KEY)
      if (raw) {
        const { ts, data } = JSON.parse(raw)
        if (Date.now() - ts < 3_600_000) {
          setCurrency(data)
          setLoading(false)
          return
        }
      }
    } catch { /* ignore */ }

    let cancelled = false

    async function detect() {
      try {
        // Step 1 — country + currency code from IP
        const geoRes = await fetch('https://ipapi.co/json/', {
          signal: AbortSignal.timeout(5000),
        })
        if (!geoRes.ok) throw new Error('geo')
        const geo = await geoRes.json()
        const code = (geo.currency as string)?.toUpperCase()
        const country = (geo.country_name as string) ?? ''

        if (!code || code === 'USD') return

        // Step 2 — exchange rate (USD → local)
        const rateRes = await fetch('https://open.er-api.com/v6/latest/USD', {
          signal: AbortSignal.timeout(5000),
        })
        if (!rateRes.ok) throw new Error('rate')
        const rateData = await rateRes.json()
        const rate: number | undefined = rateData.rates?.[code]

        if (!cancelled && rate) {
          const info: CurrencyInfo = { code, rate, country, locale: LOCALE_MAP[code] ?? 'en-US' }
          setCurrency(info)
          try {
            sessionStorage.setItem(SESSION_KEY, JSON.stringify({ ts: Date.now(), data: info }))
          } catch { /* quota */ }
        }
      } catch { /* fall through to USD */ } finally {
        if (!cancelled) setLoading(false)
      }
    }

    detect()
    return () => { cancelled = true }
  }, [])

  function format(usdAmount: number): string {
    const localAmount = usdAmount === 0 ? 0 : usdAmount * currency.rate
    const noDecimals = localAmount >= 10 || ['JPY', 'KRW', 'VND', 'IDR', 'CLP'].includes(currency.code)
    return new Intl.NumberFormat(currency.locale, {
      style: 'currency',
      currency: currency.code,
      maximumFractionDigits: noDecimals ? 0 : 2,
    }).format(localAmount)
  }

  return { currency, loading, format }
}

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

const CurrencyBadge = styled.div`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  color: ${({ theme }) => theme.color.mutedForeground};
  background: ${({ theme }) => theme.color.muted};
  border: 1px solid ${({ theme }) => theme.color.border};
  border-radius: 9999px;
  padding: 4px 12px;
  margin-top: 12px;
`

const PricingGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
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
  margin-bottom: 0.25rem;
  display: flex;
  align-items: baseline;
  line-height: 1;

  span {
    font-size: 1rem;
    font-family: ${({ theme }) => theme.typography.fontFamily.sans};
    color: ${({ theme }) => theme.color.mutedForeground};
    font-weight: 400;
  }
`

const UsdNote = styled.div`
  font-size: 11px;
  color: ${({ theme }) => theme.color.mutedForeground};
  margin-bottom: 1rem;
  opacity: 0.75;
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

// ── Page ─────────────────────────────────────────────────────────────────────

export function PricingPage() {
  const navigate = useNavigate()
  const isAuthenticated = useAuthStore(s => s.isAuthenticated)
  const { billing_enabled: billingEnabled } = useFeatures()
  const { currency, loading, format } = usePricingCurrency()

  const isUSD = currency.code === 'USD'

  const handlePlanCta = async (plan: 'pro' | 'pro_plus' | 'household') => {
    if (!isAuthenticated) { navigate('/signup'); return }
    if (!billingEnabled) { navigate('/app/settings'); return }
    try {
      const { url } = await billingApi.checkout(plan)
      window.location.href = url
    } catch {
      navigate('/app/settings')
    }
  }

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
          {!loading && !isUSD && currency.country && (
            <CurrencyBadge>
              <Globe size={13} />
              Showing prices in {currency.code} for {currency.country}
            </CurrencyBadge>
          )}
        </TitleSection>

        <PricingGrid>
          {/* Starter */}
          <PricingCard initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <PlanName>Starter</PlanName>
            <PlanPrice>
              {loading ? '$0' : format(0)}<span>/mo</span>
            </PlanPrice>
            {!isUSD && <UsdNote>Free forever</UsdNote>}
            <PlanDesc>Perfect for getting started with basic life management.</PlanDesc>
            <FeatureList>
              <li><Check size={16} /> Basic Finance Tracking</li>
              <li><Check size={16} /> Basic Health Logs</li>
              <li><Check size={16} /> Basic Career Tracking</li>
              <li><Check size={16} /> Up to 50 items/month</li>
              <li><Check size={16} /> 1 Connected Bank Account</li>
            </FeatureList>
            <Button variant="outline" size="lg" style={{ marginTop: 'auto' }} onClick={() => navigate('/signup')}>
              Get Started for Free
            </Button>
          </PricingCard>

          {/* Pro */}
          <PricingCard initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
            <PlanName>Pro</PlanName>
            <PlanPrice>
              {loading ? '$12' : format(12)}<span>/mo</span>
            </PlanPrice>
            {!isUSD && !loading && <UsdNote>≈ $12 USD · billed in USD</UsdNote>}
            <PlanDesc>Everything you need for advanced wealth and health mastery.</PlanDesc>
            <FeatureList>
              <li><Check size={16} /> Unlimited Finance & Health</li>
              <li><Check size={16} /> AI Chat Assistant</li>
              <li><Check size={16} /> Advanced AI Agents</li>
              <li><Check size={16} /> Unlimited Bank Connections</li>
              <li><Check size={16} /> Premium Reports & Analytics</li>
            </FeatureList>
            <Button variant="primary" size="lg" style={{ marginTop: 'auto' }} onClick={() => handlePlanCta('pro')}>
              {isAuthenticated ? 'Upgrade to Pro' : 'Start 14-Day Free Trial'}
            </Button>
          </PricingCard>

          {/* Pro Plus */}
          <PricingCard $highlight initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
            <PlanName>Pro Plus</PlanName>
            <PlanPrice>
              {loading ? '$20' : format(20)}<span>/mo</span>
            </PlanPrice>
            {!isUSD && !loading && <UsdNote>≈ $20 USD · billed in USD</UsdNote>}
            <PlanDesc>For entrepreneurs and creators building their empire.</PlanDesc>
            <FeatureList>
              <li><Check size={16} /> Everything in Pro</li>
              <li><Check size={16} /> Optional Business Add-on (+$10/mo)</li>
              <li><Check size={16} /> Optional Content Add-on (+$10/mo)</li>
              <li><Check size={16} /> Advanced Custom AI Prompts</li>
              <li><Zap size={16} /> Priority Processing</li>
            </FeatureList>
            <Button variant="primary" size="lg" style={{ marginTop: 'auto' }} onClick={() => handlePlanCta('pro_plus')}>
              {isAuthenticated ? 'Upgrade to Pro Plus' : 'Start 14-Day Free Trial'}
            </Button>
          </PricingCard>

          {/* Household */}
          <PricingCard initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
            <PlanName>Household</PlanName>
            <PlanPrice>
              {loading ? '$24' : format(24)}<span>/mo</span>
            </PlanPrice>
            {!isUSD && !loading && <UsdNote>≈ $24 USD · billed in USD</UsdNote>}
            <PlanDesc>One subscription, up to 5 household members.</PlanDesc>
            <FeatureList>
              <li><Check size={16} /> Pro features for 5 members</li>
              <li><Check size={16} /> Shared Dashboard & Goals</li>
              <li><Check size={16} /> Combined Finance Overview</li>
              <li><Shield size={16} /> Family Health Tracking</li>
              <li><Check size={16} /> Add-ons purchased separately</li>
            </FeatureList>
            <Button variant="outline" size="lg" style={{ marginTop: 'auto' }} onClick={() => handlePlanCta('household')}>
              {isAuthenticated ? 'Upgrade to Household' : 'Get Started'}
            </Button>
          </PricingCard>
        </PricingGrid>
      </Content>
    </PageWrapper>
  )
}
