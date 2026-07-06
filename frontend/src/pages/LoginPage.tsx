import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import styled, { keyframes, useTheme } from 'styled-components'
import { Button, Input, Card } from '@ledgr/ui'
import { api } from '@/api/client'
import { useAuthStore } from '@/stores/authStore'
import { StatusPill } from '@/components/lumina'
import {
  IndianRupee, Heart, Briefcase, Rocket, PenLine,
  ArrowRight, Eye, EyeOff, Sparkles, Shield, Zap, Lock,
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
  border-radius: ${({ theme }) => theme.radii.md};
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
  border-radius: ${({ theme }) => theme.radii.md};
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
  border-radius: ${({ theme }) => theme.radii.md};
  background: ${({ theme }) => theme.color.card}99;
  border: 1px solid ${({ theme }) => theme.color.border};
`

const FeatureIcon = styled.div`
  width: 36px;
  height: 36px;
  border-radius: ${({ theme }) => theme.radii.md};
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


const LoginCard = styled(Card)`
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
  border-radius: ${({ theme }) => theme.radii.sm};
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
  border-radius: ${({ theme }) => theme.radii.md};
  background: ${({ theme }) => theme.color.destructive}12;
`

const Divider = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  color: ${({ theme }) => theme.color.mutedForeground};
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  &::before, &::after {
    content: '';
    flex: 1;
    height: 1px;
    background: ${({ theme }) => theme.color.border};
  }
`

const GoogleBtn = styled.button`
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  padding: 12px 16px;
  border-radius: ${({ theme }) => theme.radii.md};
  border: 1px solid ${({ theme }) => theme.color.border};
  background: ${({ theme }) => theme.color.card};
  color: ${({ theme }) => theme.color.foreground};
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 150ms;
  &:hover {
    background: ${({ theme }) => theme.color.muted};
    border-color: ${({ theme }) => theme.color.mutedForeground}40;
  }
  &:focus-visible {
    outline: 2px solid ${({ theme }) => theme.color.ring};
    outline-offset: 2px;
  }
  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
`

const GoogleIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
  </svg>
)

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
  border-radius: ${({ theme }) => theme.radii.sm};
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

const LegalLinks = styled.div`
  display: flex;
  justify-content: center;
  gap: 16px;
  margin-top: 12px;
  animation: ${fadeUp} 0.5s 0.3s cubic-bezier(0.16, 1, 0.3, 1) both;
  
  a {
    font-size: 11px;
    color: ${({ theme }) => theme.color.mutedForeground};
    text-decoration: none;
    transition: color 150ms;
    &:hover {
      color: ${({ theme }) => theme.color.foreground};
    }
  }
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

type AuthMode = 'login' | 'signup'

/** Pull a human-readable message out of a FastAPI error response. */
function errorMessage(err: any, fallback: string): string {
  const detail = err?.response?.data?.detail
  if (typeof detail === 'string') return detail
  if (Array.isArray(detail) && detail[0]?.msg) return detail[0].msg
  return fallback
}

export function LoginPage({ initialMode = 'login' }: { initialMode?: AuthMode }) {
  const theme = useTheme()
  const [mode, setMode] = useState<AuthMode>(initialMode)
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [googleLoading, setGoogleLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const navigate = useNavigate()
  const setAuthenticated = useAuthStore(s => s.setAuthenticated)
  const setUser = useAuthStore(s => s.setUser)

  const isSignup = mode === 'signup'

  const toggleMode = () => {
    setError('')
    setMode(m => (m === 'login' ? 'signup' : 'login'))
  }

  const handleGoogleLogin = async () => {
    setGoogleLoading(true)
    setError('')
    try {
      const { data } = await api.get('/auth/google/url')
      window.location.href = data.url
    } catch {
      setError('Google Sign-In is not configured')
      setGoogleLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (isSignup && password.length < 8) {
      setError('Password must be at least 8 characters')
      return
    }
    setLoading(true)
    setError('')
    try {
      const { data } = isSignup
        ? await api.post('/auth/signup', { name, email, password })
        : await api.post('/auth/login', { email, password })
      setAuthenticated(true)
      if (data.user) setUser(data.user)
      navigate('/app')
    } catch (err) {
      setError(errorMessage(err, isSignup ? 'Could not create account' : 'Invalid email or password'))
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

          <LoginCard
            as="form"
            onSubmit={handleSubmit}
            title={isSignup ? 'Create your account' : 'Welcome back'}
            subtitle={isSignup ? 'Start running your life on AIOS' : 'Sign in to continue'}
            icon={<Shield size={16} />}
            action={<StatusPill label="Secure" tone="primary" />}
            style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}
          >
            {isSignup && (
              <div>
                <FieldLabel htmlFor="signup-name">Name</FieldLabel>
                <Input
                  id="signup-name"
                  type="text"
                  placeholder="Your name"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  autoFocus
                  required
                  fullWidth
                  size="lg"
                />
              </div>
            )}

            <div>
              <FieldLabel htmlFor="login-email">Email</FieldLabel>
              <Input
                id="login-email"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={e => setEmail(e.target.value)}
                autoFocus={!isSignup}
                required
                fullWidth
                size="lg"
              />
            </div>

            <div>
              <FieldLabel htmlFor="login-password">Password</FieldLabel>
              <PasswordWrap>
                <Input
                  id="login-password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder={isSignup ? 'At least 8 characters' : 'Enter your password'}
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
              disabled={loading || !email || !password || (isSignup && !name)}
              style={{ width: '100%', justifyContent: 'center' }}
            >
              {loading
                ? (isSignup ? 'Creating account…' : 'Signing in…')
                : <><span>{isSignup ? 'Create account' : 'Sign in'}</span><ArrowRight size={16} /></>}
            </Button>

            <Divider>or</Divider>

            <GoogleBtn
              type="button"
              onClick={handleGoogleLogin}
              disabled={googleLoading}
            >
              <GoogleIcon />
              {googleLoading ? 'Redirecting…' : `Continue with Google`}
            </GoogleBtn>

            <DemoLink type="button" onClick={toggleMode}>
              {isSignup ? 'Already have an account? Sign in' : 'New to AIOS? Create an account'}
            </DemoLink>
          </LoginCard>

          <MobileDomains>
            {DOMAINS.map(d => (
              <MobileDomainLabel key={d.label}>
                {d.label}
              </MobileDomainLabel>
            ))}
          </MobileDomains>

          <FooterNote>Your data, encrypted · Private by design</FooterNote>
          <LegalLinks>
            <Link to="/privacy-policy">Privacy</Link>
            <Link to="/terms-of-service">Terms</Link>
            <Link to="/support">Support</Link>
          </LegalLinks>
        </FormWrap>
      </FormPanel>
    </Root>
  )
}
