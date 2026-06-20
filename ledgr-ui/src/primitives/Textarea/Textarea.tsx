import { forwardRef } from 'react';
import type { TextareaHTMLAttributes } from 'react';
import styled from 'styled-components';
import { focusRing } from '../../utils/focusRing';

export interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  invalid?: boolean;
  fullWidth?: boolean;
}

const StyledTextarea = styled.textarea<{ $invalid: boolean; $fullWidth: boolean }>`
  display: block;
  width: ${({ $fullWidth }) => ($fullWidth ? '100%' : 'auto')};
  min-height: 80px;
  padding: ${({ theme }) => theme.spacing[2]} ${({ theme }) => theme.spacing[3]};
  font-family: ${({ theme }) => theme.typography.fontFamily.sans};
  font-size: ${({ theme }) => theme.typography.fontSize.base};
  line-height: ${({ theme }) => theme.typography.lineHeight.normal};
  color: ${({ theme }) => theme.color.foreground};
  background: ${({ theme }) => theme.color.card};
  border: 1px solid ${({ theme, $invalid }) => ($invalid ? theme.color.destructive : theme.color.input)};
  border-radius: ${({ theme }) => theme.radii.md};
  resize: vertical;
  transition: border-color ${({ theme }) => theme.motion.duration.fast} ${({ theme }) => theme.motion.easing.standard};
  ${focusRing}

  &::placeholder { color: ${({ theme }) => theme.color.mutedForeground}; }
  &:focus-visible {
    border-color: ${({ theme, $invalid }) => ($invalid ? theme.color.destructive : theme.color.ring)};
    outline: none;
    box-shadow: 0 0 0 3px ${({ theme, $invalid }) =>
      $invalid ? theme.color.destructive + '33' : theme.color.ring + '33'};
  }
  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
    background: ${({ theme }) => theme.color.muted};
  }
`;

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(function Textarea(
  { invalid = false, fullWidth = true, ...rest },
  ref,
) {
  return <StyledTextarea ref={ref} $invalid={invalid} $fullWidth={fullWidth} aria-invalid={invalid || undefined} {...rest} />;
});
