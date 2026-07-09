import React from 'react'
import styled, { keyframes, css, useTheme } from 'styled-components'
import { useUIStore } from '@/stores/uiStore'

export type LoaderVariant = 'dual-ring' | 'pulse-dots' | 'data-stream' | 'glow-pulse';
export type LoaderSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl';
export type LoaderTone = 'primary' | 'secondary' | 'cta' | 'theme';

export interface LoaderProps {
  variant?: LoaderVariant;
  size?: LoaderSize;
  tone?: LoaderTone;
  label?: string;
  inline?: boolean;
  className?: string;
}

// --------------------------------------------------------
// Keyframes for premium animations
// --------------------------------------------------------

const rotateClockwise = keyframes`
  from { transform: rotate(0deg); }
  to   { transform: rotate(360deg); }
`;

const rotateCounterClockwise = keyframes`
  from { transform: rotate(360deg); }
  to   { transform: rotate(0deg); }
`;

const pulseScale = keyframes`
  0%, 100% {
    transform: scale(0.7);
    opacity: 0.35;
  }
  50% {
    transform: scale(1.15);
    opacity: 1;
  }
`;

const streamFlow = keyframes`
  0% {
    background-position: -200% 0;
  }
  100% {
    background-position: 200% 0;
  }
`;

const glowPulse = keyframes`
  0%, 100% {
    opacity: 0.55;
    filter: drop-shadow(0 0 1px rgba(34, 197, 94, 0.3));
  }
  50% {
    opacity: 1;
    filter: drop-shadow(0 0 8px rgba(34, 197, 94, 0.75));
  }
`;

// --------------------------------------------------------
// Size maps (px values)
// --------------------------------------------------------

const SIZE_MAP: Record<LoaderSize, { outer: number; inner: number; stroke: number; gap: number }> = {
  xs: { outer: 16, inner: 10, stroke: 1.5, gap: 4 },
  sm: { outer: 24, inner: 16, stroke: 2, gap: 6 },
  md: { outer: 36, inner: 24, stroke: 2.5, gap: 8 },
  lg: { outer: 48, inner: 32, stroke: 3, gap: 10 },
  xl: { outer: 64, inner: 42, stroke: 4, gap: 12 },
};

// --------------------------------------------------------
// Helper to resolve color tokens based on active theme
// --------------------------------------------------------

function getToneColor(tone: LoaderTone, theme: any, isDark: boolean): string {
  // Hardcoded Dashboard Tokens (Primary: #0F172A, Secondary: #1E293B, CTA: #22C55E)
  if (tone === 'primary') {
    return isDark ? '#FAFAF9' : '#0F172A';
  }
  if (tone === 'secondary') {
    return isDark ? '#E2E8F0' : '#1E293B';
  }
  if (tone === 'cta') {
    return '#22C55E';
  }
  
  // Theme-aware fallback
  return theme?.color?.primary ?? '#0F172A';
}

function getSecondaryColor(tone: LoaderTone, theme: any, isDark: boolean): string {
  if (tone === 'cta') {
    return isDark ? '#1E293B' : '#E2E8F0';
  }
  return isDark ? '#334155' : '#E2E8F0';
}

// --------------------------------------------------------
// Styled Components
// --------------------------------------------------------

const Container = styled.div<{ $inline?: boolean }>`
  display: ${({ $inline }) => ($inline ? 'inline-flex' : 'flex')};
  align-items: center;
  justify-content: center;
  vertical-align: middle;
  ${({ $inline }) =>
    !$inline &&
    css`
      width: 100%;
      height: 100%;
      min-height: 100px;
      padding: 24px;
    `}
`;

const SrOnly = styled.span`
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
`;

// 1. Dual-Ring Spinner Styled Components
const SvgContainer = styled.svg<{ $size: number }>`
  width: ${({ $size }) => $size}px;
  height: ${({ $size }) => $size}px;
  position: relative;
`;

const OuterRing = styled.circle<{ $color: string; $stroke: number }>`
  stroke: ${({ $color }) => $color};
  stroke-width: ${({ $stroke }) => $stroke}px;
  fill: none;
  stroke-linecap: round;
  transform-origin: 50% 50%;
  animation: ${rotateClockwise} 1.2s cubic-bezier(0.4, 0, 0.2, 1) infinite;
`;

const InnerRing = styled.circle<{ $color: string; $stroke: number }>`
  stroke: ${({ $color }) => $color};
  stroke-width: ${({ $stroke }) => $stroke}px;
  fill: none;
  stroke-linecap: round;
  transform-origin: 50% 50%;
  animation: ${rotateCounterClockwise} 0.8s cubic-bezier(0.4, 0, 0.2, 1) infinite;
  opacity: 0.75;
`;

// 2. Pulse Dots Styled Components
const DotsWrapper = styled.div<{ $gap: number }>`
  display: flex;
  align-items: center;
  gap: ${({ $gap }) => $gap}px;
`;

const Dot = styled.span<{ $color: string; $size: number; $delay: string }>`
  width: ${({ $size }) => $size}px;
  height: ${({ $size }) => $size}px;
  border-radius: 50%;
  background-color: ${({ $color }) => $color};
  animation: ${pulseScale} 1.2s ease-in-out infinite;
  animation-delay: ${({ $delay }) => $delay};
`;

// 3. Data Stream (Horizontal Bar) Styled Components
const StreamTrack = styled.div<{ $bgColor: string; $height: number }>`
  width: 100%;
  max-width: 240px;
  height: ${({ $height }) => $height}px;
  border-radius: 4px;
  background-color: ${({ $bgColor }) => $bgColor};
  overflow: hidden;
  position: relative;
`;

const StreamFill = styled.div<{ $color1: string; $color2: string }>`
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: linear-gradient(
    90deg,
    transparent 0%,
    ${({ $color1 }) => $color1} 50%,
    ${({ $color2 }) => $color2} 100%
  );
  background-size: 200% 100%;
  animation: ${streamFlow} 1.4s cubic-bezier(0.4, 0, 0.2, 1) infinite;
`;

// 4. Glow Pulse Styled Components
const GlowWrapper = styled.div<{ $size: number; $color: string }>`
  width: ${({ $size }) => $size}px;
  height: ${({ $size }) => $size}px;
  border-radius: 50%;
  background-color: ${({ $color }) => $color};
  animation: ${glowPulse} 2s ease-in-out infinite;
`;

// --------------------------------------------------------
// Theme / Mode bridge component
// --------------------------------------------------------

interface BridgeProps {
  tone: LoaderTone;
  children: (theme: any, isDark: boolean) => React.ReactNode;
}

function StyledComponentBridge({ children }: BridgeProps) {
  const theme = useTheme();
  // Get active light/dark state from the store
  const uiTheme = useUIStore(s => s.theme);
  const isDark = uiTheme === 'dark';
  
  return <>{children(theme, isDark)}</>;
}

// --------------------------------------------------------
// Main Component
// --------------------------------------------------------

export function Loader({
  variant = 'dual-ring',
  size = 'md',
  tone = 'primary',
  label = 'Loading components…',
  inline = false,
  className,
}: LoaderProps) {
  const sizeConfig = SIZE_MAP[size];
  
  return (
    <Container $inline={inline} className={className} role="status">
      <SrOnly>{label}</SrOnly>
      
      {/* Dynamic Styled rendering based on variant */}
      {styledRenderer(variant, sizeConfig, tone, label)}
    </Container>
  );
}

function styledRenderer(
  variant: LoaderVariant,
  sizeConfig: typeof SIZE_MAP['md'],
  tone: LoaderTone,
  label: string
) {
  return (
    <StyledComponentBridge tone={tone}>
      {(theme: any, isDark: boolean) => {
        const primaryColor = getToneColor(tone, theme, isDark);
        const secondaryColor = getSecondaryColor(tone, theme, isDark);
        
        switch (variant) {
          case 'dual-ring': {
            // Calculate circumferences and dash lengths
            const outerR = (sizeConfig.outer - sizeConfig.stroke) / 2;
            const innerR = (sizeConfig.inner - sizeConfig.stroke) / 2;
            const outerCirc = 2 * Math.PI * outerR;
            const innerCirc = 2 * Math.PI * innerR;
            
            // 60% arc for outer, 40% arc for inner
            const outerDash = outerCirc * 0.6;
            const outerGap = outerCirc * 0.4;
            const innerDash = innerCirc * 0.4;
            const innerGap = innerCirc * 0.6;
            
            const center = sizeConfig.outer / 2;

            return (
              <SvgContainer $size={sizeConfig.outer} viewBox={`0 0 ${sizeConfig.outer} ${sizeConfig.outer}`}>
                <OuterRing
                  $color={primaryColor}
                  $stroke={sizeConfig.stroke}
                  cx={center}
                  cy={center}
                  r={outerR}
                  strokeDasharray={`${outerDash} ${outerGap}`}
                />
                <InnerRing
                  $color={tone === 'cta' ? getToneColor('primary', theme, isDark) : '#22C55E'}
                  $stroke={sizeConfig.stroke}
                  cx={center}
                  cy={center}
                  r={innerR}
                  strokeDasharray={`${innerDash} ${innerGap}`}
                />
              </SvgContainer>
            );
          }
          
          case 'pulse-dots': {
            const dotSize = Math.max(4, sizeConfig.stroke * 2.5);
            return (
              <DotsWrapper $gap={sizeConfig.gap}>
                <Dot $color={primaryColor} $size={dotSize} $delay="0s" />
                <Dot $color={tone === 'cta' ? getToneColor('secondary', theme, isDark) : '#22C55E'} $size={dotSize} $delay="0.15s" />
                <Dot $color={primaryColor} $size={dotSize} $delay="0.3s" />
              </DotsWrapper>
            );
          }
          
          case 'data-stream': {
            const streamH = Math.max(2, sizeConfig.stroke);
            const streamAccent = tone === 'cta' ? '#22C55E' : getToneColor('cta', theme, isDark);
            return (
              <StreamTrack $bgColor={secondaryColor} $height={streamH}>
                <StreamFill $color1={primaryColor} $color2={streamAccent} />
              </StreamTrack>
            );
          }
          
          case 'glow-pulse': {
            const circleSize = Math.max(8, sizeConfig.inner);
            const glowColor = tone === 'cta' ? '#22C55E' : primaryColor;
            return <GlowWrapper $size={circleSize} $color={glowColor} />;
          }
          
          default:
            return null;
        }
      }}
    </StyledComponentBridge>
  );
}
