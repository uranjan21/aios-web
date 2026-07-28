import styled, { keyframes } from 'styled-components';

export type SpinnerSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl';
export type SpinnerTone = 'primary' | 'muted' | 'success' | 'destructive' | 'warning' | 'inherit';

export interface SpinnerProps {
  size?: SpinnerSize;
  tone?: SpinnerTone;
  label?: string;       // accessible sr-only label, defaults to "Loading…"
  className?: string;
}

const SIZE_PX: Record<SpinnerSize, number> = {
  xs: 12,
  sm: 16,
  md: 20,
  lg: 28,
  xl: 40,
};

const STROKE: Record<SpinnerSize, number> = {
  xs: 2,
  sm: 2,
  md: 2.5,
  lg: 3,
  xl: 3.5,
};

const spin = keyframes`
  from { transform: rotate(0deg); }
  to   { transform: rotate(360deg); }
`;

const Ring = styled.svg<{ $px: number }>`
  width: ${({ $px }) => $px}px;
  height: ${({ $px }) => $px}px;
  flex-shrink: 0;
  animation: ${spin} 0.75s linear infinite;
`;

const SrOnly = styled.span`
  position: absolute;
  width: 1px; height: 1px;
  padding: 0; margin: -1px;
  overflow: hidden;
  clip: rect(0,0,0,0);
  white-space: nowrap;
  border: 0;
`;

function toneColor(tone: SpinnerTone, theme: any): string {
  if (tone === 'inherit') return 'currentColor';
  const map: Record<string, string> = {
    primary:     theme.color.primary,
    muted:       theme.color.mutedForeground,
    success:     theme.color.success,
    destructive: theme.color.destructive,
    warning:     theme.color.warning,
  };
  return map[tone] ?? theme.color.primary;
}

const TrackCircle = styled.circle<{ $tone: SpinnerTone }>`
  stroke: ${({ theme, $tone }) => toneColor($tone, theme)};
  opacity: 0.18;
`;

const ArcCircle = styled.circle<{ $tone: SpinnerTone }>`
  stroke: ${({ theme, $tone }) => toneColor($tone, theme)};
  stroke-linecap: round;
`;

export function Spinner({ size = 'md', tone = 'primary', label = 'Loading…', className }: SpinnerProps) {
  const px = SIZE_PX[size];
  const sw = STROKE[size];
  const r  = (px - sw) / 2;
  const cx = px / 2;
  const circ = 2 * Math.PI * r;
  // Arc covers ~75% of the circle
  const dash = circ * 0.75;
  const gap  = circ * 0.25;

  return (
    <Ring
      $px={px}
      viewBox={`0 0 ${px} ${px}`}
      fill="none"
      role="status"
      aria-label={label}
      className={className}
    >
      {/* Track */}
      <TrackCircle $tone={tone} cx={cx} cy={cx} r={r} strokeWidth={sw} />
      {/* Arc */}
      <ArcCircle
        $tone={tone}
        cx={cx} cy={cx} r={r}
        strokeWidth={sw}
        strokeDasharray={`${dash} ${gap}`}
        strokeDashoffset={circ * 0.25}
        transform={`rotate(-90 ${cx} ${cx})`}
      />
      <SrOnly>{label}</SrOnly>
    </Ring>
  );
}
