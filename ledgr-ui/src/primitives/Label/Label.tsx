import { forwardRef } from 'react';
import type { LabelHTMLAttributes } from 'react';
import styled from 'styled-components';

export interface LabelProps extends LabelHTMLAttributes<HTMLLabelElement> {
  /** Show a required-field asterisk after the text. */
  required?: boolean;
}

const StyledLabel = styled.label`
  display: inline-flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing[1]};
  font-family: ${({ theme }) => theme.typography.fontFamily.sans};
  font-size: ${({ theme }) => theme.typography.fontSize.base};
  font-weight: ${({ theme }) => theme.typography.fontWeight.medium};
  color: ${({ theme }) => theme.color.foreground};
  line-height: ${({ theme }) => theme.typography.lineHeight.tight};
  user-select: none;
`;

const Required = styled.span`
  color: ${({ theme }) => theme.color.destructive};
`;

export const Label = forwardRef<HTMLLabelElement, LabelProps>(function Label(
  { required, children, ...rest },
  ref,
) {
  return (
    <StyledLabel ref={ref} {...rest}>
      {children}
      {required && <Required aria-label="required">*</Required>}
    </StyledLabel>
  );
});
