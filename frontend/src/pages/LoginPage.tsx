import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import styled, { keyframes } from 'styled-components'
import { api } from '@/api/client'
import { useAuthStore } from '@/stores/authStore'
import {
  IndianRupee, Heart, Briefcase, Rocket, PenLine,
  Eye, EyeOff, Sparkles, Shield, Zap, ChevronRight,
  Mail, Lock, ArrowRight, Check,
} from 'lucide-react'

/* ── Dark panel constants ───────────────────────────────────────────── */
const DARK_BG = '#080A08'
const DARK_CARD = 'rgba(255,255,255,0.04)'
const DARK_BORDER = 'rgba(255,255,255,0.08)'
const DARK_MUTED = 'rgba(255,255,255,0.45)'
const GOLD = '#CA8A04'

/* ── Animations ────────────────────────────────────────────────────── */
const fadeUp = keyframes`
  from { opacity: 0; transform: translateY(10px); }
  to   { opacity: 1; transform: translateY(0); }
`

const glowPulse = keyframes`
  0%, 100% { opacity: 0.12; }
  50% { opacity: 0.22; }
`

/* ── Root ───────────────────────────────────────────────────────────── */
const Root = styled.div`
  min-height: 100dvh;
  display: flex;
  background: ${DARK_BG};
`

/* ── Dark hero panel ─────────────────────────────────────────────────── */
const HeroPanel = styled.aside`
  display: none;
  @media (min-width: 1024px) {
    display: flex;
    width: 58%;
    flex-direction: column;
    justify-content: center;
    align-items: flex-start;
    padding: 56px 56px 56px 60px;
    position: relative;
    overflow: hidden;
    background-color: ${DARK_BG};
    background-image: radial-gradient(rgba(202, 138, 4, 0.07) 1px, transparent 1px);
    background-size: 28px 28px;
  }
`

const GlowOrb = styled.div<{
  $top: string
  $right?: string
  $left?: string
  $bottom?: string
  $size: number
  $gold?: boolean
}>`
  position: absolute;
  width: ${({ $size }) => $size}px;
  height: ${({ $size }) => $size}px;
  border-radius: 50%;
  background: ${({ $gold }) =>
    $gold
      ? `radial-gradient(circle, ${GOLD}2a 0%, transparent 70%)`
      : 'radial-gradient(circle, rgba(255,255,255,0.04) 0%, transparent 70%)'};
  top: ${({ $top }) => $top};
  right: ${({ $right }) => $right ?? 'auto'};
  left: ${({ $left }) => $left ?? 'auto'};
  bottom: ${({ $bottom }) => $bottom ?? 'auto'};
  animation: ${glowPulse} 5s ease-in-out infinite;
  pointer-events: none;
`

const WaveOverlay = styled.div`
  position: absolute;
  inset: 0;
  pointer-events: none;
  overflow: hidden;
`

const HeroContent = styled.div`
  position: relative;
  z-index: 1;
  width: 100%;
  max-width: 500px;
  animation: ${fadeUp} 0.5s cubic-bezier(0.16, 1, 0.3, 1) both;
`

/* ── Logo ────────────────────────────────────────────────────────────── */
const LogoRow = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 32px;
`

const LogoBadge = styled.div<{ $size?: number }>`
  width: ${({ $size }) => $size ?? 44}px;
  height: ${({ $size }) => $size ?? 44}px;
  border-radius: 10px;
  background: linear-gradient(135deg, ${GOLD} 0%, #7a5208 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
`

const LogoBadgeText = styled.span<{ $size?: number }>`
  font-size: ${({ $size }) => $size ?? 14}px;
  font-weight: 800;
  color: #ffffff;
  letter-spacing: -0.02em;
`

const BrandName = styled.span<{ $dark?: boolean; $size?: number }>`
  font-size: ${({ $size }) => $size ?? 22}px;
  font-weight: 700;
  color: ${({ $dark }) => ($dark ? '#0C0A09' : '#ffffff')};
  letter-spacing: -0.03em;
`

/* ── Hero text ───────────────────────────────────────────────────────── */
const HeroTitle = styled.h1`
  font-size: 44px;
  line-height: 1.08;
  font-weight: 700;
  color: #ffffff;
  letter-spacing: -0.03em;
  margin: 0 0 14px;

  span { color: ${GOLD}; }
`

const HeroSub = styled.p`
  font-size: 14px;
  color: ${DARK_MUTED};
  line-height: 1.65;
  max-width: 380px;
  margin: 0 0 32px;
`

/* ── Domain cards ────────────────────────────────────────────────────── */
const DomainGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 8px;
  margin-bottom: 20px;
`

const DomainCard = styled.div`
  display: flex;
  flex-direction: column;
  gap: 7px;
  padding: 14px;
  border-radius: 10px;
  background: rgba(10, 12, 10, 0.55);
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
  border: 1px solid ${DARK_BORDER};
`

const DomainIconWrap = styled.div<{ $bg: string }>`
  width: 32px;
  height: 32px;
  border-radius: 8px;
  background: ${({ $bg }) => $bg};
  display: flex;
  align-items: center;
  justify-content: center;
`

const DomainName = styled.span`
  font-size: 13px;
  font-weight: 600;
  color: #ffffff;
`

const DomainTagline = styled.span`
  font-size: 11px;
  color: ${DARK_MUTED};
`

/* ── Feature list ────────────────────────────────────────────────────── */
const FeatureList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 6px;
`

const FeatureRow = styled.div`
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 14px;
  border-radius: 10px;
  background: rgba(10, 12, 10, 0.55);
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
  border: 1px solid ${DARK_BORDER};
`

const FeatureIconCircle = styled.div<{ $gradient: string }>`
  width: 36px;
  height: 36px;
  border-radius: 50%;
  background: ${({ $gradient }) => $gradient};
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  color: #ffffff;
`

const FeatureText = styled.div`
  flex: 1;
`

const FeatureTitle = styled.p`
  font-size: 13px;
  font-weight: 600;
  color: #ffffff;
  margin: 0 0 2px;
`

const FeatureDesc = styled.p`
  font-size: 12px;
  color: ${DARK_MUTED};
  margin: 0;
  line-height: 1.4;
`

const FeatureArrow = styled.div`
  color: ${DARK_MUTED};
  display: flex;
  align-items: center;
  flex-shrink: 0;
`

/* ── Right white form panel ──────────────────────────────────────────── */
const FormPanel = styled.div`
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #ffffff;
  padding: 32px 24px;

  @media (min-width: 640px) {
    padding: 40px 32px;
  }

  @media (min-width: 1024px) {
    border-radius: 24px 0 0 24px;
    padding: 56px 48px;
    box-shadow: -12px 0 48px rgba(0, 0, 0, 0.18);
  }
`

const FormInner = styled.div`
  width: 100%;
  max-width: 400px;
  animation: ${fadeUp} 0.5s 0.1s cubic-bezier(0.16, 1, 0.3, 1) both;
`

const MobileLogoRow = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
  justify-content: center;
  margin-bottom: 32px;

  @media (min-width: 1024px) {
    display: none;
  }
`

const FormHeading = styled.h2`
  font-size: 28px;
  font-weight: 700;
  color: #0c0a09;
  letter-spacing: -0.02em;
  margin: 0 0 6px;
`

const FormSubtitle = styled.p`
  font-size: 14px;
  color: #6b7280;
  margin: 0 0 28px;
`

/* ── Form fields ─────────────────────────────────────────────────────── */
const FieldGroup = styled.div`
  display: flex;
  flex-direction: column;
  gap: 16px;
  margin-bottom: 18px;
`

const FieldLabel = styled.label`
  display: block;
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.08em;
  color: #6b7280;
  margin-bottom: 6px;
  text-transform: uppercase;
`

const InputWrap = styled.div`
  position: relative;
  display: flex;
  align-items: center;
`

const InputIconLeft = styled.div`
  position: absolute;
  left: 14px;
  color: #9ca3af;
  display: flex;
  align-items: center;
  pointer-events: none;
  z-index: 1;
`

const InputIconRight = styled.div`
  position: absolute;
  right: 14px;
  display: flex;
  align-items: center;
`

const StyledInput = styled.input`
  width: 100%;
  padding: 13px 46px;
  font-size: 14px;
  font-family: 'DM Sans', sans-serif;
  border: 1.5px solid #e5e7eb;
  border-radius: 10px;
  background: #ffffff;
  color: #0c0a09;
  outline: none;
  transition: border-color 150ms, box-shadow 150ms;
  box-sizing: border-box;

  &::placeholder {
    color: #9ca3af;
  }
  &:focus {
    border-color: #1c1917;
    box-shadow: 0 0 0 3px rgba(28, 25, 23, 0.07);
  }
`

const StyledInputSimple = styled(StyledInput)`
  padding: 13px 14px;
`

const EyeBtn = styled.button`
  background: none;
  border: none;
  padding: 0;
  cursor: pointer;
  color: #9ca3af;
  display: flex;
  align-items: center;
  transition: color 120ms;
  &:hover {
    color: #374151;
  }
  &:focus-visible {
    outline: 2px solid #1c1917;
    border-radius: 4px;
    outline-offset: 2px;
  }
`

const ValidCheck = styled.div`
  width: 20px;
  height: 20px;
  border-radius: 50%;
  background: #10b981;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  flex-shrink: 0;
`

const RememberRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 24px;
`

const RememberLabel = styled.label`
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  color: #374151;
  cursor: pointer;
  user-select: none;

  input[type='checkbox'] {
    width: 16px;
    height: 16px;
    border-radius: 4px;
    accent-color: #1c1917;
    cursor: pointer;
  }
`

const ForgotLink = styled(Link)`
  font-size: 13px;
  color: #7c3aed;
  text-decoration: none;
  font-weight: 500;
  &:hover {
    text-decoration: underline;
  }
`

const ErrorBox = styled.div`
  font-size: 13px;
  color: #dc2626;
  padding: 10px 14px;
  border-radius: 8px;
  background: #fef2f2;
  border: 1px solid #fca5a5;
  margin-bottom: 16px;
`

const SignInBtn = styled.button`
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 14px;
  font-size: 15px;
  font-weight: 600;
  font-family: 'DM Sans', sans-serif;
  background: #111827;
  color: #ffffff;
  border: none;
  border-radius: 10px;
  cursor: pointer;
  transition: background 150ms, transform 100ms;
  margin-bottom: 20px;

  &:hover:not(:disabled) {
    background: #1f2937;
  }
  &:active:not(:disabled) {
    transform: scale(0.99);
  }
  &:disabled {
    opacity: 0.55;
    cursor: not-allowed;
  }
  &:focus-visible {
    outline: 2px solid #111827;
    outline-offset: 2px;
  }
`

const Divider = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 16px;

  span {
    font-size: 11px;
    color: #9ca3af;
    font-weight: 500;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    flex-shrink: 0;
  }

  &::before,
  &::after {
    content: '';
    flex: 1;
    height: 1px;
    background: #e5e7eb;
  }
`

const GoogleBtn = styled.button`
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  padding: 13px 16px;
  border: 1.5px solid #e5e7eb;
  border-radius: 10px;
  background: #ffffff;
  color: #374151;
  font-size: 14px;
  font-weight: 500;
  font-family: 'DM Sans', sans-serif;
  cursor: pointer;
  transition: background 150ms, border-color 150ms;
  margin-bottom: 20px;

  &:hover:not(:disabled) {
    background: #f9fafb;
    border-color: #d1d5db;
  }
  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
  &:focus-visible {
    outline: 2px solid #374151;
    outline-offset: 2px;
  }
`

const ToggleNote = styled.p`
  text-align: center;
  font-size: 13px;
  color: #6b7280;
  margin: 0 0 24px;

  button {
    background: none;
    border: none;
    color: #7c3aed;
    font-size: 13px;
    font-weight: 600;
    font-family: 'DM Sans', sans-serif;
    cursor: pointer;
    padding: 0;
    margin-left: 4px;
    &:hover {
      text-decoration: underline;
    }
    &:focus-visible {
      outline: 2px solid #7c3aed;
      border-radius: 2px;
    }
  }
`

const FooterNote = styled.p`
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 5px;
  font-size: 12px;
  color: #9ca3af;
  margin: 0 0 8px;
`

const LegalLinks = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 4px;

  a {
    font-size: 12px;
    color: #9ca3af;
    text-decoration: none;
    transition: color 120ms;
    &:hover {
      color: #374151;
    }
  }

  span {
    color: #d1d5db;
    font-size: 12px;
  }
`

/* ── Static data ─────────────────────────────────────────────────────── */
const DOMAINS = [
  { icon: IndianRupee, label: 'Finance',  tagline: 'Track • Plan • Grow',  color: '#EF4444', bg: 'rgba(239,68,68,0.15)' },
  { icon: Heart,       label: 'Health',   tagline: 'Monitor • Improve',    color: '#F43F5E', bg: 'rgba(244,63,94,0.15)' },
  { icon: Briefcase,   label: 'Career',   tagline: 'Learn • Advance',      color: '#3B82F6', bg: 'rgba(59,130,246,0.15)' },
  { icon: Rocket,      label: 'Business', tagline: 'Build • Scale',        color: '#10B981', bg: 'rgba(16,185,129,0.15)' },
  { icon: PenLine,     label: 'Content',  tagline: 'Create • Publish',     color: '#8B5CF6', bg: 'rgba(139,92,246,0.15)' },
]

const FEATURES = [
  {
    icon: Sparkles,
    label: 'AI-Powered',
    desc: 'Chat with Claude about any life domain',
    gradient: 'linear-gradient(135deg, #7C3AED, #A855F7)',
  },
  {
    icon: Shield,
    label: 'Vault Synced',
    desc: 'Obsidian vault as your knowledge layer',
    gradient: 'linear-gradient(135deg, #0284C7, #06B6D4)',
  },
  {
    icon: Zap,
    label: 'Agents',
    desc: 'Automated workflows that run on schedule',
    gradient: 'linear-gradient(135deg, #059669, #10B981)',
  },
]

/* ── Google icon ─────────────────────────────────────────────────────── */
const GoogleIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4" />
    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
  </svg>
)

/* ── Domain constellation ────────────────────────────────────────────
   The five life domains, each in its own colour, wired into one gold
   core — a literal picture of the hero copy: "Five life domains. One
   intelligent interface. All your data, connected and AI-powered."
   Ambient by design: it sits behind the content and never competes.  */
const CORE = { x: 628, y: 336 }

const CONSTELLATION = [
  { key: 'finance',  x: 640, y: 168, color: '#EF4444', r: 3.2, delay: '0s'   },
  { key: 'health',   x: 728, y: 292, color: '#F43F5E', r: 2.8, delay: '1.1s' },
  { key: 'career',   x: 702, y: 474, color: '#3B82F6', r: 3.0, delay: '2.3s' },
  { key: 'business', x: 546, y: 452, color: '#10B981', r: 2.8, delay: '3.1s' },
  { key: 'content',  x: 534, y: 246, color: '#8B5CF6', r: 3.0, delay: '4.2s' },
]

const WaveSVG = () => (
  <svg
    style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}
    viewBox="0 0 800 900"
    preserveAspectRatio="xMidYMid slice"
    xmlns="http://www.w3.org/2000/svg"
    aria-hidden="true"
  >
    <defs>
      {/* One spoke path per domain — shared by the hairline and its travelling pulse */}
      {CONSTELLATION.map(d => (
        <path key={d.key} id={`spoke-${d.key}`} d={`M ${d.x} ${d.y} L ${CORE.x} ${CORE.y}`} />
      ))}

      <radialGradient id="coreHalo">
        <stop offset="0%" stopColor={GOLD} stopOpacity="0.28" />
        <stop offset="100%" stopColor={GOLD} stopOpacity="0" />
      </radialGradient>

      <linearGradient id="threadFade" x1="0%" y1="0%" x2="100%" y2="0%">
        <stop offset="0%" stopColor={GOLD} stopOpacity="0" />
        <stop offset="50%" stopColor={GOLD} stopOpacity="0.14" />
        <stop offset="100%" stopColor={GOLD} stopOpacity="0" />
      </linearGradient>

      <filter id="soft">
        <feGaussianBlur stdDeviation="2.5" result="b" />
        <feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge>
      </filter>

      <style>{`
        @keyframes coreBreathe { 0%,100% { opacity:.55 } 50% { opacity:.95 } }
        @keyframes haloBreathe { 0%,100% { opacity:.5 } 50% { opacity:.9 } }
        @keyframes nodeBreathe { 0%,100% { opacity:.45 } 50% { opacity:.8 } }

        .coreDot  { animation: coreBreathe 5s ease-in-out infinite }
        .coreHalo { animation: haloBreathe 5s ease-in-out infinite }
        .node     { animation: nodeBreathe 6s ease-in-out infinite }

        @media (prefers-reduced-motion: reduce) {
          .coreDot, .coreHalo, .node { animation: none }
          .pulse { display: none }
        }
      `}</style>
    </defs>

    {/* Ambient threads drifting off-frame — suggests the network continues */}
    <g fill="none" stroke="url(#threadFade)" strokeWidth="1">
      <path d="M -40 596 Q 180 520 360 470 Q 500 430 546 452" />
      <path d="M 640 168 Q 700 90 800 44" />
      <path d="M 534 246 Q 380 200 200 232 Q 80 254 -40 226" />
      <path d="M 702 474 Q 740 610 840 690" />
    </g>

    {/* Spokes: each domain wired to the core */}
    {CONSTELLATION.map(d => (
      <use key={d.key} href={`#spoke-${d.key}`} stroke={GOLD} strokeOpacity="0.13" strokeWidth="1" />
    ))}

    {/* Data flowing inward, domain-coloured, one slow pulse per spoke */}
    {CONSTELLATION.map(d => (
      <circle key={d.key} className="pulse" r="1.8" fill={d.color} opacity="0.85">
        <animateMotion dur="9s" begin={d.delay} repeatCount="indefinite" keyPoints="0;1" keyTimes="0;1" calcMode="linear">
          <mpath href={`#spoke-${d.key}`} />
        </animateMotion>
        <animate attributeName="opacity" values="0;0.85;0.85;0" keyTimes="0;0.15;0.7;1" dur="9s" begin={d.delay} repeatCount="indefinite" />
      </circle>
    ))}

    {/* Domain nodes */}
    {CONSTELLATION.map(d => (
      <g key={d.key}>
        <circle
          className="node"
          cx={d.x} cy={d.y} r={d.r}
          fill={d.color}
          filter="url(#soft)"
          style={{ animationDelay: d.delay }}
        />
        <circle cx={d.x} cy={d.y} r={d.r + 6} fill="none" stroke={d.color} strokeOpacity="0.16" strokeWidth="1" />
      </g>
    ))}

    {/* The intelligent core */}
    <circle className="coreHalo" cx={CORE.x} cy={CORE.y} r="72" fill="url(#coreHalo)" />
    <circle cx={CORE.x} cy={CORE.y} r="18" fill="none" stroke={GOLD} strokeOpacity="0.2" strokeWidth="1" />
    <circle className="coreDot" cx={CORE.x} cy={CORE.y} r="4.5" fill="#FDE68A" filter="url(#soft)" />
  </svg>
)

/* ── Error helper ────────────────────────────────────────────────────── */
function errorMessage(err: any, fallback: string): string {
  const detail = err?.response?.data?.detail
  if (typeof detail === 'string') return detail
  if (Array.isArray(detail) && detail[0]?.msg) return detail[0].msg
  return fallback
}

/* ── Component ───────────────────────────────────────────────────────── */
type AuthMode = 'login' | 'signup'

export function LoginPage({ initialMode = 'login' }: { initialMode?: AuthMode }) {
  const [mode, setMode] = useState<AuthMode>(initialMode)
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [googleLoading, setGoogleLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [rememberMe, setRememberMe] = useState(false)
  const navigate = useNavigate()
  const setAuthenticated = useAuthStore(s => s.setAuthenticated)
  const setUser = useAuthStore(s => s.setUser)

  const isSignup = mode === 'signup'
  const isEmailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)

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
      {/* ── Left dark hero panel ── */}
      <HeroPanel>
        <GlowOrb $top="-120px" $right="-100px" $size={480} $gold />
        <GlowOrb $top="65%" $left="-100px" $size={320} />
        <WaveOverlay>
          <WaveSVG />
        </WaveOverlay>

        <HeroContent>
          <LogoRow>
            <LogoBadge>
              <LogoBadgeText>AI</LogoBadgeText>
            </LogoBadge>
            <BrandName>aios</BrandName>
          </LogoRow>

          <HeroTitle>
            Your personal<br />
            <span>command</span> center.
          </HeroTitle>
          <HeroSub>
            Five life domains. One intelligent interface.<br />
            All your data, connected and AI-powered.
          </HeroSub>

          <DomainGrid>
            {DOMAINS.map(d => (
              <DomainCard key={d.label}>
                <DomainIconWrap $bg={d.bg}>
                  <d.icon size={16} color={d.color} />
                </DomainIconWrap>
                <DomainName>{d.label}</DomainName>
                <DomainTagline>{d.tagline}</DomainTagline>
              </DomainCard>
            ))}
          </DomainGrid>

          <FeatureList>
            {FEATURES.map(f => (
              <FeatureRow key={f.label}>
                <FeatureIconCircle $gradient={f.gradient}>
                  <f.icon size={16} />
                </FeatureIconCircle>
                <FeatureText>
                  <FeatureTitle>{f.label}</FeatureTitle>
                  <FeatureDesc>{f.desc}</FeatureDesc>
                </FeatureText>
                <FeatureArrow>
                  <ChevronRight size={16} />
                </FeatureArrow>
              </FeatureRow>
            ))}
          </FeatureList>
        </HeroContent>
      </HeroPanel>

      {/* ── Right white form panel ── */}
      <FormPanel>
        <FormInner>
          {/* Mobile-only logo */}
          <MobileLogoRow>
            <LogoBadge $size={36}>
              <LogoBadgeText $size={12}>AI</LogoBadgeText>
            </LogoBadge>
            <BrandName $dark $size={18}>aios</BrandName>
          </MobileLogoRow>

          <FormHeading>
            {isSignup ? 'Create your account' : 'Welcome back 👋'}
          </FormHeading>
          <FormSubtitle>
            {isSignup
              ? 'Start running your life on AIOS'
              : 'Sign in to continue to AIOS'}
          </FormSubtitle>

          <form onSubmit={handleSubmit}>
            <FieldGroup>
              {isSignup && (
                <div>
                  <FieldLabel htmlFor="signup-name">Name</FieldLabel>
                  <StyledInputSimple
                    id="signup-name"
                    type="text"
                    placeholder="Your name"
                    value={name}
                    onChange={e => setName(e.target.value)}
                    autoFocus
                    required
                  />
                </div>
              )}

              <div>
                <FieldLabel htmlFor="login-email">Email</FieldLabel>
                <InputWrap>
                  <InputIconLeft>
                    <Mail size={16} />
                  </InputIconLeft>
                  <StyledInput
                    id="login-email"
                    type="email"
                    placeholder="you@example.com"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    autoFocus={!isSignup}
                    required
                  />
                  {email && isEmailValid && (
                    <InputIconRight>
                      <ValidCheck>
                        <Check size={11} />
                      </ValidCheck>
                    </InputIconRight>
                  )}
                </InputWrap>
              </div>

              <div>
                <FieldLabel htmlFor="login-password">Password</FieldLabel>
                <InputWrap>
                  <InputIconLeft>
                    <Lock size={16} />
                  </InputIconLeft>
                  <StyledInput
                    id="login-password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder={isSignup ? 'At least 8 characters' : '••••••••••'}
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    required
                  />
                  <InputIconRight>
                    <EyeBtn
                      type="button"
                      onClick={() => setShowPassword(v => !v)}
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                    >
                      {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </EyeBtn>
                  </InputIconRight>
                </InputWrap>
              </div>
            </FieldGroup>

            {!isSignup && (
              <RememberRow>
                <RememberLabel>
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={e => setRememberMe(e.target.checked)}
                  />
                  Remember me
                </RememberLabel>
                <ForgotLink to="/forgot-password">Forgot password?</ForgotLink>
              </RememberRow>
            )}

            {error && <ErrorBox>{error}</ErrorBox>}

            <SignInBtn
              type="submit"
              disabled={loading || !email || !password || (isSignup && !name)}
            >
              {loading
                ? (isSignup ? 'Creating account…' : 'Signing in…')
                : <>{isSignup ? 'Create account' : 'Sign in'} <ArrowRight size={16} /></>}
            </SignInBtn>
          </form>

          <Divider><span>or</span></Divider>

          <GoogleBtn type="button" onClick={handleGoogleLogin} disabled={googleLoading}>
            <GoogleIcon />
            {googleLoading ? 'Redirecting…' : 'Continue with Google'}
          </GoogleBtn>

          <ToggleNote>
            {isSignup ? 'Already have an account?' : 'New to AIOS?'}
            <button type="button" onClick={toggleMode}>
              {isSignup ? 'Sign in' : 'Create an account'}
            </button>
          </ToggleNote>

          <FooterNote>
            <Lock size={11} /> Your data, encrypted · Private by design
          </FooterNote>
          <LegalLinks>
            <Link to="/privacy-policy">Privacy</Link>
            <span>·</span>
            <Link to="/terms-of-service">Terms</Link>
            <span>·</span>
            <Link to="/support">Support</Link>
          </LegalLinks>
        </FormInner>
      </FormPanel>
    </Root>
  )
}
