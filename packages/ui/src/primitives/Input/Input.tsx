import { forwardRef } from 'react';
import type { InputHTMLAttributes, ReactNode } from 'react';
import styled, { css } from 'styled-components';

export type InputSize = 'sm' | 'md' | 'lg';

export interface InputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'size'> {
  size?: InputSize;
  /** Show invalid styles + sets aria-invalid. */
  invalid?: boolean;
  /** Slot before the input. */
  startAdornment?: ReactNode;
  /** Slot after the input. */
  endAdornment?: ReactNode;
  /** Stretch to fill parent. Default true. */
  fullWidth?: boolean;
}

const sizeStyles = {
  sm: css`
    height: 32px;
    font-size: ${({ theme }) => theme.typography.fontSize.xs};
    padding: 0 ${({ theme }) => theme.spacing[2]};
  `,
  md: css`
    height: 36px;
    font-size: ${({ theme }) => theme.typography.fontSize.base};
    padding: 0 ${({ theme }) => theme.spacing[3]};
  `,
  lg: css`
    height: 44px;
    font-size: ${({ theme }) => theme.typography.fontSize.md};
    padding: 0 ${({ theme }) => theme.spacing[4]};
  `,
};

const Wrapper = styled.div<{ $fullWidth: boolean; $invalid: boolean; $size: InputSize }>`
  display: inline-flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing[2]};
  background: ${({ theme }) => theme.mode === 'dark' ? 'rgba(255, 255, 255, 0.04)' : 'rgba(0, 0, 0, 0.02)'};
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  border: 1px solid ${({ theme }) => theme.mode === 'dark' ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.08)'};
  border-radius: ${({ theme }) => theme.radii.md};
  box-shadow: inset 0 2px 4px rgba(0, 0, 0, 0.04);
  transition: all ${({ theme }) => theme.motion.duration.fast} ${({ theme }) => theme.motion.easing.standard};
  ${({ $fullWidth }) => $fullWidth && css`width: 100%;`}
  ${({ $size }) => sizeStyles[$size]}

  &:hover {
    background: ${({ theme }) => theme.mode === 'dark' ? 'rgba(255, 255, 255, 0.06)' : 'rgba(0, 0, 0, 0.03)'};
    border-color: ${({ theme }) => theme.mode === 'dark' ? 'rgba(255, 255, 255, 0.15)' : 'rgba(0, 0, 0, 0.15)'};
  }

  &:focus-within {
    background: ${({ theme }) => theme.mode === 'dark' ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.04)'};
    border-color: ${({ theme, $invalid }) => ($invalid ? theme.color.destructive : theme.color.accent)};
    box-shadow: 
      inset 0 2px 4px rgba(0, 0, 0, 0.04),
      0 0 0 1px ${({ theme, $invalid }) => ($invalid ? theme.color.destructive : theme.color.accent)},
      0 0 12px ${({ theme, $invalid }) => ($invalid ? theme.color.destructive : theme.color.accent)}40;
  }

  &:has(input:disabled) {
    opacity: 0.6;
    cursor: not-allowed;
    background: ${({ theme }) => theme.color.muted};
  }

  & > svg { width: 1em; height: 1em; flex-shrink: 0; color: ${({ theme }) => theme.color.mutedForeground}; }
`;

const StyledInput = styled.input`
  flex: 1;
  min-width: 0;
  height: 100%;
  background: transparent;
  border: none;
  outline: none;
  font-family: ${({ theme }) => theme.typography.fontFamily.sans};
  color: ${({ theme }) => theme.color.foreground};

  &::placeholder {
    color: ${({ theme }) => theme.color.mutedForeground};
  }

  &:disabled {
    cursor: not-allowed;
  }
`;

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  {
    size = 'md',
    invalid = false,
    startAdornment,
    endAdornment,
    fullWidth = true,
    className,
    style,
    ...rest
  },
  ref,
) {
  return (
    <Wrapper $fullWidth={fullWidth} $invalid={invalid} $size={size} className={className} style={style}>
      {startAdornment}
      <StyledInput ref={ref} aria-invalid={invalid || undefined} {...rest} />
      {endAdornment}
    </Wrapper>
  );
});
