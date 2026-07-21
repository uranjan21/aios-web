import styled, { keyframes } from 'styled-components'
import { motion } from 'framer-motion'
import { Link } from 'react-router-dom'

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

export const PageWrapper = styled.div`
  min-height: 100vh;
  background-color: ${({ theme }) => theme.color.background};
  color: ${({ theme }) => theme.color.foreground};
  display: flex;
  flex-direction: column;
  font-family: ${({ theme }) => theme.typography.fontFamily.sans};
`

// ── Header ───────────────────────────────────────────────────────────────────

export const Header = styled.header`
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

export const Logo = styled(Link)`
  font-family: ${({ theme }) => theme.typography.fontFamily.display};
  font-size: 1.5rem;
  font-weight: 700;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  color: ${({ theme }) => theme.color.foreground};
  text-decoration: none;
  .accent { color: ${({ theme }) => theme.color.accent}; }
`

export const HeaderNav = styled.nav`
  display: flex;
  gap: 1.5rem;
  align-items: center;
  a {
    font-size: ${({ theme }) => theme.typography.fontSize.base};
    font-weight: 500;
    color: ${({ theme }) => theme.color.mutedForeground};
    text-decoration: none;
    transition: color 0.2s;
    &:hover { color: ${({ theme }) => theme.color.foreground}; }
  }
`

// ── Hero ─────────────────────────────────────────────────────────────────────

export const HeroSection = styled.section`
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

export const HeroEyebrow = styled(motion.div)`
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  font-size: ${({ theme }) => theme.typography.fontSize.sm};
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  color: ${({ theme }) => theme.color.accent};
  padding: 0.35rem 1rem;
  border-radius: ${({ theme }) => theme.radii.sm};
  border: 1px solid ${({ theme }) => theme.color.accent}40;
  background: ${({ theme }) => theme.color.accent}0d;
  margin-bottom: 2rem;
`

export const HeroTitle = styled(motion.h1)`
  font-family: ${({ theme }) => theme.typography.fontFamily.display};
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

export const HeroSubtitle = styled(motion.p)`
  font-size: 1.2rem;
  line-height: 1.65;
  color: ${({ theme }) => theme.color.mutedForeground};
  margin-bottom: 2.5rem;
  max-width: 580px;
`

export const CTARow = styled(motion.div)`
  display: flex;
  gap: 1rem;
  justify-content: center;
  flex-wrap: wrap;
`

export const TrustBar = styled(motion.div)`
  display: flex;
  align-items: center;
  gap: 1.5rem;
  margin-top: 2.5rem;
  flex-wrap: wrap;
  justify-content: center;
  font-size: ${({ theme }) => theme.typography.fontSize.sm};
  color: ${({ theme }) => theme.color.mutedForeground};
`

export const TrustItem = styled.div`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => `${theme.spacing[1]}`};
  font-weight: 500;
  svg { color: ${({ theme }) => theme.color.accent}; }
`

// ── Stats strip ───────────────────────────────────────────────────────────────

export const StatsStrip = styled.section`
  border-top: 1px solid ${({ theme }) => theme.color.border};
  border-bottom: 1px solid ${({ theme }) => theme.color.border};
  padding: 2rem;
  display: flex;
  justify-content: center;
  gap: 0;
`

export const StatItem = styled.div`
  flex: 1;
  max-width: 200px;
  text-align: center;
  padding: 0 2rem;
  border-right: 1px solid ${({ theme }) => theme.color.border};
  &:last-child { border-right: none; }
  @media ${({ theme }) => theme.media.belowSm} { min-width: 120px; padding: 0 1rem; }
`

export const StatNum = styled.div`
  font-family: ${({ theme }) => theme.typography.fontFamily.display};
  font-size: 2rem;
  font-weight: 700;
  color: ${({ theme }) => theme.color.foreground};
`

export const StatLabel = styled.div`
  font-size: ${({ theme }) => theme.typography.fontSize.sm};
  color: ${({ theme }) => theme.color.mutedForeground};
  margin-top: ${({ theme }) => `${theme.spacing[0.5]}`};
`

// ── Domains ───────────────────────────────────────────────────────────────────

export const SectionWrap = styled.section`
  max-width: 1200px;
  margin: 0 auto;
  padding: 5rem 2rem;
  width: 100%;
`

export const SectionLabel = styled.div`
  font-size: ${({ theme }) => theme.typography.fontSize.sm};
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  color: ${({ theme }) => theme.color.accent};
  margin-bottom: 0.75rem;
`

export const SectionTitle = styled.h2`
  font-family: ${({ theme }) => theme.typography.fontFamily.display};
  font-size: clamp(1.75rem, 4vw, 2.75rem);
  font-weight: 700;
  margin-bottom: 1rem;
  line-height: 1.2;
`

export const SectionSubtitle = styled.p`
  font-size: 1.05rem;
  color: ${({ theme }) => theme.color.mutedForeground};
  max-width: 560px;
  line-height: 1.6;
  margin-bottom: 3rem;
`

export const DomainGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
  gap: 1.25rem;
`

export const DomainCard = styled(motion.div)`
  background: ${({ theme }) => theme.color.card};
  border: 1px solid ${({ theme }) => theme.color.border};
  border-radius: ${({ theme }) => theme.radii.md};
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

export const DomainIcon = styled.div`
  width: 44px;
  height: 44px;
  border-radius: ${({ theme }) => theme.radii.sm};
  background: ${({ theme }) => theme.color.accent}12;
  color: ${({ theme }) => theme.color.accent};
  display: flex;
  align-items: center;
  justify-content: center;
  animation: ${float} 4s ease-in-out infinite;
`

export const DomainName = styled.div`
  font-size: ${({ theme }) => theme.typography.fontSize.base};
  font-weight: 600;
  color: ${({ theme }) => theme.color.foreground};
`

export const DomainDesc = styled.div`
  font-size: ${({ theme }) => theme.typography.fontSize.sm};
  color: ${({ theme }) => theme.color.mutedForeground};
  line-height: 1.55;
`

export const DomainFeatures = styled.ul`
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => `${theme.spacing[1]}`};
`

export const DomainFeat = styled.li`
  font-size: ${({ theme }) => theme.typography.fontSize.sm};
  color: ${({ theme }) => theme.color.mutedForeground};
  display: flex;
  align-items: center;
  gap: ${({ theme }) => `${theme.spacing[1.5]}`};
  svg { color: ${({ theme }) => theme.color.accent}; flex-shrink: 0; }
`

// ── AI Section ────────────────────────────────────────────────────────────────

export const AiSection = styled.section`
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

export const AiTitle = styled.h2`
  font-family: ${({ theme }) => theme.typography.fontFamily.display};
  font-size: clamp(1.75rem, 4vw, 2.75rem);
  font-weight: 700;
  color: ${({ theme }) => theme.color.primaryForeground};
  margin-bottom: 1rem;
  max-width: 700px;
  margin-inline: auto;
`

export const AiSubtitle = styled.p`
  font-size: 1.05rem;
  color: ${({ theme }) => theme.color.primaryForeground}A6;
  max-width: 520px;
  margin: 0 auto 2.5rem;
  line-height: 1.65;
`

export const AiGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
  gap: 1rem;
  max-width: 1100px;
  margin: 0 auto;
`

export const AiCard = styled.div`
  background: ${({ theme }) => theme.color.primaryForeground}0F;
  border: 1px solid ${({ theme }) => theme.color.primaryForeground}1A;
  border-radius: ${({ theme }) => theme.radii.md};
  padding: 1.5rem;
  text-align: left;
`

export const AiCardTitle = styled.div`
  font-size: ${({ theme }) => theme.typography.fontSize.base};
  font-weight: 600;
  color: ${({ theme }) => theme.color.primaryForeground};
  margin-bottom: ${({ theme }) => `${theme.spacing[1.5]}`};
  display: flex;
  align-items: center;
  gap: ${({ theme }) => `${theme.spacing[2]}`};
  svg { color: ${({ theme }) => theme.color.accent}; }
`

export const AiCardDesc = styled.div`
  font-size: ${({ theme }) => theme.typography.fontSize.sm};
  color: ${({ theme }) => theme.color.primaryForeground}8C;
  line-height: 1.55;
`

// ── Comparison table ──────────────────────────────────────────────────────────

export const CompareSection = styled(SectionWrap)`
  text-align: center;
`

export const CompareTable = styled.div`
  display: grid;
  grid-template-columns: 2fr 1fr 1fr;
  border: 1px solid ${({ theme }) => theme.color.border};
  border-radius: ${({ theme }) => theme.radii.md};
  overflow: hidden;
  text-align: left;
  margin-top: 2rem;
  @media ${({ theme }) => theme.media.belowSm} { grid-template-columns: 1fr; }
`

export const CompareHeader = styled.div<{ $highlight?: boolean }>`
  padding: 1.5rem;
  background: ${({ theme, $highlight }) => $highlight ? theme.color.primary : theme.color.card};
  color: ${({ theme, $highlight }) => $highlight ? theme.color.primaryForeground : 'inherit'};
  border-bottom: 1px solid ${({ theme }) => theme.color.border};
  font-weight: 700;
  font-size: ${({ theme }) => theme.typography.fontSize.base};
`

export const CompareRow = styled.div<{ $highlight?: boolean }>`
  padding: 0.875rem 1.5rem;
  background: ${({ theme, $highlight }) => $highlight ? `${theme.color.primary}08` : 'transparent'};
  border-bottom: 1px solid ${({ theme }) => theme.color.border}60;
  font-size: ${({ theme }) => theme.typography.fontSize.sm};
  display: flex;
  align-items: center;
  gap: ${({ theme }) => `${theme.spacing[2]}`};
  &:last-child { border-bottom: none; }
  .yes { color: ${({ theme }) => theme.color.accent}; }
  .no { color: ${({ theme }) => theme.color.mutedForeground}; }
`

// ── Pricing preview ───────────────────────────────────────────────────────────

export const PricingWrap = styled.section`
  background: ${({ theme }) => theme.color.muted};
  padding: 5rem 2rem;
  text-align: center;
`

export const PriceCards = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
  gap: 1.5rem;
  max-width: 1100px;
  margin: 2rem auto 0;
`

export const PriceCard = styled.div<{ $featured?: boolean }>`
  background: ${({ theme, $featured }) => $featured ? theme.color.primary : theme.color.card};
  color: ${({ theme, $featured }) => $featured ? theme.color.primaryForeground : 'inherit'};
  border: 1px solid ${({ theme, $featured }) => $featured ? 'transparent' : theme.color.border};
  border-radius: ${({ theme }) => theme.radii.md};
  padding: 2rem;
  text-align: left;
  position: relative;
`

export const PriceBadge = styled.div`
  position: absolute;
  top: -12px;
  left: 50%;
  transform: translateX(-50%);
  background: ${({ theme }) => theme.color.accent};
  color: ${({ theme }) => theme.color.accentForeground};
  font-size: ${({ theme }) => theme.typography.fontSize.xs};
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  padding: ${({ theme }) => `${theme.spacing[0.5]} ${theme.spacing[3]}`};
  border-radius: ${({ theme }) => theme.radii.sm};
`

export const PriceName = styled.div`
  font-size: ${({ theme }) => theme.typography.fontSize.base};
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  margin-bottom: 0.5rem;
  opacity: 0.8;
`

export const PriceAmount = styled.div`
  font-family: ${({ theme }) => theme.typography.fontFamily.display};
  font-size: 2.5rem;
  font-weight: 700;
  line-height: 1;
  margin-bottom: 0.25rem;
`

export const PricePer = styled.div`
  font-size: ${({ theme }) => theme.typography.fontSize.sm};
  opacity: 0.6;
  margin-bottom: 1.5rem;
`

export const PriceFeats = styled.ul`
  list-style: none;
  padding: 0;
  margin: 0 0 1.5rem;
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => `${theme.spacing[2]}`};
`

export const PriceFeat = styled.li`
  font-size: ${({ theme }) => theme.typography.fontSize.sm};
  display: flex;
  align-items: flex-start;
  gap: ${({ theme }) => `${theme.spacing[2]}`};
  line-height: 1.4;
  opacity: 0.9;
  svg { flex-shrink: 0; margin-top: ${({ theme }) => `${theme.spacing[0.5]}`}; }
`

export const PriceUsdNote = styled.div`
  font-size: ${({ theme }) => theme.typography.fontSize.xs};
  opacity: 0.6;
  margin-bottom: 1.5rem;
`

// ── Final CTA ─────────────────────────────────────────────────────────────────

export const FinalCTA = styled.section`
  padding: 6rem 2rem;
  text-align: center;
  background: ${({ theme }) => theme.color.background};
`

export const FinalTitle = styled.h2`
  font-family: ${({ theme }) => theme.typography.fontFamily.display};
  font-size: clamp(2rem, 5vw, 3.5rem);
  font-weight: 700;
  margin-bottom: 1rem;
`

export const FinalSub = styled.p`
  font-size: 1.1rem;
  color: ${({ theme }) => theme.color.mutedForeground};
  margin-bottom: 2rem;
`

// ── Footer ────────────────────────────────────────────────────────────────────

export const Footer = styled.footer`
  padding: 2rem;
  border-top: 1px solid ${({ theme }) => theme.color.border};
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: ${({ theme }) => theme.typography.fontSize.sm};
  color: ${({ theme }) => theme.color.mutedForeground};
  flex-wrap: wrap;
  gap: 1rem;
  .links { display: flex; gap: 1.5rem; }
  a { color: inherit; text-decoration: none; &:hover { color: ${({ theme }) => theme.color.foreground}; } }
`
