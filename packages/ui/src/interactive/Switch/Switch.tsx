import { forwardRef } from 'react';
import type { InputHTMLAttributes } from 'react';
import styled from 'styled-components';

export interface SwitchProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type' | 'size'> {
  size?: 'sm' | 'md' | 'lg';
}

const dimensions = {
  sm: { w: '28px', h: '16px', thumb: '12px' },
  md: { w: '36px', h: '20px', thumb: '16px' },
  lg: { w: '44px', h: '24px', thumb: '20px' },
};

const Wrapper = styled.label<{ $size: 'sm' | 'md' | 'lg'; $disabled: boolean }>`
  position: relative;
  display: inline-block;
  width: ${({ $size }) => dimensions[$size].w};
  height: ${({ $size }) => dimensions[$size].h};
  cursor: ${({ $disabled }) => ($disabled ? 'not-allowed' : 'pointer')};
  opacity: ${({ $disabled }) => ($disabled ? 0.5 : 1)};
  flex-shrink: 0;
`;

const HiddenInput = styled.input`
  position: absolute;
  inset: 0;
  margin: 0;
  opacity: 0;
  cursor: inherit;
  &:focus-visible + span {
    outline: ${({ theme }) => theme.border.focus} solid ${({ theme }) => theme.color.ring};
    outline-offset: 2px;
  }
`;

const Track = styled.span<{ $checked: boolean; $size: 'sm' | 'md' | 'lg' }>`
  position: absolute;
  inset: 0;
  display: block;
  background: ${({ theme, $checked }) => ($checked ? theme.color.primary : theme.color.border)};
  border-radius: 9999px;
  transition: background-color ${({ theme }) => theme.motion.duration.normal} ${({ theme }) => theme.motion.easing.standard};

  &::after {
    content: '';
    position: absolute;
    top: 50%;
    transform: translateY(-50%) ${({ $checked, $size }) =>
      $checked
        ? `translateX(calc(${dimensions[$size].w} - ${dimensions[$size].thumb} - 2px))`
        : 'translateX(2px)'};
    width: ${({ $size }) => dimensions[$size].thumb};
    height: ${({ $size }) => dimensions[$size].thumb};
    background: ${({ theme }) => theme.color.card};
    border-radius: 50%;
    box-shadow: ${({ theme }) => theme.shadow.sm};
    transition: transform ${({ theme }) => theme.motion.duration.normal} ${({ theme }) => theme.motion.easing.standard};
  }
`;

export const Switch = forwardRef<HTMLInputElement, SwitchProps>(function Switch(
  { size = 'md', checked, disabled, ...rest },
  ref,
) {
  const isChecked = !!checked;
  return (
    <Wrapper $size={size} $disabled={!!disabled}>
      <HiddenInput
        ref={ref}
        type="checkbox"
        role="switch"
        checked={isChecked}
        disabled={disabled}
        aria-checked={isChecked}
        {...rest}
      />
      <Track $checked={isChecked} $size={size} />
    </Wrapper>
  );
});
