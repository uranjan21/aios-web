import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import styled, { keyframes, useTheme } from 'styled-components'
import { api } from '@ct/shared/api/client'
import { useAuthStore } from '@ct/shared/stores/authStore'
import { errorMessage } from '@ct/shared/lib/utils'
import { track, identify } from '@ct/shared/lib/analytics'
import {
  IndianRupee, Heart, Briefcase,
  Eye, EyeOff, Sparkles, Shield, Zap,
  Mail, Lock, ArrowRight, Check,
} from 'lucide-react'

/* ── Palette — deliberately page-local ───────────────────────────────
 *
 * These are NOT drift. This page renders always-dark regardless of the user's
 * light/dark preference (see the chromeDomain note below), so it cannot source
 * surface colours from the active theme without breaking that intent. GOLD is
 * the same value as theme.color.accent; the rest are alpha steps over the dark
 * ground that have no semantic equivalent in the palette.
 *
 * Everything that CAN come from the theme now does: the type family, and the
 * focus ring. */
const BG = '#080A08'
const GOLD = '#CA8A04'
const GOLD_LIT = '#FDE68A'
const TXT = '#FFFFFF'
const MUTED = 'rgba(255,255,255,0.45)'
const FAINT = 'rgba(255,255,255,0.28)'
const LINE = 'rgba(255,255,255,0.09)'
const GLASS = 'rgba(255,255,255,0.035)'

/* Domain identity comes from theme.chromeDomain — the dark-mode variants of
 * the single source of truth in ctTheme. This page is always dark whatever
 * the user's mode, which is exactly what chromeDomain exists for.
 *
 * The colours here previously DISAGREED with the rest of the app: Finance was
 * red here and gold everywhere else; Business was green here and red
 * everywhere else. The app's convention won (2026-07-15).
 *
 * Consequence: Finance is now the brand gold, which is also this page's chrome
 * colour. The Finance node separates from the chrome by weight, not hue — a
 * solid glowing dot against 14%-opacity hairlines, with the paler #FDE68A core
 * above it. */

/* ── Animations ─────────────────────────────────────────────────────── */
const fadeUp = keyframes`
  from { opacity: 0; transform: translateY(10px); }
  to   { opacity: 1; transform: translateY(0); }
`

/* ═══════════════════════════════════════════════════════════════════════
   AMBIENT HUD
   A ghosted picture of the product itself. Every layer maps to something
   that actually exists in Control Tower — nothing is decorative sci-fi:
     · core + 5 spokes   → the five life domains feeding one interface
     · vault node        → the Obsidian knowledge layer
     · outer ring, 7 ticks → the 7 scheduled agents
     · heatmap grid      → the LifeHeatmap on the dashboard
     · sparklines        → PulseRow's 30-day domain trends
   ═══════════════════════════════════════════════════════════════════════ */

/* The core lives in the gutter between the two columns; every node sits out
   in a page margin. Only the hairline spokes cross behind copy — so the
   composition frames the page instead of colliding with it. */
const CORE = { x: 800, y: 452 }

/** `domain` keys into theme.chromeDomain; `r` is bumped for Finance so the
 *  gold node still reads against the gold chrome. */
const NODES = [
  { key: 'finance',  domain: 'finance',  x: 660,  y: 86,  r: 4.2, begin: '0s'   },
  { key: 'health',   domain: 'health',   x: 1180, y: 96,  r: 3.0, begin: '1.8s' },
  { key: 'career',   domain: 'career',   x: 1046, y: 858, r: 3.2, begin: '3.6s' },
  { key: 'business', domain: 'business', x: 300,  y: 862, r: 3.0, begin: '5.4s' },
  { key: 'content',  domain: 'content',  x: 104,  y: 322, r: 3.2, begin: '7.2s' },
] as const

const VAULT = { x: 150, y: 648 }

/** 7 evenly-spaced ticks on the outer ring — one per default agent. */
const AGENT_TICKS = Array.from({ length: 7 }, (_, i) => {
  const a = ((i * (360 / 7) - 90) * Math.PI) / 180
  return {
    x1: CORE.x + Math.cos(a) * 292,
    y1: CORE.y + Math.sin(a) * 292,
    x2: CORE.x + Math.cos(a) * 308,
    y2: CORE.y + Math.sin(a) * 308,
  }
})

/** Deterministic pseudo-random — stable across renders, no Math.random. */
const noise = (i: number) => Math.abs(Math.sin(i * 12.9898) * 43758.5453) % 1

/** 22 weeks × 7 days, exactly like the dashboard LifeHeatmap. */
const HEAT = Array.from({ length: 22 * 7 }, (_, i) => ({
  col: Math.floor(i / 7),
  row: i % 7,
  v: noise(i),
}))

/** Builds a smooth-ish sparkline path from a deterministic series. */
const spark = (seed: number, x: number, y: number, w: number, h: number, n = 26) => {
  const pts = Array.from({ length: n }, (_, i) => {
    const px = x + (i / (n - 1)) * w
    const py = y + h - noise(i + seed) * h
    return `${px.toFixed(1)} ${py.toFixed(1)}`
  })
  return `M ${pts.join(' L ')}`
}

const AmbientHUD = () => {
  const theme = useTheme()
  // Always-dark surface → dark domain variants regardless of the user's mode.
  const dc = theme.chromeDomain

  return (
  <HudSvg viewBox="0 0 1440 900" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
    <defs>
      {NODES.map(n => (
        <path key={n.key} id={`sp-${n.key}`} d={`M ${n.x} ${n.y} L ${CORE.x} ${CORE.y}`} />
      ))}
      <path id="sp-vault" d={`M ${VAULT.x} ${VAULT.y} L ${CORE.x} ${CORE.y}`} />

      <radialGradient id="halo">
        <stop offset="0%" stopColor={GOLD} stopOpacity="0.17" />
        <stop offset="100%" stopColor={GOLD} stopOpacity="0" />
      </radialGradient>

      <linearGradient id="thread" x1="0%" y1="0%" x2="100%" y2="0%">
        <stop offset="0%" stopColor={GOLD} stopOpacity="0" />
        <stop offset="50%" stopColor={GOLD} stopOpacity="0.16" />
        <stop offset="100%" stopColor={GOLD} stopOpacity="0" />
      </linearGradient>

      <filter id="soft">
        <feGaussianBlur stdDeviation="2.5" result="b" />
        <feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge>
      </filter>

      <style>{`
        @keyframes breathe { 0%,100% { opacity:.5 } 50% { opacity:.95 } }
        @keyframes nodeB   { 0%,100% { opacity:.5 } 50% { opacity:.85 } }
        @keyframes ringSpin{ to { transform: rotate(360deg) } }
        @keyframes heatB   { 0%,100% { opacity:.35 } 50% { opacity:.75 } }

        .coreDot, .halo { animation: breathe 5s ease-in-out infinite }
        .nd    { animation: nodeB 6s ease-in-out infinite }
        .agents{ transform-box: view-box; transform-origin: ${CORE.x}px ${CORE.y}px;
                 animation: ringSpin 90s linear infinite }
        .hcell { animation: heatB 4s ease-in-out infinite }

        @media (prefers-reduced-motion: reduce) {
          .coreDot,.halo,.nd,.agents,.hcell { animation: none }
          .pulse { display: none }
        }
      `}</style>
    </defs>

    {/* ── Texture: PulseRow-style 30-day sparklines, in the margins ── */}
    <g fill="none" stroke={GOLD} strokeOpacity="0.1" strokeWidth="1">
      <path d={spark(3, 856, 54, 230, 34)} />
      <path d={spark(31, 470, 828, 250, 36)} />
      <path d={spark(67, 34, 464, 148, 30)} />
    </g>

    {/* ── Texture: LifeHeatmap ghost, bottom-right corner ── */}
    <g transform="translate(1168 790)">
      {HEAT.map((c, i) => (
        <rect
          key={i}
          className={c.v > 0.72 ? 'hcell' : undefined}
          x={c.col * 11} y={c.row * 11}
          width="7" height="7" rx="1.5"
          fill={GOLD}
          fillOpacity={c.v > 0.72 ? 0.34 : c.v > 0.45 ? 0.16 : 0.06}
          style={{ animationDelay: `${(i % 9) * 0.35}s` }}
        />
      ))}
    </g>

    {/* ── Ambient threads drifting off-frame ── */}
    <g fill="none" stroke="url(#thread)" strokeWidth="1">
      <path d="M 104 322 Q 60 180 120 -40" />
      <path d="M 660 86 Q 460 30 240 -40" />
      <path d="M 1180 96 Q 1330 40 1480 60" />
      <path d="M 300 862 Q 140 900 -40 940" />
      <path d="M 1046 858 Q 1240 930 1480 900" />
    </g>

    {/* ── Agent ring: 7 ticks = the 7 scheduled agents ── */}
    <g className="agents">
      <circle
        cx={CORE.x} cy={CORE.y} r="300"
        fill="none" stroke={GOLD} strokeOpacity="0.09"
        strokeWidth="1" strokeDasharray="2 10"
      />
      {AGENT_TICKS.map((t, i) => (
        <line key={i} x1={t.x1} y1={t.y1} x2={t.x2} y2={t.y2}
          stroke={GOLD} strokeOpacity="0.26" strokeWidth="1.4" />
      ))}
    </g>

    {/* ── Spokes ── */}
    {NODES.map(n => (
      <use key={n.key} href={`#sp-${n.key}`} stroke={GOLD} strokeOpacity="0.14" strokeWidth="1" />
    ))}
    <use href="#sp-vault" stroke={dc.vault} strokeOpacity="0.12" strokeWidth="1" strokeDasharray="3 6" />

    {/* ── Data flowing inward, one slow pulse per domain ── */}
    {NODES.map(n => (
      <circle key={n.key} className="pulse" r="2" fill={dc[n.domain]}>
        <animateMotion dur="9s" begin={n.begin} repeatCount="indefinite" calcMode="linear">
          <mpath href={`#sp-${n.key}`} />
        </animateMotion>
        <animate attributeName="opacity" values="0;0.9;0.9;0"
          keyTimes="0;0.15;0.7;1" dur="9s" begin={n.begin} repeatCount="indefinite" />
      </circle>
    ))}
    <circle className="pulse" r="1.8" fill={dc.vault}>
      <animateMotion dur="11s" begin="2.5s" repeatCount="indefinite" calcMode="linear">
        <mpath href="#sp-vault" />
      </animateMotion>
      <animate attributeName="opacity" values="0;0.8;0.8;0"
        keyTimes="0;0.15;0.7;1" dur="11s" begin="2.5s" repeatCount="indefinite" />
    </circle>

    {/* ── Domain nodes ── */}
    {NODES.map(n => (
      <g key={n.key}>
        <circle className="nd" cx={n.x} cy={n.y} r={n.r} fill={dc[n.domain]}
          filter="url(#soft)" style={{ animationDelay: n.begin }} />
        <circle cx={n.x} cy={n.y} r={n.r + 7} fill="none"
          stroke={dc[n.domain]} strokeOpacity="0.18" strokeWidth="1" />
      </g>
    ))}

    {/* ── Vault node ── */}
    <g>
      <circle className="nd" cx={VAULT.x} cy={VAULT.y} r="2.6" fill={dc.vault} filter="url(#soft)" />
      <rect x={VAULT.x - 8} y={VAULT.y - 8} width="16" height="16" rx="3"
        fill="none" stroke={dc.vault} strokeOpacity="0.2" strokeWidth="1"
        transform={`rotate(45 ${VAULT.x} ${VAULT.y})`} />
    </g>

    {/* ── The intelligent core ── */}
    <circle className="halo" cx={CORE.x} cy={CORE.y} r="88" fill="url(#halo)" />
    <circle cx={CORE.x} cy={CORE.y} r="22" fill="none" stroke={GOLD} strokeOpacity="0.22" strokeWidth="1" />
    <circle cx={CORE.x} cy={CORE.y} r="38" fill="none" stroke={GOLD} strokeOpacity="0.1" strokeWidth="1" />
    <circle className="coreDot" cx={CORE.x} cy={CORE.y} r="5" fill={GOLD_LIT} filter="url(#soft)" />
  </HudSvg>
  )
}

/* ── Layout ─────────────────────────────────────────────────────────── */
const Root = styled.div`
  position: relative;
  min-height: 100dvh;
  background-color: ${BG};
  background-image: radial-gradient(rgba(202, 138, 4, 0.06) 1px, transparent 1px);
  background-size: 30px 30px;
  overflow: hidden;
`

const HudSvg = styled.svg`
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
  opacity: 0.5;
  @media ${({ theme }) => theme.media.lg} {
    opacity: 1;
  }
`

/* Warm vignette so the core glow reads and the edges settle */
const Vignette = styled.div`
  position: absolute;
  inset: 0;
  pointer-events: none;
  background:
    radial-gradient(60% 55% at 36% 50%, rgba(202, 138, 4, 0.07), transparent 70%),
    radial-gradient(120% 90% at 50% 50%, transparent 40%, ${BG} 100%);
`

const Shell = styled.div`
  position: relative;
  z-index: 1;
  min-height: 100dvh;
  display: grid;
  place-items: center;
  padding: ${({ theme }) => `${theme.spacing[8]} ${theme.spacing[5]}`};

  @media ${({ theme }) => theme.media.lg} {
    grid-template-columns: 1fr 420px;
    align-items: center;
    gap: 72px;
    max-width: 1240px;
    margin: 0 auto;
    padding: ${({ theme }) => `${theme.spacing[12]} ${theme.spacing[10]}`};
  }
`

/* ── Left column ────────────────────────────────────────────────────── */
const Hero = styled.div`
  display: none;
  @media ${({ theme }) => theme.media.lg} {
    display: block;
    animation: ${fadeUp} 0.5s cubic-bezier(0.16, 1, 0.3, 1) both;
  }
`

const LogoRow = styled.div`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => `${theme.spacing[3]}`};
  margin-bottom: ${({ theme }) => `${theme.spacing[10]}`};
`

const LogoBadge = styled.div<{ $size?: number }>`
  width: ${({ $size }) => $size ?? 42}px;
  height: ${({ $size }) => $size ?? 42}px;
  border-radius: ${({ theme }) => theme.radii.sm};
  background: linear-gradient(135deg, ${GOLD} 0%, #7a5208 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
`

const LogoBadgeText = styled.span<{ $size?: number }>`
  font-size: ${({ $size }) => $size ?? 13}px;
  font-weight: 800;
  color: ${TXT};
  letter-spacing: -0.02em;
`

const BrandName = styled.span<{ $size?: number }>`
  font-size: ${({ $size }) => $size ?? 21}px;
  font-weight: 700;
  color: ${TXT};
  letter-spacing: -0.03em;
`

const Eyebrow = styled.p`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => `${theme.spacing[2.5]}`};
  font-size: ${({ theme }) => theme.typography.fontSize.xs};
  font-weight: 600;
  letter-spacing: 0.22em;
  text-transform: uppercase;
  color: ${GOLD};
  margin: ${({ theme }) => `0 0 ${theme.spacing[4.5]}`};

  &::after {
    content: '';
    flex: 1;
    max-width: 72px;
    height: 1px;
    background: linear-gradient(90deg, rgba(202, 138, 4, 0.5), transparent);
  }
`

/* GlobalStyles sets h1/h2 to Playfair Display — pin sans, UI is never serif. */
const Title = styled.h1`
  font-family: ${({ theme }) => theme.typography.fontFamily.sans};
  font-size: ${({ theme }) => theme.typography.fontSize['4xl']};
  line-height: 1.06;
  font-weight: 700;
  color: ${TXT};
  letter-spacing: -0.035em;
  margin: ${({ theme }) => `0 0 ${theme.spacing[4]}`};

  span { color: ${GOLD}; }
`

const Sub = styled.p`
  font-size: ${({ theme }) => theme.typography.fontSize.base};
  color: ${MUTED};
  line-height: 1.7;
  max-width: 400px;
  margin: ${({ theme }) => `0 0 ${theme.spacing[8]}`};
`

/* Domain chips — the five life domains, one row */
const ChipRow = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: ${({ theme }) => `${theme.spacing[2]}`};
  margin-bottom: ${({ theme }) => `${theme.spacing[8]}`};
`

const Chip = styled.div`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => `${theme.spacing[2]}`};
  padding: ${({ theme }) => `${theme.spacing[2]} ${theme.spacing[3]}`};
  border-radius: ${({ theme }) => theme.radii.sm};
  background: ${GLASS};
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  border: 1px solid ${LINE};
`

const ChipLabel = styled.span`
  font-size: ${({ theme }) => theme.typography.fontSize.sm};
  font-weight: 600;
  color: ${TXT};
`

/* Feature list — editorial hairline rows, not cards */
const Features = styled.div`
  display: flex;
  flex-direction: column;
  border-top: 1px solid ${LINE};
  margin-bottom: ${({ theme }) => `${theme.spacing[8]}`};
`

const FeatureRow = styled.div`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => `${theme.spacing[3.5]}`};
  padding: ${({ theme }) => `${theme.spacing[3.5]} ${theme.spacing[0.5]}`};
  border-bottom: 1px solid ${LINE};
`

const FeatureIcon = styled.div<{ $c: string }>`
  width: 30px;
  height: 30px;
  border-radius: ${({ theme }) => theme.radii.sm};
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  color: ${({ $c }) => $c};
  background: ${({ $c }) => `${$c}1f`};
`

const FeatureTitle = styled.span`
  font-size: ${({ theme }) => theme.typography.fontSize.sm};
  font-weight: 600;
  color: ${TXT};
  width: 106px;
  flex-shrink: 0;
`

const FeatureDesc = styled.span`
  font-size: ${({ theme }) => theme.typography.fontSize.sm};
  color: ${MUTED};
`

/* Status ticker — real product facts */
const Ticker = styled.div`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => `${theme.spacing[3.5]}`};
  font-size: ${({ theme }) => theme.typography.fontSize.xs};
  color: ${FAINT};
  letter-spacing: 0.04em;
`

/* Live-status dot. Uses success, not a domain colour — it means "running",
   not "Business". */
const Dot = styled.span`
  width: 5px;
  height: 5px;
  border-radius: 50%;
  background: ${({ theme }) => theme.color.success};
  box-shadow: 0 0 8px ${({ theme }) => theme.color.success};
  flex-shrink: 0;
`

const TickerSep = styled.span`
  color: rgba(255, 255, 255, 0.15);
`

/* ── Right column — auth card ───────────────────────────────────────── */
const Card = styled.div`
  width: 100%;
  max-width: 420px;
  padding: ${({ theme }) => `${theme.spacing[8]} ${theme.spacing[7]}`};
  border-radius: ${({ theme }) => theme.radii.md};
  background: rgba(14, 16, 14, 0.72);
  backdrop-filter: blur(28px);
  -webkit-backdrop-filter: blur(28px);
  border: 1px solid ${LINE};
  box-shadow:
    0 24px 70px rgba(0, 0, 0, 0.55),
    0 0 0 1px rgba(202, 138, 4, 0.06);
  animation: ${fadeUp} 0.5s 0.1s cubic-bezier(0.16, 1, 0.3, 1) both;

  @media ${({ theme }) => theme.media.sm} {
    padding: 36px 34px;
  }
`

const MobileLogo = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  gap: ${({ theme }) => `${theme.spacing[2.5]}`};
  margin-bottom: ${({ theme }) => `${theme.spacing[6]}`};
  @media ${({ theme }) => theme.media.lg} {
    display: none;
  }
`

const CardTitle = styled.h2`
  font-family: ${({ theme }) => theme.typography.fontFamily.sans};
  font-size: ${({ theme }) => theme.typography.fontSize['2xl']};
  font-weight: 700;
  color: ${TXT};
  letter-spacing: -0.02em;
  margin: ${({ theme }) => `0 0 ${theme.spacing[1.5]}`};
`

const CardSub = styled.p`
  font-size: ${({ theme }) => theme.typography.fontSize.sm};
  color: ${MUTED};
  margin: ${({ theme }) => `0 0 ${theme.spacing[6]}`};
`

const Fields = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => `${theme.spacing[3.5]}`};
  margin-bottom: ${({ theme }) => `${theme.spacing[4]}`};
`

const Label = styled.label`
  display: block;
  font-size: ${({ theme }) => theme.typography.fontSize.xs};
  font-weight: 600;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: ${FAINT};
  margin-bottom: ${({ theme }) => `${theme.spacing[1.5]}`};
`

const InputWrap = styled.div`
  position: relative;
  display: flex;
  align-items: center;
`

const IconL = styled.div`
  position: absolute;
  left: 13px;
  display: flex;
  color: rgba(255, 255, 255, 0.3);
  pointer-events: none;
  z-index: 1;
`

const IconR = styled.div`
  position: absolute;
  right: 13px;
  display: flex;
  align-items: center;
`

const Input = styled.input`
  width: 100%;
  box-sizing: border-box;
  padding: 12px 42px;
  font-size: ${({ theme }) => theme.typography.fontSize.base};
  font-family: ${({ theme }) => theme.typography.fontFamily.sans};
  color: ${TXT};
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid ${LINE};
  border-radius: ${({ theme }) => theme.radii.sm};
  outline: none;
  transition: border-color 150ms, box-shadow 150ms, background 150ms;

  &::placeholder { color: rgba(255, 255, 255, 0.26); }
  &:hover { border-color: rgba(255, 255, 255, 0.16); }
  &:focus {
    border-color: ${GOLD};
    background: rgba(255, 255, 255, 0.055);
    box-shadow: ${({ theme }) => theme.focusRing};
  }
`

const InputPlain = styled(Input)`
  padding: ${({ theme }) => `${theme.spacing[3]} ${theme.spacing[3.5]}`};
`

const EyeBtn = styled.button`
  background: none;
  border: none;
  padding: 0;
  cursor: pointer;
  display: flex;
  color: rgba(255, 255, 255, 0.32);
  transition: color 120ms;
  &:hover { color: ${TXT}; }
  &:focus-visible { outline: 2px solid ${GOLD}; outline-offset: 2px; border-radius: ${({ theme }) => theme.radii.xs}; }
`

/* Valid-email check. Success, not a domain colour. */
const Valid = styled.div`
  width: 18px;
  height: 18px;
  border-radius: 50%;
  background: ${({ theme }) => theme.color.success};
  display: flex;
  align-items: center;
  justify-content: center;
  color: #04140d;
`

const Row = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: ${({ theme }) => `${theme.spacing[5]}`};
`

const Remember = styled.label`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => `${theme.spacing[2]}`};
  font-size: ${({ theme }) => theme.typography.fontSize.sm};
  color: ${MUTED};
  cursor: pointer;
  user-select: none;

  input {
    width: 15px;
    height: 15px;
    border-radius: ${({ theme }) => theme.radii.xs};
    accent-color: ${GOLD};
    cursor: pointer;
  }
`

const Forgot = styled(Link)`
  font-size: ${({ theme }) => theme.typography.fontSize.sm};
  font-weight: 500;
  color: ${GOLD};
  text-decoration: none;
  &:hover { color: ${GOLD_LIT}; }
`

const ErrorBox = styled.div`
  font-size: ${({ theme }) => theme.typography.fontSize.sm};
  color: #fca5a5;
  padding: ${({ theme }) => `${theme.spacing[2.5]} ${theme.spacing[3]}`};
  border-radius: ${({ theme }) => theme.radii.sm};
  background: rgba(239, 68, 68, 0.1);
  border: 1px solid rgba(239, 68, 68, 0.28);
  margin-bottom: ${({ theme }) => `${theme.spacing[4]}`};
`

const Primary = styled.button`
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: ${({ theme }) => `${theme.spacing[2]}`};
  padding: ${({ theme }) => `${theme.spacing[3]}`};
  font-size: ${({ theme }) => theme.typography.fontSize.base};
  font-weight: 700;
  font-family: ${({ theme }) => theme.typography.fontFamily.sans};
  color: #100c02;
  background: linear-gradient(135deg, #e3ac1a 0%, ${GOLD} 100%);
  border: none;
  border-radius: ${({ theme }) => theme.radii.sm};
  cursor: pointer;
  transition: filter 150ms, transform 100ms;
  margin-bottom: ${({ theme }) => `${theme.spacing[5]}`};

  &:hover:not(:disabled) { filter: brightness(1.1); }
  &:active:not(:disabled) { transform: scale(0.99); }
  &:disabled { opacity: 0.4; cursor: not-allowed; }
  &:focus-visible { outline: 2px solid ${GOLD_LIT}; outline-offset: 2px; }
`

const Divider = styled.div`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => `${theme.spacing[3]}`};
  margin-bottom: ${({ theme }) => `${theme.spacing[4]}`};

  span {
    font-size: ${({ theme }) => theme.typography.fontSize.xs};
    letter-spacing: 0.12em;
    text-transform: uppercase;
    color: rgba(255, 255, 255, 0.22);
    flex-shrink: 0;
  }
  &::before, &::after {
    content: '';
    flex: 1;
    height: 1px;
    background: ${LINE};
  }
`

const Ghost = styled.button`
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: ${({ theme }) => `${theme.spacing[2.5]}`};
  padding: ${({ theme }) => `${theme.spacing[3]}`};
  font-size: ${({ theme }) => theme.typography.fontSize.sm};
  font-weight: 500;
  font-family: ${({ theme }) => theme.typography.fontFamily.sans};
  color: ${TXT};
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid ${LINE};
  border-radius: ${({ theme }) => theme.radii.sm};
  cursor: pointer;
  transition: background 150ms, border-color 150ms;
  margin-bottom: ${({ theme }) => `${theme.spacing[5]}`};

  &:hover:not(:disabled) {
    background: rgba(255, 255, 255, 0.06);
    border-color: rgba(255, 255, 255, 0.18);
  }
  &:disabled { opacity: 0.5; cursor: not-allowed; }
  &:focus-visible { outline: 2px solid ${GOLD}; outline-offset: 2px; }
`

const Toggle = styled.p`
  text-align: center;
  font-size: ${({ theme }) => theme.typography.fontSize.sm};
  color: ${MUTED};
  margin: ${({ theme }) => `0 0 ${theme.spacing[5]}`};

  button {
    background: none;
    border: none;
    color: ${GOLD};
    font-size: ${({ theme }) => theme.typography.fontSize.sm};
    font-weight: 600;
    font-family: ${({ theme }) => theme.typography.fontFamily.sans};
    cursor: pointer;
    padding: 0;
    margin-left: ${({ theme }) => `${theme.spacing[1]}`};
    &:hover { color: ${GOLD_LIT}; }
    &:focus-visible { outline: 2px solid ${GOLD}; border-radius: ${({ theme }) => theme.radii.xs}; }
  }
`

const Foot = styled.p`
  display: flex;
  align-items: center;
  justify-content: center;
  gap: ${({ theme }) => `${theme.spacing[1]}`};
  font-size: ${({ theme }) => theme.typography.fontSize.xs};
  color: rgba(255, 255, 255, 0.22);
  margin: ${({ theme }) => `0 0 ${theme.spacing[2]}`};
`

const Legal = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  gap: ${({ theme }) => `${theme.spacing[1]}`};

  a {
    font-size: ${({ theme }) => theme.typography.fontSize.xs};
    color: rgba(255, 255, 255, 0.28);
    text-decoration: none;
    transition: color 120ms;
    &:hover { color: ${TXT}; }
  }
  span { color: rgba(255, 255, 255, 0.14); font-size: ${({ theme }) => theme.typography.fontSize.xs}; }
`

/* ── Static data ────────────────────────────────────────────────────── */
const DOMAINS = [
  { icon: IndianRupee, label: 'Finance',  domain: 'finance'  },
  { icon: Heart,       label: 'Health',   domain: 'health'   },
  { icon: Briefcase,   label: 'Career',   domain: 'career'   },
] as const

const FEATURES = [
  { icon: Sparkles, label: 'AI-Powered',   desc: 'Chat with Claude about any life domain', domain: 'content' },
  { icon: Shield,   label: 'Vault Synced', desc: 'Obsidian vault as your knowledge layer', domain: 'vault' },
  { icon: Zap,      label: 'Agents',       desc: 'Automated workflows that run on schedule', domain: 'business' },
] as const

const GoogleIcon = () => (
  <svg width="17" height="17" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4" />
    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
  </svg>
)


type AuthMode = 'login' | 'signup'

/* ── Component ──────────────────────────────────────────────────────── */
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
  const [rememberMe, setRememberMe] = useState(false)
  const [signupSent, setSignupSent] = useState(false)
  const navigate = useNavigate()
  const setAuthenticated = useAuthStore(s => s.setAuthenticated)
  const setUser = useAuthStore(s => s.setUser)

  const isSignup = mode === 'signup'
  const emailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)

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
      if (isSignup) {
        // Signup issues no session — it answers 202 for new AND existing emails
        // so the endpoint can't be used to enumerate users. The verification
        // link in the inbox is what turns the account on.
        await api.post('/auth/signup', { name, email, password })
        track('signup')
        setSignupSent(true)
        return
      }
      const { data } = await api.post('/auth/login', { email, password })
      setAuthenticated(true)
      if (data.user) {
        setUser(data.user)
        identify(data.user.id)
      }
      navigate('/app')
    } catch (err) {
      setError(errorMessage(err, isSignup ? 'Could not create account' : 'Invalid email or password'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <Root>
      <AmbientHUD />
      <Vignette />

      <Shell>
        {/* ── Left: the pitch ── */}
        <Hero>
          <LogoRow>
            <LogoBadge>
              <LogoBadgeText>AI</LogoBadgeText>
            </LogoBadge>
            <BrandName>Control Tower</BrandName>
          </LogoRow>

          <Eyebrow>AI Life Operating System</Eyebrow>
          <Title>
            Your personal<br />
            <span>command</span> center.
          </Title>
          <Sub>
            Money, health and career in one intelligent interface.
            All your data, connected and AI-powered.
          </Sub>

          <ChipRow>
            {DOMAINS.map(d => (
              <Chip key={d.label}>
                <d.icon size={14} color={theme.chromeDomain[d.domain]} />
                <ChipLabel>{d.label}</ChipLabel>
              </Chip>
            ))}
          </ChipRow>

          <Features>
            {FEATURES.map(f => (
              <FeatureRow key={f.label}>
                <FeatureIcon $c={theme.chromeDomain[f.domain]}><f.icon size={15} /></FeatureIcon>
                <FeatureTitle>{f.label}</FeatureTitle>
                <FeatureDesc>{f.desc}</FeatureDesc>
              </FeatureRow>
            ))}
          </Features>

          <Ticker>
            <Dot />
            <span>3 domains</span>
            <TickerSep>·</TickerSep>
            <span>8 agents on schedule</span>
            <TickerSep>·</TickerSep>
            <span>vault synced</span>
          </Ticker>
        </Hero>

        {/* ── Right: auth ── */}
        <Card>
          <MobileLogo>
            <LogoBadge $size={34}><LogoBadgeText $size={11}>AI</LogoBadgeText></LogoBadge>
            <BrandName $size={18}>Control Tower</BrandName>
          </MobileLogo>

          {signupSent ? (
            <>
              <CardTitle>Check your email</CardTitle>
              <CardSub>
                We've sent a verification link to <strong>{email}</strong>. Click it to
                activate your account, then sign in.
              </CardSub>
              <Toggle>
                Wrong address or already registered?
                <button type="button" onClick={() => { setSignupSent(false); setMode('login') }}>
                  Back to sign in
                </button>
              </Toggle>
            </>
          ) : (
          <>
          <CardTitle>{isSignup ? 'Create your account' : 'Welcome back'}</CardTitle>
          <CardSub>
            {isSignup ? 'Start running your life on Control Tower' : 'Sign in to continue to Control Tower'}
          </CardSub>

          <form onSubmit={handleSubmit}>
            <Fields>
              {isSignup && (
                <div>
                  <Label htmlFor="signup-name">Name</Label>
                  <InputPlain
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
                <Label htmlFor="login-email">Email</Label>
                <InputWrap>
                  <IconL><Mail size={15} /></IconL>
                  <Input
                    id="login-email"
                    type="email"
                    placeholder="you@example.com"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    autoFocus={!isSignup}
                    required
                  />
                  {email && emailValid && (
                    <IconR><Valid><Check size={11} strokeWidth={3} /></Valid></IconR>
                  )}
                </InputWrap>
              </div>

              <div>
                <Label htmlFor="login-password">Password</Label>
                <InputWrap>
                  <IconL><Lock size={15} /></IconL>
                  <Input
                    id="login-password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder={isSignup ? 'At least 8 characters' : '••••••••••'}
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    required
                  />
                  <IconR>
                    <EyeBtn
                      type="button"
                      onClick={() => setShowPassword(v => !v)}
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                    >
                      {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                    </EyeBtn>
                  </IconR>
                </InputWrap>
              </div>
            </Fields>

            {!isSignup && (
              <Row>
                <Remember>
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={e => setRememberMe(e.target.checked)}
                  />
                  Remember me
                </Remember>
                <Forgot to="/forgot-password">Forgot password?</Forgot>
              </Row>
            )}

            {error && <ErrorBox>{error}</ErrorBox>}

            <Primary type="submit" disabled={loading || !email || !password || (isSignup && !name)}>
              {loading
                ? (isSignup ? 'Creating account…' : 'Signing in…')
                : <>{isSignup ? 'Create account' : 'Sign in'} <ArrowRight size={16} /></>}
            </Primary>
          </form>

          <Divider><span>or</span></Divider>

          <Ghost type="button" onClick={handleGoogleLogin} disabled={googleLoading}>
            <GoogleIcon />
            {googleLoading ? 'Redirecting…' : 'Continue with Google'}
          </Ghost>

          <Toggle>
            {isSignup ? 'Already have an account?' : 'New to Control Tower?'}
            <button type="button" onClick={toggleMode}>
              {isSignup ? 'Sign in' : 'Create an account'}
            </button>
          </Toggle>
          </>
          )}

          <Foot><Lock size={10} /> Your data, encrypted · Private by design</Foot>
          <Legal>
            <Link to="/privacy-policy">Privacy</Link>
            <span>·</span>
            <Link to="/terms-of-service">Terms</Link>
            <span>·</span>
            <Link to="/support">Support</Link>
          </Legal>
        </Card>
      </Shell>
    </Root>
  )
}
