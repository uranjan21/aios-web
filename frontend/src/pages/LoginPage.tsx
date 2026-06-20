import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import styled, { keyframes, useTheme } from 'styled-components'
import { Button, Input } from '@ledgr/ui'
import { api } from '@/api/client'
import { useAuthStore } from '@/stores/authStore'
import {
  IndianRupee, Heart, Briefcase, Rocket, PenLine,
  ArrowRight, Eye, EyeOff, Sparkles, Shield, Zap,
} from 'lucide-react'

/* ── Animations ────────────────────────────────────────────────────── */
const fadeUp = keyframes`
  from { opacity: 0; transform: translateY(12px); }
  to   { opacity: 1; transform: translateY(0); }
`

/* ── Layout ─────────────────────────────────────────────────────────── */
const Root = styled.div`
  min-height: 100dvh;
  display: flex;
  background: ${({ theme }) => theme.color.background};
`

const HeroPanel = styled.aside`
  display: none;
  @media (min-width: 1024px) {
    display: flex;
    width: 55%;
    flex-direction: column;
    justify-content: center;
    align-items: center;
    padding: 48px;
    position: relative;
    overflow: hidden;
    background: linear-gradient(135deg,
      ${({ theme }) => theme.color.primary}08 0%,
      ${({ theme }) => theme.color.background} 50%,
      ${({ theme }) => theme.color.accent}06 100%
    );
  }
`

const HeroBlob = styled.div<{ $top?: string; $left?: string; $right?: string; $bottom?: string; $variant: 'accent' | 'primary' }>`
  position: absolute;
  width: 380px;
  height: 380px;
  border-radius: 50%;
  background: ${({ theme, $variant }) => $variant === 'accent' ? `${theme.color.accent}0d` : `${theme.color.primary}0d`};
  filter: blur(80px);
  top: ${({ $top }) => $top ?? 'auto'};
  left: ${({ $left }) => $left ?? 'auto'};
  right: ${({ $right }) => $right ?? 'auto'};
  bottom: ${({ $bottom }) => $bottom ?? 'auto'};
  pointer-events: none;
`

const HeroContent = styled.div`
  position: relative;
  z-index: 1;
  max-width: 480px;
  animation: ${fadeUp} 0.5s cubic-bezier(0.16, 1, 0.3, 1) both;
`

const LogoBadge = styled.div`
  width: 60px;
  height: 60px;
  border-radius: 18px;
  background: linear-gradient(135deg, ${({ theme }) => theme.color.primary}, ${({ theme }) => theme.color.accent});
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 24px;
  box-shadow: ${({ theme }) => theme.shadow.md};
`

const LogoBadgeText = styled.span`
  font-family: ${({ theme }) => theme.typography.fontFamily.serif};
  font-size: 18px;
  font-weight: 700;
  color: ${({ theme }) => theme.color.primaryForeground};
  letter-spacing: -0.02em;
`

const HeroTitle = styled.h1`
  font-family: ${({ theme }) => theme.typography.fontFamily.serif};
  font-size: 52px;
  line-height: 1.05;
  font-weight: 700;
  color: ${({ theme }) => theme.color.foreground};
  letter-spacing: -0.03em;
  margin: 0 0 12px;
`

const HeroSub = styled.p`
  font-size: 15px;
  color: ${({ theme }) => theme.color.mutedForeground};
  line-height: 1.6;
  max-width: 340px;
  margin: 0 0 32px;
`

const PillRow = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 40px;
  animation: ${fadeUp} 0.5s 0.1s cubic-bezier(0.16, 1, 0.3, 1) both;
`

const DomainPill = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 14px;
  border-radius: 12px;
  background: ${({ theme }) => theme.color.card};
  border: 1px solid ${({ theme }) => theme.color.border};
  box-shadow: ${({ theme }) => theme.shadow.xs};
`

const DomainLabel = styled.span`
  font-size: 12px;
  font-weight: 500;
  color: ${({ theme }) => theme.color.foreground};
`

const FeatureList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 10px;
  animation: ${fadeUp} 0.5s 0.2s cubic-bezier(0.16, 1, 0.3, 1) both;
`

const FeatureRow = styled.div`
  display: flex;
  align-items: flex-start;
  gap: 14px;
  padding: 14px;
  border-radius: 14px;
  background: ${({ theme }) => theme.color.card}99;
  border: 1px solid ${({ theme }) => theme.color.border};
`

const FeatureIcon = styled.div`
  width: 36px;
  height: 36px;
  border-radius: 10px;
  background: ${({ theme }) => theme.color.primary}12;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  color: ${({ theme }) => theme.color.primary};
`

const FeatureTitle = styled.p`
  font-size: 13px;
  font-weight: 600;
  color: ${({ theme }) => theme.color.foreground};
  margin: 0 0 2px;
`

const FeatureDesc = styled.p`
  font-size: 11px;
  color: ${({ theme }) => theme.color.mutedForeground};
  margin: 0;
  line-height: 1.45;
`

/* ── Right / Form panel ─────────────────────────────────────────────── */
const FormPanel = styled.div`
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
  @media (min-width: 640px) { padding: 40px; }
`

const FormWrap = styled.div`
  width: 100%;
  max-width: 420px;
`

const MobileBrand = styled.div`
  text-align: center;
  margin-bottom: 36px;
  animation: ${fadeUp} 0.5s cubic-bezier(0.16, 1, 0.3, 1) both;
  @media (min-width: 1024px) { display: none; }
`

const MobileTitle = styled.h1`
  font-family: ${({ theme }) => theme.typography.fontFamily.serif};
  font-size: 40px;
  font-weight: 700;
  color: ${({ theme }) => theme.color.foreground};
  letter-spacing: -0.03em;
  margin: 16px 0 8px;
`

const MobileSub = styled.p`
  font-size: 12px;
  text-transform: uppercase;
  letter-spacing: 0.15em;
  color: ${({ theme }) => theme.color.mutedForeground};
  margin: 0;
`

const DesktopWelcome = styled.div`
  margin-bottom: 28px;
  animation: ${fadeUp} 0.5s cubic-bezier(0.16, 1, 0.3, 1) both;
  display: none;
  @media (min-width: 1024px) { display: block; }
`

const WelcomeTitle = styled.h2`
  font-family: ${({ theme }) => theme.typography.fontFamily.serif};
  font-size: 28px;
  font-weight: 600;
  color: ${({ theme }) => theme.color.foreground};
  letter-spacing: -0.02em;
  margin: 0 0 6px;
`

const WelcomeSub = styled.p`
  font-size: 14px;
  color: ${({ theme }) => theme.color.mutedForeground};
  margin: 0;
`

const LoginCard = styled.form`
  background: ${({ theme }) => theme.color.card};
  border: 1px solid ${({ theme }) => theme.color.border};
  border-radius: ${({ theme }) => theme.radii.xl};
  padding: 28px;
  box-shadow: ${({ theme }) => theme.shadow.md};
  display: flex;
  flex-direction: column;
  gap: 20px;
  animation: ${fadeUp} 0.5s 0.1s cubic-bezier(0.16, 1, 0.3, 1) both;
`

const FieldLabel = styled.label`
  display: block;
  font-size: 11px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: ${({ theme }) => theme.color.mutedForeground};
  margin-bottom: 8px;
  cursor: pointer;
`

const PasswordWrap = styled.div`
  position: relative;
`

const ShowHideBtn = styled.button`
  position: absolute;
  right: 10px;
  top: 50%;
  transform: translateY(-50%);
  background: none;
  border: none;
  padding: 4px;
  cursor: pointer;
  color: ${({ theme }) => theme.color.mutedForeground};
  border-radius: 6px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: color 120ms;
  &:hover { color: ${({ theme }) => theme.color.foreground}; }
  &:focus-visible { outline: 2px solid ${({ theme }) => theme.color.ring}; }
`

const ErrorBox = styled.div`
  font-size: 13px;
  color: ${({ theme }) => theme.color.destructive};
  text-align: center;
  padding: 8px 12px;
  border-radius: 10px;
  background: ${({ theme }) => theme.color.destructive}12;
`

const DemoLink = styled.button`
  width: 100%;
  text-align: center;
  font-size: 12px;
  color: ${({ theme }) => theme.color.mutedForeground};
  background: none;
  border: none;
  cursor: pointer;
  font-weight: 500;
  padding: 4px;
  transition: color 120ms;
  border-radius: 4px;
  &:hover { color: ${({ theme }) => theme.color.primary}; }
  &:focus-visible {
    outline: 2px solid ${({ theme }) => theme.color.ring};
    outline-offset: 2px;
  }
`

const FooterNote = styled.p`
  text-align: center;
  font-size: 10px;
  color: ${({ theme }) => theme.color.mutedForeground}66;
  margin: 28px 0 0;
  animation: ${fadeUp} 0.5s 0.3s cubic-bezier(0.16, 1, 0.3, 1) both;
`

const MobileDomains = styled.div`
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 10px;
  margin-top: 28px;
  animation: ${fadeUp} 0.5s 0.2s cubic-bezier(0.16, 1, 0.3, 1) both;
  @media (min-width: 1024px) { display: none; }
`

const MobileDomainLabel = styled.span`
  font-size: 11px;
  color: ${({ theme }) => theme.color.mutedForeground};
  font-weight: 500;
`

const DOMAIN_COLOR_KEYS: Record<string, 'primary' | 'accent' | 'mutedForeground'> = {
  Finance:  'primary',
  Health:   'accent',
  Career:   'mutedForeground',
  Business: 'primary',
  Content:  'accent',
}

const DOMAINS = [
  { icon: IndianRupee, label: 'Finance' },
  { icon: Heart, label: 'Health' },
  { icon: Briefcase, label: 'Career' },
  { icon: Rocket, label: 'Business' },
  { icon: PenLine, label: 'Content' },
]

const FEATURES = [
  { icon: Sparkles, title: 'AI-Powered', desc: 'Chat with Claude about any life domain' },
  { icon: Shield, title: 'Vault Synced', desc: 'Obsidian vault as your knowledge layer' },
  { icon: Zap, title: 'Agents', desc: 'Automated workflows that run on schedule' },
]

export function LoginPage() {
  const theme = useTheme()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const navigate = useNavigate()
  const setAuthenticated = useAuthStore(s => s.setAuthenticated)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      await api.post('/auth/login', { email, password })
      setAuthenticated(true)
      navigate('/')
    } catch {
      setError('Invalid passphrase')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Root>
      {/* Left hero (desktop) */}
      <HeroPanel>
        <HeroBlob $top="-120px" $left="-80px" $variant="accent" />
        <HeroBlob $bottom="-100px" $right="-60px" $variant="primary" />
        <HeroContent>
          <LogoBadge>
            <LogoBadgeText>AI</LogoBadgeText>
          </LogoBadge>
          <HeroTitle>aios</HeroTitle>
          <HeroSub>Your personal command center. Five life domains, one intelligent interface.</HeroSub>

          <PillRow>
            {DOMAINS.map(d => (
              <DomainPill key={d.label}>
                <d.icon size={14} color={theme.color[DOMAIN_COLOR_KEYS[d.label]]} />
                <DomainLabel>{d.label}</DomainLabel>
              </DomainPill>
            ))}
          </PillRow>

          <FeatureList>
            {FEATURES.map(f => (
              <FeatureRow key={f.title}>
                <FeatureIcon><f.icon size={16} /></FeatureIcon>
                <div>
                  <FeatureTitle>{f.title}</FeatureTitle>
                  <FeatureDesc>{f.desc}</FeatureDesc>
                </div>
              </FeatureRow>
            ))}
          </FeatureList>
        </HeroContent>
      </HeroPanel>

      {/* Right form */}
      <FormPanel>
        <FormWrap>
          {/* Mobile brand */}
          <MobileBrand>
            <LogoBadge style={{ margin: '0 auto 16px' }}>
              <LogoBadgeText>AI</LogoBadgeText>
            </LogoBadge>
            <MobileTitle>aios</MobileTitle>
            <MobileSub>Your life, beautifully run</MobileSub>
          </MobileBrand>

          {/* Desktop welcome */}
          <DesktopWelcome>
            <WelcomeTitle>Welcome back</WelcomeTitle>
            <WelcomeSub>Enter your passphrase to continue</WelcomeSub>
          </DesktopWelcome>

          <LoginCard onSubmit={handleSubmit}>
            <div>
              <FieldLabel htmlFor="login-email">Email</FieldLabel>
              <Input
                id="login-email"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={e => setEmail(e.target.value)}
                autoFocus
                required
                fullWidth
                size="lg"
              />
            </div>

            <div>
              <FieldLabel htmlFor="login-password">Passphrase</FieldLabel>
              <PasswordWrap>
                <Input
                  id="login-password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Enter your passphrase"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  required
                  fullWidth
                  size="lg"
                  style={{ paddingRight: '44px' }}
                />
                <ShowHideBtn
                  type="button"
                  onClick={() => setShowPassword(v => !v)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </ShowHideBtn>
              </PasswordWrap>
            </div>

            {error && <ErrorBox>{error}</ErrorBox>}

            <Button
              type="submit"
              variant="primary"
              size="lg"
              disabled={loading || !email || !password}
              style={{ width: '100%', justifyContent: 'center' }}
            >
              {loading ? 'Unlocking…' : <><span>Enter</span><ArrowRight size={16} /></>}
            </Button>

            <DemoLink
              type="button"
              onClick={() => { setEmail('demo@aios.dev'); setPassword('demo1234') }}
            >
              Use demo credentials
            </DemoLink>
          </LoginCard>

          <MobileDomains>
            {DOMAINS.map(d => (
              <MobileDomainLabel key={d.label}>
                {d.label}
              </MobileDomainLabel>
            ))}
          </MobileDomains>

          <FooterNote>Single-user instance · End-to-end encrypted</FooterNote>
        </FormWrap>
      </FormPanel>
    </Root>
  )
}
