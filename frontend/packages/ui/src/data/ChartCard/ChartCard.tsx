/**
 * ChartCard — themed wrapper for any charting library.
 *
 * Provides consistent title/subtitle/actions chrome and exposes the brand colour
 * palette to consumers via the `chartColors` export. Bring your own chart lib.
 */
import type { ReactNode } from 'react';
import { useTheme } from 'styled-components';
import styled from 'styled-components';

export interface ChartCardProps {
  title: ReactNode;
  subtitle?: ReactNode;
  /** Top-right slot — typically a SegmentedControl, Select, or Button. */
  actions?: ReactNode;
  /** Optional height — useful when the chart needs a fixed container. */
  height?: string | number;
  /** The chart itself — pass any chart lib's component as a child. */
  children: ReactNode;
  className?: string;
}

const Root = styled.div`
  background: ${({ theme }) => theme.color.card};
  border: 1px solid ${({ theme }) => theme.color.border};
  border-radius: ${({ theme }) => theme.radii.md};
  padding: ${({ theme }) => theme.spacing[5]};
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.spacing[4]};
`;

const Header = styled.div`
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: ${({ theme }) => theme.spacing[3]};
`;

const Title = styled.h3`
  font-size: ${({ theme }) => theme.typography.fontSize.lg};
  font-weight: ${({ theme }) => theme.typography.fontWeight.semibold};
  margin: 0;
`;

const Subtitle = styled.p`
  margin: ${({ theme }) => `${theme.spacing[1]} 0 0`};
  font-size: ${({ theme }) => theme.typography.fontSize.xs};
  color: ${({ theme }) => theme.color.mutedForeground};
`;

const Body = styled.div<{ $h?: string | number }>`
  position: relative;
  ${({ $h }) => $h !== undefined && `height: ${typeof $h === 'number' ? `${$h}px` : $h};`}
`;

export function ChartCard({ title, subtitle, actions, height, children, className }: ChartCardProps) {
  return (
    <Root className={className}>
      <Header>
        <div>
          <Title>{title}</Title>
          {subtitle && <Subtitle>{subtitle}</Subtitle>}
        </div>
        {actions}
      </Header>
      <Body $h={height}>{children}</Body>
    </Root>
  );
}

/**
 * Curated brand-aware colour palette for charts. Read from current theme.
 * Use inside a chart lib's `colors` prop.
 */
export function useChartColors() {
  const t = useTheme();
  return {
    primary:     t.color.primary,
    accent:      t.color.accent,
    success:     t.color.success,
    warning:     t.color.warning,
    destructive: t.color.destructive,
    info:        t.color.info,
    muted:       t.color.mutedForeground,
    /** A 6-color ordered series used for categorical charts. */
    series: [t.color.primary, t.color.accent, t.color.info, t.color.success, t.color.warning, t.color.destructive],
  };
}
