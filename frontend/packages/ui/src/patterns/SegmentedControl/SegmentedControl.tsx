import type { ReactNode } from 'react';
import styled from 'styled-components';

export interface SegmentOption<V extends string = string> {
  value: V;
  label: ReactNode;
  icon?: ReactNode;
  badge?: ReactNode;
}

export interface SegmentedControlProps<V extends string = string> {
  value: V;
  onChange: (value: V) => void;
  options: SegmentOption<V>[];
  size?: 'sm' | 'md';
  /** Accessible label for the tablist. */
  'aria-label'?: string;
  className?: string;
  style?: React.CSSProperties;
}

const Root = styled.div<{ $size: 'sm' | 'md' }>`
  display: inline-flex;
  align-items: center;
  gap: ${({ theme }) => `${theme.spacing[0.5]}`};
  padding: ${({ theme }) => `${theme.spacing[1]}`};
  background: ${({ theme }) => theme.color.muted};
  /* sm outer / xs inner (see the thumb below) - concentric, and never a
     pill at the 32px track height. */
  border-radius: ${({ theme }) => theme.radii.sm};
  ${({ $size, theme }) => $size === 'sm'
    ? `height: 32px; font-size: ${theme.typography.fontSize.xs};`
    : `height: 36px; font-size: ${theme.typography.fontSize.base};`}
`;

const Segment = styled.button<{ $active: boolean; $size: 'sm' | 'md' }>`
  display: inline-flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing[2]};
  padding: ${({ theme, $size }) => $size === 'sm'
    ? `${theme.spacing[1]} ${theme.spacing[3]}`
    : `${theme.spacing[1]} ${theme.spacing[4]}`};
  font-family: ${({ theme }) => theme.typography.fontFamily.sans};
  font-weight: ${({ theme }) => theme.typography.fontWeight.medium};
  color: ${({ theme, $active }) => ($active ? theme.color.foreground : theme.color.mutedForeground)};
  background: ${({ theme, $active }) => ($active ? theme.color.card : 'transparent')};
  border: none;
  border-radius: ${({ theme }) => theme.radii.xs};
  box-shadow: ${({ theme, $active }) => ($active ? theme.elevation[1] : 'none')};
  cursor: pointer;
  white-space: nowrap;
  user-select: none;
  transition: background-color ${({ theme }) => theme.motion.duration.fast} ${({ theme }) => theme.motion.easing.standard},
              color ${({ theme }) => theme.motion.duration.fast} ${({ theme }) => theme.motion.easing.standard};

  &:hover:not(:disabled) {
    background: ${({ theme, $active }) => ($active ? theme.color.card : theme.color.background)};
    color: ${({ theme }) => theme.color.foreground};
  }
  &:focus-visible { outline: 2px solid ${({ theme }) => theme.color.ring}; outline-offset: 2px; }

  & > svg { width: 14px; height: 14px; }
`;

export function SegmentedControl<V extends string = string>({
  value,
  onChange,
  options,
  size = 'md',
  'aria-label': ariaLabel,
  className,
  style,
}: SegmentedControlProps<V>) {
  return (
    <Root role="tablist" aria-label={ariaLabel} $size={size} className={className} style={style}>
      {options.map(opt => (
        <Segment
          key={opt.value}
          type="button"
          role="tab"
          aria-selected={opt.value === value}
          $active={opt.value === value}
          $size={size}
          onClick={() => onChange(opt.value)}
        >
          {opt.icon}
          {opt.label}
          {opt.badge}
        </Segment>
      ))}
    </Root>
  );
}
