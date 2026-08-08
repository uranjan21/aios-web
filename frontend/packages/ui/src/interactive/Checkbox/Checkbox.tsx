import { forwardRef } from 'react';
import type { InputHTMLAttributes } from 'react';
import styled from 'styled-components';

export interface CheckboxProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type' | 'size'> {
  /** Tri-state: shows a dash icon instead of a check. */
  indeterminate?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

const sizeMap = { sm: '14px', md: '18px', lg: '22px' };

const Wrapper = styled.span<{ $size: 'sm' | 'md' | 'lg' }>`
  position: relative;
  display: inline-flex;
  width: ${({ $size }) => sizeMap[$size]};
  height: ${({ $size }) => sizeMap[$size]};
  vertical-align: middle;
  flex-shrink: 0;
`;

const HiddenInput = styled.input`
  position: absolute;
  inset: 0;
  margin: 0;
  opacity: 0;
  cursor: pointer;

  &:disabled { cursor: not-allowed; }
  &:focus-visible + span {
    outline: ${({ theme }) => theme.border.focus} solid ${({ theme }) => theme.color.ring};
    outline-offset: 2px;
  }
`;

const Box = styled.span<{ $checked: boolean; $indeterminate: boolean; $disabled: boolean }>`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 100%;
  border: 1.5px solid ${({ theme, $checked, $indeterminate }) =>
    $checked || $indeterminate ? theme.color.primary : theme.color.border};
  /* The box is 16-18px. xs keeps it an unmistakable square rather than
     something that reads as a radio button. */
  border-radius: ${({ theme }) => theme.radii.xs};
  background: ${({ theme, $checked, $indeterminate }) =>
    $checked || $indeterminate ? theme.color.primary : theme.color.card};
  color: ${({ theme }) => theme.color.primaryForeground};
  transition: background-color ${({ theme }) => theme.motion.duration.fast} ${({ theme }) => theme.motion.easing.standard},
              border-color ${({ theme }) => theme.motion.duration.fast} ${({ theme }) => theme.motion.easing.standard};
  pointer-events: none;
  opacity: ${({ $disabled }) => ($disabled ? 0.5 : 1)};

  & svg {
    width: 70%;
    height: 70%;
    stroke-width: 3;
    stroke: currentColor;
    fill: none;
  }
`;

export const Checkbox = forwardRef<HTMLInputElement, CheckboxProps>(function Checkbox(
  { indeterminate = false, size = 'md', checked, disabled, ...rest },
  ref,
) {
  const isChecked = !!checked;
  return (
    <Wrapper $size={size}>
      <HiddenInput
        ref={ref}
        type="checkbox"
        checked={isChecked}
        disabled={disabled}
        aria-checked={indeterminate ? 'mixed' : isChecked}
        {...rest}
      />
      <Box $checked={isChecked} $indeterminate={indeterminate} $disabled={!!disabled}>
        {indeterminate ? (
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h14" strokeLinecap="round" /></svg>
        ) : isChecked ? (
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12.5l5 5L20 7" strokeLinecap="round" strokeLinejoin="round" /></svg>
        ) : null}
      </Box>
    </Wrapper>
  );
});
