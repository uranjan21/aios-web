import type { ReactNode } from 'react';
import styled from 'styled-components';

export interface StatCardProps {
  label: ReactNode;
  value: ReactNode;
  /** Optional small icon. */
  icon?: ReactNode;
  /** Delta indicator below the value (e.g. "+12% vs last month"). */
  trend?: {
    value: ReactNode;
    direction: 'up' | 'down' | 'flat';
  };
  /** Tint the value/icon based on intent. */
  tone?: 'default' | 'primary' | 'success' | 'warning' | 'destructive' | 'info';
  /** Optional helper text below the trend. */
  hint?: ReactNode;
  className?: string;
}

const Root = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.spacing[2]};
  padding: ${({ theme }) => theme.spacing[4]};
  background: ${({ theme }) => theme.color.card};
  border: 1px solid ${({ theme }) => theme.color.border};
  border-radius: ${({ theme }) => theme.radii.md};
  box-shadow: ${({ theme }) => theme.shadow.xs};
`;

const Top = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: ${({ theme }) => theme.spacing[2]};
`;

const Label = styled.span`
  font-size: ${({ theme }) => theme.typography.fontSize.xs};
  font-weight: ${({ theme }) => theme.typography.fontWeight.medium};
  color: ${({ theme }) => theme.color.mutedForeground};
  text-transform: uppercase;
  letter-spacing: ${({ theme }) => theme.typography.letterSpacing.wide};
`;

const IconWrap = styled.div<{ $tone: NonNullable<StatCardProps['tone']> }>`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border-radius: ${({ theme }) => theme.radii.md};
  background: ${({ theme, $tone }) => {
    switch ($tone) {
      case 'primary':     return theme.color.primary + '15';
      case 'success':     return theme.color.success + '15';
      case 'warning':     return theme.color.warning + '20';
      case 'destructive': return theme.color.destructive + '15';
      case 'info':        return theme.color.info + '15';
      default:            return theme.color.muted;
    }
  }};
  color: ${({ theme, $tone }) => {
    switch ($tone) {
      case 'primary':     return theme.color.primary;
      case 'success':     return theme.color.success;
      case 'warning':     return theme.color.warning;
      case 'destructive': return theme.color.destructive;
      case 'info':        return theme.color.info;
      default:            return theme.color.mutedForeground;
    }
  }};
  & svg { width: 14px; height: 14px; }
`;

const Value = styled.div<{ $tone: NonNullable<StatCardProps['tone']> }>`
  font-family: ${({ theme }) => theme.typography.fontFamily.display};
  font-size: ${({ theme }) => theme.typography.fontSize['3xl']};
  font-weight: ${({ theme }) => theme.typography.fontWeight.bold};
  line-height: ${({ theme }) => theme.typography.lineHeight.tight};
  font-variant-numeric: tabular-nums;
  color: ${({ theme, $tone }) => {
    switch ($tone) {
      case 'success':     return theme.color.success;
      case 'destructive': return theme.color.destructive;
      case 'warning':     return theme.color.warning;
      case 'info':        return theme.color.info;
      case 'primary':     return theme.color.primary;
      default:            return theme.color.foreground;
    }
  }};
`;

const Trend = styled.div<{ $direction: 'up' | 'down' | 'flat' }>`
  display: inline-flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing[1]};
  font-size: ${({ theme }) => theme.typography.fontSize.xs};
  color: ${({ theme, $direction }) =>
    $direction === 'up'   ? theme.color.success :
    $direction === 'down' ? theme.color.destructive :
                            theme.color.mutedForeground};
`;

const Hint = styled.p`
  margin: 0;
  font-size: ${({ theme }) => theme.typography.fontSize.xs};
  color: ${({ theme }) => theme.color.mutedForeground};
`;

const TrendIcon = ({ d }: { d: 'up' | 'down' | 'flat' }) => {
  if (d === 'flat') return <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" aria-hidden="true"><line x1="5" y1="12" x2="19" y2="12" /></svg>;
  if (d === 'up')   return <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><polyline points="6 15 12 9 18 15" /></svg>;
  return                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><polyline points="6 9 12 15 18 9" /></svg>;
};

export function StatCard({
  label,
  value,
  icon,
  trend,
  tone = 'default',
  hint,
  className,
}: StatCardProps) {
  return (
    <Root className={className}>
      <Top>
        <Label>{label}</Label>
        {icon && <IconWrap $tone={tone} aria-hidden="true">{icon}</IconWrap>}
      </Top>
      <Value $tone={tone}>{value}</Value>
      {trend && (
        <Trend $direction={trend.direction}>
          <TrendIcon d={trend.direction} />
          {trend.value}
        </Trend>
      )}
      {hint && <Hint>{hint}</Hint>}
    </Root>
  );
}
